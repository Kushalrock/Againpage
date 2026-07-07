-- Allow multiple notes folders: vault_path (single) -> vault_paths (array).
ALTER TABLE settings ADD COLUMN vault_paths TEXT[] NOT NULL DEFAULT '{}';
UPDATE settings SET vault_paths = CASE
    WHEN vault_path IS NOT NULL AND vault_path <> '' THEN ARRAY[vault_path]
    ELSE '{}'::text[] END;
ALTER TABLE settings DROP COLUMN vault_path;
