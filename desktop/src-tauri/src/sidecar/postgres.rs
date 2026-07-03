use std::path::{Path, PathBuf};
use std::process::Command;
use crate::sidecar::ports::free_port;

#[allow(dead_code)]
pub struct Postgres { pub data_dir: PathBuf, pub bin_dir: PathBuf, pub port: u16 }

#[allow(dead_code)]
impl Postgres {
    pub fn new(app_data_dir: &Path, bin_dir: PathBuf) -> Self {
        Postgres { data_dir: app_data_dir.join("pgdata"), bin_dir, port: free_port() }
    }

    fn tool(&self, name: &str) -> PathBuf { self.bin_dir.join(name) }

    pub fn start(&self) -> Result<String, String> {
        if !self.data_dir.join("PG_VERSION").exists() {
            std::fs::create_dir_all(&self.data_dir).map_err(|e| e.to_string())?;
            let out = Command::new(self.tool("initdb"))
                .args(["-D", self.data_dir.to_str().unwrap(), "-U", "postgres", "--auth=trust"])
                .output().map_err(|e| e.to_string())?;
            if !out.status.success() { return Err(String::from_utf8_lossy(&out.stderr).into()); }
        }
        let status = Command::new(self.tool("pg_ctl"))
            .args(["-D", self.data_dir.to_str().unwrap(), "-o",
                   &format!("-p {} -k /tmp", self.port), "-w", "start"])
            .status().map_err(|e| e.to_string())?;
        if !status.success() { return Err("pg_ctl start failed".into()); }
        // ensure the app database exists
        let _ = Command::new(self.tool("createdb"))
            .args(["-p", &self.port.to_string(), "-U", "postgres", "againpage"]).status();
        Ok(format!("postgresql://postgres@127.0.0.1:{}/againpage", self.port))
    }

    pub fn stop(&self) {
        let _ = Command::new(self.tool("pg_ctl"))
            .args(["-D", self.data_dir.to_str().unwrap(), "-m", "fast", "-w", "stop"]).status();
    }
}
