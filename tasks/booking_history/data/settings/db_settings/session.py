from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from settings import settings


async_engine = create_async_engine(url=settings.database_url, echo=True)

async_session = async_sessionmaker(async_engine)
