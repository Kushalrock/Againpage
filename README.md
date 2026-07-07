<p align="center">
  <img src="reader/public/favicon.svg" width="76" alt="Againpage" />
</p>

<h1 align="center">Againpage</h1>

<p align="center">
  <em>A daily edition composed from your own notes.</em><br />
  Your notes, read back to you — an original morning edition written from everything you've already written.
</p>

<p align="center">
  <img alt="Status: alpha" src="https://img.shields.io/badge/status-alpha-orange" />
  <img alt="License: FSL-1.1-ALv2" src="https://img.shields.io/badge/license-FSL--1.1--ALv2%20%E2%86%92%20Apache--2.0-blue" />
  <img alt="Local-first" src="https://img.shields.io/badge/local--first-yes-brightgreen" />
</p>

---

Againpage reads your personal note vault (an Obsidian folder, or any folder of
Markdown) and periodically **composes an original edition** — a piece of
writing that connects ideas across your notes, resurfaces things you'd
forgotten, and gives you a reason to re-encounter your own thinking. It then
presents it in a quiet, newspaper-like reader.

It is **local-first**: it runs on your machine, stores everything in a local
database, and — with a local model — never sends a single note over the network.

> **Alpha.** Againpage is early software. Today you run it locally with Docker
> (below). A packaged one-click desktop app is on the roadmap.

## Features

- **Composed, not collected** — each edition is original writing (a lead essay,
  connections between notes, standalone summaries, questions, things to apply),
  not a list of links.
- **Reads across your whole vault** — scans your Markdown, embeds every note,
  and clusters them into themes so editions draw unexpected connections.
- **Click any note, read it in depth** — a slide-in drawer shows a rich ~500-word
  summary of any single note, on demand.
- **On your schedule** — pick a delivery time and an "every N days" cadence, with
  a live countdown to your next edition.
- **Private by design** — your notes stay on your machine; with Ollama, editions
  compose fully offline.
- **Bring your own models** — local via **Ollama**, or hosted via **OpenRouter**,
  all configured in the app.

## Setting up

There are two ways to run Againpage:

- **[For personal use](#for-personal-use)** — run the engine with **Docker** and
  use the **downloaded reader app**. No coding tools required.
- **[For development](#for-development)** — run everything from source with the
  dev toolchain. You use your **own filesystem** directly, so none of the Docker
  path caveats apply.

### For development

Install the toolchain:

| Tool | For |
|---|---|
| [Docker](https://docs.docker.com/get-docker/) | local Postgres (`pnpm db:up`) |
| Node 24 + pnpm 10.30.3 | reader + workspace |
| [uv](https://docs.astral.sh/uv/) + Python ≥ 3.14 | the engine |
| Rust (stable) | building the desktop app (optional) |

```bash
pnpm install
cd engine && uv sync && cd ..
pnpm db:up                             # Postgres (pgvector) in Docker
# then three terminals:
cd engine && uv run againpage-api      # API   → :8000
cd engine && uv run againpage-worker   # worker
pnpm --filter reader dev               # reader → :5173
```

Run natively like this and the engine reads your **real filesystem** — you use
ordinary absolute paths, and the folder picker works normally. None of the
Docker mount rules below apply. Full details: [`CONTRIBUTING.md`](./CONTRIBUTING.md).

### For personal use

The **reader** is a downloadable desktop app; the **engine** (Postgres + API +
worker) runs with Docker. First: install **Docker**, pick an **AI source** — an
**[OpenRouter](https://openrouter.ai/) key** (one key covers writing **and**
embeddings; simplest) or **[Ollama](https://ollama.com/download)** (fully local:
`ollama pull nomic-embed-text` + a chat model) — and clone the repo:

```bash
git clone <this-repo-url> againpage && cd againpage
```

> **⚠️ The one Docker rule — read this.** The engine runs in a container and can
> only read a folder you *mount* into it. So **mount the *parent* folder** of your
> notes as `VAULT_PATH`; it appears inside the engine at `/vault`. Then in the
> reader, write each notes folder as **`/vault/<folder-name>`**. (A
> `\\server\share` URL won't work — mount the share on the host first, then point
> `VAULT_PATH` at that host path.)
>
> **Do NOT use the reader's folder picker here.** It points at *your* machine,
> which the containerized engine can't read — type `/vault/<folder-name>`
> instead. The picker is only for the [development](#for-development) setup
> (native engine, no Docker).

#### 1. Everything on one machine

```bash
# mount the PARENT of your notes; it appears inside the engine at /vault
VAULT_PATH="/Users/you/Documents" docker compose up --build -d
```

Download the reader for your OS (macOS `.dmg`, Windows `.exe`/`.msi`, Linux
`.AppImage`/`.deb`) from the **Releases** page and open it — it connects to
`http://localhost:8000` automatically. Then, in the reader:

1. **Notes folder** — type `/vault/<folder-name>`. E.g. notes in
   `~/Documents/Notes` → you mounted `~/Documents`, so enter `/vault/Notes`. Add
   as many `/vault/...` folders as you like.
2. **AI source** — OpenRouter key, or Ollama at `http://host.docker.internal:11434`.
   **Test connection.**
3. **Index** — Settings → Advanced → **Re-index notes & embeddings**, then generate
   and read.

To stop the engine: `docker compose down` (data persists in a Docker volume).

*Don't want Docker?* If you already have the dev tools, use
[For development](#for-development) instead — it runs against your own
filesystem, no mounting.

#### 2. Split — home lab / server

Engine on a server or NAS, reader on your laptop.

**On the server** — mount the parent folder of your notes (a network share
mounted on the server works) and start the engine:

```bash
VAULT_PATH="/mnt/notes" pnpm engine:up     # ≡ docker compose up --build -d ; API on 0.0.0.0:8000
```

**On your laptop** — download and open the reader, then **point it at the
server** (required — otherwise every screen fails to load):

1. Set the **Engine URL** to `http://SERVER_IP:8000` — in onboarding (welcome
   step) or later in **Settings → Engine connection**.
2. Set the notes folder to `/vault/<folder-name>` — the path on the **server**,
   as mounted (again, type it; don't use the picker). *If you run the engine
   **natively** on the server (dev tools, no Docker), there's no mount — use the
   real path like `/mnt/notes/vault1`; the `/vault/...` prefix only exists
   because of the Docker mount.*
3. AI source → index → read, as above.

> **⚠️ Security.** The engine API is **unauthenticated** and single-user. Keep it
> on a **trusted LAN or VPN** — never expose it to the public internet; anyone who
> can reach it can read your notes.

## Privacy

- Everything runs on your machine — a local Postgres database and a local reader.
- With **Ollama** selected, no note ever leaves your computer; editions can be
  composed with the network disconnected.
- Notes only reach a hosted provider (OpenRouter) if you explicitly choose it for
  the writer model.
- No account, no sign-up, no telemetry.

## Documentation & contributing

- **Developers:** setup, repo layout, and conventions live in
  [`CONTRIBUTING.md`](./CONTRIBUTING.md).
- **License:** Againpage is source-available under the Functional Source License
  1.1, converting to **Apache License 2.0 on 1 January 2029** — see
  [`LICENSE`](./LICENSE).

## License

Copyright © 2026 Kushal Agrawal and the Againpage contributors.
Licensed under **FSL-1.1-ALv2** (see [`LICENSE`](./LICENSE)).
