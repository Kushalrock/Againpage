from againpage.generation.payload import build_include, word_target, manual_payload

def test_word_target_matches_reader():
    assert word_target(7) == 1540 and word_target(3) == 660

def test_include_scales():
    assert "wildcard" not in build_include(3)
    assert "wildcard" in build_include(15) and "forgotten" in build_include(15)
    assert set(build_include(3)) >= {"masthead", "lead", "connections", "questions"}

def test_manual_payload_carries_word_target_and_include():
    p = manual_payload(reading_minutes=7, theme="Amor Fati", anchor={"title":"x","text":"y"},
                        fresh=[], connections_found=[], profile="")
    assert p["target_word_count"] == 1540 and "lead" in p["include"]
