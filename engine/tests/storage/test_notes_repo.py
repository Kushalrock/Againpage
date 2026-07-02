import os
from uuid import uuid4
from againpage.storage import db, migrate
from againpage.storage.repository import Repository
from againpage.core.models import NewNote, LinkEdge

async def _repo() -> Repository:
    pool = db.make_pool(os.environ.get("DATABASE_URL", db.DEFAULT_DSN))
    async with pool.connection() as conn:
        await conn.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
    await migrate.apply(pool)
    return Repository(pool)

def _note(uid, path, vec, h="h1"):
    return NewNote(user_id=uid, vault_path=path, title=path, content_hash=h,
                   substantive=True, summary="s", tags=["t"], embedding=vec)

async def test_upsert_is_idempotent_by_path():
    repo = await _repo(); uid = await repo.ensure_local_user()
    a = await repo.upsert_note(_note(uid, "a.md", [0.0]*768))
    b = await repo.upsert_note(_note(uid, "a.md", [0.0]*768, h="h2"))
    assert a.id == b.id and b.content_hash == "h2"

async def test_deactivate_missing():
    repo = await _repo(); uid = await repo.ensure_local_user()
    await repo.upsert_note(_note(uid, "a.md", [0.0]*768))
    await repo.upsert_note(_note(uid, "b.md", [0.0]*768))
    n = await repo.deactivate_missing(uid, {"a.md"})
    active = {x.vault_path for x in await repo.active_notes(uid)}
    assert n == 1 and active == {"a.md"}

async def test_nearest_and_links():
    repo = await _repo(); uid = await repo.ensure_local_user()
    q = [1.0] + [0.0]*767
    near = await repo.upsert_note(_note(uid, "near.md", [0.99] + [0.0]*767))
    far = await repo.upsert_note(_note(uid, "far.md", [0.0]*767 + [1.0]))
    await repo.replace_links(near.id, [LinkEdge(dst_vault_path="far.md")])
    res = await repo.nearest_notes(q, limit=1, exclude=set())
    assert res[0].vault_path == "near.md" and res[0].similarity > 0.9
