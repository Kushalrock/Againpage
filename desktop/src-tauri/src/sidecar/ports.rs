pub fn free_port() -> u16 {
    std::net::TcpListener::bind("127.0.0.1:0")
        .and_then(|l| l.local_addr())
        .map(|a| a.port())
        .expect("no free port")
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn free_port_is_nonzero_and_bindable() {
        let p = free_port();
        assert!(p > 0);
        // the port is free right now → we can bind it
        assert!(std::net::TcpListener::bind(("127.0.0.1", p)).is_ok());
    }
}
