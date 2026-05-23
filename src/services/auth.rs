use std::sync::Arc;
use uuid::Uuid;

use crate::auth::{jwt, password};
use crate::config::JwtConfig;
use crate::domain::user::User;
use crate::error::{AppError, AppResult};
use crate::repositories::user::UserRepository;

pub struct AuthService {
    repo: Arc<dyn UserRepository>,
    jwt: JwtConfig,
}

pub struct LoginOutcome {
    pub user: User,
    pub token: String,
}

impl AuthService {
    pub fn new(repo: Arc<dyn UserRepository>, jwt: JwtConfig) -> Self {
        Self { repo, jwt }
    }

    pub async fn register(&self, username: &str, password: &str) -> AppResult<User> {
        if username.len() < 3 || username.len() > 64 {
            return Err(AppError::BadRequest("username length must be 3..=64".into()));
        }
        if !username.chars().all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-' || c == '.') {
            return Err(AppError::BadRequest("username contains invalid characters".into()));
        }
        if password.len() < 8 {
            return Err(AppError::BadRequest("password must be at least 8 chars".into()));
        }
        if self.repo.find_by_username(username).await?.is_some() {
            return Err(AppError::Conflict("username taken".into()));
        }
        let hash = password::hash_password(password)?;
        let id = Uuid::new_v4().to_string();
        self.repo.create(&id, username, &hash).await
    }

    pub async fn login(&self, username: &str, password: &str) -> AppResult<LoginOutcome> {
        let user = self
            .repo
            .find_by_username(username)
            .await?
            .ok_or(AppError::Unauthorized)?;
        if !password::verify_password(password, &user.password_hash)? {
            return Err(AppError::Unauthorized);
        }
        let token = jwt::issue(&self.jwt, &user.id)?;
        Ok(LoginOutcome { user, token })
    }

    pub async fn me(&self, user_id: &str) -> AppResult<User> {
        self.repo.find_by_id(user_id).await?.ok_or(AppError::NotFound)
    }
}
