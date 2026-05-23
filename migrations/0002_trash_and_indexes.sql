ALTER TABLE media ADD COLUMN deleted_at DATETIME;

CREATE INDEX IF NOT EXISTS idx_media_user_active
    ON media(user_id, COALESCE(capture_date, created_at) DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_media_user_trash
    ON media(user_id, deleted_at)
    WHERE deleted_at IS NOT NULL;
