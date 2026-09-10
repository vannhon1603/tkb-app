from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import distinct
from typing import List, Optional

from db.session import get_db
from db.models import TKBSlotModel
from schemas.tkb import TKBSlotResponse, TKBSlotCreate, TKBUploadResponse
from services.tkb_parser import parse_tkb_excel, parse_tkb_pdf
from logger import logger

router = APIRouter(prefix="/tkb", tags=["Thời Khóa Biểu (TKB)"])

@router.post("/upload", response_model=TKBUploadResponse)
async def upload_tkb_file(
    file: UploadFile = File(...),
    teacher_name: str = Form("Giáo viên"),
    overwrite: bool = Form(True),
    db: Session = Depends(get_db)
):
    content = await file.read()
    filename = file.filename.lower()
    
    parsed_slots = []
    if filename.endswith(".xlsx") or filename.endswith(".xls"):
        parsed_slots = parse_tkb_excel(content, default_teacher=teacher_name)
    elif filename.endswith(".pdf"):
        parsed_slots = parse_tkb_pdf(content, default_teacher=teacher_name)
    else:
        raise HTTPException(status_code=400, detail="Vui lòng tải lên file định dạng Excel (.xlsx) hoặc PDF (.pdf)")

    if not parsed_slots:
        raise HTTPException(status_code=400, detail="Không nhận diện được tiết dạy trong file TKB. Vui lòng kiểm tra định dạng bảng.")

    if overwrite:
        if teacher_name and teacher_name != "Giáo viên":
            db.query(TKBSlotModel).filter(TKBSlotModel.teacher_name == teacher_name).delete()
        else:
            db.query(TKBSlotModel).delete()
        db.commit()

    saved_slots = []
    for slot_data in parsed_slots:
        slot = TKBSlotModel(
            teacher_name=slot_data.get("teacher_name", teacher_name),
            class_name=slot_data.get("class_name", ""),
            subject=slot_data.get("subject", "Toán"),
            day_of_week=slot_data.get("day_of_week", 2),
            period=slot_data.get("period", 1),
            session=slot_data.get("session", "Sáng"),
            semester=slot_data.get("semester", "Học kỳ 1")
        )
        db.add(slot)
        saved_slots.append(slot)

    db.commit()
    for s in saved_slots:
        db.refresh(s)

    teachers = [t[0] for t in db.query(distinct(TKBSlotModel.teacher_name)).all() if t[0]]
    classes = [c[0] for c in db.query(distinct(TKBSlotModel.class_name)).all() if c[0]]

    return TKBUploadResponse(
        total_slots=len(saved_slots),
        teachers=teachers,
        classes=classes,
        slots=saved_slots
    )

@router.get("/", response_model=List[TKBSlotResponse])
async def list_tkb(
    teacher_name: Optional[str] = Query(None),
    class_name: Optional[str] = Query(None),
    day_of_week: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    q = db.query(TKBSlotModel)
    if teacher_name and teacher_name != "Tất cả":
        q = q.filter(TKBSlotModel.teacher_name == teacher_name)
    if class_name:
        q = q.filter(TKBSlotModel.class_name == class_name)
    if day_of_week:
        q = q.filter(TKBSlotModel.day_of_week == day_of_week)
    return q.order_by(TKBSlotModel.day_of_week.asc(), TKBSlotModel.period.asc()).all()

@router.get("/teachers", response_model=List[str])
async def get_teachers(db: Session = Depends(get_db)):
    results = db.query(distinct(TKBSlotModel.teacher_name)).all()
    return [r[0] for r in results if r[0]]

@router.get("/classes", response_model=List[str])
async def get_classes(db: Session = Depends(get_db)):
    results = db.query(distinct(TKBSlotModel.class_name)).all()
    return [r[0] for r in results if r[0]]

from schemas.tkb import TKBSlotResponse, TKBSlotCreate, TKBSlotUpdate, TKBUploadResponse

@router.post("/", response_model=TKBSlotResponse)
async def create_tkb_slot(slot_in: TKBSlotCreate, db: Session = Depends(get_db)):
    slot = TKBSlotModel(**slot_in.model_dump())
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return slot

@router.put("/{slot_id}", response_model=TKBSlotResponse)
async def update_tkb_slot(
    slot_id: int,
    slot_in: TKBSlotUpdate,
    db: Session = Depends(get_db)
):
    slot = db.query(TKBSlotModel).filter(TKBSlotModel.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Tiết dạy không tồn tại")
    
    update_data = slot_in.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        if v is not None:
            setattr(slot, k, v)
            
    db.commit()
    db.refresh(slot)
    return slot

@router.delete("/clear")
async def clear_tkb(teacher_name: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(TKBSlotModel)
    if teacher_name and teacher_name != "Tất cả":
        q = q.filter(TKBSlotModel.teacher_name == teacher_name)
    count = q.delete()
    db.commit()
    return {"status": "success", "message": f"Đã xóa {count} tiết TKB."}

@router.delete("/{slot_id}")
async def delete_tkb_slot(slot_id: int, db: Session = Depends(get_db)):
    slot = db.query(TKBSlotModel).filter(TKBSlotModel.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Tiết dạy không tồn tại")
    db.delete(slot)
    db.commit()
    return {"status": "success", "message": "Đã xóa tiết dạy khỏi TKB thành công."}

@router.get("/stats")
async def get_tkb_stats(db: Session = Depends(get_db)):
    total = db.query(TKBSlotModel).count()
    teachers = [t[0] for t in db.query(distinct(TKBSlotModel.teacher_name)).all() if t[0]]
    classes = [c[0] for c in db.query(distinct(TKBSlotModel.class_name)).all() if c[0]]
    subjects = [s[0] for s in db.query(distinct(TKBSlotModel.subject)).all() if s[0]]
    return {
        "total_slots": total,
        "total_teachers": len(teachers),
        "total_classes": len(classes),
        "teachers": teachers,
        "classes": classes,
        "subjects": subjects
    }

@router.get("/export/excel")
async def export_tkb_excel(
    teacher_name: Optional[str] = Query("Giáo viên"),
    db: Session = Depends(get_db)
):
    import openpyxl
    from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
    from fastapi.responses import Response
    import io, urllib.parse

    q = db.query(TKBSlotModel)
    if teacher_name and teacher_name != "Tất cả":
        q = q.filter(TKBSlotModel.teacher_name == teacher_name)
    slots = q.all()

    # Create slot lookup matrix [period][day]
    grid = {}
    for s in slots:
        grid[(s.period, s.day_of_week)] = f"{s.class_name} ({s.subject})"

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "TKB"

    # Title
    ws.merge_cells("A1:G1")
    ws["A1"] = f"THỜI KHÓA BIỂU - {teacher_name or 'TẤT CẢ GIÁO VIÊN'}"
    ws["A1"].font = Font(name="Times New Roman", size=14, bold=True, color="1F4E78")
    ws["A1"].alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 30

    headers = ["Tiết", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"]
    ws.append(headers)

    header_font = Font(name="Times New Roman", size=11, bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid")
    header_align = Alignment(horizontal="center", vertical="center")
    
    thin_border = Border(
        left=Side(style="thin", color="D9D9D9"),
        right=Side(style="thin", color="D9D9D9"),
        top=Side(style="thin", color="D9D9D9"),
        bottom=Side(style="thin", color="D9D9D9")
    )

    for col_idx in range(1, 8):
        cell = ws.cell(row=2, column=col_idx)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_align
    ws.row_dimensions[2].height = 25

    row_font = Font(name="Times New Roman", size=11)
    
    # Morning (1..5)
    row_idx = 3
    for p in range(1, 11):
        if p == 1:
            ws.merge_cells(f"A{row_idx}:G{row_idx}")
            cell = ws.cell(row=row_idx, column=1, value="BUỔI SÁNG")
            cell.font = Font(name="Times New Roman", size=10, bold=True, color="555555")
            cell.fill = PatternFill(start_color="E9ECEF", end_color="E9ECEF", fill_type="solid")
            row_idx += 1
        elif p == 6:
            ws.merge_cells(f"A{row_idx}:G{row_idx}")
            cell = ws.cell(row=row_idx, column=1, value="BUỔI CHIỀU")
            cell.font = Font(name="Times New Roman", size=10, bold=True, color="555555")
            cell.fill = PatternFill(start_color="E9ECEF", end_color="E9ECEF", fill_type="solid")
            row_idx += 1

        ws.cell(row=row_idx, column=1, value=f"Tiết {p}").alignment = Alignment(horizontal="center", vertical="center")
        ws.cell(row=row_idx, column=1).font = Font(name="Times New Roman", size=11, bold=True)
        ws.cell(row=row_idx, column=1).border = thin_border

        for d_idx, day_num in enumerate([2, 3, 4, 5, 6, 7], start=2):
            cell_val = grid.get((p, day_num), "")
            cell = ws.cell(row=row_idx, column=d_idx, value=cell_val)
            cell.font = row_font
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            cell.border = thin_border
            if cell_val:
                cell.fill = PatternFill(start_color="E6F4EA" if p <= 5 else "E8F0FE", end_color="E6F4EA" if p <= 5 else "E8F0FE", fill_type="solid")
        ws.row_dimensions[row_idx].height = 28
        row_idx += 1

    ws.column_dimensions["A"].width = 12
    for c in ["B", "C", "D", "E", "F", "G"]:
        ws.column_dimensions[c].width = 18

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    filename = f"TKB_{teacher_name.replace(' ', '_')}.xlsx"
    encoded_filename = urllib.parse.quote(filename)
    return Response(
        content=buf.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"}
    )

from pydantic import BaseModel
class TKBPasteRequest(BaseModel):
    text: str
    teacher_name: Optional[str] = "Giáo viên"
    overwrite: Optional[bool] = True

@router.post("/paste", response_model=TKBUploadResponse)
async def paste_tkb_text(
    req: TKBPasteRequest,
    db: Session = Depends(get_db)
):
    from services.tkb_parser import parse_tkb_text
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="Nội dung văn bản dán không được để trống")

    teacher_name = req.teacher_name or "Giáo viên"
    parsed_slots = parse_tkb_text(req.text, default_teacher=teacher_name)

    if not parsed_slots:
        raise HTTPException(status_code=400, detail="Không nhận diện được tiết dạy từ nội dung đã dán.")

    if req.overwrite:
        if teacher_name and teacher_name != "Giáo viên":
            db.query(TKBSlotModel).filter(TKBSlotModel.teacher_name == teacher_name).delete()
        else:
            db.query(TKBSlotModel).delete()
        db.commit()

    saved_slots = []
    for slot_data in parsed_slots:
        slot = TKBSlotModel(
            teacher_name=slot_data.get("teacher_name", teacher_name),
            class_name=slot_data.get("class_name", ""),
            subject=slot_data.get("subject", "Toán"),
            day_of_week=slot_data.get("day_of_week", 2),
            period=slot_data.get("period", 1),
            session=slot_data.get("session", "Sáng"),
            semester=slot_data.get("semester", "Học kỳ 1")
        )
        db.add(slot)
        saved_slots.append(slot)

    db.commit()
    for s in saved_slots:
        db.refresh(s)

    teachers = [t[0] for t in db.query(distinct(TKBSlotModel.teacher_name)).all() if t[0]]
    classes = [c[0] for c in db.query(distinct(TKBSlotModel.class_name)).all() if c[0]]

    return TKBUploadResponse(
        total_slots=len(saved_slots),
        teachers=teachers,
        classes=classes,
        slots=saved_slots
    )

@router.post("/upload-image", response_model=TKBUploadResponse)
async def upload_tkb_image(
    file: UploadFile = File(...),
    teacher_name: str = Form("Giáo viên"),
    overwrite: bool = Form(True),
    api_key: Optional[str] = Form(None),
    model_name: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Analyzes an uploaded or clipboard-pasted image of Thời Khóa Biểu (TKB) using Gemini AI Vision
    """
    from services.gemini_service import set_custom_gemini_key
    if api_key and api_key.strip():
        set_custom_gemini_key(api_key.strip())

    import json
    import re
    from services.gemini_service import generate_with_gemini_vision

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="File ảnh rỗng hoặc không hợp lệ")

    prompt = f"""
Bạn là chuyên gia số hóa Thời khóa biểu (TKB) trường học Việt Nam. Hãy quan sát kỹ ảnh Thời khóa biểu (có thể là bảng dọc theo thứ hoặc bảng ma trận hàng/cột) và trích xuất TOÀN BỘ các ô có tiết dạy.

Quy tắc bóc tách:
- day_of_week: Thứ trong tuần (số nguyên: 2=Thứ Hai, 3=Thứ Ba, 4=Thứ Tư, 5=Thứ Năm, 6=Thứ Sáu, 7=Thứ Bảy, 8=Chủ Nhật).
- period: Tiết học trong ngày (số nguyên từ 1 đến 10. Tiết 1-5 là buổi Sáng, tiết 6-10 là buổi Chiều).
- class_name: Tên lớp dạy (Ví dụ: 10A1, 10A21, 11A15, 11A17, 12C3...).
- subject: Tên môn học (Ví dụ: Toán, Ngữ văn, Tiếng Anh, Vật lí, Hóa học...). Nếu ô chỉ ghi tên lớp hoặc tên lớp kèm môn (ví dụ '10A21 - Toán'), hãy tách rõ class_name='10A21' và subject='Toán'.
- session: "Sáng" (nếu period <= 5) hoặc "Chiều" (nếu period >= 6).
- teacher_name: Tên giáo viên nếu đọc được trên tiêu đề/cột (hoặc mặc định '{teacher_name}').

HÃY TRẢ VỀ DUY NHẤT MỘT MẢNG JSON HỢP LỆ (mảng JSON thuần túy [ ... ]):
[
  {{
    "day_of_week": 2,
    "period": 1,
    "class_name": "10A21",
    "subject": "Toán",
    "session": "Sáng",
    "teacher_name": "{teacher_name}"
  }}
]
"""
    try:
        raw_result = generate_with_gemini_vision(
            prompt=prompt,
            image_bytes=image_bytes,
            mime_type=file.content_type or "image/png",
            user_key=api_key,
            selected_model=model_name
        )
    except Exception as e:
        logger.error(f"Gemini Vision TKB extraction error: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi AI Vision khi đọc ảnh TKB: {str(e)}")

    cleaned = raw_result.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    if cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    try:
        parsed_slots = json.loads(cleaned)
    except Exception as e:
        logger.warning(f"Could not parse direct JSON from Vision: {cleaned}")
        match = re.search(r'\[.*\]', cleaned, re.DOTALL)
        if match:
            parsed_slots = json.loads(match.group(0))
        else:
            raise HTTPException(status_code=500, detail="AI không thể nhận diện ma trận TKB từ ảnh này. Vui lòng thử ảnh chụp rõ nét hơn.")

    if not isinstance(parsed_slots, list) or len(parsed_slots) == 0:
        raise HTTPException(status_code=400, detail="Không tìm thấy dữ liệu tiết học trong ảnh TKB.")

    if overwrite:
        if teacher_name and teacher_name != "Giáo viên":
            db.query(TKBSlotModel).filter(TKBSlotModel.teacher_name == teacher_name).delete()
        else:
            db.query(TKBSlotModel).delete()
        db.commit()

    saved_slots = []
    for slot_data in parsed_slots:
        day_val = int(slot_data.get("day_of_week") or 2)
        period_val = int(slot_data.get("period") or 1)
        sess_val = slot_data.get("session") or ("Sáng" if period_val <= 5 else "Chiều")
        
        slot = TKBSlotModel(
            teacher_name=teacher_name,
            class_name=str(slot_data.get("class_name") or ""),
            subject=str(slot_data.get("subject") or "Toán"),
            day_of_week=day_val,
            period=period_val,
            session=sess_val,
            semester="Học kỳ 1"
        )
        db.add(slot)
        saved_slots.append(slot)

    db.commit()
    for s in saved_slots:
        db.refresh(s)

    teachers = [t[0] for t in db.query(distinct(TKBSlotModel.teacher_name)).all() if t[0]]
    classes = [c[0] for c in db.query(distinct(TKBSlotModel.class_name)).all() if c[0]]

    return TKBUploadResponse(
        total_slots=len(saved_slots),
        teachers=teachers,
        classes=classes,
        slots=saved_slots
    )


