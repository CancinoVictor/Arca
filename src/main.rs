mod auth;
mod config;
mod db;
mod domain;
mod error;
mod handlers;
mod repositories;
mod router;
mod services;
mod state;
mod upload;
mod workers;

use anyhow::Result;
use std::sync::Arc;
use tokio::sync::mpsc;

use crate::config::Config;
use crate::repositories::media::{MediaRepository, SqliteMediaRepository};
use crate::repositories::user::{SqliteUserRepository, UserRepository};
use crate::services::auth::AuthService;
use crate::services::media::MediaService;
use crate::state::AppState;
use crate::workers::Job;

#[tokio::main]
async fn main() -> Result<()> {
    dotenvy::dotenv().ok();
    let filter = tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("arca=debug,tower_http=info"));
    tracing_subscriber::fmt().with_env_filter(filter).init();

    let config = Config::from_env()?;
    tokio::fs::create_dir_all(&config.storage_root).await?;
    tokio::fs::create_dir_all("data").await.ok();

    let pool = db::init_pool(&config.database_url).await?;
    db::run_migrations(&pool).await?;

    let user_repo: Arc<dyn UserRepository> = Arc::new(SqliteUserRepository::new(pool.clone()));
    let media_repo: Arc<dyn MediaRepository> = Arc::new(SqliteMediaRepository::new(pool.clone()));

    let (job_tx, job_rx) = mpsc::channel::<Job>(256);

    let auth_service = Arc::new(AuthService::new(user_repo.clone(), config.jwt.clone()));
    let media_service = Arc::new(MediaService::new(
        media_repo.clone(),
        config.storage_root.clone(),
        job_tx.clone(),
    ));

    let state = AppState {
        config: Arc::new(config.clone()),
        auth_service,
        media_service,
    };

    workers::spawn(job_rx, media_repo.clone(), config.storage_root.clone());
    workers::purge::spawn(state.media_service.clone());

    let app = router::build(state);
    let listener = tokio::net::TcpListener::bind(config.bind_addr).await?;
    tracing::info!(addr = %config.bind_addr, "arca listening");
    axum::serve(listener, app).await?;
    Ok(())
}
