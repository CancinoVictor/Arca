use axum::routing::{delete, get, head, post};
use axum::Router;
use tower_http::trace::TraceLayer;

use crate::handlers;
use crate::state::AppState;

pub fn build(state: AppState) -> Router {
    let auth = Router::new()
        .route("/register", post(handlers::auth::register))
        .route("/login", post(handlers::auth::login))
        .route("/logout", post(handlers::auth::logout))
        .route("/me", get(handlers::auth::me));

    let media = Router::new()
        .route("/verify", post(handlers::media::verify))
        .route("/verify-batch", post(handlers::media::verify_batch))
        .route(
            "/uploads",
            post(handlers::media::initiate).options(handlers::media::options_upload),
        )
        .route(
            "/uploads/:id",
            head(handlers::media::head_upload)
                .patch(handlers::media::patch_upload)
                .options(handlers::media::options_upload),
        )
        .route("/", get(handlers::media::list))
        .route("/buckets", get(handlers::media::buckets))
        .route("/delete-batch", post(handlers::media::delete_batch))
        .route("/restore-batch", post(handlers::media::restore_batch))
        .route("/trash", delete(handlers::media::empty_trash))
        .route("/:id", get(handlers::media::detail).delete(handlers::media::delete_one))
        .route("/:id/restore", post(handlers::media::restore_one))
        .route("/:id/file", get(handlers::media::file))
        .route("/:id/thumbnail", get(handlers::media::thumbnail));

    let api = Router::new().nest("/auth", auth).nest("/media", media);

    Router::new()
        .route("/health", get(|| async { "ok" }))
        .nest("/api", api)
        .with_state(state)
        .layer(TraceLayer::new_for_http())
}
