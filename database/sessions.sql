-- Run once on existing databases before deploying to Vercel.
CREATE TABLE IF NOT EXISTS bookngo_sessions (
 id CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 data MEDIUMBLOB NOT NULL,
 expires_at BIGINT UNSIGNED NOT NULL,
 KEY session_expiry (expires_at)
) ENGINE=InnoDB;
