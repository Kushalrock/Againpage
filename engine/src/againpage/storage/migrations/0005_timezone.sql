-- The scheduler compares the delivery time against the user's local wall clock
-- and measures the cadence gap in local days. Store the user's IANA timezone
-- so a server running in UTC (e.g. a Docker container) still fires editions at
-- the user's local delivery time. Existing rows keep UTC (the prior behaviour).
ALTER TABLE settings ADD COLUMN timezone TEXT NOT NULL DEFAULT 'UTC';
