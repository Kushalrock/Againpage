# againpage engine

FastAPI + worker engine for AgainPage: ingests a markdown vault, embeds and
clusters note summaries into themes, and composes daily editions.

## Run (dev)

Requires a Postgres 17 + pgvector instance (see repo-root `pnpm db:up`).

```bash
uv sync
uv run againpage-api      # HTTP API on http://127.0.0.1:8000 (migrates + seeds on boot)
uv run againpage-worker   # job worker: ingest -> cluster -> generate
```

Configuration via environment (defaults suit the docker-compose DB):

- `DATABASE_URL` (default `postgresql://postgres:dev@localhost:5432/againpage`)
- `AGAINPAGE_API_PORT` (default `8000`)

## Test

```bash
uv run pytest
```
