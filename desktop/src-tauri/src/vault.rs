use walkdir::WalkDir;

#[tauri::command]
pub fn scan_vault(path: String) -> usize {
    WalkDir::new(&path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.file_type().is_file()
                && e.path().extension().map(|x| x == "md").unwrap_or(false)
        })
        .count()
}
