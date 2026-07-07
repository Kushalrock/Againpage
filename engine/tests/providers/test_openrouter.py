import json, httpx, respx
from againpage.providers.openrouter import OpenRouterProvider

def _chat(content: str):
    return httpx.Response(200, json={"choices":[{"message":{"content":content}}]})

@respx.mock
async def test_summarize_parses_digest():
    respx.post("https://openrouter.ai/api/v1/chat/completions").mock(
        return_value=_chat(json.dumps({"substantive":True,"summary":"s","tags":["x"]})))
    p = OpenRouterProvider(api_key="sk-test")
    d = await p.summarize("T", "body", model="anthropic/claude-haiku-4.5")
    assert d.substantive and d.summary == "s"

@respx.mock
async def test_generate_returns_dict():
    payload_json = json.dumps({"title":"T","dek":"d","standfirst":"s","sources":["a"],
        "lead":"x","connections":[],"standalone_summaries":[],"questions":[],
        "apply":[],"wildcard":None,"forgotten":None})
    respx.post("https://openrouter.ai/api/v1/chat/completions").mock(return_value=_chat(payload_json))
    p = OpenRouterProvider(api_key="sk-test")
    out = await p.generate({"target_word_count": 1000, "include": []}, model="anthropic/claude-sonnet-4.6")
    assert out["title"] == "T"

@respx.mock
async def test_embed_returns_vector():
    respx.post("https://openrouter.ai/api/v1/embeddings").mock(
        return_value=httpx.Response(200, json={"data":[{"embedding":[0.1,0.2,0.3]}]}))
    p = OpenRouterProvider(api_key="sk-test")
    v = await p.embed("hello", model="google/gemini-embedding")
    assert v == [0.1, 0.2, 0.3]

@respx.mock
async def test_health_pings_each_model():
    respx.post("https://openrouter.ai/api/v1/chat/completions").mock(return_value=_chat("ok"))
    p = OpenRouterProvider(api_key="sk-test")
    h = await p.health(models=["anthropic/claude-sonnet-4.6"])
    assert h.ok and h.models["anthropic/claude-sonnet-4.6"] is True

@respx.mock
async def test_error_surfaces_model_and_body():
    respx.post("https://openrouter.ai/api/v1/chat/completions").mock(
        return_value=httpx.Response(400, json={"error": {"message": "not a valid model id"}}))
    p = OpenRouterProvider(api_key="sk-test")
    try:
        await p.summarize("T", "body", model="google/gemini-3.5-flash-lite")
        assert False, "expected an error"
    except httpx.HTTPStatusError as e:
        assert "google/gemini-3.5-flash-lite" in str(e)      # names the offending model
        assert "not a valid model id" in str(e)              # includes OpenRouter's reason

@respx.mock
async def test_expand_note_returns_prose():
    respx.post("https://openrouter.ai/api/v1/chat/completions").mock(
        return_value=_chat("A long, detailed standalone summary of the note."))
    p = OpenRouterProvider(api_key="sk-test")
    out = await p.expand_note("Amor Fati", "the note body", model="openai/gpt-4o-mini")
    assert out == "A long, detailed standalone summary of the note."
