# AgainPage engine — serves both the API and the worker (command selects which).
FROM python:3.14-slim

# uv (fast, deterministic installs from uv.lock)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Build tools as a safety net for any dependency without a 3.14 wheel.
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV UV_LINK_MODE=copy \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH"

# Install deps against the locked versions. Copy the metadata + sources the
# hatchling build backend needs (pyproject declares the README, so include it).
COPY pyproject.toml uv.lock README.md ./
COPY src ./src
RUN uv sync --frozen --no-dev

# The API binds 0.0.0.0 inside the container so the published port is reachable.
ENV AGAINPAGE_API_HOST=0.0.0.0
EXPOSE 8000

# Overridden by docker-compose: `againpage-api` or `againpage-worker`.
CMD ["againpage-api"]
