use std::process::{Child, Command};
use std::path::PathBuf;
use crate::keychain::keychain_get_impl;

#[allow(dead_code)]
pub struct Supervisor {
    pub db_url: String,
    pub api_port: u16,
    pub engine_dir: PathBuf,   // where againpage-api / againpage-worker live
    api: Option<Child>,
    worker: Option<Child>,
}

#[allow(dead_code)]
impl Supervisor {
    pub fn new(db_url: String, api_port: u16, engine_dir: PathBuf) -> Self {
        Supervisor { db_url, api_port, engine_dir, api: None, worker: None }
    }

    fn key_env(cmd: &mut Command) {
        if let Ok(Some(k)) = keychain_get_impl("againpage", "openrouter") {
            cmd.env("OPENROUTER_API_KEY", k);
        }
        if let Ok(Some(k)) = keychain_get_impl("againpage", "ollama") {
            cmd.env("OLLAMA_API_KEY", k);
        }
    }

    fn spawn(&self, bin: &str, extra_env: &[(&str, String)]) -> std::io::Result<Child> {
        let mut cmd = Command::new(self.engine_dir.join(bin).join(bin));
        cmd.env("DATABASE_URL", &self.db_url)
           .env("AGAINPAGE_API_PORT", self.api_port.to_string());
        Self::key_env(&mut cmd);
        for (k, v) in extra_env { cmd.env(k, v); }
        cmd.spawn()
    }

    pub fn start(&mut self) -> Result<(), String> {
        self.api = Some(self.spawn("againpage-api", &[]).map_err(|e| e.to_string())?);
        self.worker = Some(self.spawn("againpage-worker", &[]).map_err(|e| e.to_string())?);
        Ok(())
    }

    /// Call periodically from a monitor thread; restarts a dead child.
    pub fn tick(&mut self) {
        if let Some(c) = self.worker.as_mut() {
            if matches!(c.try_wait(), Ok(Some(_))) {
                self.worker = self.spawn("againpage-worker", &[]).ok();
            }
        }
        if let Some(c) = self.api.as_mut() {
            if matches!(c.try_wait(), Ok(Some(_))) {
                self.api = self.spawn("againpage-api", &[]).ok();
            }
        }
    }

    pub fn shutdown(&mut self) {
        // order: worker -> api -> (postgres stopped by caller)
        for child in [self.worker.take(), self.api.take()] {
            if let Some(mut c) = child { let _ = c.kill(); let _ = c.wait(); }
        }
    }
}
