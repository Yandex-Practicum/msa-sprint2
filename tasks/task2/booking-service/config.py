from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_ignore_empty=False)

    grpc_port: int = Field(default=9090)
    monolith_url: str = Field(default="http://localhost:8080")

    kafka_bootstrap_servers: str = Field(default="localhost:9092")
    kafka_topic: str = Field(default="booking-events")

    db_host: str = Field(default="localhost")
    db_port: int = Field(default=5432)
    db_name: str = Field(default="booking")
    db_user: str = Field(default="booking")
    db_password: str = Field(default="booking")

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+psycopg2://{self.db_user}:{self.db_password}" f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )


settings = Settings()
