from pathlib import Path
from againpage.vault.scan import scan_vault

def test_scan_finds_md_and_honors_excludes(tmp_path: Path):
    (tmp_path / "a.md").write_text("# A")
    (tmp_path / "note.txt").write_text("nope")
    (tmp_path / "Templates").mkdir(); (tmp_path / "Templates" / "t.md").write_text("# T")
    (tmp_path / "sub").mkdir(); (tmp_path / "sub" / "b.md").write_text("# B")
    found = scan_vault(str(tmp_path), excluded=["./Templates"])
    names = sorted(Path(f).name for f in found)
    assert names == ["a.md", "b.md"]
