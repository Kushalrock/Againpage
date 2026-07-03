use keyring::Entry;

pub fn keychain_set_impl(service: &str, key: &str, value: &str) -> Result<(), String> {
    Entry::new(service, key)
        .map_err(|e| e.to_string())?
        .set_password(value)
        .map_err(|e| e.to_string())
}

pub fn keychain_get_impl(service: &str, key: &str) -> Result<Option<String>, String> {
    match Entry::new(service, key).map_err(|e| e.to_string())?.get_password() {
        Ok(v) => Ok(Some(v)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

pub fn keychain_delete_impl(service: &str, key: &str) -> Result<(), String> {
    match Entry::new(service, key)
        .map_err(|e| e.to_string())?
        .delete_credential()
    {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn keychain_set(service: String, key: String, value: String) -> Result<(), String> {
    keychain_set_impl(&service, &key, &value)
}

#[tauri::command]
pub fn keychain_get(service: String, key: String) -> Result<Option<String>, String> {
    keychain_get_impl(&service, &key)
}

#[tauri::command]
pub fn keychain_delete(service: String, key: String) -> Result<(), String> {
    keychain_delete_impl(&service, &key)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn set_get_delete_roundtrip() {
        let svc = "againpage-test";
        let key = "unit-key";
        keychain_set_impl(svc, key, "secret").unwrap();
        assert_eq!(keychain_get_impl(svc, key).unwrap(), Some("secret".to_string()));
        keychain_delete_impl(svc, key).unwrap();
        assert_eq!(keychain_get_impl(svc, key).unwrap(), None);
    }
}
