from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="YOKAI_")

    waiting_room_disconnect_grace_seconds: int = 300
    cors_origins: list[str] = ["*"]
