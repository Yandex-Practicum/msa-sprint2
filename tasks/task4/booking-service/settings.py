from pydantic_settings import BaseSettings, SettingsConfigDict


class Setting(BaseSettings):
    ENABLE_FEATURE_X: bool = False

    model_config = SettingsConfigDict(extra="allow")


settings = Setting()
