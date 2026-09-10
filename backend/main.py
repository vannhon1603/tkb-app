import sys
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import settings
from logger import logger
from db import init_db
from routers import (
    health_router,
    items_router,
    stats_router,
    settings_router,
    auth_router,
    gemini_router,
    ppct_router,
    tkb_router,
    so_bao_giang_router,
    database_router,
    students_router,
    attendance_router,
    bonus_points_router,
    tasks_router,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Database...")
    try:
        init_db()
        logger.info("Database schema initialized successfully.")
    except Exception as e:
        logger.error(f"Database initialization error: {e}")
    yield
    logger.info("Application shutdown.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="FastAPI Backend cho hệ thống Quản lý Thời Khóa Biểu & Tự Động Tạo Sổ Báo Giảng",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled Exception on {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": f"Đã xảy ra lỗi máy chủ nội bộ: {str(exc)}"}
    )

# Register Routers
app.include_router(health_router, prefix=settings.API_V1_STR)
app.include_router(items_router, prefix=settings.API_V1_STR)
app.include_router(stats_router, prefix=settings.API_V1_STR)
app.include_router(settings_router, prefix=settings.API_V1_STR)
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(gemini_router, prefix=settings.API_V1_STR)
app.include_router(ppct_router, prefix=settings.API_V1_STR)
app.include_router(tkb_router, prefix=settings.API_V1_STR)
app.include_router(so_bao_giang_router, prefix=settings.API_V1_STR)
app.include_router(database_router, prefix=settings.API_V1_STR)
app.include_router(students_router, prefix=settings.API_V1_STR)
app.include_router(attendance_router, prefix=settings.API_V1_STR)
app.include_router(bonus_points_router, prefix=settings.API_V1_STR)
app.include_router(tasks_router, prefix=settings.API_V1_STR)



@app.get("/")
async def root():
    return {
        "app": settings.PROJECT_NAME,
        "docs": "/docs",
        "status": "ready"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
