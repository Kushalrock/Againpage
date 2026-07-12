-- Periodic auto-index interval (0 = off; else clamped to >=30 min) and the
-- last full-sync report shown in Settings.
ALTER TABLE settings ADD COLUMN sync_interval_minutes INT NOT NULL DEFAULT 60;
CREATE TABLE sync_state (
  user_id        UUID PRIMARY KEY REFERENCES users(id),
  scanned        INT NOT NULL DEFAULT 0,
  synced         INT NOT NULL DEFAULT 0,
  failed         INT NOT NULL DEFAULT 0,
  last_synced_at TIMESTAMPTZ
);
