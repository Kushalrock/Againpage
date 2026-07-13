import httpx
from datetime import timedelta
from againpage.worker.loop import retry_after, MAX_JOB_ATTEMPTS


def _http_error(code: int) -> httpx.HTTPStatusError:
    req = httpx.Request("POST", "https://openrouter.ai/api/v1/chat/completions")
    res = httpx.Response(code, request=req)
    return httpx.HTTPStatusError(f"{code}", request=req, response=res)


def test_permanent_4xx_is_not_retried():
    # 402 out-of-credits, 401 bad key, 400/404 bad model — retrying can't help.
    for code in (400, 401, 402, 404):
        assert retry_after(_http_error(code), attempts=1) is None


def test_rate_limit_and_5xx_are_retried():
    assert retry_after(_http_error(429), attempts=1) is not None   # transient
    assert retry_after(_http_error(500), attempts=1) is not None   # server error
    assert retry_after(RuntimeError("boom"), attempts=1) is not None  # unknown → retry


def test_retries_are_capped():
    # Under the cap → a backoff delay; at/over the cap → give up.
    assert isinstance(retry_after(RuntimeError("x"), attempts=MAX_JOB_ATTEMPTS - 1), timedelta)
    assert retry_after(RuntimeError("x"), attempts=MAX_JOB_ATTEMPTS) is None
    assert retry_after(_http_error(500), attempts=MAX_JOB_ATTEMPTS) is None


def test_backoff_is_bounded_to_60s():
    assert retry_after(RuntimeError("x"), attempts=2) == timedelta(seconds=4)
    # 2**large would explode; it's clamped to 60s.
    assert retry_after(RuntimeError("x"), attempts=3, max_attempts=99) == timedelta(seconds=8)
    assert retry_after(RuntimeError("x"), attempts=20, max_attempts=99) == timedelta(seconds=60)
