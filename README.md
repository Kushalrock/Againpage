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

## Getting started

Againpage runs as a small local stack (database + engine + reader). The easiest
way to run it is with **Docker** — you don't need Node, Python, or any other
toolchain installed.

### 1. Install the essentials

- **[Docker](https://docs.docker.com/get-docker/)** (Docker Desktop is fine) —
  no other toolchain needed.
- **An AI source** — pick one:
  - **[OpenRouter](https://openrouter.ai/) key** _(simplest)_ — a single hosted
    key covers both the writing **and** the embeddings. Nothing else to install.
  - **[Ollama](https://ollama.com/download)** _(fully local & private)_ — run the
    models on your own machine; no key, and nothing leaves your computer. Pull an
    embedding model and a chat model, and leave Ollama running:

    ```bash
    ollama pull nomic-embed-text   # embeddings
    ollama pull qwen2.5            # writer / summariser
    ```

### 2. Get Againpage

```bash
git clone <this-repo-url> againpage
cd againpage
```

### 3. Run it

Point `VAULT_PATH` at your notes folder and start the stack:

```bash
VAULT_PATH="/absolute/path/to/your/notes" docker compose up --build
```

Prefer a hosted writer model? Add your OpenRouter key (you can also do this later
in the app):

```bash
OPENROUTER_API_KEY="sk-or-..." VAULT_PATH="/absolute/path/to/your/notes" docker compose up --build
```

When it finishes building, open **<http://localhost:5173>**.

### 4. First run

1. **Notes folder** — in onboarding, set your notes folder to `/vault` (that's
   your `VAULT_PATH`, mounted read-only inside the app).
2. **AI source** — choose **OpenRouter** (paste your key; it provides both the
   writer and the embedding models) or **Ollama** for a fully local/private setup
   (set the endpoint to `http://host.docker.internal:11434` and pick the models
   you pulled). Use **Test connection** to confirm.
3. **Index** — open **Settings → Advanced** and run **Re-index notes & embeddings**.
   It reads your vault, summarises and embeds each note, and composes your themes.
4. **Read** — generate your first edition and open it. Every past edition is kept
   in the archive.

To stop the stack: `Ctrl-C`, then `docker compose down`. Your data persists in a
local Docker volume between runs.

## Home lab / self-hosted (advanced)

Againpage splits cleanly into an **engine** (Postgres + API + worker — the heavy,
always-on part) and a **reader** (the UI). You can run the engine on a home
server or NAS and keep only the reader on your laptop.

**On the server — run the engine (and point it at your notes):**

Mount your notes on the server (a network share works — e.g. an NFS/SMB mount at
`/mnt/notes`); the **engine** reads the vault, so the folder only needs to be
reachable by the server, not by your laptop. Then bring up just the database,
API, and worker:

```bash
VAULT_PATH="/mnt/notes" OPENROUTER_API_KEY="sk-or-..." \
  docker compose up --build -d db api worker
```

The API listens on `0.0.0.0:8000` — reachable from other machines on your
network as `http://SERVER_IP:8000`.

**On your machine — run only the reader, pointed at the server:**

```bash
pnpm install
VITE_API_BASE="http://SERVER_IP:8000" pnpm --filter reader dev
# then open http://localhost:5173
```

`VITE_API_BASE` tells the reader where the engine is (it defaults to
`localhost:8000`). You can also bake it into a static reader build with the same
variable and serve the built files anywhere.

> **⚠️ Security.** The engine API has **no authentication** (Againpage is
> single-user) and allows all origins. Only expose it on a **trusted LAN** or
> behind a **VPN / authenticating reverse proxy** — never put it directly on the
> public internet. Your notes are readable by anyone who can reach the API.

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
