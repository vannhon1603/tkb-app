import os
from typing import List
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "TKB System Backend"
    API_V1_STR: str = "/api"
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "*"
    ]
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./app.db")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-key-for-tkb-development-2026")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "359719086023-56nmtffqumnu4n0gkqqiq2r97com31ou.apps.googleusercontent.com")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    # Render Keep-Alive Configuration
    KEEP_ALIVE_ENABLED: bool = os.getenv("KEEP_ALIVE_ENABLED", "true").lower() in ("true", "1", "yes")
    RENDER_EXTERNAL_URL: str = os.getenv("RENDER_EXTERNAL_URL", "")
    KEEP_ALIVE_URL: str = os.getenv("KEEP_ALIVE_URL", os.getenv("RENDER_EXTERNAL_URL", ""))
    KEEP_ALIVE_INTERVAL: int = int(os.getenv("KEEP_ALIVE_INTERVAL", "600"))  # Mặc định 600s = 10 phút

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
