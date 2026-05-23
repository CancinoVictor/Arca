use axum::extract::State;
use axum::Json;
use axum_extra::extract::cookie::{Cookie, SameSite};
use axum_extra::extract::CookieJar;
use serde::Deserialize;
use time::Duration as CookieDuration;

use crate::auth::{AuthUser, SESSION_COOKIE};
use crate::domain::user::PublicUser;
use crate::error::AppResult;
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct Credentials {
    pub username: String,
    pub password: String,
}

pub async fn register(
    State(state): State<AppState>,
    Json(body): Json<Credentials>,
) -> AppResult<Json<PublicUser>> {
    let user = state
        .auth_service
        .register(body.username.trim(), &body.password)
        .await?;
    Ok(Json(user.into()))
}

pub async fn login(
    State(state): State<AppState>,
    jar: CookieJar,
    Json(body): Json<Credentials>,
) -> AppResult<(CookieJar, Json<PublicUser>)> {
    let outcome = state
        .auth_service
        .login(body.username.trim(), &body.password)
        .await?;
    let ttl_secs = state.config.jwt.ttl.as_secs() as i64;
    let cookie = Cookie::build((SESSION_COOKIE, outcome.token))
        .http_only(true)
        .secure(state.config.cookie_secure)
        .same_site(SameSite::Lax)
        .path("/")
        .max_age(CookieDuration::seconds(ttl_secs))
        .build();
    Ok((jar.add(cookie), Json(outcome.user.into())))
}

pub async fn logout(jar: CookieJar) -> (CookieJar, Json<serde_json::Value>) {
    let expired = Cookie::build((SESSION_COOKIE, ""))
        .path("/")
        .max_age(CookieDuration::seconds(0))
        .build();
    (jar.add(expired), Json(serde_json::json!({ "ok": true })))
}

pub async fn me(
    State(state): State<AppState>,
    user: AuthUser,
) -> AppResult<Json<PublicUser>> {
    let u = state.auth_service.me(&user.user_id).await?;
    Ok(Json(u.into()))
}
