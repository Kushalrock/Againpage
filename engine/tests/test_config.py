import os
from pathlib import Path
from againpage.config import load_env


def test_load_env_sets_unset_keys_and_strips_quotes(tmp_path: Path):
    env = tmp_path / ".env"
    env.write_text('# a comment\nOPENROUTER_API_KEY="sk-or-xyz"\n\nFOO=bar\n')
    os.environ.pop("OPENROUTER_API_KEY", None)
    os.environ.pop("FOO", None)
    try:
        loaded = load_env(extra=[env])
        assert env in loaded
        assert os.environ["OPENROUTER_API_KEY"] == "sk-or-xyz"   # quotes stripped
        assert os.environ["FOO"] == "bar"
    finally:
        os.environ.pop("OPENROUTER_API_KEY", None)
        os.environ.pop("FOO", None)


def test_load_env_does_not_override_the_real_environment(tmp_path: Path):
    env = tmp_path / ".env"
    env.write_text("OPENROUTER_API_KEY=from-file\n")
    os.environ["OPENROUTER_API_KEY"] = "from-shell"
    try:
        load_env(extra=[env])
        assert os.environ["OPENROUTER_API_KEY"] == "from-shell"   # exported var wins
    finally:
        os.environ.pop("OPENROUTER_API_KEY", None)


def test_load_env_missing_file_is_harmless(tmp_path: Path):
    assert load_env(extra=[tmp_path / "nope.env"]) == []
