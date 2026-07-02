from __future__ import annotations
import os
import httpx
from againpage.providers.base import Provider
from againpage.core.models import NoteDigest, ProviderHealth
from againpage.generation import prompts
from againpage.generation.schema import extract_json

class OllamaProvider(Provider):
    def __init__(self, endpoint: str = "http://localhost:11434", *,
                 api_key: str | None = None, http: httpx.AsyncClient | None = None):
        self.endpoint = endpoint.rstrip("/")
        self.api_key = api_key or os.environ.get("OLLAMA_API_KEY", "")
        self._http = http

    def _client(self) -> httpx.AsyncClient:
        headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
        return self._http or httpx.AsyncClient(headers=headers, timeout=300)

    async def _chat(self, model: str, system: str, user: str) -> str:
        client = self._client()
        try:
            res = await client.post(f"{self.endpoint}/api/chat", json={
                "model": model, "stream": False,
                "messages": [{"role": "system", "content": system},
                             {"role": "user", "content": user}]})
            res.raise_for_status()
            return res.json()["message"]["content"]
        finally:
            if self._http is None:
                await client.aclose()

    async def summarize(self, title: str, body: str, *, model: str) -> NoteDigest:
        content = await self._chat(model, prompts.PER_NOTE_SYSTEM, prompts.per_note_user(title, body))
        return NoteDigest(**extract_json(content))

    async def embed(self, text: str, *, model: str, task: str = "clustering") -> list[float]:
        client = self._client()
        try:
            res = await client.post(f"{self.endpoint}/api/embeddings", json={"model": model, "prompt": text})
            res.raise_for_status()
            return res.json()["embedding"]
        finally:
            if self._http is None:
                await client.aclose()

    async def generate(self, payload: dict, *, model: str) -> dict:
        wc = payload.get("target_word_count", 1200)
        system = prompts.WRITER_SYSTEM.replace("{target_word_count}", str(wc))
        content = await self._chat(model, system, prompts.writer_user(payload))
        return extract_json(content)

    async def health(self, *, models: list[str]) -> ProviderHealth:
        client = self._client()
        try:
            res = await client.get(f"{self.endpoint}/api/tags")
            res.raise_for_status()
            available = {m["name"] for m in res.json().get("models", [])}
        except Exception as e:  # noqa: BLE001
            return ProviderHealth(ok=False, reachable=False, models={m: False for m in models}, detail=str(e)[:200])
        finally:
            if self._http is None:
                await client.aclose()
        results = {m: (m in available) for m in models}
        return ProviderHealth(ok=bool(models) and all(results.values()), reachable=True, models=results)
