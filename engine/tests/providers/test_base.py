import pytest
from againpage.providers.base import Provider
from againpage.core.models import NoteDigest, ProviderHealth

def test_provider_is_abstract():
    with pytest.raises(TypeError):
        Provider()  # abstract — cannot instantiate

def test_note_digest_shape():
    d = NoteDigest(substantive=True, summary="s", tags=["a", "b"])
    assert d.substantive and d.tags == ["a", "b"]

def test_provider_health_defaults():
    h = ProviderHealth(ok=True, reachable=True, models={"m": True})
    assert h.detail == ""
