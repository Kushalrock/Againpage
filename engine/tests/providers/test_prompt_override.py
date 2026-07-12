from againpage.providers.openrouter import OpenRouterProvider


async def test_generate_uses_writer_override(monkeypatch):
    captured = {}

    async def fake_chat(self, model, system, user):
        captured["system"] = system
        return '{"title":"t","dek":"d","standfirst":"s","sources":[],"lead":"l"}'

    monkeypatch.setattr(OpenRouterProvider, "_chat", fake_chat)
    p = OpenRouterProvider("k", writer_prompt="TALK LIKE A CHEF.")
    await p.generate({"target_word_count": 900, "include": []}, model="m")
    assert captured["system"].startswith("TALK LIKE A CHEF.")
    assert "Schema:" in captured["system"] and "~900 words" in captured["system"]


async def test_expand_uses_note_expand_override_and_words(monkeypatch):
    captured = {}

    async def fake_chat(self, model, system, user):
        captured["system"] = system
        return "prose"

    monkeypatch.setattr(OpenRouterProvider, "_chat", fake_chat)
    p = OpenRouterProvider("k", note_expand_prompt="Be terse.", note_expand_words=250)
    await p.expand_note("T", "body", model="m")
    assert captured["system"].startswith("Be terse.") and "~250 words" in captured["system"]
