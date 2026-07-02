CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id),
  vault_path    TEXT NOT NULL,
  title         TEXT NOT NULL,
  content_hash  TEXT NOT NULL,
  substantive   BOOLEAN NOT NULL DEFAULT TRUE,
  summary       TEXT,
  tags          TEXT[] NOT NULL DEFAULT '{}',
  embedding     VECTOR(768),
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ,
  UNIQUE (user_id, vault_path)
);

CREATE TABLE themes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  label           TEXT NOT NULL,
  centroid        VECTOR(768),
  membership_hash TEXT,
  last_visited_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE note_themes (
  note_id  UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  theme_id UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  weight   REAL NOT NULL DEFAULT 1.0,
  PRIMARY KEY (note_id, theme_id)
);

CREATE TABLE wikilinks (
  src_note_id  UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  dst_note_id  UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  PRIMARY KEY (src_note_id, dst_note_id)
);

CREATE TABLE issues (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id),
  issue_no     INT,
  issue_date   DATE NOT NULL,
  theme_id     UUID REFERENCES themes(id),
  theme_label  TEXT,
  reading_min  INT NOT NULL,
  word_target  INT NOT NULL,
  content      JSONB NOT NULL,          -- the IssueContent the reader renders
  payload      JSONB,                   -- exact writer input (confabulation audit)
  model        TEXT,
  status       TEXT NOT NULL DEFAULT 'generated',
  synced_at    TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE issue_notes (
  issue_id    UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  note_id     UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  role        TEXT NOT NULL,           -- anchor|fresh|connection|wildcard|forgotten
  theme_angle TEXT,
  PRIMARY KEY (issue_id, note_id, role)
);

CREATE TABLE settings (
  user_id         UUID PRIMARY KEY REFERENCES users(id),
  vault_path      TEXT,                          -- ADDED: chosen notes folder
  excluded_paths  TEXT[] NOT NULL DEFAULT '{}',  -- ADDED: settings screen "excluded paths"
  profile_text    TEXT,                          -- user.md
  cadence         TEXT NOT NULL DEFAULT 'daily', -- daily|few_days|weekly|biweekly
  delivery_time   TIME NOT NULL DEFAULT '07:00',
  reading_min     INT NOT NULL DEFAULT 5,
  notes_per_issue INT NOT NULL DEFAULT 3,
  provider        TEXT NOT NULL DEFAULT 'openrouter',  -- openrouter|ollama|custom
  ollama_endpoint TEXT NOT NULL DEFAULT 'http://localhost:11434',  -- ADDED
  embed_model     TEXT,
  summary_model   TEXT,
  writer_model    TEXT
);

CREATE TABLE jobs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT NOT NULL,                    -- ingest|cluster|generate
  payload     JSONB NOT NULL DEFAULT '{}',
  status      TEXT NOT NULL DEFAULT 'queued',   -- queued|running|done|failed
  attempts    INT NOT NULL DEFAULT 0,
  run_after   TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notes_embedding  ON notes USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_notes_tags       ON notes USING gin (tags);
CREATE INDEX idx_issues_date      ON issues (user_id, issue_date DESC);
CREATE INDEX idx_issue_notes_note ON issue_notes (note_id);
CREATE INDEX idx_jobs_claim       ON jobs (status, run_after);
