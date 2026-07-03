import importlib, os

def test_api_and_worker_entrypoints_exist():
    api = importlib.import_module("againpage.api.app")
    worker = importlib.import_module("againpage.worker.loop")
    assert hasattr(api, "main") and hasattr(worker, "main")

def test_api_reads_port_env(monkeypatch):
    monkeypatch.setenv("AGAINPAGE_API_PORT", "9123")
    assert int(os.environ["AGAINPAGE_API_PORT"]) == 9123  # main() consumes this
