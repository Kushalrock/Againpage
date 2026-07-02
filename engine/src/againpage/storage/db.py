from pgvector.psycopg import register_vector_async
from psycopg.rows import tuple_row
from psycopg_pool import AsyncConnectionPool

DEFAULT_DSN = "postgresql://postgres:dev@localhost:5432/againpage"


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
