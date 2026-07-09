use serde_json::{Map, Value};
use std::path::Path;

// ---- Desktop: OS-native keychain (macOS Keychain / Windows Credential
// Manager / Secret Service). Unchanged from the pre-Android implementation. ----
#[cfg(not(target_os = "android"))]
use keyring::Entry;

#[cfg(not(target_os = "android"))]
pub fn keychain_set_impl(service: &str, key: &str, value: &str) -> Result<(), String> {
    Entry::new(service, key)
        .map_err(|e| e.to_string())?
        .set_password(value)
        .map_err(|e| e.to_string())
}

#[cfg(not(target_os = "android"))]
pub fn keychain_get_impl(service: &str, key: &str) -> Result<Option<String>, String> {
    match Entry::new(service, key).map_err(|e| e.to_string())?.get_password() {
        Ok(v) => Ok(Some(v)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[cfg(not(target_os = "android"))]
pub fn keychain_delete_impl(service: &str, key: &str) -> Result<(), String> {
    match Entry::new(service, key)
        .map_err(|e| e.to_string())?
        .delete_credential()
    {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

// ---- Android: no keyring backend exists, so secrets persist as JSON in the
// app-private data dir (OS-sandboxed per app on non-rooted devices). This
// module is pure (operates on a path) and platform-agnostic, so it is
// unit-tested on the host CI runner even though it is only *used* on Android. ----
pub mod file_store {
    use super::*;

    fn entry_key(service: &str, key: &str) -> String {
        format!("{service}/{key}")
    }

    fn load(path: &Path) -> Map<String, Value> {
        match std::fs::read(path) {
            Ok(bytes) => serde_json::from_slice(&bytes).unwrap_or_default(),
            Err(_) => Map::new(),
        }
    }

    fn persist(path: &Path, map: &Map<String, Value>) -> Result<(), String> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let bytes = serde_json::to_vec(map).map_err(|e| e.to_string())?;
        std::fs::write(path, bytes).map_err(|e| e.to_string())
    }

    pub fn set(path: &Path, service: &str, key: &str, value: &str) -> Result<(), String> {
        let mut map = load(path);
        map.insert(entry_key(service, key), Value::String(value.to_string()));
        persist(path, &map)
    }

    pub fn get(path: &Path, service: &str, key: &str) -> Result<Option<String>, String> {
        let map = load(path);
        Ok(map
            .get(&entry_key(service, key))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()))
    }

    pub fn delete(path: &Path, service: &str, key: &str) -> Result<(), String> {
        let mut map = load(path);
        map.remove(&entry_key(service, key));
        persist(path, &map)
    }
}

// ---- Commands: identical signatures on every platform. `AppHandle` is
// auto-injected by Tauri (not a JS argument), so the frontend keyStore is
// unchanged. Only the body branches by target OS. ----
#[cfg(target_os = "android")]
fn android_store_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    use tauri::Manager;
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(dir.join("secrets.json"))
}

#[tauri::command]
#[cfg_attr(not(target_os = "android"), allow(unused_variables))]
pub fn keychain_set(
    app: tauri::AppHandle,
    service: String,
    key: String,
    value: String,
) -> Result<(), String> {
    #[cfg(not(target_os = "android"))]
    {
        keychain_set_impl(&service, &key, &value)
    }
    #[cfg(target_os = "android")]
    {
        file_store::set(&android_store_path(&app)?, &service, &key, &value)
    }
}

#[tauri::command]
#[cfg_attr(not(target_os = "android"), allow(unused_variables))]
pub fn keychain_get(
    app: tauri::AppHandle,
    service: String,
    key: String,
) -> Result<Option<String>, String> {
    #[cfg(not(target_os = "android"))]
    {
        keychain_get_impl(&service, &key)
    }
    #[cfg(target_os = "android")]
    {
        file_store::get(&android_store_path(&app)?, &service, &key)
    }
}

#[tauri::command]
#[cfg_attr(not(target_os = "android"), allow(unused_variables))]
pub fn keychain_delete(
    app: tauri::AppHandle,
    service: String,
    key: String,
) -> Result<(), String> {
    #[cfg(not(target_os = "android"))]
    {
        keychain_delete_impl(&service, &key)
    }
    #[cfg(target_os = "android")]
    {
        file_store::delete(&android_store_path(&app)?, &service, &key)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[cfg(not(target_os = "android"))]
    #[test]
    fn set_get_delete_roundtrip() {
        let svc = "againpage-test";
        let key = "unit-key";
        keychain_set_impl(svc, key, "secret").unwrap();
        assert_eq!(keychain_get_impl(svc, key).unwrap(), Some("secret".to_string()));
        keychain_delete_impl(svc, key).unwrap();
        assert_eq!(keychain_get_impl(svc, key).unwrap(), None);
    }

    #[test]
    fn file_store_roundtrip() {
        let dir = std::env::temp_dir().join(format!("againpage_filestore_{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        let path = dir.join("secrets.json");

        assert_eq!(file_store::get(&path, "againpage", "k").unwrap(), None);
        file_store::set(&path, "againpage", "k", "v1").unwrap();
        assert_eq!(file_store::get(&path, "againpage", "k").unwrap(), Some("v1".to_string()));
        file_store::set(&path, "againpage", "k", "v2").unwrap();
        assert_eq!(file_store::get(&path, "againpage", "k").unwrap(), Some("v2".to_string()));
        file_store::delete(&path, "againpage", "k").unwrap();
        assert_eq!(file_store::get(&path, "againpage", "k").unwrap(), None);
        // delete of a missing key is a no-op success (matches desktop NoEntry semantics)
        file_store::delete(&path, "againpage", "missing").unwrap();

        let _ = std::fs::remove_dir_all(&dir);
    }
}
