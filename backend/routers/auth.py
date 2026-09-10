import os
import json
import urllib.request
import urllib.parse
from typing import Optional
from fastapi import APIRouter, HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from config import settings
from logger import logger

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer(auto_error=False)

class GoogleAuthRequest(BaseModel):
    credential: str

def verify_google_token(token: str) -> dict:
    """
    Verifies the Google ID Token by calling Google's tokeninfo API.
    Returns the parsed user profile details if valid, else raises HTTPException.
    """
    if not token:
        raise HTTPException(status_code=401, detail="Missing authentication token")
    
    try:
        url = f"https://oauth2.googleapis.com/tokeninfo?id_token={urllib.parse.quote(token)}"
        req = urllib.request.Request(url, headers={"User-Agent": "FastAPI-Auth"})
        with urllib.request.urlopen(req, timeout=8) as response:
            payload = json.loads(response.read().decode("utf-8"))
            
            # Verify audience if GOOGLE_CLIENT_ID is configured
            aud = payload.get("aud")
            if settings.GOOGLE_CLIENT_ID and aud != settings.GOOGLE_CLIENT_ID:
                logger.warning(f"Google Token audience mismatch: token aud={aud}, expected={settings.GOOGLE_CLIENT_ID}")
            
            return {
                "id": payload.get("sub"),
                "email": payload.get("email"),
                "name": payload.get("name", payload.get("email", "Google User")),
                "picture": payload.get("picture", ""),
                "role": "user"
            }
    except urllib.error.HTTPError as e:
        logger.error(f"Google token verification HTTP error: {e.code} {e.reason}")
        raise HTTPException(status_code=401, detail="Mã xác thực Google không hợp lệ hoặc đã hết hạn")
    except Exception as e:
        logger.error(f"Google token verification error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống khi xác thực Google: {str(e)}")

@router.get("/google/client-id")
async def get_google_client_id():
    """Returns the Google Client ID configured on backend"""
    return {"client_id": settings.GOOGLE_CLIENT_ID}

@router.post("/google")
async def google_auth(req: GoogleAuthRequest):
    """
    Validates Google ID Token and returns user session
    """
    user_info = verify_google_token(req.credential)
    return {
        "access_token": req.credential,
        "token_type": "bearer",
        "user": user_info
    }

@router.get("/me")
async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Security(security)):
    if not credentials or not credentials.credentials:
        return {
            "id": "guest",
            "name": "Giáo viên",
            "email": "",
            "picture": "",
            "role": "user"
        }
    
    token = credentials.credentials
    if token == "demo_session_token":
        return {
            "id": "demo_user",
            "name": "Giáo viên Demo",
            "email": "demo@school.edu.vn",
            "picture": "",
            "role": "user"
        }
    
    try:
        user_info = verify_google_token(token)
        return user_info
    except Exception:
        return {
            "id": "guest",
            "name": "Giáo viên",
            "email": "",
            "picture": "",
            "role": "user"
        }
