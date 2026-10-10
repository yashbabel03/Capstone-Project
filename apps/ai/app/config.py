from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=("../../.env", ".env"), extra="ignore")

    internal_ai_key: str = "dev-internal"
    chroma_path: str = str(Path(__file__).resolve().parents[3] / "data" / "chroma")
    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"
    openai_model: str = "gpt-4o-mini"
    embedding_model: str = "text-embedding-3-small"


settings = Settings()
_root = Path(__file__).resolve().parents[3]
_chroma = Path(settings.chroma_path)
if not _chroma.is_absolute():
    _chroma = _root / "data" / "chroma"
settings.chroma_path = str(_chroma)
Path(settings.chroma_path).mkdir(parents=True, exist_ok=True)
