# Desktop build notes

Build/packaging runbook for the AgainPage Tauri desktop app. This is the
complete per-platform build + sign runbook for M6 (bundled Postgres, sidecar
API/worker, signed installer). Producing the actual signed installer is a
**manual step** performed by a human on a signing-capable machine — this
document is the exact sequence they follow, plus the checklist they use to
verify the result.

## Contents

1. [Prerequisites](#1-prerequisites)
2. [Engine: build the API + worker sidecars](#2-engine-build-the-api--worker-sidecars)
3. [Postgres: bundled relocatable Postgres 17 + pgvector](#3-postgres-bundled-relocatable-postgres-17--pgvector)
4. [Signing secrets](#4-signing-secrets-env-only-never-committed)
5. [Build the installer](#5-build-the-installer)
6. [Expected artifacts](#6-expected-artifacts)
7. [Manual verification checklist](#7-manual-verification-checklist)

---

## 1. Prerequisites

Install on the build machine (must match the target platform — Tauri does
not cross-compile signed installers):

| Tool | Version | Check |
|---|---|---|
| Rust (stable toolchain) | stable | `rustc -vV` |
| Node.js | `v24.18.0` (pinned in `.nvmrc`) | `node -v` |
| pnpm | `10.30.3` (pinned in root `package.json`'s `packageManager`) | `pnpm -v` |
| `uv` (Python package/venv manager) | latest | `uv --version` |
| Python | `>=3.14` (per `engine/pyproject.toml`) | `uv run python --version` |

Platform signing toolchains:

- **macOS:** Xcode Command Line Tools (`xcode-select --install`) for
  `codesign`/`spctl`; a Developer ID Application certificate installed in
  the login keychain; `xcrun notarytool` (ships with recent Xcode CLT) for
  notarization.
- **Windows:** a code-signing certificate (EV cert or Azure Trusted
  Signing) plus `signtool.exe` (Windows SDK) or the Azure Trusted Signing
  CLI integration, whichever the cert vendor requires.
- **Linux:** no OS-level signing is required for `appimage`/`deb` in this
  setup (`bundle.targets` does not include any Linux signing step).

From repo root, install JS deps once:

```bash
pnpm install
```

Get the exact Rust target triple for the current machine (needed in step 2):

```bash
rustc -vV | grep host
```

---

## 2. Engine: build the API + worker sidecars

The desktop app embeds the FastAPI server and the clustering worker as
**PyInstaller-built standalone binaries**, wired into Tauri as
`externalBin` sidecars (`desktop/src-tauri/tauri.conf.json`):

```json
"externalBin": ["binaries/againpage-api", "binaries/againpage-worker"]
```

Tauri resolves each `externalBin` entry by appending the **Rust target
triple** (and `.exe` on Windows) to the base name — it will not find a
bare `binaries/againpage-api`. Build and place them as follows.

### 2.1 Build

```bash
cd engine
./scripts/build_engine.sh
```

This runs `uv run pyinstaller --onedir` twice and produces:

```
engine/dist/againpage-api/againpage-api
engine/dist/againpage-worker/againpage-worker
```

(each `dist/<name>/` directory also contains the PyInstaller `_internal/`
payload — the whole `dist/*` tree, not just the top-level executable, must
be considered when copying; see 2.2).

### 2.2 Copy into `desktop/src-tauri/binaries/` with the target-triple suffix

Tauri expects the exact filename `{base-name}-{target-triple}{.exe on
Windows}`. Get the triple with `rustc -vV | grep host`, then copy/rename:

| Platform | target triple | expected filename(s) |
|---|---|---|
| macOS (Apple Silicon) | `aarch64-apple-darwin` | `binaries/againpage-api-aarch64-apple-darwin`, `binaries/againpage-worker-aarch64-apple-darwin` |
| macOS (Intel) | `x86_64-apple-darwin` | `binaries/againpage-api-x86_64-apple-darwin`, `binaries/againpage-worker-x86_64-apple-darwin` |
| Windows x64 | `x86_64-pc-windows-msvc` | `binaries/againpage-api-x86_64-pc-windows-msvc.exe`, `binaries/againpage-worker-x86_64-pc-windows-msvc.exe` |
| Linux x64 | `x86_64-unknown-linux-gnu` | `binaries/againpage-api-x86_64-unknown-linux-gnu`, `binaries/againpage-worker-x86_64-unknown-linux-gnu` |

Example (macOS Apple Silicon):

```bash
TRIPLE=$(rustc -vV | grep host | cut -d' ' -f2)
cp engine/dist/againpage-api/againpage-api \
   desktop/src-tauri/binaries/againpage-api-$TRIPLE
cp engine/dist/againpage-worker/againpage-worker \
   desktop/src-tauri/binaries/againpage-worker-$TRIPLE
chmod +x desktop/src-tauri/binaries/againpage-api-$TRIPLE \
         desktop/src-tauri/binaries/againpage-worker-$TRIPLE
```

If PyInstaller's `--onedir` output also needs its `_internal/` support
directory alongside the executable at runtime, copy that directory to sit
next to the renamed binary under the same name PyInstaller expects (i.e.
preserve the `dist/againpage-api/` layout, just renaming the top-level
executable to include the triple suffix — do not flatten `_internal/`
contents into `binaries/` directly).

**Note:** these binaries are build output, not source — they are
git-ignored (`desktop/src-tauri/.gitignore` excludes `/binaries/*`, keeping
only a tracked `.gitkeep`). A fresh checkout's `cargo build`/`tauri build`
will fail until this copy step has been run at least once for the host's
target triple.

---

## 3. Postgres: bundled relocatable Postgres 17 + pgvector

AgainPage ships a **relocatable Postgres 17 + pgvector** binary set per
platform so the desktop app runs against the same schema/engine as the cloud
deployment (local↔cloud parity — this is deliberately Postgres, not SQLite).

The Rust sidecar module (`desktop/src-tauri/src/sidecar/postgres.rs`) drives
the bundled `initdb` / `pg_ctl` / `createdb` binaries directly via
`std::process::Command`; it does not depend on a system-installed Postgres.

### 3.1 Resource layout

Binaries are placed under Tauri `resources` (not `externalBin`, since these
are a full toolset directory rather than a single sidecar executable) —
`tauri.conf.json`'s `bundle.resources` is `["resources/postgres/**/*"]`,
mapping to:

```
desktop/src-tauri/resources/postgres/<platform>/
  bin/
    initdb
    pg_ctl
    postgres
    createdb
    ... (other libpq/postgres client tools as needed by the above)
  lib/
    ... (postgres shared libs + pgvector.{so,dylib,dll})
  share/
    ... (postgres shared data: timezone files, extension SQL, etc.)
```

`<platform>` is one of:

- `darwin-arm64` — macOS on Apple Silicon
- `darwin-x64` — macOS on Intel
- `linux-x64` — Linux x86_64
- `win-x64` — Windows x86_64

At first run, `Postgres::new(app_data_dir, bin_dir)` is pointed at the
resource dir's `bin/` for the current platform (resolved via Tauri's
resource-path API), and `pgdata` is initialized under the app's writable
data dir (`app_data_dir.join("pgdata")`) — never inside the read-only
bundled resources.

### 3.2 Where the binaries come from

Per-platform relocatable Postgres 17 + pgvector builds are produced from:

- **macOS (darwin-arm64 / darwin-x64):** an `embedded-postgres`-style
  relocatable tarball built via [theseus-rs/postgresql-binaries](https://github.com/theseus-rs/postgresql-binaries)
  (zonky/embedded-postgres-binaries lineage), with the `pgvector` extension
  compiled against the matching Postgres 17 headers and copied into
  `lib/postgresql/` + `share/postgresql/extension/`.
- **Linux (linux-x64):** same relocatable-tarball approach, built against a
  manylinux/glibc baseline old enough to run on common desktop distros;
  statically links what it reasonably can to minimize runtime `.so` deps.
- **Windows (win-x64):** the official EDB "zip" (non-installer) Postgres 17
  Windows binaries, with `pgvector` built via the EDB-provided MSVC toolchain
  instructions and copied into the corresponding `lib`/`share` dirs.

### 3.3 Fetch/place step

Unpack each platform's tarball/zip into
`desktop/src-tauri/resources/postgres/<platform>/` before running `tauri
build` on that platform — only the current build platform's directory is
required for a given build (the bundler only needs to find the glob match
for the machine it is bundling on):

```bash
# example: macOS Apple Silicon, having already downloaded/built the tarball
mkdir -p desktop/src-tauri/resources/postgres/darwin-arm64
tar -xzf pg17-pgvector-darwin-arm64.tar.gz \
    -C desktop/src-tauri/resources/postgres/darwin-arm64
```

Nothing is compiled from source during the app build itself — binaries are
pre-built and vendored in as bundle resources. Like `binaries/`, this
directory is git-ignored except for a tracked `.gitkeep`; it must be
populated locally before `tauri build` on that platform.

### 3.4 Migrations

There is no separate "run migrations" step in the sidecar itself. The engine
API's `main()` already applies schema migrations on boot (established in M0).
Since the desktop app starts the bundled API process against the
`DATABASE_URL` returned by `Postgres::start()`, **the API's normal boot
sequence is the migration point** — starting the API sidecar after Postgres
is up is what brings the schema up to date. `postgres.rs` itself only
handles `initdb` / `pg_ctl start` / ensuring the `againpage` database exists.

### 3.5 Lifecycle summary

1. `Postgres::new(app_data_dir, bin_dir)` — picks a free local port, computes
   `pgdata` path under the app's data dir.
2. `Postgres::start()` — runs `initdb` if `pgdata/PG_VERSION` doesn't exist
   yet (first run), starts `pg_ctl` on the allocated port (trust auth, local
   only), ensures the `againpage` database exists via `createdb`, and returns
   the `postgresql://postgres@127.0.0.1:<port>/againpage` connection string.
3. The API sidecar is launched with that `DATABASE_URL` and migrates the
   schema on its own boot.
4. `Postgres::stop()` — `pg_ctl -m fast stop` on app shutdown.

---

## 4. Signing secrets (env only, never committed)

`tauri.conf.json` references signing config via environment variables and a
`null` placeholder — **no secret values live in this repo**. Set these in
the shell (or CI secret store) of the machine doing the signed build; do not
write them into any tracked file.

### macOS (notarization)

| Env var | Purpose |
|---|---|
| `APPLE_SIGNING_IDENTITY` | Developer ID Application identity/name used by `codesign`; matches `bundle.macOS.signingIdentity: "$APPLE_SIGNING_IDENTITY"` in `tauri.conf.json`. |
| `APPLE_ID` | Apple ID email used for `notarytool` submission. |
| `APPLE_PASSWORD` | App-specific password for that Apple ID (not the account password). |
| `APPLE_TEAM_ID` | Apple Developer Team ID for notarization. |

```bash
export APPLE_SIGNING_IDENTITY="Developer ID Application: <Name> (<TEAMID>)"
export APPLE_ID="you@example.com"
export APPLE_PASSWORD="app-specific-password"
export APPLE_TEAM_ID="TEAMID1234"
```

Tauri's bundler signs and notarizes automatically during `tauri build` when
these are present in the environment.

### Windows

`tauri.conf.json` has `bundle.windows.certificateThumbprint: null` —
intentionally unset in the repo, supplied at build time. Use one of:

- **Local cert (thumbprint):** set the certificate thumbprint via env/CLI
  override and ensure the cert is installed in the Windows certificate
  store; `signtool.exe` picks it up by thumbprint.
- **Azure Trusted Signing:** configure the Trusted Signing account/endpoint
  per Tauri's Windows signing docs and supply the Azure credentials as
  environment variables (do not hardcode into `tauri.conf.json`).

Never commit a certificate thumbprint, `.pfx` file, or Azure credentials
into this repo. If a real thumbprint is needed for a given build, override
it out-of-band (CI secret injected into the build environment / build
config generated at CI time), not by editing the tracked `tauri.conf.json`.

---

## 5. Build the installer

> **Prerequisite gate — read this first.** The build command is a thin
> passthrough to `tauri build`; it does **not** produce the sidecars or the
> Postgres resources for you. Steps 2–4 above are mandatory and manual. A
> fresh checkout will fail here because `desktop/src-tauri/binaries/*` holds
> 80-byte placeholder stubs (`echo "placeholder"; exit 1`) and
> `desktop/src-tauri/resources/postgres/` is empty (`.gitkeep` only). Run
> step 2 (build + copy the PyInstaller sidecars with the target-triple
> suffix) and step 3 (unpack the relocatable Postgres 17 + pgvector set for
> this platform) before the command below will succeed.

With steps 1–4 complete (engine binaries copied in with the correct
triple suffix, Postgres resources unpacked for the current platform,
signing env vars exported), run either of these equivalent commands:

```bash
pnpm build:desktop                  # root convenience alias
pnpm --filter desktop tauri build   # what the alias expands to
pnpm --filter desktop build         # desktop-package alias (also `tauri build`)
```

This runs the configured `beforeBuildCommand` (`pnpm --filter reader
build`) to produce the frontend bundle, compiles the Rust/Tauri shell,
bundles the `externalBin` sidecars and `resources/postgres/**/*` payload,
and (on macOS/Windows, when signing env vars are present) signs — and on
macOS, notarizes — the resulting installer.

---

## 6. Expected artifacts

`bundle.targets` is `["dmg", "app", "nsis", "msi", "appimage", "deb"]`.
Built artifacts land under:

```
desktop/src-tauri/target/release/bundle/dmg/*.dmg          # macOS installer
desktop/src-tauri/target/release/bundle/macos/*.app        # macOS app bundle
desktop/src-tauri/target/release/bundle/nsis/*.exe         # Windows installer (NSIS)
desktop/src-tauri/target/release/bundle/msi/*.msi          # Windows installer (MSI)
desktop/src-tauri/target/release/bundle/appimage/*.AppImage # Linux AppImage
desktop/src-tauri/target/release/bundle/deb/*.deb          # Linux Debian package
```

Only the bundle formats native to the build machine's OS are actually
produced in a given `tauri build` run (e.g. building on macOS produces
`dmg`/`macos`, not `nsis`/`msi`/`appimage`/`deb`).

---

## 7. Manual verification checklist

The signed installer itself, and its verification, are a **manual step**
performed by a human on a signing-capable machine (and, for the clean-install
check, a second clean machine/VM) — there is no automated test for a real
Postgres+API+worker+installer end-to-end run. Work through this checklist
after each `tauri build` intended for distribution.

### 7.1 Build produces a signed installer

```bash
pnpm --filter desktop tauri build
```

Expected: build completes; a `.dmg`/`.app` (macOS), `.exe`/`.msi`
(Windows), or `.AppImage`/`.deb` (Linux) artifact appears under
`target/release/bundle/...` per the paths in §6. On macOS/Windows with
signing env set, the bundler's own output should show signing (and, on
macOS, notarization submission/stapling) succeeding with no errors.

### 7.2 Clean-machine install + first run

Install the built artifact on a clean machine/VM with **no** system
Python and **no** system Postgres installed. Launch the app.

Expected:
- Onboarding screen appears (fresh DB, no prior state).
- You pick a vault folder and paste an API key.
- The first edition composes and renders in the reader view.
- While running, `ps aux` shows the app's own bundled processes:

```bash
ps aux | grep -E 'againpage|postgres'
```

  Expected: entries for the app's own `postgres` (running from
  `resources/postgres/<platform>/bin/postgres` against the app's
  `pgdata`), `againpage-api`, and `againpage-worker` — not any
  system-installed Postgres.

- Quit the app, then check for orphaned processes:

```bash
ps aux | grep -E 'againpage|pgdata'
```

  Expected: no matches (besides the `grep` command itself) — confirms the
  shutdown order (worker → api → postgres) leaves no orphaned sidecar or
  Postgres process behind.

### 7.3 Offline check

With the app running (or freshly launched) on the clean machine, disconnect
the network entirely (Wi-Fi off / cable unplugged / airplane mode).

Expected:
- With Ollama selected as the local model provider, the app still ingests
  content and composes an edition — nothing about the local-model path
  requires network access.
- Fonts render correctly (bundled `.woff2` files under the app's own
  frontend assets — no requests to `fonts.googleapis.com` /
  `fonts.gstatic.com`; see `reader/src/theme/fonts.css`).
- No visible errors/broken UI attributable to the missing network for the
  above two flows.

### 7.4 macOS signature/notarization verification

```bash
codesign --verify --deep --strict /Applications/againpage.app
spctl -a -vv /Applications/againpage.app
```

Expected:
- `codesign --verify --deep --strict`: exits 0, no output (silence means
  valid signature through the whole bundle, including sidecar binaries and
  bundled Postgres binaries).
- `spctl -a -vv`: reports `accepted` and `source=Notarized Developer ID`
  (or equivalent "notarized" source) — confirms Gatekeeper will allow the
  app to launch on a machine that has never seen this build before.

If either check fails, treat the build as **not shippable** — re-check the
signing identity, entitlements, and notarization submission/stapling before
re-running §7.1.
