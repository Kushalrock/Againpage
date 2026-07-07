# Contributing to Againpage

Thanks for your interest in Againpage. This document explains what the project
is, how the repository is laid out, how to get a development environment
running, and the conventions we follow. Read it once end-to-end before your
first change.

> **License note.** Againpage is **source-available** under the Functional
> Source License 1.1 (converting to Apache 2.0 on 1 January 2029 — see
> [`LICENSE`](./LICENSE)). By contributing, you agree that your contributions
> are licensed under the same terms.

---

## 1. What Againpage is

Againpage is a **local-first desktop app** that turns your personal note vault
(e.g. an Obsidian folder of Markdown files) into a periodical: it periodically
composes a "morning edition" — an original piece of writing that connects,
resurfaces, and reflects on your own notes — and presents it in a quiet reader.

Everything runs on your machine: your notes never leave it, the database is a
local Postgres, and the AI models are either a local Ollama instance or a
provider key you supply.

The pipeline, at a glance:

```
vault (.md files)
   │  scan + parse frontmatter/title
   ▼
ingest ──► summarise + embed each note ──► store in Postgres (pgvector)
   │
   ▼
cluster notes into themes (UMAP + HDBSCAN)
   │
   ▼
compose an edition (writer model) ──► reader renders it
```

---

## 2. Repository layout

This is a **pnpm workspace** (JS/TS packages) plus a **`uv`-managed Python
engine** and a **Cargo/Tauri desktop shell**.

```
againpage/
├── engine/                 # Python backend: API + worker + pipeline
│   ├── src/againpage/
│   │   ├── api/            # FastAPI app + routes + schemas
│   │   ├── worker/         # background job loop (loop.py → againpage-worker)
│   │   ├── queue/          # pg-backed job queue (FOR UPDATE SKIP LOCKED)
│   │   ├── scheduler/      # decides when the next edition is due
│   │   ├── pipeline/       # ingest, reindex, cluster, label
│   │   ├── vault/          # scan folders, parse frontmatter/titles, watch, links
│   │   ├── generation/     # prompts, writer, schema validation/repair
│   │   ├── providers/      # OpenRouter / Ollama / routing + factory
│   │   ├── storage/        # repository (raw SQL), db pool, migrate, migrations/
│   │   ├── core/           # pydantic models, scoring, pure helpers
│   │   ├── sync/           # (sync helpers)
│   │   └── config.py       # dependency-free .env loader
│   ├── migrations/ →       # SQL lives in src/againpage/storage/migrations/
│   ├── scripts/            # build_engine.sh, reset_db.py, run_goldens.py
│   ├── tests/              # pytest suite (+ conftest.py test-DB isolation)
│   └── pyproject.toml      # deps, console scripts, pytest config
│
├── reader/                 # Vite + React 19 + TS + Tailwind 4 reader UI
│   └── src/
│       ├── api/            # typed client, http, queries (TanStack Query), fixtures
│       ├── components/     # shell/, sections/, settings/, Issue, NoteDrawer, Logo
│       ├── pages/          # Reader, Archive, Settings, Onboarding
│       ├── lib/            # pure helpers (countdown, masthead, providerDefaults)
│       ├── types/          # settings, status, issue types
│       ├── theme/          # design tokens + fonts
│       └── platform/       # desktop seams (folder picker, key store, connection test)
│
├── desktop/                # Tauri v2 desktop shell (Rust)
│   └── src-tauri/          # Rust sidecar host, tauri.conf.json, icons, binaries/, resources/
│
├── infra/
│   └── docker-compose.yaml # Postgres 17 + pgvector for local dev
│
├── package.json            # workspace root scripts (db:*, dev, build:desktop, stack:*)
├── pnpm-workspace.yaml
└── LICENSE
```

### Component responsibilities

- **engine** — the brains. A FastAPI HTTP API (`againpage-api`) the reader
  talks to, and a background worker (`againpage-worker`) that runs ingest,
  embedding, clustering, and edition generation off a Postgres-backed job
  queue. Talks to Postgres via `psycopg3` + `pgvector`; talks to AI providers
  via `httpx`.
- **reader** — the UI. A single-page React app that renders editions, the
  archive, onboarding, and settings. In dev it runs standalone against the API;
  in the desktop build it's bundled as the Tauri frontend.
- **desktop** — packages the reader + engine + a bundled Postgres into one
  installable app via Tauri. Day-to-day dev does not require it.
- **infra** — the local Postgres (image `pgvector/pgvector:pg17`).

---

## 3. Prerequisites

| Tool     | Version                       | Why                                  |
| -------- | ----------------------------- | ------------------------------------ |
| Node.js  | `v24.x` (see `.nvmrc`)        | reader / workspace tooling           |
| pnpm     | `10.30.3` (`packageManager`)  | workspace package manager            |
| `uv`     | latest                        | Python venv + dependency manager     |
| Python   | `>=3.14` (`engine/pyproject`) | the engine                           |
| Docker   | any recent                    | local Postgres + pgvector            |
| Rust     | stable (desktop only)         | Tauri build; not needed for web dev  |

Install with your platform's package manager (`brew install pnpm uv`, etc.).
Enable pnpm via `corepack enable` if you don't have it.

---

## 4. First-time setup

```bash
# 1. JS deps (workspace-wide)
pnpm install

# 2. Python deps (creates engine/.venv)
cd engine && uv sync && cd ..

# 3. Start Postgres (pgvector) in Docker
pnpm db:up
```

Schema migrations are applied **automatically** when the API or worker boots
(`migrate.apply(pool)` runs `storage/migrations/*.sql` in order) — there is no
separate migrate command.

---

## 5. Running in development

You need three things up: **Postgres**, the **API**, the **worker**, and the
**reader** (or the desktop shell, which wraps the reader).

**Web dev (fastest loop — recommended):** three terminals.

```bash
# terminal 1 — API (http://127.0.0.1:8000)
cd engine && uv run againpage-api

# terminal 2 — worker (ingest / embed / cluster / compose)
cd engine && uv run againpage-worker

# terminal 3 — reader (http://localhost:5173)
pnpm --filter reader dev
```

The reader talks to `http://localhost:8000` unless `globalThis.__AGAINPAGE_API__`
is set. Open the reader, complete onboarding (pick a notes folder, choose a
provider, paste a key), then trigger a re-index from **Settings → Advanced**.

**Provider keys & Ollama URL** are entered through the UI (Settings → AI
source) and stored write-only in the DB — you do not need to edit code or
`.env` each time. For a headless engine you can alternatively export them; the
`config.py` loader reads `.env` from cwd / engine / repo root without
overriding real environment variables.

**Desktop dev (Tauri shell):**

```bash
pnpm dev          # = pnpm db:up && tauri dev (runs the reader inside the shell)
```

### Handy root scripts

| Command             | What it does                                              |
| ------------------- | --------------------------------------------------------- |
| `pnpm db:up`        | start Postgres (pgvector) via `infra/docker-compose.yaml` |
| `pnpm db:down`      | stop it                                                    |
| `pnpm db:reset`     | **drop the schema and re-migrate** (wipes local data)     |
| `pnpm dev`          | db up + Tauri desktop dev                                 |
| `pnpm build:desktop`| `tauri build` — packages the app (needs engine sidecars + bundled Postgres) |
| `pnpm stack:*`      | full docker-compose stack up/down/logs                    |

---

## 6. Testing

We practice **TDD**: write a failing test, make it pass, refactor. Every change
should keep both suites green.

**Engine (pytest):**

```bash
cd engine
uv run pytest -q                       # full suite
uv run pytest tests/storage -q         # a subset
```

Engine tests hit a **real Postgres**, isolated to a separate `againpage_test`
database by the autouse fixture in `engine/tests/conftest.py` — they never
touch your dev data. Make sure `pnpm db:up` is running.

**Reader (Vitest + React Testing Library):**

```bash
pnpm --filter reader test              # run once
pnpm --filter reader test:watch        # watch mode
pnpm --filter reader lint              # eslint
pnpm --filter reader build             # tsc typecheck + vite build
```

Before opening a PR, run all of: engine `pytest`, reader `test`, `lint`, and
`build`.

---

## 7. Conventions

- **Match the surrounding code.** Follow the naming, comment density, and idiom
  already present in the file you're editing. The codebase favors small, focused
  files with one clear responsibility.
- **TDD.** New behavior comes with tests. Reader components get RTL tests; engine
  logic gets pytest tests. Bug fixes start with a failing test that reproduces
  the bug.
- **Database access** goes through `storage/repository.py` (raw parameterized
  SQL — no ORM). Schema changes are new numbered files in
  `storage/migrations/` (e.g. `0005_*.sql`); they apply on boot, so keep them
  idempotent-friendly and forward-only.
- **Vectors / pgvector.** Embedding dimension is auto-detected and the column /
  HNSW index are (re)built to match; note the 2000-dim `vector` HNSW cap
  (halfvec is used above that). See `repository.py`.
- **Providers.** All model I/O goes through the `providers/` seam
  (`Provider` base + OpenRouter / Ollama / routing). Add new capabilities as
  methods on the base class so every provider implements them.
- **Cooperative cancellation.** Long jobs (reindex, generate) accept a
  `cancelled` callback and compute-then-swap so a mid-run cancel discards the
  in-progress work and leaves the previous state intact.
- **Commits.** Use clear, conventional-style messages
  (`fix(engine): …`, `feat(reader): …`, `docs: …`). Keep each commit a
  coherent, testable unit.

---

## 8. Submitting a change

1. Branch off `main` (do not commit directly to `main`/`master`).
2. Make the change with tests; keep commits focused.
3. Run the full gate: engine `pytest`, reader `test` + `lint` + `build`.
4. Open a PR describing **what** changed and **why**, and how you verified it.
5. Note any migration, config, or provider-behavior change explicitly in the PR.

---

## 9. Where to look first

- **API surface / routes:** `engine/src/againpage/api/routes.py`
- **Job worker:** `engine/src/againpage/worker/loop.py`
- **Data access:** `engine/src/againpage/storage/repository.py`
- **Edition generation:** `engine/src/againpage/generation/`
- **Reader entry:** `reader/src/pages/Reader.tsx` and `reader/src/api/`
- **Desktop shell / packaging:** `desktop/src-tauri/` (`tauri.conf.json`)

Questions or unsure where something belongs? Open a draft PR or an issue and
ask — a short conversation up front beats a large redirect later.
