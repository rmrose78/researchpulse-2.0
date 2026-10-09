from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    pubmed_base_url: str = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
    pubmed_api_key: str = ""
    semantic_scholar_base_url: str = "https://api.semanticscholar.org"
    semantic_scholar_api_key: str = ""
    app_name: str = "ResearchPulse"
    database_url: str = "postgresql://localhost/researchpulse"
    frontend_url: str = "http://localhost:5173"
    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:3000,http://localhost:4173"
    analytics_secret: str = ""

    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()

