use axum::body::Body;
use axum::extract::{Path, Query, State};
use axum::http::{header, HeaderMap, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::Json;
use base64::Engine;
use chrono::{DateTime, NaiveDate, TimeZone, Utc};
use futures::StreamExt;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use tokio::fs::OpenOptions;
use tokio::io::AsyncWriteExt;
use uuid::Uuid;

use crate::auth::AuthUser;
use crate::domain::media::{Media, MediaBucket};
use crate::error::{AppError, AppResult};
use crate::repositories::media::{BucketGranularity, NewMedia, TrashFilter};
use crate::state::AppState;
use crate::upload::storage;
use crate::workers::Job;

const TUS_VERSION: &str = "1.0.0";
const MAX_UPLOAD_BYTES: i64 = 50 * 1024 * 1024 * 1024;

#[derive(Debug, Deserialize)]
pub struct VerifyBody {
    pub hash: String,
}

#[derive(Debug, Serialize)]
pub struct VerifyResponse {
    pub exists: bool,
    pub media: Option<Media>,
}

pub async fn verify(
    State(state): State<AppState>,
    user: AuthUser,
    Json(body): Json<VerifyBody>,
) -> AppResult<Json<VerifyResponse>> {
    let outcome = state
        .media_service
        .verify(&user.user_id, &body.hash.to_lowercase())
        .await?;
    Ok(Json(VerifyResponse { exists: outcome.exists, media: outcome.media }))
}

#[derive(Debug, Deserialize)]
pub struct VerifyBatchBody {
    pub hashes: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct VerifyBatchItem {
    pub hash: String,
    pub exists: bool,
    pub media_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct VerifyBatchResponse {
    pub results: Vec<VerifyBatchItem>,
}

pub async fn verify_batch(
    State(state): State<AppState>,
    user: AuthUser,
    Json(body): Json<VerifyBatchBody>,
) -> AppResult<Json<VerifyBatchResponse>> {
    if body.hashes.is_empty() {
        return Ok(Json(VerifyBatchResponse { results: vec![] }));
    }
    if body.hashes.len() > 500 {
        return Err(AppError::BadRequest("max 500 hashes per batch".into()));
    }
    let found = state
        .media_service
        .verify_batch(&user.user_id, &body.hashes)
        .await?;
    let results = body
        .hashes
        .into_iter()
        .map(|h| {
            let lc = h.to_lowercase();
            let media_id = found.get(&lc).cloned();
            VerifyBatchItem {
                exists: media_id.is_some(),
                media_id,
                hash: h,
            }
        })
        .collect();
    Ok(Json(VerifyBatchResponse { results }))
}

pub async fn options_upload() -> Response {
    let mut headers = HeaderMap::new();
    headers.insert("Tus-Resumable", HeaderValue::from_static(TUS_VERSION));
    headers.insert("Tus-Version", HeaderValue::from_static(TUS_VERSION));
    headers.insert("Tus-Extension", HeaderValue::from_static("creation"));
    headers.insert("Tus-Max-Size", HeaderValue::from(MAX_UPLOAD_BYTES));
    (StatusCode::NO_CONTENT, headers).into_response()
}

fn parse_upload_metadata(s: &str) -> HashMap<String, String> {
    let engine = base64::engine::general_purpose::STANDARD;
    let mut map = HashMap::new();
    for entry in s.split(',') {
        let trimmed = entry.trim();
        if trimmed.is_empty() {
            continue;
        }
        let parts: Vec<&str> = trimmed.splitn(2, ' ').collect();
        if parts.len() != 2 {
            continue;
        }
        if let Ok(bytes) = engine.decode(parts[1].trim()) {
            if let Ok(value) = String::from_utf8(bytes) {
                map.insert(parts[0].trim().to_string(), value);
            }
        }
    }
    map
}

fn require_tus_version(headers: &HeaderMap) -> AppResult<()> {
    let v = headers
        .get("Tus-Resumable")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    if v != TUS_VERSION {
        return Err(AppError::BadRequest(
            "Tus-Resumable: 1.0.0 header required".into(),
        ));
    }
    Ok(())
}

pub async fn initiate(
    State(state): State<AppState>,
    user: AuthUser,
    headers: HeaderMap,
) -> AppResult<Response> {
    require_tus_version(&headers)?;

    let upload_length: i64 = headers
        .get("Upload-Length")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.parse().ok())
        .ok_or_else(|| AppError::BadRequest("Upload-Length header required".into()))?;

    let metadata_str = headers
        .get("Upload-Metadata")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    let metadata = parse_upload_metadata(metadata_str);

    let hash = metadata
        .get("hash")
        .ok_or_else(|| AppError::BadRequest("Upload-Metadata 'hash' required".into()))?
        .to_lowercase();
    let filename = metadata
        .get("filename")
        .or_else(|| metadata.get("name"))
        .cloned()
        .unwrap_or_else(|| "unnamed".to_string());
    let mime = metadata
        .get("filetype")
        .or_else(|| metadata.get("type"))
        .cloned()
        .unwrap_or_default();

    let outcome = state
        .media_service
        .initiate_upload(&user.user_id, &hash, upload_length, &mime, &filename)
        .await?;

    let mut response_headers = HeaderMap::new();
    response_headers.insert("Tus-Resumable", HeaderValue::from_static(TUS_VERSION));
    response_headers.insert(
        "Location",
        HeaderValue::from_str(&format!("/api/media/uploads/{}", outcome.upload.id))
            .map_err(|e| AppError::Other(anyhow::anyhow!("location header: {e}")))?,
    );
    response_headers.insert("Upload-Offset", HeaderValue::from(0i64));
    response_headers.insert("Upload-Length", HeaderValue::from(upload_length));

    Ok((StatusCode::CREATED, response_headers).into_response())
}

pub async fn head_upload(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> AppResult<Response> {
    let upload = state
        .media_service
        .repo()
        .find_upload(&id)
        .await?
        .ok_or(AppError::NotFound)?;
    if upload.user_id != user.user_id {
        return Err(AppError::Forbidden);
    }
    let mut headers = HeaderMap::new();
    headers.insert("Tus-Resumable", HeaderValue::from_static(TUS_VERSION));
    headers.insert("Upload-Offset", HeaderValue::from(upload.received_bytes));
    headers.insert("Upload-Length", HeaderValue::from(upload.declared_size));
    headers.insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
    Ok((StatusCode::OK, headers).into_response())
}

pub async fn patch_upload(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
    headers: HeaderMap,
    body: Body,
) -> AppResult<Response> {
    require_tus_version(&headers)?;

    let upload = state
        .media_service
        .repo()
        .find_upload(&id)
        .await?
        .ok_or(AppError::NotFound)?;
    if upload.user_id != user.user_id {
        return Err(AppError::Forbidden);
    }
    if upload.status != "pending" {
        return Err(AppError::Conflict("upload not pending".into()));
    }

    let declared_offset: i64 = headers
        .get("Upload-Offset")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.parse().ok())
        .ok_or_else(|| AppError::BadRequest("missing Upload-Offset header".into()))?;

    if declared_offset != upload.received_bytes {
        return Err(AppError::Conflict(format!(
            "offset mismatch: expected {}, got {}",
            upload.received_bytes, declared_offset
        )));
    }

    let temp_path = PathBuf::from(&upload.temp_path);
    let mut file = OpenOptions::new().append(true).open(&temp_path).await?;

    let mut stream = body.into_data_stream();
    let mut written: i64 = 0;
    let remaining = upload.declared_size - upload.received_bytes;

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| AppError::BadRequest(format!("body error: {e}")))?;
        let chunk_len = chunk.len() as i64;
        if written + chunk_len > remaining {
            return Err(AppError::BadRequest("payload exceeds declared length".into()));
        }
        file.write_all(&chunk).await?;
        written += chunk_len;
    }
    file.flush().await?;

    let new_offset = upload.received_bytes + written;
    state.media_service.repo().touch_upload(&id, new_offset).await?;

    let mut response_headers = HeaderMap::new();
    response_headers.insert("Tus-Resumable", HeaderValue::from_static(TUS_VERSION));
    response_headers.insert("Upload-Offset", HeaderValue::from(new_offset));

    if new_offset == upload.declared_size {
        let media = finalize(&state, &upload.user_id, &id).await?;
        if let Ok(v) = HeaderValue::from_str(&media.id) {
            response_headers.insert("Upload-Media-Id", v);
        }
        if let Ok(v) = HeaderValue::from_str(&format!("/api/media/{}", media.id)) {
            response_headers.insert("Location", v);
        }
    }

    Ok((StatusCode::NO_CONTENT, response_headers).into_response())
}

async fn finalize(state: &AppState, user_id: &str, upload_id: &str) -> AppResult<Media> {
    let upload = state
        .media_service
        .repo()
        .find_upload(upload_id)
        .await?
        .ok_or(AppError::NotFound)?;
    let temp_path = PathBuf::from(&upload.temp_path);

    let actual_hash = storage::sha256_file(&temp_path).await?;
    if actual_hash != upload.declared_hash {
        state
            .media_service
            .repo()
            .set_upload_status(upload_id, "aborted")
            .await?;
        tokio::fs::remove_file(&temp_path).await.ok();
        return Err(AppError::BadRequest(format!(
            "hash mismatch: declared {}, actual {}",
            upload.declared_hash, actual_hash
        )));
    }

    let media_id = Uuid::new_v4().to_string();
    let originals_dir = state.media_service.user_originals_dir(user_id);
    tokio::fs::create_dir_all(&originals_dir).await?;
    let extension = guess_extension(&upload.mime_type, &upload.filename);
    let original_path = originals_dir.join(format!("{media_id}.{extension}"));
    tokio::fs::rename(&temp_path, &original_path).await?;

    let file_type = classify_mime(&upload.mime_type);
    let media = state
        .media_service
        .repo()
        .create_media(NewMedia {
            id: &media_id,
            user_id,
            file_hash: &actual_hash,
            original_path: &original_path.to_string_lossy(),
            file_type,
            mime_type: &upload.mime_type,
            size_bytes: upload.declared_size,
        })
        .await?;

    state
        .media_service
        .repo()
        .set_upload_status(upload_id, "finalized")
        .await?;

    let _ = state
        .media_service
        .jobs()
        .send(Job::Process {
            media_id: media.id.clone(),
            user_id: user_id.to_string(),
            original_path: original_path.clone(),
            mime_type: upload.mime_type.clone(),
        })
        .await;

    Ok(media)
}

fn classify_mime(mime: &str) -> &'static str {
    if mime.starts_with("video/") {
        "video"
    } else {
        "image"
    }
}

fn guess_extension(mime: &str, filename: &str) -> String {
    if let Some(idx) = filename.rfind('.') {
        let ext: String = filename[idx + 1..]
            .chars()
            .filter(|c| c.is_ascii_alphanumeric())
            .take(8)
            .collect();
        if !ext.is_empty() {
            return ext.to_lowercase();
        }
    }
    match mime {
        "image/jpeg" => "jpg".into(),
        "image/png" => "png".into(),
        "image/webp" => "webp".into(),
        "image/heic" => "heic".into(),
        "image/heif" => "heif".into(),
        "video/mp4" => "mp4".into(),
        "video/quicktime" => "mov".into(),
        _ => "bin".into(),
    }
}

#[derive(Debug, Deserialize)]
pub struct ListQuery {
    pub before: Option<DateTime<Utc>>,
    pub before_id: Option<String>,
    pub after: Option<DateTime<Utc>>,
    pub after_id: Option<String>,
    pub limit: Option<i64>,

    #[serde(rename = "type")]
    pub file_type: Option<String>,

    pub sort: Option<String>,

    pub from: Option<DateTime<Utc>>,
    pub to: Option<DateTime<Utc>>,

    pub year: Option<i32>,
    pub month: Option<u32>,

    #[serde(default)]
    pub trashed: bool,
}

#[derive(Debug, Serialize)]
pub struct CursorOut {
    pub date: DateTime<Utc>,
    pub id: String,
}

#[derive(Debug, Serialize)]
pub struct ListResponse {
    pub items: Vec<Media>,
    pub next_cursor: Option<CursorOut>,
}

pub async fn list(
    State(state): State<AppState>,
    user: AuthUser,
    Query(q): Query<ListQuery>,
) -> AppResult<Json<ListResponse>> {
    let limit = q.limit.unwrap_or(50).clamp(1, 200);

    let sort_asc = matches!(q.sort.as_deref(), Some("asc"));
    let cursor: Option<(DateTime<Utc>, String)> = if sort_asc {
        match (q.after, q.after_id) {
            (Some(d), Some(id)) => Some((d, id)),
            (Some(d), None) => Some((d, String::new())),
            _ => None,
        }
    } else {
        match (q.before, q.before_id) {
            (Some(d), Some(id)) => Some((d, id)),
            // Backwards-compatible: id ausente equivale a "uuid máximo" para descendente.
            (Some(d), None) => Some((d, "\u{10FFFF}".to_string())),
            _ => None,
        }
    };

    let file_type = match q.file_type.as_deref() {
        None | Some("") | Some("all") => None,
        Some("photo") | Some("image") => Some("image"),
        Some("video") => Some("video"),
        Some(other) => return Err(AppError::BadRequest(format!("invalid type: {other}"))),
    };

    let (range_from, range_to) = derive_range(q.year, q.month, q.from, q.to)?;

    let trash = if q.trashed { TrashFilter::TrashedOnly } else { TrashFilter::Active };

    let items = state
        .media_service
        .repo()
        .list_by_user_filtered(
            &user.user_id,
            cursor,
            limit,
            sort_asc,
            file_type,
            range_from,
            range_to,
            trash,
        )
        .await?;

    let next_cursor = if (items.len() as i64) == limit {
        items.last().map(|m| CursorOut {
            date: m.capture_date.unwrap_or(m.created_at),
            id: m.id.clone(),
        })
    } else {
        None
    };

    Ok(Json(ListResponse { items, next_cursor }))
}

fn derive_range(
    year: Option<i32>,
    month: Option<u32>,
    from: Option<DateTime<Utc>>,
    to: Option<DateTime<Utc>>,
) -> AppResult<(Option<DateTime<Utc>>, Option<DateTime<Utc>>)> {
    if year.is_none() && month.is_none() {
        return Ok((from, to));
    }

    let y = year.ok_or_else(|| AppError::BadRequest("year is required when month is set".into()))?;
    if !(1970..=2200).contains(&y) {
        return Err(AppError::BadRequest("invalid year".into()));
    }

    let (start_date, end_date) = if let Some(m) = month {
        if !(1..=12).contains(&m) {
            return Err(AppError::BadRequest("invalid month".into()));
        }
        let start = NaiveDate::from_ymd_opt(y, m, 1)
            .ok_or_else(|| AppError::BadRequest("invalid year/month".into()))?;
        let (ny, nm) = if m == 12 { (y + 1, 1) } else { (y, m + 1) };
        let end = NaiveDate::from_ymd_opt(ny, nm, 1)
            .ok_or_else(|| AppError::BadRequest("invalid year/month".into()))?;
        (start, end)
    } else {
        let start = NaiveDate::from_ymd_opt(y, 1, 1)
            .ok_or_else(|| AppError::BadRequest("invalid year".into()))?;
        let end = NaiveDate::from_ymd_opt(y + 1, 1, 1)
            .ok_or_else(|| AppError::BadRequest("invalid year".into()))?;
        (start, end)
    };

    let range_from = Some(Utc.from_utc_datetime(&start_date.and_hms_opt(0, 0, 0).unwrap()));
    let end_dt = Utc.from_utc_datetime(&end_date.and_hms_opt(0, 0, 0).unwrap());
    let range_to = Some(end_dt - chrono::Duration::nanoseconds(1));

    let merged_from = match (from, range_from) {
        (Some(a), Some(b)) => Some(std::cmp::max(a, b)),
        (Some(a), None) => Some(a),
        (None, Some(b)) => Some(b),
        (None, None) => None,
    };
    let merged_to = match (to, range_to) {
        (Some(a), Some(b)) => Some(std::cmp::min(a, b)),
        (Some(a), None) => Some(a),
        (None, Some(b)) => Some(b),
        (None, None) => None,
    };

    Ok((merged_from, merged_to))
}

#[derive(Debug, Deserialize)]
pub struct BucketsQuery {
    pub granularity: Option<String>,
    #[serde(rename = "type")]
    pub file_type: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct BucketsResponse {
    pub granularity: String,
    pub buckets: Vec<MediaBucket>,
}

pub async fn buckets(
    State(state): State<AppState>,
    user: AuthUser,
    Query(q): Query<BucketsQuery>,
) -> AppResult<Json<BucketsResponse>> {
    let granularity = match q.granularity.as_deref().unwrap_or("month") {
        "year" => BucketGranularity::Year,
        "month" => BucketGranularity::Month,
        other => return Err(AppError::BadRequest(format!("invalid granularity: {other}"))),
    };
    let file_type = match q.file_type.as_deref() {
        None | Some("") | Some("all") => None,
        Some("photo") | Some("image") => Some("image"),
        Some("video") => Some("video"),
        Some(other) => return Err(AppError::BadRequest(format!("invalid type: {other}"))),
    };

    let buckets = state
        .media_service
        .buckets(&user.user_id, granularity, file_type)
        .await?;

    let label = match granularity {
        BucketGranularity::Year => "year",
        BucketGranularity::Month => "month",
    };

    Ok(Json(BucketsResponse { granularity: label.into(), buckets }))
}

#[derive(Debug, Deserialize)]
pub struct DeleteBatchBody {
    pub ids: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct DeleteBatchResponse {
    pub deleted: u64,
    pub requested: u64,
}

pub async fn delete_one(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> AppResult<Json<DeleteBatchResponse>> {
    let outcome = state
        .media_service
        .soft_delete(&user.user_id, &[id])
        .await?;
    if outcome.deleted == 0 {
        return Err(AppError::NotFound);
    }
    Ok(Json(DeleteBatchResponse { deleted: outcome.deleted, requested: outcome.requested }))
}

pub async fn delete_batch(
    State(state): State<AppState>,
    user: AuthUser,
    Json(body): Json<DeleteBatchBody>,
) -> AppResult<Json<DeleteBatchResponse>> {
    let outcome = state
        .media_service
        .soft_delete(&user.user_id, &body.ids)
        .await?;
    Ok(Json(DeleteBatchResponse { deleted: outcome.deleted, requested: outcome.requested }))
}

pub async fn restore_one(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> AppResult<Json<DeleteBatchResponse>> {
    let outcome = state
        .media_service
        .restore(&user.user_id, &[id])
        .await?;
    if outcome.deleted == 0 {
        return Err(AppError::NotFound);
    }
    Ok(Json(DeleteBatchResponse { deleted: outcome.deleted, requested: outcome.requested }))
}

pub async fn restore_batch(
    State(state): State<AppState>,
    user: AuthUser,
    Json(body): Json<DeleteBatchBody>,
) -> AppResult<Json<DeleteBatchResponse>> {
    let outcome = state
        .media_service
        .restore(&user.user_id, &body.ids)
        .await?;
    Ok(Json(DeleteBatchResponse { deleted: outcome.deleted, requested: outcome.requested }))
}

#[derive(Debug, Serialize)]
pub struct EmptyTrashResponse {
    pub purged: u64,
}

pub async fn empty_trash(
    State(state): State<AppState>,
    user: AuthUser,
) -> AppResult<Json<EmptyTrashResponse>> {
    let purged = state.media_service.empty_trash(&user.user_id).await?;
    Ok(Json(EmptyTrashResponse { purged }))
}

pub async fn detail(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> AppResult<Json<Media>> {
    let m = state
        .media_service
        .repo()
        .find_by_id(&id)
        .await?
        .ok_or(AppError::NotFound)?;
    if m.user_id != user.user_id {
        return Err(AppError::Forbidden);
    }
    Ok(Json(m))
}

pub async fn file(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> AppResult<Response> {
    let m = state
        .media_service
        .repo()
        .find_by_id(&id)
        .await?
        .ok_or(AppError::NotFound)?;
    if m.user_id != user.user_id {
        return Err(AppError::Forbidden);
    }
    storage::stream_file(&PathBuf::from(&m.original_path), &m.mime_type).await
}

pub async fn thumbnail(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> AppResult<Response> {
    let m = state
        .media_service
        .repo()
        .find_by_id(&id)
        .await?
        .ok_or(AppError::NotFound)?;
    if m.user_id != user.user_id {
        return Err(AppError::Forbidden);
    }
    let path = m.thumbnail_path.ok_or(AppError::NotFound)?;
    storage::stream_file(&PathBuf::from(path), "image/webp").await
}
