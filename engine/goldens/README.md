# Golden-Set Harness

This directory contains hand-authored golden payloads for M1 quality iteration.

## What Are Goldens?

Each golden payload is a complete, self-contained `Payload` dict (see `engine/src/againpage/core/models.py::Payload`) that exercises the full writing pipeline. The payloads are designed to test real-world scenarios and enable rapid iteration on the WRITER_SYSTEM prompt.

- **amor_fati.json**: A complete payload themed "Amor Fati: Loving What Is" with anchor notes, fresh notes with full text, multiple connections with flavors, a wildcard bridge, and a forgotten nudge.

## Manual Quality Gate

This is the M1 deliverable: human review of composed issues before they reach readers.

### How to Use

1. **Get an OpenRouter API key** from https://openrouter.ai if you don't have one.

2. **Run the CLI with your key:**
   ```bash
   cd engine
   OPENROUTER_API_KEY=sk-... uv run python scripts/run_goldens.py
   ```

3. **Optional: Specify a different model:**
   ```bash
   OPENROUTER_API_KEY=sk-... uv run python scripts/run_goldens.py --model "anthropic/claude-opus"
   ```

4. **Read the output** carefully:
   - Does the **lead** genuinely synthesize the notes or just recap them?
   - Do **connections** explain the *why* (not just name the relationship)?
   - Are all details **sourced from the payload** (no invention)?
   - Is the **profile** used only where connections are genuine?
   - Do **questions** provoke thinking rather than test recall?
   - Does the **wildcard** feel authentic or forced?

5. **Iterate the prompt**: Edit `engine/src/againpage/generation/prompts.py::WRITER_SYSTEM` to improve quality, then re-run.

6. **Validate via the test** (runs with a mocked provider, no API):
   ```bash
   cd engine
   uv run pytest tests/generation/test_goldens.py -v
   ```

## Payload Requirements

Each golden payload must include all §13 fields per the Payload schema:

- `date`, `issue_no`: metadata (optional but recommended)
- `reading_minutes`: 3–15 (sets `target_word_count` and `include` sections)
- `target_word_count`: auto-computed from `reading_minutes`
- `include`: auto-computed sections list
- `theme`: the day's theme
- `anchor`: a dict with `title` and `body` (the main note)
- `fresh`: a list of dicts with `title` and `body` (supporting notes)
- `connections_found`: a list of dicts with `flavor` (discovery|reminder), `a`, `b`, `overlap`, `text`
- `wildcard`: optional; a dict with `bridge` and `trivia`
- `forgotten`: optional; a dict with `note` and `nudge`
- `profile`: optional reader context string

## Testing

The fast unit test (`tests/generation/test_goldens.py`) uses a `FakeProvider` that returns canned VALID JSON and asserts each golden composes + validates to an `IssueContent`. It **never calls the real API** and requires no environment setup.

Run:
```bash
cd engine
uv run pytest tests/generation/test_goldens.py -v
```

This test is part of CI; the manual CLI is for M1 quality iteration only.
