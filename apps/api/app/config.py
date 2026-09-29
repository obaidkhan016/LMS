"""Application configuration loaded from environment variables."""
from functools import lru_cache
from typing import Annotated, List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "Roots Garden Attendance"
    app_env: str = "development"
    app_debug: bool = True
    app_timezone: str = "Asia/Karachi"
    api_v1_prefix: str = "/api/v1"

    # Security
    secret_key: str = Field(..., min_length=32)
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 14

    # Database
    database_url: str
    database_echo: bool = False

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # CORS — comma-separated in .env (NoDecode stops pydantic from JSON-parsing)
    cors_origins: Annotated[List[str], NoDecode] = ["http://localhost:3000"]

    # AI
    ai_provider: str = "stub"
    ai_confidence_high: float = 0.85
    ai_confidence_medium: float = 0.60

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_cors(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]