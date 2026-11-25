import json
import os
from typing import Any, List, Union

# Disable any automatic telemetry or cloud tracing in LangChain/LangSmith
os.environ["LANGCHAIN_TRACING_V2"] = "false"
os.environ["LANGSMITH_TRACING"] = "false"
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve backend and project root directories consistently across CWD variations
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)


def _strip_wrapping_quotes(val: str) -> str:
    return val.strip().strip('"').strip("'")


class Settings(BaseSettings):
    PROJECT_NAME: str = "InsightIQ Data Analyst Agent"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug(cls, v: Any) -> bool:
        if isinstance(v, bool):
            return v
        if isinstance(v, str):
            return v.lower().strip() in ("true", "1", "yes", "dev", "development")
        return bool(v)

    API_V1_PREFIX: str = "/api"

    # Security & JWT
    SECRET_KEY: str = "insightiq-dev-secret-key-super-secure-change-in-production-12345"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database
    DATABASE_URL: str = "sqlite:///./insightiq.db"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def normalize_db_url(cls, v: Any) -> str:
        if isinstance(v, str):
            cleaned = _strip_wrapping_quotes(v)
            if not cleaned:
                return "sqlite:///./insightiq.db"
            # Fix legacy postgres:// dialect prefix commonly returned by Supabase/Render
            if cleaned.startswith("postgres://"):
                return cleaned.replace("postgres://", "postgresql://", 1)
            return cleaned
        return str(v)

    @field_validator("SECRET_KEY", "GEMINI_API_KEY", "OPENAI_API_KEY", mode="before", check_fields=False)
    @classmethod
    def strip_secret_quotes(cls, v: Any) -> str:
        if v is None:
            return ""
        if isinstance(v, str):
            return _strip_wrapping_quotes(v)
        return str(v)

    # Storage
    UPLOAD_DIR: str = os.path.join(BACKEND_DIR, "uploads")
    REPORTS_DIR: str = os.path.join(BACKEND_DIR, "reports_generated")
    MAX_UPLOAD_SIZE_MB: int = 50

    @field_validator("UPLOAD_DIR", "REPORTS_DIR", mode="before")
    @classmethod
    def resolve_storage_dir(cls, v: Any) -> str:
        if not isinstance(v, str) or not v.strip():
            return BACKEND_DIR
        cleaned = _strip_wrapping_quotes(v)
        if os.path.isabs(cleaned):
            return cleaned
        norm = cleaned.replace("\\", "/")
        if norm.startswith("./backend/") or norm.startswith("backend/"):
            return os.path.abspath(os.path.join(PROJECT_ROOT, cleaned))
        # Resolve relative defaults cleanly relative to BACKEND_DIR
        return os.path.abspath(os.path.join(BACKEND_DIR, cleaned))

    # AI Model Providers
    AI_PROVIDER: str = "gemini"  # "gemini", "openai", "mock"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"

    # CORS
    CORS_ORIGINS: Union[str, List[str]] = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Any) -> Any:
        if isinstance(v, str):
            cleaned = v.strip()
            if cleaned.startswith("[") and cleaned.endswith("]"):
                try:
                    parsed = json.loads(cleaned)
                    if isinstance(parsed, list):
                        return [str(x).strip() for x in parsed if str(x).strip()]
                except Exception:
                    pass
            return cleaned
        return v

    @property
    def cors_origins_list(self) -> List[str]:
        if isinstance(self.CORS_ORIGINS, list):
            return [str(o).strip() for o in self.CORS_ORIGINS if str(o).strip()]
        if isinstance(self.CORS_ORIGINS, str):
            return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        return ["*"]

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.REPORTS_DIR, exist_ok=True)
