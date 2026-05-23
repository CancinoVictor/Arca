use anyhow::{Context, Result};
use std::net::SocketAddr;
use std::path::PathBuf;
use std::time::Duration;

#[derive(Debug, Clone)]
pub struct Config {
    pub bind_addr: SocketAddr,
    pub database_url: String,
    pub storage_root: PathBuf,
    pub jwt: JwtConfig,
    pub cookie_secure: bool,
}

#[derive(Debug, Clone)]
pub struct JwtConfig {
    pub secret: String,
    pub ttl: Duration,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        let bind_addr: SocketAddr = std::env::var("ARCA_BIND")
            .unwrap_or_else(|_| "0.0.0.0:8080".into())
            .parse()
            .context("ARCA_BIND")?;
        let database_url = std::env::var("ARCA_DATABASE_URL")
            .unwrap_or_else(|_| "sqlite://data/arca.db".into());
        let storage_root: PathBuf = std::env::var("ARCA_STORAGE")
            .unwrap_or_else(|_| "data/storage".into())
            .into();
        let secret = std::env::var("ARCA_JWT_SECRET")
            .context("ARCA_JWT_SECRET must be set")?;
        if secret.len() < 16 {
            anyhow::bail!("ARCA_JWT_SECRET must be at least 16 characters");
        }
        let ttl_hours: u64 = std::env::var("ARCA_JWT_TTL_HOURS")
            .unwrap_or_else(|_| "168".into())
            .parse()
            .context("ARCA_JWT_TTL_HOURS")?;
        let cookie_secure = std::env::var("ARCA_COOKIE_SECURE")
            .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
            .unwrap_or(false);

        Ok(Self {
            bind_addr,
            database_url,
            storage_root,
            jwt: JwtConfig {
                secret,
                ttl: Duration::from_secs(ttl_hours * 3600),
            },
            cookie_secure,
        })
    }
}
