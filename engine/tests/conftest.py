"""Test-database isolation.

Storage tests run ``DROP SCHEMA public CASCADE`` to get a clean slate. Left on
the default DSN that means they wipe the *dev* database (and crash any running
worker/API). This session-scoped, autouse fixture points the whole suite at a
separate ``*_test`` database instead, created on demand — so running the tests
never touches dev data.

Override with ``TEST_DATABASE_URL`` to use an explicit test DSN.
"""
import os
import psycopg
import pytest
from againpage.storage import db


def _test_dsn() -> str:
    explicit = os.environ.get("TEST_DATABASE_URL")
    if explicit:
        return explicit
    base = os.environ.get("DATABASE_URL", db.DEFAULT_DSN)
    head, sep, tail = base.rpartition("/")
    if not sep:
        return base
    dbname = tail.split("?")[0]
    # Idempotent: don't append _test twice.
    if not dbname.endswith("_test"):
        dbname = f"{dbname}_test"
    return f"{head}/{dbname}"


def _ensure_database(dsn: str) -> None:
    head, _, tail = dsn.rpartition("/")
    dbname = tail.split("?")[0]
    admin = f"{head}/postgres"
    with psycopg.connect(admin, autocommit=True) as conn:
        exists = conn.execute("SELECT 1 FROM pg_database WHERE datname = %s", (dbname,)).fetchone()
        if not exists:
            conn.execute(f'CREATE DATABASE "{dbname}"')
    # make_pool registers the pgvector type on every connection, which requires
    # the extension to already exist — otherwise the pool times out with
    # "vector type not found". Create it before any pool opens.
    with psycopg.connect(dsn, autocommit=True) as conn:
        conn.execute("CREATE EXTENSION IF NOT EXISTS vector")


@pytest.fixture(scope="session", autouse=True)
def _isolated_test_db():
    dsn = _test_dsn()
    _ensure_database(dsn)
    os.environ["DATABASE_URL"] = dsn   # every test helper reads this at call time
    yield
