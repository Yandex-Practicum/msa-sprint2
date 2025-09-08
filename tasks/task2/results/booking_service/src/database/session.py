from sqlalchemy.ext.asyncio import AsyncSession

from .engine import get_database


async def get_session() -> AsyncSession:
    async with get_database().async_session() as session:
        try:
            yield session
        except Exception as ex:
            await session.rollback()
            raise ex
        finally:
            await session.commit()
            await session.close()

__all__ = [
    "get_session",
]