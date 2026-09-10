from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import io
import urllib.parse

from db.session import get_db
from db.models import SoBaoGiangEntryModel
from schemas.so_bao_giang import (
    SoBaoGiangEntryResponse,
    SoBaoGiangEntryCreate,
    SoBaoGiangEntryUpdate,
    GenerateSoBaoGiangRequest,
    GenerateAllWeeksRequest,
    GenerateAllWeeksResponse,
    SoBaoGiangWeekResponse,
    ToggleTaughtRequest,
    BatchToggleTaughtRequest,
    BatchToggleTaughtResponse,
    ProgressStatsResponse
)
from services.so_bao_giang_service import SoBaoGiangService

router = APIRouter(prefix="/so-bao-giang", tags=["Sổ Báo Giảng Tự Động"])

@router.post("/generate-all", response_model=GenerateAllWeeksResponse)
async def generate_all_weeks(
    req: GenerateAllWeeksRequest,
    db: Session = Depends(get_db)
):
    """
    Automatically generates Sổ Báo Giảng for all 35 weeks (or custom total_weeks) of the school year.
    Advances PPCT lessons seamlessly across weeks.
    """
    result = SoBaoGiangService.generate_all_weeks(
        db=db,
        semester_start_date_str=req.semester_start_date,
        total_weeks=req.total_weeks or 35,
        teacher_name=req.teacher_name,
        semester=req.semester or "Học kỳ 1",
        overwrite=req.overwrite if req.overwrite is not None else True,
        preserve_taught=req.preserve_taught if req.preserve_taught is not None else True
    )

    if result.get("total_entries", 0) == 0:
        raise HTTPException(
            status_code=400,
            detail=result.get("message") or "Chưa có dữ liệu Thời khóa biểu hoặc Phân phối chương trình để sinh sổ báo giảng. Vui lòng nạp TKB và PPCT trước."
        )

    return GenerateAllWeeksResponse(
        total_weeks=result["total_weeks"],
        total_entries=result["total_entries"],
        teacher_name=result["teacher_name"],
        message=result["message"]
    )

@router.post("/batch-toggle-taught", response_model=BatchToggleTaughtResponse)
async def batch_toggle_taught(
    req: BatchToggleTaughtRequest,
    db: Session = Depends(get_db)
):
    """
    Batch update taught status for an entire week or selected entry IDs
    """
    q = db.query(SoBaoGiangEntryModel)
    if req.entry_ids and len(req.entry_ids) > 0:
        q = q.filter(SoBaoGiangEntryModel.id.in_(req.entry_ids))
    elif req.week_number is not None:
        q = q.filter(SoBaoGiangEntryModel.week_number == req.week_number)
        if req.teacher_name and req.teacher_name != "Tất cả":
            q = q.filter(SoBaoGiangEntryModel.teacher_name == req.teacher_name)
    else:
        raise HTTPException(status_code=400, detail="Cần chỉ định week_number hoặc danh sách entry_ids")

    entries = q.all()
    now_utc = datetime.utcnow()
    for e in entries:
        e.is_taught = req.is_taught
        if req.is_taught:
            e.status = "completed"
            e.taught_at = now_utc
        else:
            e.status = "pending"
            e.taught_at = None

    db.commit()
    status_label = "ĐÃ DẠY" if req.is_taught else "CHƯA DẠY"
    return BatchToggleTaughtResponse(
        updated_count=len(entries),
        is_taught=req.is_taught,
        message=f"Đã cập nhật trạng thái {status_label} cho {len(entries)} tiết dạy thành công!"
    )

@router.post("/generate", response_model=SoBaoGiangWeekResponse)
async def generate_so_bao_giang(
    req: GenerateSoBaoGiangRequest,
    db: Session = Depends(get_db)
):
    entries = SoBaoGiangService.generate_for_week(
        db=db,
        week_number=req.week_number,
        start_date_str=req.start_date,
        teacher_name=req.teacher_name,
        semester=req.semester or "Học kỳ 1",
        overwrite=req.overwrite if req.overwrite is not None else True
    )

    if not entries:
        raise HTTPException(
            status_code=400,
            detail="Chưa có dữ liệu Thời khóa biểu hoặc Phân phối chương trình để sinh sổ báo giảng. Vui lòng nạp TKB và PPCT trước."
        )

    return SoBaoGiangWeekResponse(
        week_number=req.week_number,
        start_date=req.start_date,
        teacher_name=req.teacher_name or "Giáo viên",
        total_entries=len(entries),
        entries=entries
    )

@router.get("/", response_model=List[SoBaoGiangEntryResponse])
async def get_so_bao_giang(
    week_number: Optional[int] = Query(None),
    start_date: Optional[str] = Query(None),
    teacher_name: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    q = db.query(SoBaoGiangEntryModel)
    if week_number:
        q = q.filter(SoBaoGiangEntryModel.week_number == week_number)
    if start_date:
        q = q.filter(SoBaoGiangEntryModel.start_date == start_date)
    if teacher_name and teacher_name != "Tất cả":
        q = q.filter(SoBaoGiangEntryModel.teacher_name == teacher_name)
    return q.order_by(SoBaoGiangEntryModel.day_of_week.asc(), SoBaoGiangEntryModel.period.asc()).all()

@router.put("/{entry_id}", response_model=SoBaoGiangEntryResponse)
async def update_entry(
    entry_id: int,
    req: SoBaoGiangEntryUpdate,
    db: Session = Depends(get_db)
):
    entry = db.query(SoBaoGiangEntryModel).filter(SoBaoGiangEntryModel.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Bản ghi không tồn tại")
    
    update_data = req.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(entry, k, v)
    entry.is_custom = True
    db.commit()
    db.refresh(entry)
    return entry

@router.post("/", response_model=SoBaoGiangEntryResponse)
async def create_entry(
    req: SoBaoGiangEntryCreate,
    db: Session = Depends(get_db)
):
    entry = SoBaoGiangEntryModel(**req.model_dump())
    entry.is_custom = True
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry

@router.patch("/{entry_id}/toggle-taught", response_model=SoBaoGiangEntryResponse)
async def toggle_taught(
    entry_id: int,
    req: Optional[ToggleTaughtRequest] = None,
    db: Session = Depends(get_db)
):
    entry = db.query(SoBaoGiangEntryModel).filter(SoBaoGiangEntryModel.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Bản ghi không tồn tại")
    
    if req and req.is_taught is not None:
        entry.is_taught = req.is_taught
    else:
        entry.is_taught = not (entry.is_taught or False)
        
    if entry.is_taught:
        entry.status = "completed"
        entry.taught_at = datetime.utcnow()
    else:
        entry.status = "pending"
        entry.taught_at = None
        
    db.commit()
    db.refresh(entry)
    return entry

@router.get("/progress-stats", response_model=ProgressStatsResponse)
async def get_progress_stats(
    week_number: Optional[int] = Query(None),
    teacher_name: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    q = db.query(SoBaoGiangEntryModel)
    if week_number:
        q = q.filter(SoBaoGiangEntryModel.week_number == week_number)
    if teacher_name and teacher_name != "Tất cả":
        q = q.filter(SoBaoGiangEntryModel.teacher_name == teacher_name)
        
    entries = q.all()
    total = len(entries)
    taught = sum(1 for e in entries if e.is_taught)
    pending = total - taught
    
    # Check delayed: date_str has passed today and not yet taught
    today = datetime.now().date()
    delayed = 0
    for e in entries:
        if not e.is_taught and e.date_str:
            try:
                # DD/MM/YYYY
                parts = e.date_str.split("/")
                if len(parts) == 3:
                    entry_date = datetime(int(parts[2]), int(parts[1]), int(parts[0])).date()
                    if entry_date < today:
                        delayed += 1
            except Exception:
                pass

    completion_rate = round((taught / total * 100), 1) if total > 0 else 0.0

    by_class = {}
    by_subject = {}
    for e in entries:
        cls = e.class_name or "Khác"
        if cls not in by_class:
            by_class[cls] = {"total": 0, "taught": 0, "pending": 0}
        by_class[cls]["total"] += 1
        if e.is_taught:
            by_class[cls]["taught"] += 1
        else:
            by_class[cls]["pending"] += 1

        sub = e.subject or "Khác"
        if sub not in by_subject:
            by_subject[sub] = {"total": 0, "taught": 0, "pending": 0}
        by_subject[sub]["total"] += 1
        if e.is_taught:
            by_subject[sub]["taught"] += 1
        else:
            by_subject[sub]["pending"] += 1

    return ProgressStatsResponse(
        total_lessons=total,
        taught_lessons=taught,
        pending_lessons=pending,
        delayed_lessons=delayed,
        completion_rate=completion_rate,
        by_class=by_class,
        by_subject=by_subject
    )

@router.delete("/week/{week_number}")
async def clear_week_entries(
    week_number: int,
    teacher_name: Optional[str] = None,
    db: Session = Depends(get_db)
):
    q = db.query(SoBaoGiangEntryModel).filter(SoBaoGiangEntryModel.week_number == week_number)
    if teacher_name and teacher_name != "Tất cả":
        q = q.filter(SoBaoGiangEntryModel.teacher_name == teacher_name)
    count = q.delete()
    db.commit()
    return {"status": "success", "message": f"Đã xóa {count} tiết trong Tuần {week_number}."}

@router.delete("/{entry_id}")
async def delete_entry(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(SoBaoGiangEntryModel).filter(SoBaoGiangEntryModel.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Bản ghi không tồn tại")
    db.delete(entry)
    db.commit()
    return {"status": "success", "message": "Đã xóa tiết báo giảng."}

@router.get("/export/excel")
async def export_excel(
    week_number: int = Query(1),
    start_date: Optional[str] = Query(None),
    teacher_name: str = Query("Giáo viên"),
    db: Session = Depends(get_db)
):
    q = db.query(SoBaoGiangEntryModel).filter(SoBaoGiangEntryModel.week_number == week_number)
    if teacher_name and teacher_name != "Tất cả":
        q = q.filter(SoBaoGiangEntryModel.teacher_name == teacher_name)
    entries = q.order_by(SoBaoGiangEntryModel.day_of_week.asc(), SoBaoGiangEntryModel.period.asc()).all()

    if not entries:
        # Try generating automatically if not yet exists
        if start_date:
            entries = SoBaoGiangService.generate_for_week(
                db=db,
                week_number=week_number,
                start_date_str=start_date,
                teacher_name=teacher_name
            )

    excel_bytes = SoBaoGiangService.export_excel(entries, week_number=week_number, teacher_name=teacher_name)
    filename = f"So_Bao_Giang_Tuan_{week_number}_{teacher_name.replace(' ', '_')}.xlsx"
    encoded_filename = urllib.parse.quote(filename)

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"
        }
    )

@router.get("/export/word")
async def export_word(
    week_number: int = Query(1),
    start_date: Optional[str] = Query(None),
    teacher_name: str = Query("Giáo viên"),
    db: Session = Depends(get_db)
):
    q = db.query(SoBaoGiangEntryModel).filter(SoBaoGiangEntryModel.week_number == week_number)
    if teacher_name and teacher_name != "Tất cả":
        q = q.filter(SoBaoGiangEntryModel.teacher_name == teacher_name)
    entries = q.order_by(SoBaoGiangEntryModel.day_of_week.asc(), SoBaoGiangEntryModel.period.asc()).all()

    if not entries and start_date:
        entries = SoBaoGiangService.generate_for_week(
            db=db,
            week_number=week_number,
            start_date_str=start_date,
            teacher_name=teacher_name
        )

    word_bytes = SoBaoGiangService.export_word(entries, week_number=week_number, teacher_name=teacher_name)
    filename = f"So_Bao_Giang_Tuan_{week_number}_{teacher_name.replace(' ', '_')}.docx"
    encoded_filename = urllib.parse.quote(filename)

    return Response(
        content=word_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"
        }
    )
