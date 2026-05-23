use std::path::{Path, PathBuf};
use std::sync::Arc;

use chrono::{DateTime, NaiveDateTime, TimeZone, Utc};
use image::ImageReader;

use crate::error::{AppError, AppResult};
use crate::repositories::media::MediaRepository;

const THUMB_MAX: u32 = 512;

pub async fn process(
    repo: &Arc<dyn MediaRepository>,
    storage_root: &Path,
    media_id: &str,
    user_id: &str,
    original_path: &Path,
    mime_type: &str,
) -> AppResult<()> {
    let capture_date = extract_capture_date(original_path).await.ok().flatten();

    let thumbnail_path = if can_thumbnail(mime_type) {
        match generate_thumbnail(storage_root, user_id, media_id, original_path).await {
            Ok(path) => Some(path.to_string_lossy().to_string()),
            Err(e) => {
                tracing::warn!(media_id, error = ?e, "thumbnail generation failed");
                None
            }
        }
    } else {
        None
    };

    repo.update_processed(media_id, thumbnail_path.as_deref(), capture_date).await?;
    Ok(())
}

fn can_thumbnail(mime: &str) -> bool {
    matches!(mime, "image/jpeg" | "image/png" | "image/webp")
}

async fn generate_thumbnail(
    storage_root: &Path,
    user_id: &str,
    media_id: &str,
    original: &Path,
) -> AppResult<PathBuf> {
    let thumb_dir = storage_root.join(user_id).join("thumbnails");
    tokio::fs::create_dir_all(&thumb_dir).await?;
    let dest = thumb_dir.join(format!("{media_id}.webp"));

    let original = original.to_path_buf();
    let dest_clone = dest.clone();
    tokio::task::spawn_blocking(move || -> anyhow::Result<()> {
        let img = ImageReader::open(&original)?.with_guessed_format()?.decode()?;
        let thumb = img.thumbnail(THUMB_MAX, THUMB_MAX);
        thumb.save_with_format(&dest_clone, image::ImageFormat::WebP)?;
        Ok(())
    })
    .await
    .map_err(|e| AppError::Other(anyhow::anyhow!("blocking join: {e}")))??;

    Ok(dest)
}

async fn extract_capture_date(path: &Path) -> AppResult<Option<DateTime<Utc>>> {
    let path = path.to_path_buf();
    let res = tokio::task::spawn_blocking(move || -> anyhow::Result<Option<DateTime<Utc>>> {
        let file = std::fs::File::open(&path)?;
        let mut bufreader = std::io::BufReader::new(file);
        let exif_reader = exif::Reader::new();
        let exif = match exif_reader.read_from_container(&mut bufreader) {
            Ok(e) => e,
            Err(_) => return Ok(None),
        };
        let field = exif
            .get_field(exif::Tag::DateTimeOriginal, exif::In::PRIMARY)
            .or_else(|| exif.get_field(exif::Tag::DateTime, exif::In::PRIMARY));
        let Some(field) = field else {
            return Ok(None);
        };
        let value = field.display_value().to_string();
        let parsed = NaiveDateTime::parse_from_str(&value, "%Y-%m-%d %H:%M:%S")
            .or_else(|_| NaiveDateTime::parse_from_str(&value, "%Y:%m:%d %H:%M:%S"))
            .ok();
        Ok(parsed.map(|n| Utc.from_utc_datetime(&n)))
    })
    .await
    .map_err(|e| AppError::Other(anyhow::anyhow!("blocking join: {e}")))?;

    Ok(res.unwrap_or(None))
}
