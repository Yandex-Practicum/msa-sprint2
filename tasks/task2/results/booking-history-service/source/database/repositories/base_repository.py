from sqlalchemy.ext.asyncio import AsyncSession, AsyncSessionTransaction


class BaseRepository:
    def __init__(
        self,
        db_session: AsyncSession,
    ):
        self._db_session = db_session

    def get_transaction(self) -> AsyncSessionTransaction:
        if self._db_session.in_transaction():
            return self._db_session.begin_nested()

        return self._db_session.begin()


__all__ = [
    "BaseRepository",
]
