import os
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Document Intelligence Engine"
    PROJECT_VERSION: str = "0.1.0"
    API_V1_STR: str = "/api"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = []

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    # Infrastructure
    OLLAMA_HOST: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.1"
    FAISS_INDEX_PATH: str = "./data/faiss_indices"
    UPLOAD_DIR: str = "./data/uploads"
    DATABASE_URL: str = "sqlite:///./data/documents.db"
    MAX_FILE_SIZE: int = 52428800  # 50MB

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()
