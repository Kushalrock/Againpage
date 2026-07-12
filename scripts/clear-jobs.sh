#!/usr/bin/env bash
# Clear the Againpage job queue: delete queued jobs and cancel running ones.
#
# Use when the queue is flooded or stuck (e.g. a backlog piled up before an
# indexing fix), or to force the reader's Generate / Re-index buttons to
# re-enable — those grey out while any job is queued/running, so an empty
# queue re-enables them within a couple seconds.
#
# Jobs are transient. After clearing, the periodic sync re-indexes changed
# notes on its next tick; you can also hit Re-index in the app.
#
#   ./scripts/clear-jobs.sh            # clear ALL job types
#   ./scripts/clear-jobs.sh ingest     # clear only 'ingest' (or cluster|generate)
#
# Run from the repo root (where docker-compose.yaml lives). Honors
# POSTGRES_PASSWORD (defaults to 'dev', matching docker-compose).
set -euo pipefail

PW="${POSTGRES_PASSWORD:-dev}"
TYPE="${1:-}"

if [ -n "$TYPE" ] && ! printf '%s' "$TYPE" | grep -qE '^(ingest|cluster|generate)$'; then
  echo "unknown job type: '$TYPE' (use ingest | cluster | generate, or no argument for all)" >&2
  exit 1
fi
FILTER=""
[ -n "$TYPE" ] && FILTER="AND type = '$TYPE'"

psql() { docker compose exec -T -e PGPASSWORD="$PW" db psql -U postgres -d againpage -v ON_ERROR_STOP=1 "$@"; }

echo "== job counts before =="
psql -c "SELECT type, status, count(*) FROM jobs GROUP BY type, status ORDER BY type, status;"

psql -c "DELETE FROM jobs WHERE status='queued' $FILTER;
         UPDATE jobs SET status='cancelled' WHERE status='running' $FILTER;"

echo "== job counts after =="
psql -c "SELECT type, status, count(*) FROM jobs GROUP BY type, status ORDER BY type, status;"

echo "Done — queued jobs deleted, running jobs marked cancelled (the worker stops them at its next check)."
echo "The reader's Generate / Re-index buttons re-enable within ~a couple seconds."
