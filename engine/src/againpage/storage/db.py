from psycopg_pool import AsyncConnectionPool

DEFAULT_DSN = "postgresql://postgres:dev@localhost:5432/againpage"

def make_pool(dsn: str = DEFAULT_DSN, *, open: bool = True) -> AsyncConnectionPool:
    return AsyncConnectionPool(conninfo=dsn, min_size=1, max_size=8, open=open)
