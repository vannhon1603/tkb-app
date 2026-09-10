import os
import sqlite3
import shutil
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import text

from config import settings
from db.session import get_db, engine
from db.base import Base
from db.models import PPCTModel, TKBSlotModel, SoBaoGiangEntryModel, ItemModel, SettingModel
from logger import logger

router = APIRouter(prefix="/database", tags=["Quản Lý Cơ Sở Dữ Liệu SQLite"])

def get_db_file_path() -> str:
    """Extracts absolute SQLite file path from DATABASE_URL"""
    url = settings.DATABASE_URL
    if url.startswith("sqlite:///"):
        rel_path = url.replace("sqlite:///", "")
        return os.path.abspath(rel_path)
    return ""

@router.get("/info")
async def get_database_info(db: Session = Depends(get_db)):
    """
    Returns SQLite database health, storage stats, and row counts
    """
    db_path = get_db_file_path()
    file_exists = os.path.exists(db_path) if db_path else False
    file_size_bytes = os.path.getsize(db_path) if file_exists else 0
    file_size_formatted = (
        f"{file_size_bytes / (1024 * 1024):.2f} MB"
        if file_size_bytes >= 1024 * 1024
        else f"{file_size_bytes / 1024:.1f} KB"
    )

    # Query row counts
    try:
        total_ppct = db.query(PPCTModel).count()
        total_tkb = db.query(TKBSlotModel).count()
        total_so_bao_giang = db.query(SoBaoGiangEntryModel).count()
        total_items = db.query(ItemModel).count()
        total_settings = db.query(SettingModel).count()
    except Exception as e:
        logger.error(f"Error querying table stats: {e}")
        total_ppct = total_tkb = total_so_bao_giang = total_items = total_settings = 0

    # Query SQLite PRAGMA journal_mode
    journal_mode = "unknown"
    sqlite_ver = "unknown"
    try:
        res = db.execute(text("PRAGMA journal_mode;")).fetchone()
        if res:
            journal_mode = str(res[0]).upper()
        ver_res = db.execute(text("SELECT sqlite_version();")).fetchone()
        if ver_res:
            sqlite_ver = str(ver_res[0])
    except Exception as e:
        logger.warning(f"Error checking SQLite pragmas: {e}")

    return {
        "status": "connected",
        "engine": "SQLite",
        "version": sqlite_ver,
        "journal_mode": journal_mode,
        "database_url": settings.DATABASE_URL,
        "file_path": db_path,
        "file_size": file_size_formatted,
        "file_size_bytes": file_size_bytes,
        "last_modified": datetime.fromtimestamp(os.path.getmtime(db_path)).strftime("%d/%m/%Y %H:%M:%S") if file_exists else None,
        "counts": {
            "ppct": total_ppct,
            "tkb_slots": total_tkb,
            "so_bao_giang_entries": total_so_bao_giang,
            "items": total_items,
            "settings": total_settings,
            "total_records": total_ppct + total_tkb + total_so_bao_giang + total_items + total_settings
        }
    }

@router.get("/backup")
async def download_database_backup():
    """
    Downloads a fresh snapshot copy of the SQLite app.db database file
    """
    db_path = get_db_file_path()
    if not os.path.exists(db_path):
        raise HTTPException(status_code=404, detail="File cơ sở dữ liệu SQLite chưa tồn tại.")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"tkb_sqlite_backup_{timestamp}.db"

    return FileResponse(
        path=db_path,
        media_type="application/x-sqlite3",
        filename=filename,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.post("/vacuum")
async def vacuum_database(db: Session = Depends(get_db)):
    """
    Optimizes and compacts the SQLite database file to reclaim free disk space
    """
    try:
        # SQLite VACUUM cannot run within a multi-statement transaction
        with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
            conn.execute(text("VACUUM;"))
            conn.execute(text("PRAGMA optimize;"))
        
        db_path = get_db_file_path()
        file_size_bytes = os.path.getsize(db_path) if os.path.exists(db_path) else 0
        file_size_formatted = f"{file_size_bytes / 1024:.1f} KB"

        return {
            "status": "success",
            "message": "Đã tối ưu hóa và giải phóng dung lượng CSDL SQLite (VACUUM & Optimize) thành công!",
            "current_size": file_size_formatted
        }
    except Exception as e:
        logger.error(f"VACUUM error: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi thực hiện VACUUM: {str(e)}")

@router.post("/reset")
async def reset_database(db: Session = Depends(get_db)):
    """
    Clears all tables and recreates schema fresh
    """
    try:
        db.query(SoBaoGiangEntryModel).delete()
        db.query(PPCTModel).delete()
        db.query(TKBSlotModel).delete()
        db.query(ItemModel).delete()
        db.commit()

        return {
            "status": "success",
            "message": "Đã làm sạch toàn bộ dữ liệu trong cơ sở dữ liệu SQLite thành công!"
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Reset DB error: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi đặt lại CSDL: {str(e)}")
