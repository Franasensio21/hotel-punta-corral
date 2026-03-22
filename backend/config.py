from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent


class Settings(BaseSettings):
    DATABASE_URL: str
    DEFAULT_HOTEL_ID: int = 1
    DEBUG: bool = False
    SECRET_KEY: str = "hotel-puntacorral-local"
    FRONTEND_URL: str = "http://localhost:3000"
    class Config:
        env_file = str(BASE_DIR / ".env")


settings = Settings()
