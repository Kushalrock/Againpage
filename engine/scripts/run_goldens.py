import argparse
import asyncio
import glob
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
from againpage.providers.openrouter import OpenRouterProvider
from againpage.generation.writer import compose_issue


async def _run(model: str) -> None:
    for f in sorted(glob.glob(os.path.join(os.path.dirname(__file__), "..", "goldens", "*.json"))):
        payload = json.load(open(f))
        issue = await compose_issue(payload, OpenRouterProvider(), writer_model=model)
        print(f"\n===== {os.path.basename(f)} =====\n{issue.model_dump_json(indent=2)}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="anthropic/claude-sonnet-4.6")
    asyncio.run(_run(ap.parse_args().model))
