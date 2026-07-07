"""Reset the AgainPage database to a clean, freshly-migrated state.

DESTRUCTIVE: drops the entire `public` schema (all notes, themes, editions,
settings, jobs) and re-applies every migration. Targets DATABASE_URL (or a
.env / the dev default). Run via `pnpm db:reset`.
"""
import asyncio
import os

from againpage.config import load_env
from againpage.storage import db, migrate


async def _main() -> None:
    load_env()
    dsn = os.environ.get("DATABASE_URL", db.DEFAULT_DSN)
    pool = db.make_pool(dsn, open=False)
    await pool.open()
    async with pool.connection() as conn:
        await conn.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
    applied = await migrate.apply(pool)
    await pool.close()
    print(f"reset {dsn} — applied {len(applied)} migration(s): {', '.join(applied)}")


if __name__ == "__main__":
    asyncio.run(_main())
