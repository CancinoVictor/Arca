use std::sync::Arc;

use crate::config::Config;
use crate::services::{auth::AuthService, media::MediaService};

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<Config>,
    pub auth_service: Arc<AuthService>,
    pub media_service: Arc<MediaService>,
}
