CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS media (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    file_hash TEXT NOT NULL,
    original_path TEXT NOT NULL,
    thumbnail_path TEXT,
    file_type TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    capture_date DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    UNIQUE(user_id, file_hash)
);

CREATE INDEX IF NOT EXISTS idx_media_capture_date ON media(capture_date DESC);
CREATE INDEX IF NOT EXISTS idx_media_user ON media(user_id);

CREATE TABLE IF NOT EXISTS uploads (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    declared_hash TEXT NOT NULL,
    declared_size INTEGER NOT NULL,
    received_bytes INTEGER NOT NULL DEFAULT 0,
    mime_type TEXT NOT NULL,
    filename TEXT NOT NULL,
    temp_path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_uploads_user ON uploads(user_id);
