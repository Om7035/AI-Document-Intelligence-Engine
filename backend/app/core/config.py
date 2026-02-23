import os
import json
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Document Intelligence Engine"
    PROJECT_VERSION: str = "0.2.0"
    API_V1_STR: str = "/api"

    # Ollama
    OLLAMA_HOST: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.1"

    # Storage
    FAISS_INDEX_PATH: str = "./data/faiss_indices"
    UPLOAD_DIR: str = "./data/uploads"
    MAX_FILE_SIZE: int = 52_428_800  # 50 MB

    # CORS — stored as a plain string, parsed manually below
    BACKEND_CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    def get_cors_origins(self) -> List[str]:
        """Parse CORS origins from comma-separated string or JSON array."""
        v = self.BACKEND_CORS_ORIGINS.strip()
        if v.startswith("["):
            try:
                return json.loads(v)
            except Exception:
                pass
        return [o.strip() for o in v.split(",") if o.strip()]


settings = Settings()
CORS_ORIGINS = settings.get_cors_origins()
