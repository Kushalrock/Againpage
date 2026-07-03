use std::process::{Child, Command};
use std::path::PathBuf;
use crate::keychain::keychain_get_impl;

pub struct Supervisor {
    pub db_url: String,
    pub api_port: u16,
    pub engine_dir: PathBuf,   // where againpage-api / againpage-worker live
    api: Option<Child>,
    worker: Option<Child>,
}

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

    /// Call periodically from a monitor thread; (re)starts a dead or
    /// never-successfully-spawned child. Non-blocking (`try_wait`, not
    /// `wait`). Returns `true` if a (re)spawn was attempted for either
    /// child this call, `false` if both children are already running (or
    /// still healthy per `try_wait`) — callers use this to key backoff off
    /// actual restart events rather than elapsed polls.
    pub fn tick(&mut self) -> bool {
        let mut restarted = false;

        let worker_needs_spawn = match self.worker.as_mut() {
            Some(c) => matches!(c.try_wait(), Ok(Some(_))),
            None => true,
        };
        if worker_needs_spawn {
            if let Ok(child) = self.spawn("againpage-worker", &[]) {
                self.worker = Some(child);
                restarted = true;
            }
        }

        let api_needs_spawn = match self.api.as_mut() {
            Some(c) => matches!(c.try_wait(), Ok(Some(_))),
            None => true,
        };
        if api_needs_spawn {
            if let Ok(child) = self.spawn("againpage-api", &[]) {
                self.api = Some(child);
                restarted = true;
            }
        }

        restarted
    }

    pub fn shutdown(&mut self) {
        // order: worker -> api -> (postgres stopped by caller)
        for child in [self.worker.take(), self.api.take()] {
            if let Some(mut c) = child { let _ = c.kill(); let _ = c.wait(); }
        }
    }
}
