from pathlib import Path
from psycopg_pool import AsyncConnectionPool

MIGRATIONS = Path(__file__).parent / "migrations"


async def apply(pool: AsyncConnectionPool) -> list[str]:
    async with pool.connection() as conn:
        await conn.execute(
            "CREATE TABLE IF NOT EXISTS schema_migrations "
            "(filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())")
        cur = await conn.execute("SELECT filename FROM schema_migrations")
        done = {r[0] for r in await cur.fetchall()}
    applied: list[str] = []
    for path in sorted(MIGRATIONS.glob("*.sql")):
        if path.name in done:
            continue
        sql = path.read_text()
        async with pool.connection() as conn:
            await conn.execute(sql)
            await conn.execute(
                "INSERT INTO schema_migrations(filename) VALUES (%s)", (path.name,))
        applied.append(path.name)
    return applied
