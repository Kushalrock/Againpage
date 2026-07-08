"""Fresh-database bootstrap: the pgvector extension must be created before the
type-registering pool opens, or the engine can't start on a brand-new DB
(the failure seen in production: "vector type not found in the database")."""
import os
import psycopg
from againpage.storage import db


async def test_ensure_vector_extension_lets_the_pool_open_on_a_fresh_db():
    base = os.environ["DATABASE_URL"]
    head, _, _ = base.rpartition("/")
    name = "againpage_vecboot_test"
    admin = f"{head}/postgres"
    fresh = f"{head}/{name}"

    # A brand-new database with NO vector extension (mirrors a fresh Docker volume).
    with psycopg.connect(admin, autocommit=True) as conn:
        conn.execute(f'DROP DATABASE IF EXISTS "{name}" WITH (FORCE)')
        conn.execute(f'CREATE DATABASE "{name}"')
    try:
        # Without this the pool can't even connect (register_vector fails).
        await db.ensure_vector_extension(fresh)

        # Now the type-registering pool opens and the extension is present.
        pool = db.make_pool(fresh, open=False)
        await pool.open()
        try:
            async with pool.connection() as conn:
                cur = await conn.execute("SELECT 1 FROM pg_extension WHERE extname = 'vector'")
                assert await cur.fetchone() is not None
        finally:
            await pool.close()

        await db.ensure_vector_extension(fresh)   # idempotent: a second call is a no-op
    finally:
        with psycopg.connect(admin, autocommit=True) as conn:
            conn.execute(f'DROP DATABASE IF EXISTS "{name}" WITH (FORCE)')
