use std::sync::Arc;
use std::time::Duration;

use chrono::Utc;

use crate::services::media::MediaService;

const RETENTION_DAYS: i64 = 30;
const SWEEP_EVERY: Duration = Duration::from_secs(60 * 60);

/// Spawns a background task that hard-deletes media that has lived in the trash
/// for longer than [`RETENTION_DAYS`], removing the underlying files from disk.
pub fn spawn(service: Arc<MediaService>) {
    tokio::spawn(async move {
        // Pequeño retraso para no competir con el arranque.
        tokio::time::sleep(Duration::from_secs(30)).await;
        loop {
            let threshold = Utc::now() - chrono::Duration::days(RETENTION_DAYS);
            match service.purge_expired(threshold).await {
                Ok(0) => {}
                Ok(n) => tracing::info!(count = n, "purged expired trash"),
                Err(e) => tracing::warn!(error = ?e, "trash purge failed"),
            }
            tokio::time::sleep(SWEEP_EVERY).await;
        }
    });
}
