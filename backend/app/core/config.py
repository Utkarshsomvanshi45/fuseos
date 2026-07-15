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

    # Email alerts — Gmail SMTP (same pattern as SafeVision). Use a Gmail
    # "App Password", not your real password: myaccount.google.com/apppasswords
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    ALERT_RECIPIENTS: list[str] = [
        e.strip() for e in os.getenv("ALERT_RECIPIENTS", "").split(",") if e.strip()
    ]
    ALERT_MIN_SEVERITY: list[str] = ["critical", "high"]  # only email for these


settings = Settings()
