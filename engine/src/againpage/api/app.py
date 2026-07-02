from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from againpage.storage.repository import Repository
from againpage.api.routes import make_router

def create_app(repo: Repository) -> FastAPI:
    app = FastAPI(title="AgainPage")
    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
    app.include_router(make_router(repo))
    return app

def main() -> None:
    import os, uvicorn
    from againpage.storage import db, migrate
    from againpage.storage.seed import seed_sample_issue
    import asyncio
    pool = db.make_pool(os.environ.get("DATABASE_URL", db.DEFAULT_DSN))
    async def _boot() -> Repository:
        await migrate.apply(pool)
        repo = Repository(pool)
        uid = await repo.ensure_local_user()
        if (await repo.latest_issue(uid)) is None:
            await seed_sample_issue(repo, uid)
        return repo
    repo = asyncio.run(_boot())
    uvicorn.run(create_app(repo), host="127.0.0.1", port=8000)

if __name__ == "__main__":
    main()
