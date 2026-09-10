from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from db.session import get_db
from db.models import SettingModel
from schemas.settings import SettingCreate, SettingResponse

router = APIRouter(prefix="/settings", tags=["System Settings"])

@router.get("/", response_model=List[SettingResponse])
async def list_settings(db: Session = Depends(get_db)):
    return db.query(SettingModel).all()

@router.post("/seed-demo")
async def seed_demo_data(db: Session = Depends(get_db)):
    """Populates standard sample PPCT, TKB, and auto-generates Sổ Báo Giảng for instant testing"""
    from db.models import PPCTModel, TKBSlotModel, SoBaoGiangEntryModel
    from services.so_bao_giang_service import SoBaoGiangService

    # 1. Seed PPCT (Khối 10 - Môn Toán)
    sample_ppct = [
        (1, 1, "Bài 1: Mệnh đề toán học (Tiết 1)", "Máy chiếu, phiếu học tập 1"),
        (1, 2, "Bài 1: Mệnh đề toán học (Tiết 2)", "Bảng phụ"),
        (2, 3, "Bài 2: Tập hợp và các phép toán trên tập hợp (Tiết 1)", "Phiếu học tập 2"),
        (2, 4, "Bài 2: Tập hợp và các phép toán trên tập hợp (Tiết 2)", "ĐDDH"),
        (3, 5, "Bài tập cuối chương I", "Máy tính cầm tay"),
        (3, 6, "Bài 3: Bất phương trình bậc nhất hai ẩn (Tiết 1)", "Thước kẻ, máy chiếu"),
        (4, 7, "Bài 3: Bất phương trình bậc nhất hai ẩn (Tiết 2)", "Phiếu bài tập"),
        (4, 8, "Bài 4: Hệ bất phương trình bậc nhất hai ẩn", "Phần mềm GeoGebra"),
        (5, 9, "Bài tập cuối chương II", "Đề kiểm tra 15 phút"),
        (5, 10, "Bài 5: Giá trị lượng giác của một góc từ 0 đến 180 độ (Tiết 1)", "Vòng tròn lượng giác"),
        (6, 11, "Bài 5: Giá trị lượng giác của một góc từ 0 đến 180 độ (Tiết 2)", "Phiếu học tập"),
        (6, 12, "Bài 6: Hệ thức lượng trong tam giác (Tiết 1)", "Thước đo góc, compa"),
        (7, 13, "Bài 6: Hệ thức lượng trong tam giác (Tiết 2)", "Máy chiếu"),
        (7, 14, "Bài 6: Hệ thức lượng trong tam giác (Tiết 3)", "Bài tập nhóm"),
        (8, 15, "Bài tập cuối chương III", "Kiểm tra giữa kỳ I"),
        (8, 16, "Ôn tập và kiểm tra giữa học kỳ I", "Đề cương ôn tập"),
    ]

    # Delete existing demo subject if present
    db.query(PPCTModel).filter(PPCTModel.grade == "Khối 10", PPCTModel.subject == "Toán").delete()
    for week, lesson_num, title, notes in sample_ppct:
        db.add(PPCTModel(
            grade="Khối 10",
            subject="Toán",
            week=week,
            lesson_number=lesson_num,
            lesson_title=title,
            notes=notes,
            semester="Học kỳ 1"
        ))

    # 2. Seed TKB for "Thầy Nguyễn Văn An"
    sample_tkb = [
        ("Thầy Nguyễn Văn An", "10A1", "Toán", 2, 1, "Sáng"),
        ("Thầy Nguyễn Văn An", "10A1", "Toán", 2, 2, "Sáng"),
        ("Thầy Nguyễn Văn An", "10A2", "Toán", 2, 4, "Sáng"),
        ("Thầy Nguyễn Văn An", "10A2", "Toán", 3, 1, "Sáng"),
        ("Thầy Nguyễn Văn An", "10A1", "Toán", 3, 3, "Sáng"),
        ("Thầy Nguyễn Văn An", "11B1", "Toán", 3, 4, "Sáng"),
        ("Thầy Nguyễn Văn An", "10A2", "Toán", 4, 2, "Sáng"),
        ("Thầy Nguyễn Văn An", "10A1", "Toán", 4, 3, "Sáng"),
        ("Thầy Nguyễn Văn An", "11B1", "Toán", 4, 4, "Sáng"),
        ("Thầy Nguyễn Văn An", "10A2", "Toán", 5, 1, "Sáng"),
        ("Thầy Nguyễn Văn An", "11B1", "Toán", 5, 3, "Sáng"),
        ("Thầy Nguyễn Văn An", "10A1", "Toán", 6, 2, "Sáng"),
        ("Thầy Nguyễn Văn An", "11B1", "Toán", 6, 4, "Sáng"),
        ("Thầy Nguyễn Văn An", "10A2", "Toán", 7, 1, "Sáng"),
    ]

    db.query(TKBSlotModel).filter(TKBSlotModel.teacher_name == "Thầy Nguyễn Văn An").delete()
    for teacher, cls, sub, day, per, sess in sample_tkb:
        db.add(TKBSlotModel(
            teacher_name=teacher,
            class_name=cls,
            subject=sub,
            day_of_week=day,
            period=per,
            session=sess,
            semester="Học kỳ 1"
        ))
    db.commit()

    # 3. Auto-generate Sổ Báo Giảng for Week 1
    today = "2026-09-07"
    entries = SoBaoGiangService.generate_for_week(
        db=db,
        week_number=1,
        start_date_str=today,
        teacher_name="Thầy Nguyễn Văn An",
        overwrite=True
    )

    return {
        "status": "success",
        "message": "Đã nạp thành công bộ dữ liệu mẫu (PPCT Toán 10, TKB Thầy Nguyễn Văn An & Sổ Báo Giảng Tuần 1)!",
        "total_ppct": len(sample_ppct),
        "total_tkb_slots": len(sample_tkb),
        "total_so_bao_giang_entries": len(entries)
    }
