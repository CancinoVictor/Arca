use chrono::{DateTime, Utc};
use serde::Serialize;

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct Media {
    pub id: String,
    pub user_id: String,
    pub file_hash: String,
    pub original_path: String,
    pub thumbnail_path: Option<String>,
    pub file_type: String,
    pub mime_type: String,
    pub size_bytes: i64,
    pub capture_date: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct MediaBucket {
    pub bucket: String,
    pub count: i64,
    pub earliest: DateTime<Utc>,
    pub latest: DateTime<Utc>,
    pub cover_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct UploadRecord {
    pub id: String,
    pub user_id: String,
    pub declared_hash: String,
    pub declared_size: i64,
    pub received_bytes: i64,
    pub mime_type: String,
    pub filename: String,
    pub temp_path: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
