from fastapi import APIRouter, HTTPException, Depends
from schemas.gemini import GeminiStatusResponse, SetGeminiKeyRequest, TestGeminiKeyResponse
from services.gemini_service import (
    get_effective_gemini_key,
    get_key_source,
    set_custom_gemini_key,
    test_gemini_connection
)

router = APIRouter(prefix="/gemini", tags=["Gemini AI API Key"])

@router.get("/status", response_model=GeminiStatusResponse)
async def get_gemini_status():
    key = get_effective_gemini_key()
    source = get_key_source()
    if not key:
        return GeminiStatusResponse(
            configured=False,
            source="none",
            masked_key=None,
            model="gemini-1.5-flash"
        )
    
    masked = key[:4] + "..." + key[-4:] if len(key) > 8 else "***"
    return GeminiStatusResponse(
        configured=True,
        source=source,
        masked_key=masked,
        model="gemini-1.5-flash"
    )


@router.post("/set-key")
async def save_gemini_key(req: SetGeminiKeyRequest):
    if not req.api_key or not req.api_key.strip():
        raise HTTPException(status_code=400, detail="API Key không được để trống")
    
    set_custom_gemini_key(req.api_key.strip())
    # Test connection immediately
    ok, msg = test_gemini_connection(req.api_key.strip())
    return {
        "status": "success",
        "valid": ok,
        "message": msg
    }

@router.post("/test", response_model=TestGeminiKeyResponse)
async def test_key(req: SetGeminiKeyRequest = None):
    key = req.api_key if req and req.api_key else None
    ok, msg = test_gemini_connection(key)
    return TestGeminiKeyResponse(success=ok, message=msg)
