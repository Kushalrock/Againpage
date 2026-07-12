from againpage.generation import prompts


def test_per_note_prompt_forbids_invention():
    assert "Add nothing not in the note" in prompts.PER_NOTE_SYSTEM
    u = prompts.per_note_user("Amor Fati", "body text")
    assert "Amor Fati" in u and "body text" in u


def test_writer_prompt_has_schema_and_rules():
    system = prompts.compose_writer_system(None, 1200)
    assert "Use ONLY the payload. Invent nothing." in system
    assert "discovery" in system and "reminder" in system
