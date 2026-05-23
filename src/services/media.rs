use std::path::PathBuf;
use std::sync::Arc;

use tokio::sync::mpsc;
use uuid::Uuid;

use crate::domain::media::{Media, MediaBucket, UploadRecord};
use crate::error::{AppError, AppResult};
use crate::repositories::media::{BucketGranularity, MediaRepository, NewUpload};
use crate::workers::Job;

pub struct MediaService {
    repo: Arc<dyn MediaRepository>,
    storage_root: PathBuf,
    jobs: mpsc::Sender<Job>,
}

pub struct VerifyOutcome {
    pub exists: bool,
    pub media: Option<Media>,
}

pub struct InitiateOutcome {
    pub upload: UploadRecord,
}

pub struct DeleteOutcome {
    pub deleted: u64,
    pub requested: u64,
}

impl MediaService {
    pub fn new(repo: Arc<dyn MediaRepository>, storage_root: PathBuf, jobs: mpsc::Sender<Job>) -> Self {
        Self { repo, storage_root, jobs }
    }

    pub fn repo(&self) -> &Arc<dyn MediaRepository> {
        &self.repo
    }

    pub fn jobs(&self) -> &mpsc::Sender<Job> {
        &self.jobs
    }

    pub fn user_uploads_dir(&self, user_id: &str) -> PathBuf {
        self.storage_root.join(user_id).join("uploads")
    }

    pub fn user_originals_dir(&self, user_id: &str) -> PathBuf {
        self.storage_root.join(user_id).join("original")
    }

    pub async fn verify(&self, user_id: &str, hash: &str) -> AppResult<VerifyOutcome> {
        validate_hash(hash)?;
        let m = self.repo.find_by_hash(user_id, hash).await?;
        Ok(VerifyOutcome { exists: m.is_some(), media: m })
    }

    pub async fn verify_batch(
        &self,
        user_id: &str,
        hashes: &[String],
    ) -> AppResult<std::collections::HashMap<String, String>> {
        for h in hashes {
            validate_hash(h)?;
        }
        let lowered: Vec<String> = hashes.iter().map(|h| h.to_lowercase()).collect();
        self.repo.find_existing_hashes(user_id, &lowered).await
    }

    pub async fn initiate_upload(
        &self,
        user_id: &str,
        hash: &str,
        size: i64,
        mime: &str,
        filename: &str,
    ) -> AppResult<InitiateOutcome> {
        validate_hash(hash)?;
        if size <= 0 {
            return Err(AppError::BadRequest("size must be positive".into()));
        }
        const MAX_BYTES: i64 = 50 * 1024 * 1024 * 1024;
        if size > MAX_BYTES {
            return Err(AppError::BadRequest("file too large".into()));
        }
        if !mime_is_supported(mime) {
            return Err(AppError::BadRequest(format!("unsupported mime type: {mime}")));
        }
        let safe_filename = sanitize_filename(filename);
        if safe_filename.is_empty() {
            return Err(AppError::BadRequest("invalid filename".into()));
        }
        if let Some(existing) = self.repo.find_by_hash(user_id, hash).await? {
            return Err(AppError::Conflict(format!("already uploaded: {}", existing.id)));
        }

        let upload_id = Uuid::new_v4().to_string();
        let upload_dir = self.user_uploads_dir(user_id);
        tokio::fs::create_dir_all(&upload_dir).await?;
        let temp_path = upload_dir.join(format!("{upload_id}.part"));
        tokio::fs::File::create(&temp_path).await?;

        let upload = self
            .repo
            .create_upload(NewUpload {
                id: &upload_id,
                user_id,
                declared_hash: &hash.to_lowercase(),
                declared_size: size,
                mime_type: mime,
                filename: &safe_filename,
                temp_path: &temp_path.to_string_lossy(),
            })
            .await?;

        Ok(InitiateOutcome { upload })
    }

    pub async fn buckets(
        &self,
        user_id: &str,
        granularity: BucketGranularity,
        file_type: Option<&str>,
    ) -> AppResult<Vec<MediaBucket>> {
        self.repo.buckets(user_id, granularity, file_type).await
    }

    pub async fn soft_delete(&self, user_id: &str, ids: &[String]) -> AppResult<DeleteOutcome> {
        if ids.is_empty() {
            return Ok(DeleteOutcome { deleted: 0, requested: 0 });
        }
        if ids.len() > 500 {
            return Err(AppError::BadRequest("max 500 ids per request".into()));
        }
        let deleted = self.repo.soft_delete_many(user_id, ids).await?;
        Ok(DeleteOutcome { deleted, requested: ids.len() as u64 })
    }

    pub async fn restore(&self, user_id: &str, ids: &[String]) -> AppResult<DeleteOutcome> {
        if ids.is_empty() {
            return Ok(DeleteOutcome { deleted: 0, requested: 0 });
        }
        if ids.len() > 500 {
            return Err(AppError::BadRequest("max 500 ids per request".into()));
        }
        let restored = self.repo.restore_many(user_id, ids).await?;
        Ok(DeleteOutcome { deleted: restored, requested: ids.len() as u64 })
    }

    pub async fn empty_trash(&self, user_id: &str) -> AppResult<u64> {
        let removed = self.repo.empty_trash(user_id).await?;
        let count = removed.len() as u64;
        for m in removed {
            remove_media_files(&m).await;
        }
        Ok(count)
    }

    /// Used by the purge worker: hard-delete + remove files for media trashed before `threshold`.
    pub async fn purge_expired(&self, threshold: chrono::DateTime<chrono::Utc>) -> AppResult<u64> {
        let candidates = self.repo.list_purgeable(threshold).await?;
        let mut purged = 0u64;
        for m in candidates {
            remove_media_files(&m).await;
            self.repo.hard_delete(&m.id).await?;
            purged += 1;
        }
        Ok(purged)
    }

}

async fn remove_media_files(m: &Media) {
    let _ = tokio::fs::remove_file(&m.original_path).await;
    if let Some(p) = &m.thumbnail_path {
        let _ = tokio::fs::remove_file(p).await;
    }
}

pub fn validate_hash(hash: &str) -> AppResult<()> {
    if hash.len() != 64 || !hash.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(AppError::BadRequest("invalid sha-256 hash".into()));
    }
    Ok(())
}

pub fn mime_is_supported(mime: &str) -> bool {
    matches!(
        mime,
        "image/jpeg"
            | "image/png"
            | "image/webp"
            | "image/heic"
            | "image/heif"
            | "video/mp4"
            | "video/quicktime"
    )
}

pub fn sanitize_filename(name: &str) -> String {
    let trimmed = name.trim();
    let base = trimmed
        .rsplit(|c: char| c == '/' || c == '\\')
        .next()
        .unwrap_or(trimmed);
    base.chars()
        .filter(|c| !matches!(c, '\0' | '\n' | '\r' | '\t'))
        .take(255)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_hash_length_and_charset() {
        assert!(validate_hash(&"a".repeat(64)).is_ok());
        assert!(validate_hash(&"a".repeat(63)).is_err());
        assert!(validate_hash(&"z".repeat(64)).is_err());
    }

    #[test]
    fn strips_path_components_from_filename() {
        assert_eq!(sanitize_filename("../../etc/passwd"), "passwd");
        assert_eq!(sanitize_filename("C:\\Users\\foo\\img.jpg"), "img.jpg");
        assert_eq!(sanitize_filename("  hello.heic  "), "hello.heic");
    }

    #[test]
    fn accepts_known_mimes() {
        assert!(mime_is_supported("image/jpeg"));
        assert!(mime_is_supported("video/mp4"));
        assert!(!mime_is_supported("application/x-msdownload"));
    }
}
