from abc import ABC, abstractmethod
from againpage.core.models import NoteDigest, ProviderHealth

class Provider(ABC):
    @abstractmethod
    async def summarize(self, title: str, body: str, *, model: str) -> NoteDigest: ...
    @abstractmethod
    async def embed(self, text: str, *, model: str, task: str = "clustering") -> list[float]: ...
    @abstractmethod
    async def generate(self, payload: dict, *, model: str) -> dict: ...
    @abstractmethod
    async def health(self, *, models: list[str]) -> ProviderHealth: ...
    @abstractmethod
    async def expand_note(self, title: str, body: str, *, model: str) -> str:
        """A rich ~500-word standalone exposition of a single note (plain markdown)."""
