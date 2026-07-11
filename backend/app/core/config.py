"""Loads settings from .env — mirrors how SafeVision's core/config.py works."""
import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./fuseos.db")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-change-before-deploy")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 12  # 12 hour session
    CORS_ORIGINS: list[str] = os.getenv("CORS_ORIGINS", "*").split(",")


settings = Settings()
