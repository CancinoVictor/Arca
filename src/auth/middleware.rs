use axum::async_trait;
use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use axum_extra::extract::CookieJar;

use crate::error::AppError;
use crate::state::AppState;

pub const SESSION_COOKIE: &str = "arca_session";

#[derive(Debug, Clone)]
pub struct AuthUser {
    pub user_id: String,
}

#[async_trait]
impl FromRequestParts<AppState> for AuthUser {
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, Self::Rejection> {
        let jar = CookieJar::from_headers(&parts.headers);
        let token = jar
            .get(SESSION_COOKIE)
            .map(|c| c.value().to_string())
            .ok_or(AppError::Unauthorized)?;
        let claims = crate::auth::jwt::decode_token(&state.config.jwt, &token)?;
        Ok(AuthUser { user_id: claims.sub })
    }
}
