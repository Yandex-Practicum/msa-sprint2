from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_ignore_empty=False)

    kafka_bootstrap_servers: str = Field(default="localhost:9092")
    kafka_topic: str = Field(default="booking-events")
    http_port: int = Field(default=8085)

    db_host: str = Field(default="localhost")
    db_port: int = Field(default=5432)
    db_name: str = Field(default="booking_history")
    db_user: str = Field(default="history")
    db_password: str = Field(default="history")

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+psycopg2://{self.db_user}:{self.db_password}" f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )


settings = Settings()
