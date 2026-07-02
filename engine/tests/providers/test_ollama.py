import json, httpx, respx
from againpage.providers.ollama import OllamaProvider

@respx.mock
async def test_generate_from_ollama_chat():
    body = json.dumps({"title":"T","dek":"d","standfirst":"s","sources":["a"],"lead":"x",
        "connections":[],"standalone_summaries":[],"questions":[],"apply":[],"wildcard":None,"forgotten":None})
    respx.post("http://localhost:11434/api/chat").mock(
        return_value=httpx.Response(200, json={"message":{"content":body}}))
    p = OllamaProvider("http://localhost:11434")
    out = await p.generate({"target_word_count": 900}, model="llama3.1:70b")
    assert out["title"] == "T"

@respx.mock
async def test_embed_and_health():
    respx.post("http://localhost:11434/api/embeddings").mock(
        return_value=httpx.Response(200, json={"embedding":[0.5,0.6]}))
    respx.get("http://localhost:11434/api/tags").mock(
        return_value=httpx.Response(200, json={"models":[{"name":"llama3.1:8b"}]}))
    p = OllamaProvider("http://localhost:11434")
    assert await p.embed("hi", model="nomic-embed-text") == [0.5, 0.6]
    h = await p.health(models=["llama3.1:8b"])
    assert h.reachable and h.models["llama3.1:8b"] is True
