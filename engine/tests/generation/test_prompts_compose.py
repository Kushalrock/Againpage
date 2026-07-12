from againpage.generation import prompts


def test_writer_default_voice_plus_contract():
    s = prompts.compose_writer_system(None, 1200)
    assert s.startswith(prompts.WRITER_VOICE)
    assert "Schema:" in s and '"connections"' in s        # contract/schema present
    assert "~1200 words" in s                              # word count substituted


def test_writer_custom_voice_keeps_contract():
    s = prompts.compose_writer_system("SPEAK LIKE A PIRATE.", 800)
    assert s.startswith("SPEAK LIKE A PIRATE.")
    assert "Output strict JSON per schema" in s            # contract still appended
    assert "Schema:" in s and "~800 words" in s


def test_writer_blank_override_falls_back_to_default():
    assert prompts.compose_writer_system("   ", 500).startswith(prompts.WRITER_VOICE)


def test_note_expand_default_and_word_count():
    s = prompts.compose_note_expand_system(None, 500)
    assert s.startswith(prompts.NOTE_EXPAND_VOICE)
    assert "~500 words" in s and "Markdown" in s
    s2 = prompts.compose_note_expand_system("Be terse.", 300)
    assert s2.startswith("Be terse.") and "~300 words" in s2
