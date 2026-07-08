from pgvector.psycopg import register_vector_async
from psycopg import AsyncConnection
from psycopg.rows import tuple_row
from psycopg_pool import AsyncConnectionPool

DEFAULT_DSN = "postgresql://postgres:dev@localhost:5432/againpage"


async def ensure_vector_extension(dsn: str = DEFAULT_DSN) -> None:
    """Create the pgvector ``vector`` extension if it's missing, over a plain
    connection that does NOT register the vector codec.

    The pool's ``_configure`` runs ``register_vector_async`` on every connection,
    which fails with "vector type not found in the database" on a brand-new
    database — so the pool can't even open to run the migration that would create
    the extension. This bootstraps it first. Idempotent; safe on every boot."""
    async with await AsyncConnection.connect(dsn, autocommit=True) as conn:
        await conn.execute("CREATE EXTENSION IF NOT EXISTS vector")


async def _configure(conn):
    # Register pgvector's type adapters (vector <-> list[float]) on every
    # connection the pool creates. This is independent of row_factory: it
    # registers codecs for the `vector` type, not row shape.
    await register_vector_async(conn)


async def _reset(conn):
    # Repository methods borrow pooled connections and set conn.row_factory =
    # dict_row for their own use. psycopg's AsyncConnectionPool reuses
    # connections and does NOT reset row_factory on return, so without this
    # the dict_row setting leaks to the next borrower (e.g. Queue.enqueue,
    # which indexes fetchone() results by position and would raise
    # KeyError: 0 on a dict row). Restore the default here on every return.
    conn.row_factory = tuple_row


def make_pool(dsn: str = DEFAULT_DSN, *, open: bool = True) -> AsyncConnectionPool:
    return AsyncConnectionPool(
        conninfo=dsn, min_size=1, max_size=8, open=open,
        configure=_configure, reset=_reset)
