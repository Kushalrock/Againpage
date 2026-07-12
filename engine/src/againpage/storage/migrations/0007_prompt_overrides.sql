-- Voice overrides for the writer + note-expand prompts (null/empty = use the
-- built-in default voice), and a customisable note-expand word count.
ALTER TABLE settings ADD COLUMN writer_prompt      TEXT;
ALTER TABLE settings ADD COLUMN note_expand_prompt TEXT;
ALTER TABLE settings ADD COLUMN note_expand_words  INT NOT NULL DEFAULT 500;
