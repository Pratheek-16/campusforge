import os
from pathlib import Path
from dotenv import load_dotenv

# Automatically load .env from project root or backend directory
root_env = Path(__file__).resolve().parent.parent.parent / ".env"
backend_env = Path(__file__).resolve().parent.parent / ".env"
if root_env.exists():
    load_dotenv(dotenv_path=root_env)
elif backend_env.exists():
    load_dotenv(dotenv_path=backend_env)
else:
    load_dotenv()

class Settings:
    SECRET_KEY: str = os.getenv("SECRET_KEY", "campusforge-super-secret-key-change-in-production-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./campusforge.db")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")

settings = Settings()
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
