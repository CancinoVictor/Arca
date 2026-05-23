use async_trait::async_trait;
use chrono::{DateTime, Utc};
use sqlx::SqlitePool;

use crate::domain::media::{Media, MediaBucket, UploadRecord};
use crate::error::AppResult;

pub struct NewMedia<'a> {
    pub id: &'a str,
    pub user_id: &'a str,
    pub file_hash: &'a str,
    pub original_path: &'a str,
    pub file_type: &'a str,
    pub mime_type: &'a str,
    pub size_bytes: i64,
}

pub struct NewUpload<'a> {
    pub id: &'a str,
    pub user_id: &'a str,
    pub declared_hash: &'a str,
    pub declared_size: i64,
    pub mime_type: &'a str,
    pub filename: &'a str,
    pub temp_path: &'a str,
}

/// Trash filter applied when listing media.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TrashFilter {
    /// Default: only non-deleted media.
    Active,
    /// Only deleted media (papelera).
    TrashedOnly,
}

/// Bucket granularity for timeline aggregations.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BucketGranularity {
    Year,
    Month,
}

#[async_trait]
pub trait MediaRepository: Send + Sync {
    async fn find_by_hash(&self, user_id: &str, hash: &str) -> AppResult<Option<Media>>;
    async fn find_existing_hashes(
        &self,
        user_id: &str,
        hashes: &[String],
    ) -> AppResult<std::collections::HashMap<String, String>>;
    async fn create_media(&self, new: NewMedia<'_>) -> AppResult<Media>;
    async fn update_processed(
        &self,
        media_id: &str,
        thumbnail_path: Option<&str>,
        capture_date: Option<DateTime<Utc>>,
    ) -> AppResult<()>;
    async fn find_by_id(&self, id: &str) -> AppResult<Option<Media>>;

    async fn list_by_user_filtered(
        &self,
        user_id: &str,
        cursor: Option<(DateTime<Utc>, String)>,
        limit: i64,
        sort_asc: bool,
        file_type: Option<&str>,
        from: Option<DateTime<Utc>>,
        to: Option<DateTime<Utc>>,
        trash: TrashFilter,
    ) -> AppResult<Vec<Media>>;

    async fn buckets(
        &self,
        user_id: &str,
        granularity: BucketGranularity,
        file_type: Option<&str>,
    ) -> AppResult<Vec<MediaBucket>>;

    /// Returns the number of rows actually affected by the soft delete.
    async fn soft_delete_many(&self, user_id: &str, ids: &[String]) -> AppResult<u64>;

    /// Returns the number of rows actually restored.
    async fn restore_many(&self, user_id: &str, ids: &[String]) -> AppResult<u64>;

    /// Media rows whose deleted_at is older than `threshold`. Used by the purge worker.
    async fn list_purgeable(&self, threshold: DateTime<Utc>) -> AppResult<Vec<Media>>;

    /// Hard-deletes a single media row by id. Caller is responsible for removing files.
    async fn hard_delete(&self, id: &str) -> AppResult<()>;

    /// Hard-deletes every trashed row belonging to `user_id`. Returns the rows so the
    /// caller can remove their files from disk.
    async fn empty_trash(&self, user_id: &str) -> AppResult<Vec<Media>>;

    async fn create_upload(&self, new: NewUpload<'_>) -> AppResult<UploadRecord>;
    async fn find_upload(&self, id: &str) -> AppResult<Option<UploadRecord>>;
    async fn touch_upload(&self, id: &str, received_bytes: i64) -> AppResult<()>;
    async fn set_upload_status(&self, id: &str, status: &str) -> AppResult<()>;
}

pub struct SqliteMediaRepository {
    pool: SqlitePool,
}

impl SqliteMediaRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl MediaRepository for SqliteMediaRepository {
    async fn find_by_hash(&self, user_id: &str, hash: &str) -> AppResult<Option<Media>> {
        Ok(sqlx::query_as::<_, Media>(
            "SELECT * FROM media WHERE user_id = ? AND file_hash = ? AND deleted_at IS NULL",
        )
        .bind(user_id)
        .bind(hash)
        .fetch_optional(&self.pool)
        .await?)
    }

    async fn find_existing_hashes(
        &self,
        user_id: &str,
        hashes: &[String],
    ) -> AppResult<std::collections::HashMap<String, String>> {
        if hashes.is_empty() {
            return Ok(std::collections::HashMap::new());
        }
        let mut builder = sqlx::QueryBuilder::<sqlx::Sqlite>::new(
            "SELECT id, file_hash FROM media WHERE deleted_at IS NULL AND user_id = ",
        );
        builder.push_bind(user_id);
        builder.push(" AND file_hash IN (");
        let mut sep = builder.separated(", ");
        for h in hashes {
            sep.push_bind(h);
        }
        sep.push_unseparated(")");
        let rows: Vec<(String, String)> = builder.build_query_as().fetch_all(&self.pool).await?;
        Ok(rows.into_iter().map(|(id, hash)| (hash, id)).collect())
    }

    async fn create_media(&self, new: NewMedia<'_>) -> AppResult<Media> {
        sqlx::query("INSERT INTO media (id, user_id, file_hash, original_path, file_type, mime_type, size_bytes) VALUES (?, ?, ?, ?, ?, ?, ?)")
            .bind(new.id)
            .bind(new.user_id)
            .bind(new.file_hash)
            .bind(new.original_path)
            .bind(new.file_type)
            .bind(new.mime_type)
            .bind(new.size_bytes)
            .execute(&self.pool)
            .await?;
        let m = sqlx::query_as::<_, Media>("SELECT * FROM media WHERE id = ?")
            .bind(new.id)
            .fetch_one(&self.pool)
            .await?;
        Ok(m)
    }

    async fn update_processed(
        &self,
        media_id: &str,
        thumbnail_path: Option<&str>,
        capture_date: Option<DateTime<Utc>>,
    ) -> AppResult<()> {
        sqlx::query("UPDATE media SET thumbnail_path = ?, capture_date = ? WHERE id = ?")
            .bind(thumbnail_path)
            .bind(capture_date)
            .bind(media_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    async fn find_by_id(&self, id: &str) -> AppResult<Option<Media>> {
        Ok(sqlx::query_as::<_, Media>("SELECT * FROM media WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?)
    }

    async fn list_by_user_filtered(
        &self,
        user_id: &str,
        cursor: Option<(DateTime<Utc>, String)>,
        limit: i64,
        sort_asc: bool,
        file_type: Option<&str>,
        from: Option<DateTime<Utc>>,
        to: Option<DateTime<Utc>>,
        trash: TrashFilter,
    ) -> AppResult<Vec<Media>> {
        let mut builder =
            sqlx::QueryBuilder::<sqlx::Sqlite>::new("SELECT * FROM media WHERE user_id = ");
        builder.push_bind(user_id);

        match trash {
            TrashFilter::Active => builder.push(" AND deleted_at IS NULL"),
            TrashFilter::TrashedOnly => builder.push(" AND deleted_at IS NOT NULL"),
        };

        if let Some(ft) = file_type {
            builder.push(" AND file_type = ");
            builder.push_bind(ft);
        }

        if let Some(f) = from {
            builder.push(" AND COALESCE(capture_date, created_at) >= ");
            builder.push_bind(f);
        }

        if let Some(t) = to {
            builder.push(" AND COALESCE(capture_date, created_at) <= ");
            builder.push_bind(t);
        }

        // Cursor compuesto (fecha, id) para evitar saltarse o repetir items con el
        // mismo timestamp. Equivale a la comparación tupla "(d, id) < (c_d, c_id)".
        if let Some((c_date, c_id)) = cursor {
            if sort_asc {
                builder.push(
                    " AND (COALESCE(capture_date, created_at) > ",
                );
                builder.push_bind(c_date);
                builder.push(" OR (COALESCE(capture_date, created_at) = ");
                builder.push_bind(c_date);
                builder.push(" AND id > ");
                builder.push_bind(c_id);
                builder.push("))");
            } else {
                builder.push(
                    " AND (COALESCE(capture_date, created_at) < ",
                );
                builder.push_bind(c_date);
                builder.push(" OR (COALESCE(capture_date, created_at) = ");
                builder.push_bind(c_date);
                builder.push(" AND id < ");
                builder.push_bind(c_id);
                builder.push("))");
            }
        }

        if sort_asc {
            builder.push(" ORDER BY COALESCE(capture_date, created_at) ASC, id ASC ");
        } else {
            builder.push(" ORDER BY COALESCE(capture_date, created_at) DESC, id DESC ");
        }

        builder.push(" LIMIT ");
        builder.push_bind(limit);

        let rows: Vec<Media> = builder.build_query_as().fetch_all(&self.pool).await?;
        Ok(rows)
    }

    async fn buckets(
        &self,
        user_id: &str,
        granularity: BucketGranularity,
        file_type: Option<&str>,
    ) -> AppResult<Vec<MediaBucket>> {
        let fmt = match granularity {
            BucketGranularity::Year => "%Y",
            BucketGranularity::Month => "%Y-%m",
        };

        // 1) Aggregates per bucket
        let mut agg_b = sqlx::QueryBuilder::<sqlx::Sqlite>::new("SELECT strftime(");
        agg_b.push_bind(fmt);
        agg_b.push(
            ", COALESCE(capture_date, created_at)) AS bucket, \
             COUNT(*) AS count, \
             MIN(COALESCE(capture_date, created_at)) AS earliest, \
             MAX(COALESCE(capture_date, created_at)) AS latest \
             FROM media WHERE user_id = ",
        );
        agg_b.push_bind(user_id);
        agg_b.push(" AND deleted_at IS NULL");
        if let Some(ft) = file_type {
            agg_b.push(" AND file_type = ");
            agg_b.push_bind(ft);
        }
        agg_b.push(" GROUP BY bucket ORDER BY bucket DESC");

        #[derive(sqlx::FromRow)]
        struct AggRow {
            bucket: String,
            count: i64,
            earliest: DateTime<Utc>,
            latest: DateTime<Utc>,
        }
        let aggs: Vec<AggRow> = agg_b.build_query_as().fetch_all(&self.pool).await?;

        // 2) Cover id per bucket: latest media in the bucket (preferring images for video buckets is overkill).
        let mut cov_b = sqlx::QueryBuilder::<sqlx::Sqlite>::new(
            "WITH ranked AS (SELECT id, strftime(",
        );
        cov_b.push_bind(fmt);
        cov_b.push(
            ", COALESCE(capture_date, created_at)) AS bucket, \
             ROW_NUMBER() OVER (PARTITION BY strftime(",
        );
        cov_b.push_bind(fmt);
        cov_b.push(
            ", COALESCE(capture_date, created_at)) \
             ORDER BY COALESCE(capture_date, created_at) DESC, id DESC) AS rn \
             FROM media WHERE user_id = ",
        );
        cov_b.push_bind(user_id);
        cov_b.push(" AND deleted_at IS NULL");
        if let Some(ft) = file_type {
            cov_b.push(" AND file_type = ");
            cov_b.push_bind(ft);
        }
        cov_b.push(") SELECT bucket, id FROM ranked WHERE rn = 1");

        let covers: Vec<(String, String)> = cov_b.build_query_as().fetch_all(&self.pool).await?;
        let cover_map: std::collections::HashMap<String, String> = covers.into_iter().collect();

        Ok(aggs
            .into_iter()
            .map(|a| MediaBucket {
                cover_id: cover_map.get(&a.bucket).cloned(),
                bucket: a.bucket,
                count: a.count,
                earliest: a.earliest,
                latest: a.latest,
            })
            .collect())
    }

    async fn soft_delete_many(&self, user_id: &str, ids: &[String]) -> AppResult<u64> {
        if ids.is_empty() {
            return Ok(0);
        }
        let mut b = sqlx::QueryBuilder::<sqlx::Sqlite>::new(
            "UPDATE media SET deleted_at = CURRENT_TIMESTAMP WHERE deleted_at IS NULL AND user_id = ",
        );
        b.push_bind(user_id);
        b.push(" AND id IN (");
        let mut sep = b.separated(", ");
        for id in ids {
            sep.push_bind(id);
        }
        sep.push_unseparated(")");
        let res = b.build().execute(&self.pool).await?;
        Ok(res.rows_affected())
    }

    async fn restore_many(&self, user_id: &str, ids: &[String]) -> AppResult<u64> {
        if ids.is_empty() {
            return Ok(0);
        }
        let mut b = sqlx::QueryBuilder::<sqlx::Sqlite>::new(
            "UPDATE media SET deleted_at = NULL WHERE deleted_at IS NOT NULL AND user_id = ",
        );
        b.push_bind(user_id);
        b.push(" AND id IN (");
        let mut sep = b.separated(", ");
        for id in ids {
            sep.push_bind(id);
        }
        sep.push_unseparated(")");
        let res = b.build().execute(&self.pool).await?;
        Ok(res.rows_affected())
    }

    async fn list_purgeable(&self, threshold: DateTime<Utc>) -> AppResult<Vec<Media>> {
        Ok(sqlx::query_as::<_, Media>(
            "SELECT * FROM media WHERE deleted_at IS NOT NULL AND deleted_at <= ?",
        )
        .bind(threshold)
        .fetch_all(&self.pool)
        .await?)
    }

    async fn hard_delete(&self, id: &str) -> AppResult<()> {
        sqlx::query("DELETE FROM media WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    async fn empty_trash(&self, user_id: &str) -> AppResult<Vec<Media>> {
        let rows = sqlx::query_as::<_, Media>(
            "SELECT * FROM media WHERE user_id = ? AND deleted_at IS NOT NULL",
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await?;
        sqlx::query("DELETE FROM media WHERE user_id = ? AND deleted_at IS NOT NULL")
            .bind(user_id)
            .execute(&self.pool)
            .await?;
        Ok(rows)
    }

    async fn create_upload(&self, new: NewUpload<'_>) -> AppResult<UploadRecord> {
        sqlx::query("INSERT INTO uploads (id, user_id, declared_hash, declared_size, mime_type, filename, temp_path) VALUES (?, ?, ?, ?, ?, ?, ?)")
            .bind(new.id)
            .bind(new.user_id)
            .bind(new.declared_hash)
            .bind(new.declared_size)
            .bind(new.mime_type)
            .bind(new.filename)
            .bind(new.temp_path)
            .execute(&self.pool)
            .await?;
        let u = sqlx::query_as::<_, UploadRecord>("SELECT * FROM uploads WHERE id = ?")
            .bind(new.id)
            .fetch_one(&self.pool)
            .await?;
        Ok(u)
    }

    async fn find_upload(&self, id: &str) -> AppResult<Option<UploadRecord>> {
        Ok(
            sqlx::query_as::<_, UploadRecord>("SELECT * FROM uploads WHERE id = ?")
                .bind(id)
                .fetch_optional(&self.pool)
                .await?,
        )
    }

    async fn touch_upload(&self, id: &str, received_bytes: i64) -> AppResult<()> {
        sqlx::query("UPDATE uploads SET received_bytes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
            .bind(received_bytes)
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    async fn set_upload_status(&self, id: &str, status: &str) -> AppResult<()> {
        sqlx::query("UPDATE uploads SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
            .bind(status)
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}
