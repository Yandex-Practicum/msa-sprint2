import logging
from functools import lru_cache
from typing import Any

from orjson import orjson
from pydantic import PostgresDsn
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from source.settings import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


class PostgresClient:
    def __init__(
        self,
        dsn: str | PostgresDsn,
        pool_size: int,
        pool_max_overflow: int,
        pool_echo: bool = False,
        echo: bool = False,
    ) -> None:
        self.engine = create_async_engine(
            dsn + "?prepared_statement_cache_size=0",
            echo=echo,
            echo_pool=pool_echo,
            pool_pre_ping=True,
            pool_size=pool_size,
            max_overflow=pool_max_overflow,
            future=True,
            connect_args={"statement_cache_size": 0},
            json_serializer=PostgresClient.orjson_serializer,
            json_deserializer=orjson.loads,
        )
        self.async_session = async_sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=self.engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )

    @staticmethod
    async def is_healthy(session: AsyncSession) -> bool:
        try:
            query = await session.execute(text("SELECT 1"))
            return query.scalars().all() == [1]
        except Exception as exc:
            logger.exception(f"Error: {exc}")
            return False

    @staticmethod
    def orjson_serializer(obj: Any) -> Any:
        return orjson.dumps(obj, option=orjson.OPT_NAIVE_UTC | orjson.OPT_SERIALIZE_UUID).decode()


@lru_cache
def get_database() -> PostgresClient:
    settings = get_settings()
    return PostgresClient(
        dsn=settings.POSTGRES_DSN,
        pool_size=settings.POOL_SIZE,
        pool_max_overflow=settings.POOL_MAX_OVERFLOW,
        echo=settings.IS_DEBUG_MODE,
    )
