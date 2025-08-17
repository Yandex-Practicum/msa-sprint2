from logging import getLogger, INFO, basicConfig

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

basicConfig(level=INFO)


logger = getLogger("[HOTEL: MAIN]")


BASE_DIR = Path(__file__).parent.parent


class Setting(BaseSettings):
    DB_HOST: str | None = None
    DB_PORT: int | None = None
    DB_USER: str | None = None
    DB_PASS: str | None = None
    DB_NAME: str | None = None

    G_RPC_PORT: int | None = 9091

    @property
    def database_url(self):
        db_host = self.DB_HOST if self.DB_HOST is not None else "localhost"
        db_port = self.DB_PORT if self.DB_PORT is not None else "5433"
        db_user = self.DB_USER if self.DB_USER is not None else "hotel"
        db_pass = self.DB_PASS if self.DB_PASS is not None else "hotel"
        db_name = self.DB_NAME if self.DB_NAME is not None else "hotel"

        logger.info(f"{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}")

        if (
            self.DB_HOST is None
            and self.DB_PORT is None
            and self.DB_USER is None
            and self.DB_PASS is None
            and self.DB_NAME is None
        ):
            return f"postgresql+asyncpg://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}"

        return f"postgresql+asyncpg://{db_user}:{db_pass}@{db_host}/{db_name}"

    model_config = SettingsConfigDict(extra="allow")


settings = Setting()
