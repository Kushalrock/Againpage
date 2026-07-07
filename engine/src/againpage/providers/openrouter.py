from __future__ import annotations
import os
import httpx
from againpage.providers.base import Provider
from againpage.core.models import NoteDigest, ProviderHealth
from againpage.generation import prompts
from againpage.generation.schema import extract_json


def _check(res: httpx.Response, model: str) -> None:
    """Raise with the model name AND OpenRouter's response body — a bare
    raise_for_status() hides *why* (e.g. an unknown model slug → 400)."""
    if res.is_error:
        raise httpx.HTTPStatusError(
            f"OpenRouter {res.status_code} for model {model!r}: {res.text[:500].strip()}",
            request=res.request, response=res)


class OpenRouterProvider(Provider):
    def __init__(self, api_key: str | None = None, *, base_url: str = "https://openrouter.ai/api/v1",
                 http: httpx.AsyncClient | None = None):
        self.api_key = api_key or os.environ.get("OPENROUTER_API_KEY", "")
        self.base_url = base_url
        self._http = http

    def _client(self) -> httpx.AsyncClient:
        return self._http or httpx.AsyncClient(
            headers={"Authorization": f"Bearer {self.api_key}"}, timeout=120)

    async def _chat(self, model: str, system: str, user: str) -> str:
        client = self._client()
        try:
            res = await client.post(f"{self.base_url}/chat/completions", json={
                "model": model,
                "messages": [{"role": "system", "content": system},
                             {"role": "user", "content": user}]})
            _check(res, model)
            return res.json()["choices"][0]["message"]["content"]
        finally:
            if self._http is None:
                await client.aclose()

    async def summarize(self, title: str, body: str, *, model: str) -> NoteDigest:
        content = await self._chat(model, prompts.PER_NOTE_SYSTEM, prompts.per_note_user(title, body))
        return NoteDigest(**extract_json(content))

    async def embed(self, text: str, *, model: str, task: str = "clustering") -> list[float]:
        client = self._client()
        try:
            res = await client.post(f"{self.base_url}/embeddings", json={"model": model, "input": text})
            _check(res, model)
            return res.json()["data"][0]["embedding"]
        finally:
            if self._http is None:
                await client.aclose()

    async def generate(self, payload: dict, *, model: str) -> dict:
        wc = payload.get("target_word_count", 1200)
        system = prompts.WRITER_SYSTEM.replace("{target_word_count}", str(wc))
        content = await self._chat(model, system, prompts.writer_user(payload))
        return extract_json(content)

    async def expand_note(self, title: str, body: str, *, model: str) -> str:
        return await self._chat(model, prompts.NOTE_EXPAND_SYSTEM, prompts.note_expand_user(title, body))

    async def health(self, *, models: list[str]) -> ProviderHealth:
        results: dict[str, bool] = {}
        detail = ""
        for m in models:
            try:
                await self._chat(m, "ping", "reply with 'ok'")
                results[m] = True
            except Exception as e:  # noqa: BLE001
                results[m] = False
                detail = str(e)[:200]
        ok = bool(models) and all(results.values())
        return ProviderHealth(ok=ok, reachable=any(results.values()), models=results, detail=detail)
