from pydantic import BaseModel
from typing import Optional

class GeminiStatusResponse(BaseModel):
    configured: bool
    source: str # "env" | "custom" | "none"
    masked_key: Optional[str] = None
    model: str = "gemini-1.5-flash"

class SetGeminiKeyRequest(BaseModel):
    api_key: str

class TestGeminiKeyResponse(BaseModel):
    success: bool
    message: str
