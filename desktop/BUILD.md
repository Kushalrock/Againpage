# Desktop build notes

Build/packaging notes for the AgainPage Tauri desktop app. This file accretes
across the M6 packaging milestone; sections below are folded in as each
sidecar/bundling task lands (full `tauri.conf.json` bundle block lands in M6
Task 7/8).

## Bundled Postgres (sidecar)

AgainPage ships a **relocatable Postgres 17 + pgvector** binary set per
platform so the desktop app runs against the same schema/engine as the cloud
deployment (local↔cloud parity — this is deliberately Postgres, not SQLite).

The Rust sidecar module (`desktop/src-tauri/src/sidecar/postgres.rs`) drives
the bundled `initdb` / `pg_ctl` / `createdb` binaries directly via
`std::process::Command`; it does not depend on a system-installed Postgres.

### Resource layout

Binaries are placed under Tauri `resources` (not `externalBin`, since these
are a full toolset directory rather than a single sidecar executable) at:

```
resources/postgres/<platform>/
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

### Where the binaries come from

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

Each platform's tarball/zip is unpacked into
`resources/postgres/<platform>/` at build time (fetch script to be added
alongside the full bundle wiring in a later M6 task); nothing is compiled
from source during the app build itself — binaries are pre-built and vendored
in as bundle resources.

### Migrations

There is no separate "run migrations" step in the sidecar itself. The engine
API's `main()` already applies schema migrations on boot (established in M0).
Since the desktop app starts the bundled API process against the
`DATABASE_URL` returned by `Postgres::start()`, **the API's normal boot
sequence is the migration point** — starting the API sidecar after Postgres
is up is what brings the schema up to date. `postgres.rs` itself only
handles `initdb` / `pg_ctl start` / ensuring the `againpage` database exists.

### Lifecycle summary

1. `Postgres::new(app_data_dir, bin_dir)` — picks a free local port, computes
   `pgdata` path under the app's data dir.
2. `Postgres::start()` — runs `initdb` if `pgdata/PG_VERSION` doesn't exist
   yet (first run), starts `pg_ctl` on the allocated port (trust auth, local
   only), ensures the `againpage` database exists via `createdb`, and returns
   the `postgresql://postgres@127.0.0.1:<port>/againpage` connection string.
3. The API sidecar is launched with that `DATABASE_URL` and migrates the
   schema on its own boot.
4. `Postgres::stop()` — `pg_ctl -m fast stop` on app shutdown.
