import functools
from contextlib import AsyncExitStack
from typing import Callable

from fastapi import Request
from fastapi.dependencies.models import Dependant
from fastapi.dependencies.utils import get_dependant, solve_dependencies


def auto_di(async_func: Callable):
    """
    A decorator designed to extract dependencies from a decorated
    async function and substitute them into the function call.
    The decorator should be used in cases, when there is no
    access to a FastAPI application instance.

    The implementation is based on https://github.com/fastapi/fastapi/issues/1105#issuecomment-1383227362
    """

    @functools.wraps(async_func)
    async def wrapper(*args, **kwargs):
        async with AsyncExitStack() as async_exit_stack:
            empty_http_request = Request(
                {"type": "http", "headers": [], "query_string": "", "fastapi_astack": async_exit_stack}
            )
            wrapped_fn_dependant: Dependant = get_dependant(path="", call=async_func)
            resolution_results = await solve_dependencies(
                request=empty_http_request,
                dependant=wrapped_fn_dependant,
                async_exit_stack=async_exit_stack,
                embed_body_fields=False,
            )
            merged_kwargs = {**kwargs, **resolution_results.values}

            return await async_func(*args, **merged_kwargs)

    return wrapper

__all__ = [
    "auto_di",
]