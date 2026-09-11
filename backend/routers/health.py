from fastapi import APIRouter
from datetime import datetime
from services.keep_alive import keep_alive_service
from config import settings

router = APIRouter(prefix="/health", tags=["Health"])

@router.get("/")
@router.get("")
async def health_check():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.utcnow().isoformat(),
        "keep_alive": keep_alive_service.get_stats(),
        "version": "1.0.0"
    }

@router.get("/ping")
@router.post("/ping")
async def ping():
    return {
        "status": "pong",
        "timestamp": datetime.utcnow().isoformat()
    }

