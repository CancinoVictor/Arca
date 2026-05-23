use axum::body::Body;
use axum::http::{header, HeaderValue, StatusCode};
use axum::response::Response;
use sha2::{Digest, Sha256};
use std::path::Path;
use tokio::io::AsyncReadExt;
use tokio_util::io::ReaderStream;

use crate::error::{AppError, AppResult};

pub async fn sha256_file(path: &Path) -> AppResult<String> {
    let mut file = tokio::fs::File::open(path).await?;
    let mut hasher = Sha256::new();
    let mut buf = vec![0u8; 64 * 1024];
    loop {
        let n = file.read(&mut buf).await?;
        if n == 0 {
            break;
        }
        hasher.update(&buf[..n]);
    }
    Ok(hex::encode(hasher.finalize()))
}

pub async fn stream_file(path: &Path, mime: &str) -> AppResult<Response> {
    let file = tokio::fs::File::open(path).await.map_err(|_| AppError::NotFound)?;
    let metadata = file.metadata().await?;
    let stream = ReaderStream::with_capacity(file, 64 * 1024);
    let body = Body::from_stream(stream);
    let content_type = HeaderValue::from_str(mime)
        .unwrap_or(HeaderValue::from_static("application/octet-stream"));
    let response = Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, content_type)
        .header(header::CONTENT_LENGTH, metadata.len())
        .header(header::CACHE_CONTROL, HeaderValue::from_static("private, max-age=3600"))
        .body(body)
        .map_err(|e| AppError::Other(anyhow::anyhow!("response build: {e}")))?;
    Ok(response)
}
