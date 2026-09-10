from fastapi import APIRouter
from datetime import datetime

router = APIRouter(prefix="/health", tags=["Health"])

@router.get("/")
async def health_check():
    return {
        "status": "online",
        "service": "TKB Backend API",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }
