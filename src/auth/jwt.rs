use chrono::Utc;
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};

use crate::config::JwtConfig;
use crate::error::{AppError, AppResult};

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub exp: i64,
    pub iat: i64,
}

pub fn issue(config: &JwtConfig, user_id: &str) -> AppResult<String> {
    let now = Utc::now().timestamp();
    let exp = now + config.ttl.as_secs() as i64;
    let claims = Claims { sub: user_id.into(), exp, iat: now };
    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(config.secret.as_bytes()),
    )?;
    Ok(token)
}

pub fn decode_token(config: &JwtConfig, token: &str) -> AppResult<Claims> {
    let data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(config.secret.as_bytes()),
        &Validation::default(),
    )
    .map_err(|_| AppError::Unauthorized)?;
    Ok(data.claims)
}
