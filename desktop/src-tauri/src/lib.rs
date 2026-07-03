mod keychain;
mod sidecar;
mod vault;

use std::sync::Mutex;
use std::time::Duration;

use sidecar::ports::free_port;
use sidecar::postgres::Postgres;
use sidecar::supervisor::Supervisor;
use tauri::Manager;

/// Shared runtime state handed to the frontend/reader and torn down on exit.
///
/// `postgres` is only present once `setup` has started it; `supervisor`
/// mirrors that. Both are behind a `Mutex` so the periodic monitor thread and
/// the exit hook can coordinate without racing each other.
struct AppState {
    supervisor: Mutex<Option<Supervisor>>,
    postgres: Mutex<Option<Postgres>>,
    /// `http://127.0.0.1:{api_port}` — the base URL the reader (Task 6) talks to.
    #[allow(dead_code)]
    api_base: Mutex<Option<String>>,
}

/// Boots Postgres + the api/worker supervisor and wires them into app state.
///
/// Kept as a free function (rather than inline in `run`) so a failure here is
/// a single early return instead of unwinding through the whole `setup`
/// closure. Errors are logged (never panicking `setup`, which would prevent
/// the window from ever showing) — a fully headless-DB failure mode is an
/// M6-finish concern, not something to block compilation on here.
fn boot_sidecars(app: &tauri::App) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("resolve app_data_dir: {e}"))?;
    std::fs::create_dir_all(&app_data_dir).map_err(|e| e.to_string())?;

    // Bundled resources: resources/postgres/<platform>/bin (Postgres) and
    // resources/engine/{againpage-api,againpage-worker}/... (PyInstaller
    // sidecars). Resolution of the exact per-platform resource layout is
    // owned by the bundling task (M6 T8); here we just need *a* PathBuf to
    // construct Postgres/Supervisor with so the module wiring compiles.
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("resolve resource_dir: {e}"))?;
    let pg_bin_dir = resource_dir.join("postgres").join("bin");
    let engine_dir = resource_dir.join("engine");

    let postgres = Postgres::new(&app_data_dir, pg_bin_dir);
    let db_url = postgres.start()?;

    let api_port = free_port();
    let api_base = format!("http://127.0.0.1:{api_port}");

    let mut supervisor = Supervisor::new(db_url, api_port, engine_dir);
    if let Err(e) = supervisor.start() {
        // Sidecar binaries aren't present outside a packaged build; don't
        // treat that as fatal for `setup` (dev builds run against pnpm dev
        // servers, not these sidecars). Postgres stays up; log and continue.
        eprintln!("supervisor start failed (expected in unpackaged dev runs): {e}");
    }

    let state: tauri::State<AppState> = app.state();
    *state.postgres.lock().unwrap() = Some(postgres);
    *state.supervisor.lock().unwrap() = Some(supervisor);
    *state.api_base.lock().unwrap() = Some(api_base);

    // Monitor thread: periodic tick() with capped exponential backoff between
    // restart bursts, so a sidecar that keeps crash-looping doesn't spin the
    // CPU respawning every 2s forever.
    let handle = app.handle().clone();
    std::thread::spawn(move || {
        let base_delay = Duration::from_secs(2);
        let max_delay = Duration::from_secs(30);
        // Consecutive ticks are spaced `base_delay` apart normally. Every
        // `BACKOFF_AFTER` ticks in a row we double-check nothing is
        // crash-looping by widening the *next* sleep, capped at `max_delay`,
        // then reset back to `base_delay`. This bounds worst-case restart
        // spin (CPU/log noise) without needing `tick()` to report whether it
        // actually respawned anything (it intentionally doesn't, per brief).
        const BACKOFF_AFTER: u32 = 3;
        let mut ticks_since_backoff = 0u32;
        let mut delay = base_delay;
        loop {
            std::thread::sleep(delay);
            let state = handle.state::<AppState>();
            let mut guard = state.supervisor.lock().unwrap();
            let Some(sup) = guard.as_mut() else {
                // Supervisor was torn down (shutdown in progress) — stop polling.
                break;
            };
            sup.tick();
            drop(guard);

            ticks_since_backoff += 1;
            delay = if ticks_since_backoff >= BACKOFF_AFTER {
                ticks_since_backoff = 0;
                (delay * 2).min(max_delay)
            } else {
                base_delay
            };
        }
    });

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            supervisor: Mutex::new(None),
            postgres: Mutex::new(None),
            api_base: Mutex::new(None),
        })
        .setup(|app| {
            if let Err(e) = boot_sidecars(app) {
                eprintln!("boot_sidecars failed: {e}");
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            keychain::keychain_set,
            keychain::keychain_get,
            keychain::keychain_delete,
            vault::scan_vault,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::Exit = event {
                let state: tauri::State<AppState> = app_handle.state();
                // Order: worker -> api (inside Supervisor::shutdown), then postgres.
                let sup_taken = state.supervisor.lock().unwrap().take();
                if let Some(mut sup) = sup_taken {
                    sup.shutdown();
                }
                let pg_taken = state.postgres.lock().unwrap().take();
                if let Some(pg) = pg_taken {
                    pg.stop();
                }
            }
        });
}
