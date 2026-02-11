import logging
import time

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from config import settings

logger = logging.getLogger(__name__)

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine)


class Base(DeclarativeBase):
    pass


def init_db() -> None:
    from models import BookingHistory  # noqa: F401

    for attempt in range(30):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            Base.metadata.create_all(engine)
            logger.info("History DB initialized")
            return
        except Exception as e:
            logger.warning("DB not ready (attempt %d/30): %s", attempt + 1, e)
            time.sleep(2)

    raise RuntimeError("Could not connect to history DB after 30 attempts")
