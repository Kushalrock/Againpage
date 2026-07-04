from datetime import time
from uuid import uuid4
from againpage.core.models import SettingsRow
from againpage.providers.factory import make_provider, RoutingProvider
from againpage.providers.openrouter import OpenRouterProvider
from againpage.providers.ollama import OllamaProvider

def _settings(provider: str) -> SettingsRow:
    return SettingsRow(user_id=uuid4(), vault_path=None, excluded_paths=[], profile_text=None,
        cadence_days=1, delivery_time=time(7), reading_min=5, notes_per_issue=3,
        provider=provider, ollama_endpoint="http://localhost:11434",
        embed_model=None, summary_model=None, writer_model=None)

def test_openrouter_and_ollama():
    assert isinstance(make_provider(_settings("openrouter")), OpenRouterProvider)
    assert isinstance(make_provider(_settings("ollama")), OllamaProvider)

def test_custom_routes_by_prefix():
    r = make_provider(_settings("custom"))
    assert isinstance(r, RoutingProvider)
    assert isinstance(r._route("openrouter/openai/gpt-5")[0], OpenRouterProvider)
    assert r._route("openrouter/openai/gpt-5")[1] == "openai/gpt-5"
    assert isinstance(r._route("ollama/qwen3:8b")[0], OllamaProvider)
    assert r._route("ollama/qwen3:8b")[1] == "qwen3:8b"
