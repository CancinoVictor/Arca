use async_trait::async_trait;
use sqlx::SqlitePool;

use crate::domain::user::User;
use crate::error::AppResult;

#[async_trait]
pub trait UserRepository: Send + Sync {
    async fn create(&self, id: &str, username: &str, password_hash: &str) -> AppResult<User>;
    async fn find_by_username(&self, username: &str) -> AppResult<Option<User>>;
    async fn find_by_id(&self, id: &str) -> AppResult<Option<User>>;
}

pub struct SqliteUserRepository {
    pool: SqlitePool,
}

impl SqliteUserRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl UserRepository for SqliteUserRepository {
    async fn create(&self, id: &str, username: &str, password_hash: &str) -> AppResult<User> {
        sqlx::query("INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)")
            .bind(id)
            .bind(username)
            .bind(password_hash)
            .execute(&self.pool)
            .await?;
        let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = ?")
            .bind(id)
            .fetch_one(&self.pool)
            .await?;
        Ok(user)
    }

    async fn find_by_username(&self, username: &str) -> AppResult<Option<User>> {
        Ok(sqlx::query_as::<_, User>("SELECT * FROM users WHERE username = ?")
            .bind(username)
            .fetch_optional(&self.pool)
            .await?)
    }

    async fn find_by_id(&self, id: &str) -> AppResult<Option<User>> {
        Ok(sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?)
    }
}
