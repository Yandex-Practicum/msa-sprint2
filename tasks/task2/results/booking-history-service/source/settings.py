import os
from functools import lru_cache

from pydantic import field_validator, PostgresDsn, conint
from pydantic_core.core_schema import ValidationInfo
from pydantic_settings import BaseSettings, SettingsConfigDict

APP_ENV = os.getenv("ENVIRONMENT", "local")
env_path = os.path.join(os.getcwd(), ".env.local")

class Settings(BaseSettings):
    # DATABASE
    POSTGRES_PORT: int
    POOL_MAX_OVERFLOW: conint(ge=0) = 20
    POOL_SIZE: conint(ge=0) = 20
    POSTGRES_DB: str
    POSTGRES_HOST: str
    POSTGRES_PASSWORD: str
    POSTGRES_USER: str
    POSTGRES_DSN: str | None = None

    @field_validator("POSTGRES_DSN")
    @classmethod
    def assemble_database_connection(cls, v: None | str, values: ValidationInfo) -> str:
        pg_url = (
            v
            if isinstance(v, str)
            else PostgresDsn.build(
                scheme="postgresql+asyncpg",
                username=values.data.get("POSTGRES_USER"),
                password=values.data.get("POSTGRES_PASSWORD"),
                host=values.data.get("POSTGRES_HOST"),
                port=int(values.data.get("POSTGRES_PORT")),
                path=values.data.get("POSTGRES_DB", ""),
            ).unicode_string()
        )

        return pg_url

    # Kafka
    KAFKA_BOOTSTRAP_SERVER_HOST: str = ""
    KAFKA_BOOTSTRAP_SERVER_PORT: str = ""
    KAFKA_NEW_BOOKING_TOPIC_NAME: str = ""
    KAFKA_BOOTSTRAP_SERVER_ADDRESS: str = ""

    @field_validator("KAFKA_BOOTSTRAP_SERVER_ADDRESS")
    @classmethod
    def assemble_kafka_server_address(cls, _, values: ValidationInfo) -> str:
        bootstrap_server_host = values.data.get("KAFKA_BOOTSTRAP_SERVER_HOST")
        bootstrap_server_port = values.data.get("KAFKA_BOOTSTRAP_SERVER_PORT")
        bootstrap_server_address = f"{bootstrap_server_host}:{bootstrap_server_port}"

        return bootstrap_server_address

    IS_DEBUG_MODE: bool = False

    model_config = SettingsConfigDict(
        env_file=f".env.{APP_ENV}",
        env_file_encoding="utf-8",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


__all__ = [
    "get_settings",
]