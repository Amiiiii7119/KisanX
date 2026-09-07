from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # ---------------------------------------------------------
    # SUPABASE
    # ---------------------------------------------------------
    supabase_url: str = ""
    supabase_publishable_key: str = ""
    supabase_secret_key: str = ""
    supabase_service_role_key: str = ""

    # ---------------------------------------------------------
    # OLLAMA / GEMMA
    # ---------------------------------------------------------
    ollama_base_url: str = "http://127.0.0.1:11434"
    ollama_model: str = "gemma3:4b"

    # ---------------------------------------------------------
    # ENVIRONMENT
    # ---------------------------------------------------------
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def server_secret_key(self) -> str:
        """
        Prefer the newer Supabase secret key.

        Fall back to the legacy service-role key if present.
        Both are backend-only secrets.
        """
        return (
            self.supabase_secret_key
            or self.supabase_service_role_key
        )


# -------------------------------------------------------------
# GLOBAL SETTINGS
# -------------------------------------------------------------

settings = Settings()
