mod keychain;
mod vault;
// The bundled-engine build (Postgres + api/worker sidecars packaged inside the
// app) is gated behind the `bundled-engine` Cargo feature, which is OFF by
// default. The default build is the *reader-only* app: it ships no engine and
// talks to an engine you host separately (see the app's Engine URL setting).
#[cfg(feature = "bundled-engine")]
mod sidecar;

#[cfg(feature = "bundled-engine")]
use std::sync::Mutex;
#[cfg(feature = "bundled-engine")]
use std::time::Duration;
#[cfg(feature = "bundled-engine")]
use sidecar::ports::free_port;
#[cfg(feature = "bundled-engine")]
use sidecar::postgres::Postgres;
#[cfg(feature = "bundled-engine")]
use sidecar::supervisor::Supervisor;
#[cfg(feature = "bundled-engine")]
use tauri::Manager;

/// Shared runtime state handed to the frontend/reader and torn down on exit.
///
/// `postgres` is only present once `setup` has started it; `supervisor`
/// mirrors that. Both are behind a `Mutex` so the periodic monitor thread and
/// the exit hook can coordinate without racing each other.
#[cfg(feature = "bundled-engine")]
struct AppState {
    supervisor: Mutex<Option<Supervisor>>,
    postgres: Mutex<Option<Postgres>>,
    /// `http://127.0.0.1:{api_port}` — the base URL the reader talks to.
    #[allow(dead_code)]
    api_base: Mutex<Option<String>>,
}

/// Boots Postgres + the api/worker supervisor and wires them into app state.
///
/// Kept as a free function (rather than inline in `run`) so a failure here is
/// a single early return instead of unwinding through the whole `setup`
/// closure. Errors are logged (never panicking `setup`, which would prevent
/// the window from ever showing).
#[cfg(feature = "bundled-engine")]
fn boot_sidecars(app: &tauri::App) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("resolve app_data_dir: {e}"))?;
    std::fs::create_dir_all(&app_data_dir).map_err(|e| e.to_string())?;

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
        eprintln!("supervisor start failed (expected in unpackaged dev runs): {e}");
    }

    let state: tauri::State<AppState> = app.state();
    *state.postgres.lock().unwrap() = Some(postgres);
    *state.supervisor.lock().unwrap() = Some(supervisor);
    *state.api_base.lock().unwrap() = Some(api_base);

    // Monitor thread: detects a crashed child within ~one base interval and
    // retries, with restart-keyed backoff so a crash-loop can't spin the CPU.
    let handle = app.handle().clone();
    std::thread::spawn(move || {
        let base_delay = Duration::from_secs(2);
        let max_delay = Duration::from_secs(30);
        let mut delay = base_delay;
        loop {
            std::thread::sleep(delay);
            let state = handle.state::<AppState>();
            let mut guard = state.supervisor.lock().unwrap();
            let Some(sup) = guard.as_mut() else {
                break;
            };
            let restarted = sup.tick();
            drop(guard);

            delay = if restarted {
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
    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init());

    #[cfg(feature = "bundled-engine")]
    {
        builder = builder
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
            });
    }

    builder
        .invoke_handler(tauri::generate_handler![
            keychain::keychain_set,
            keychain::keychain_get,
            keychain::keychain_delete,
            vault::scan_vault,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app_handle, _event| {
            // Bundled engine: tear down worker -> api -> postgres on exit.
            #[cfg(feature = "bundled-engine")]
            if let tauri::RunEvent::Exit = _event {
                let state: tauri::State<AppState> = _app_handle.state();
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
