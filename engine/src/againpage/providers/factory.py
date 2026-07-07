from __future__ import annotations
from againpage.core.models import SettingsRow, NoteDigest, ProviderHealth
from againpage.providers.base import Provider
from againpage.providers.openrouter import OpenRouterProvider
from againpage.providers.ollama import OllamaProvider

class RoutingProvider(Provider):
    """For 'custom': dispatch each call by model-name prefix (openrouter/… | ollama/…)."""
    def __init__(self, openrouter: OpenRouterProvider, ollama: OllamaProvider):
        self.openrouter = openrouter
        self.ollama = ollama

    def _route(self, model: str) -> tuple[Provider, str]:
        prefix, _, rest = model.partition("/")
        if prefix == "ollama":
            return self.ollama, rest
        if prefix == "openrouter":
            return self.openrouter, rest
        return self.openrouter, model  # default

    async def summarize(self, title, body, *, model):
        p, m = self._route(model); return await p.summarize(title, body, model=m)
    async def embed(self, text, *, model, task="clustering"):
        p, m = self._route(model); return await p.embed(text, model=m, task=task)
    async def generate(self, payload, *, model):
        p, m = self._route(model); return await p.generate(payload, model=m)
    async def expand_note(self, title, body, *, model):
        p, m = self._route(model); return await p.expand_note(title, body, model=m)
    async def health(self, *, models):
        merged: dict[str, bool] = {}
        reachable = False
        for full in models:
            p, m = self._route(full)
            h = await p.health(models=[m])
            merged[full] = h.models.get(m, False)
            reachable = reachable or h.reachable
        return ProviderHealth(ok=bool(models) and all(merged.values()), reachable=reachable, models=merged)

def make_provider(settings: SettingsRow) -> Provider:
    # Keys come from settings (entered via the UI); each provider falls back to
    # its env var when the settings key is empty.
    or_key = settings.openrouter_key or None
    ol_key = settings.ollama_key or None
    if settings.provider == "ollama":
        return OllamaProvider(settings.ollama_endpoint, api_key=ol_key)
    if settings.provider == "custom":
        return RoutingProvider(OpenRouterProvider(or_key),
                               OllamaProvider(settings.ollama_endpoint, api_key=ol_key))
    return OpenRouterProvider(or_key)
