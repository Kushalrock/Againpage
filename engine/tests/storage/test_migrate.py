import os
from againpage.storage import db, migrate


async def test_migrate_creates_core_tables():
    pool = db.make_pool(os.environ.get("DATABASE_URL", db.DEFAULT_DSN))
    async with pool.connection() as conn:
        await conn.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
    applied = await migrate.apply(pool)
    async with pool.connection() as conn:
        cur = await conn.execute(
            "SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
        tables = {r[0] for r in await cur.fetchall()}
    await pool.close()
    assert "0001_init.sql" in applied
    assert {"users","notes","themes","note_themes","wikilinks","issues",
            "issue_notes","settings","jobs"} <= tables
