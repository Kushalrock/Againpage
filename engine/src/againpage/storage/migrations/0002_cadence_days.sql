-- Replace the fixed cadence enum with a free "every N days" gap.
ALTER TABLE settings ADD COLUMN cadence_days INT NOT NULL DEFAULT 1;
UPDATE settings SET cadence_days = CASE cadence
    WHEN 'few_days' THEN 3
    WHEN 'weekly'   THEN 7
    WHEN 'biweekly' THEN 14
    ELSE 1 END;
ALTER TABLE settings DROP COLUMN cadence;
