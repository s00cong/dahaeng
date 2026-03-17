"""livingcost crawler package."""

__all__ = ["run_batch"]


def run_batch(*args, **kwargs):
    # Lazy import so non-crawling scripts (e.g. seed script) do not require scrapling deps.
    from .runner import run_batch as _run_batch

    return _run_batch(*args, **kwargs)
