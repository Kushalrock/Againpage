from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from againpage.storage.repository import Repository
from againpage.queue.queue import Queue
from againpage.api.routes import make_router

def create_app(repo: Repository) -> FastAPI:
    app = FastAPI(title="AgainPage")
    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
    queue = Queue(repo.pool)
    app.include_router(make_router(repo, queue))
    return app

def main() -> None:
    import os, asyncio, uvicorn
    from againpage.storage import db, migrate
    from againpage.storage.repository import Repository
    from againpage.config import load_env
    load_env()   # pull DATABASE_URL / provider keys from a .env file if present
    port = int(os.environ.get("AGAINPAGE_API_PORT", "8000"))
    dsn = os.environ.get("DATABASE_URL", db.DEFAULT_DSN)

    async def _amain() -> None:
        pool = db.make_pool(dsn, open=False)
        await pool.open()
        await migrate.apply(pool)
        repo = Repository(pool)
        await repo.ensure_local_user()
        app = create_app(repo)
        config = uvicorn.Config(app, host="127.0.0.1", port=port, loop="asyncio")
        await uvicorn.Server(config).serve()

    asyncio.run(_amain())

if __name__ == "__main__":
    main()
