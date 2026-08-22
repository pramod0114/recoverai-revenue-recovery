import os

class Settings:
    PROJECT_NAME: str = "RecoverAI ML Service"
    API_V1_STR: str = "/api/v1"
    MODEL_DIR: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
    DATA_DIR: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
    MODEL_VERSION: str = "1.0.0"

settings = Settings()
