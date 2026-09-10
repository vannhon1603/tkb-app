import io
import re
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL

from db.models import PPCTModel, TKBSlotModel, SoBaoGiangEntryModel
from logger import logger

DAY_VIETNAMESE = {
    2: "Thứ Hai",
    3: "Thứ Ba",
    4: "Thứ Tư",
    5: "Thứ Năm",
    6: "Thứ Sáu",
    7: "Thứ Bảy",
    8: "Chủ Nhật"
}

def extract_grade_from_class(class_name: str) -> str:
    """Extract grade string e.g. '10A1' -> 'Khối 10'"""
    m = re.search(r'\b(1[0-2])', class_name)
    if m:
        return f"Khối {m.group(1)}"
    return "Khối 10"

def normalize_subject_group(subject: str) -> str:
    """Normalize subject string into canonical group for robust matching"""
    if not subject:
        return "khác"
    s = subject.strip().lower()
    
    # HĐTN / Hoạt động trải nghiệm, hướng nghiệp
    if any(k in s for k in ["hđtn", "hdtn", "trải nghiệm", "hướng nghiệp", "trai nghiem", "huong nghiep"]):
        return "hđtn"
    
    # Chào cờ / Sinh hoạt dưới cờ
    if any(k in s for k in ["chào cờ", "chao co", "dưới cờ", "duoi co", "shdc", "cc"]):
        return "chào cờ"
        
    # Sinh hoạt lớp / Sinh hoạt chủ nhiệm
    if any(k in s for k in ["sinh hoạt lớp", "sinh hoat lop", "shl", "shcn", "chủ nhiệm", "chu nhiem"]):
        return "sinh hoạt lớp"
        
    # Toán
    if any(k in s for k in ["toán", "toan", "đại số", "hình học", "chuyên đề toán", "cđ toán"]):
        return "toán"
        
    # Ngữ văn
    if any(k in s for k in ["văn", "van", "ngữ văn", "ngu van"]):
        return "ngữ văn"
        
    # Tiếng Anh / Ngoại ngữ
    if any(k in s for k in ["tiếng anh", "ngoại ngữ", "anh", "english"]):
        return "tiếng anh"
        
    # Vật lí
    if any(k in s for k in ["vật lí", "vật lý", "vat li", "vat ly", "lí", "lý"]):
        return "vật lí"
        
    # Hóa học
    if any(k in s for k in ["hóa học", "hóa", "hoa hoc", "hoa"]):
        return "hóa học"
        
    # Sinh học
    if any(k in s for k in ["sinh học", "sinh", "sinh hoc"]):
        return "sinh học"
        
    # Lịch sử
    if any(k in s for k in ["lịch sử", "sử", "lich su", "su"]):
        return "lịch sử"
        
    # Địa lí
    if any(k in s for k in ["địa lí", "địa lý", "địa", "dia li", "dia ly", "dia"]):
        return "địa lí"
        
    # GDCD / GDKT&PL
    if any(k in s for k in ["gdcd", "công dân", "gdkt", "kinh tế pháp luật", "kinh te phap luat"]):
        return "gdkt&pl"
        
    # Tin học
    if any(k in s for k in ["tin học", "tin", "tin hoc", "cntt"]):
        return "tin học"
        
    # Công nghệ
    if any(k in s for k in ["công nghệ", "cong nghe", "cn"]):
        return "công nghệ"
        
    # GDTC / Thể dục
    if any(k in s for k in ["gdtc", "thể dục", "the duc"]):
        return "gdtc"
        
    # GDQP / Quốc phòng
    if any(k in s for k in ["gdqp", "quốc phòng", "an ninh", "quoc phong"]):
        return "gdqp"

    return s

def find_matching_ppct_list(ppct_map: Dict[tuple, List[PPCTModel]], grade: str, subject: str) -> List[PPCTModel]:
    """Find matching PPCT list for a given grade and subject without crosstalk between different subjects."""
    grade_clean = grade.strip().lower()
    subj_clean = subject.strip().lower()
    subj_group = normalize_subject_group(subject)
    
    # 1. Exact match (grade, subject)
    exact_key = (grade_clean, subj_clean)
    if exact_key in ppct_map and ppct_map[exact_key]:
        return ppct_map[exact_key]
        
    # 2. Match by same grade and normalized subject group
    for (g, s_name), items in ppct_map.items():
        if g == grade_clean and normalize_subject_group(s_name) == subj_group:
            return items
            
    # 3. Match across grades only if subject group strictly matches
    for (g, s_name), items in ppct_map.items():
        if normalize_subject_group(s_name) == subj_group:
            return items

    # NEVER fallback to an incompatible subject group (e.g. NEVER return Toán PPCT for HĐTN or Văn)!
    return []

def get_default_lesson_info(subject: str, week_num: int, cur_idx: int) -> Tuple[str, int, str]:
    """Provide standard fallback lesson title and number when no PPCT is uploaded for that subject."""
    subj_group = normalize_subject_group(subject)
    ppct_num = cur_idx + 1
    notes = ""
    
    if subj_group == "hđtn":
        title = f"Hoạt động trải nghiệm, hướng nghiệp (Tuần {week_num})"
    elif subj_group == "chào cờ":
        title = f"Sinh hoạt dưới cờ (Tuần {week_num})"
    elif subj_group == "sinh hoạt lớp":
        title = f"Sinh hoạt lớp (Tuần {week_num})"
    else:
        title = f"{subject} - Tiết {cur_idx + 1}"
        
    return title, ppct_num, notes

def format_ppct_lesson_str(lesson_number: Optional[int], notes: Optional[str] = "", title: Optional[str] = "") -> str:
    if not lesson_number:
        return ""
    is_cd = (notes and ("chuyên đề" in notes.lower() or "cđ" in notes.lower())) or \
            (title and ("chuyên đề" in title.lower() or "cđ" in title.lower())) or \
            (105 < lesson_number <= 150)
    if is_cd:
        cd_num = (lesson_number - 105) if lesson_number > 105 else lesson_number
        return f"{cd_num}CĐ"
    return str(lesson_number)

class SoBaoGiangService:
    @staticmethod
    def generate_for_week(
        db: Session,
        week_number: int,
        start_date_str: str,
        teacher_name: Optional[str] = None,
        semester: str = "Học kỳ 1",
        overwrite: bool = True,
        preserve_taught: bool = True
    ) -> List[SoBaoGiangEntryModel]:
        """Automatically generate Sổ Báo Giảng entries for the given week from TKB and PPCT"""
        # Parse Monday start date
        try:
            start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
        except Exception:
            try:
                start_date = datetime.strptime(start_date_str, "%d/%m/%Y")
            except Exception:
                start_date = datetime.utcnow()

        # Query TKB slots
        q = db.query(TKBSlotModel)
        if teacher_name and teacher_name.strip() and teacher_name != "Tất cả":
            q = q.filter(TKBSlotModel.teacher_name == teacher_name.strip())
        
        slots = q.order_by(TKBSlotModel.day_of_week.asc(), TKBSlotModel.period.asc()).all()
        if not slots:
            return []

        # Map existing taught status if preserve_taught is True
        taught_map = {}
        if preserve_taught:
            existing = db.query(SoBaoGiangEntryModel).filter(
                SoBaoGiangEntryModel.week_number == week_number
            )
            if teacher_name and teacher_name.strip() and teacher_name != "Tất cả":
                existing = existing.filter(SoBaoGiangEntryModel.teacher_name == teacher_name.strip())
            for e in existing.all():
                if e.is_taught:
                    taught_map[(e.day_of_week, e.period, e.class_name)] = (e.is_taught, e.taught_at, e.status)

        # If overwrite, remove existing non-custom entries for this week & teacher
        if overwrite:
            del_q = db.query(SoBaoGiangEntryModel).filter(
                SoBaoGiangEntryModel.week_number == week_number,
                SoBaoGiangEntryModel.start_date == start_date.strftime("%Y-%m-%d")
            )
            if teacher_name and teacher_name.strip() and teacher_name != "Tất cả":
                del_q = del_q.filter(SoBaoGiangEntryModel.teacher_name == teacher_name.strip())
            del_q.delete()
            db.commit()

        # Query PPCT items
        ppct_items = db.query(PPCTModel).order_by(PPCTModel.lesson_number.asc()).all()
        
        # Group PPCT by (grade, subject)
        ppct_map: Dict[tuple, List[PPCTModel]] = {}
        for item in ppct_items:
            key = (item.grade.strip().lower(), item.subject.strip().lower())
            if key not in ppct_map:
                ppct_map[key] = []
            ppct_map[key].append(item)

        # Count slots per (class_name, subject_group) to determine lesson offset for earlier weeks
        class_subj_slots_per_week: Dict[tuple, int] = {}
        for s in slots:
            sg = normalize_subject_group(s.subject)
            k = (s.class_name.strip(), sg)
            class_subj_slots_per_week[k] = class_subj_slots_per_week.get(k, 0) + 1

        # Track sequential lesson pointer for each (class_name, subject_group)
        class_subj_lesson_counters: Dict[tuple, int] = {}
        for k, count in class_subj_slots_per_week.items():
            class_subj_lesson_counters[k] = (week_number - 1) * count

        generated_entries = []
        eff_teacher = teacher_name if teacher_name and teacher_name != "Tất cả" else "Giáo viên bộ môn"

        for s in slots:
            day_offset = s.day_of_week - 2 # 2=Monday -> offset 0
            slot_date = start_date + timedelta(days=day_offset)
            date_formatted = slot_date.strftime("%d/%m/%Y")

            grade = extract_grade_from_class(s.class_name)
            sg = normalize_subject_group(s.subject)
            counter_key = (s.class_name.strip(), sg)
            
            cur_idx = class_subj_lesson_counters.get(counter_key, 0)
            class_subj_lesson_counters[counter_key] = cur_idx + 1
            
            ppct_list = find_matching_ppct_list(ppct_map, grade, s.subject)

            if ppct_list:
                week_matches = [p for p in ppct_list if p.week == week_number]
                if week_matches:
                    sub_idx = cur_idx % len(week_matches)
                    target_p = week_matches[sub_idx]
                    lesson_title = target_p.lesson_title
                    ppct_lesson_num = target_p.lesson_number
                    notes = target_p.notes or ""
                elif cur_idx < len(ppct_list):
                    target_p = ppct_list[cur_idx]
                    lesson_title = target_p.lesson_title
                    ppct_lesson_num = target_p.lesson_number
                    notes = target_p.notes or ""
                else:
                    lesson_title = f"{s.subject} - Tiết {cur_idx + 1}"
                    ppct_lesson_num = cur_idx + 1
                    notes = ""
            else:
                lesson_title, ppct_lesson_num, notes = get_default_lesson_info(s.subject, week_number, cur_idx)

            # Check preserved taught status
            prev_info = taught_map.get((s.day_of_week, s.period, s.class_name))
            is_taught_val = prev_info[0] if prev_info else False
            taught_at_val = prev_info[1] if prev_info else None
            status_val = prev_info[2] if prev_info else "pending"

            entry = SoBaoGiangEntryModel(
                teacher_name=s.teacher_name or eff_teacher,
                week_number=week_number,
                start_date=start_date.strftime("%Y-%m-%d"),
                day_of_week=s.day_of_week,
                date_str=date_formatted,
                period=s.period,
                class_name=s.class_name,
                subject=s.subject,
                ppct_lesson_number=ppct_lesson_num,
                lesson_title=lesson_title,
                notes=notes,
                is_custom=False,
                is_taught=is_taught_val,
                taught_at=taught_at_val,
                status=status_val
            )
            db.add(entry)
            generated_entries.append(entry)

        db.commit()
        for e in generated_entries:
            db.refresh(e)
        return generated_entries

    @staticmethod
    def generate_all_weeks(
        db: Session,
        semester_start_date_str: str,
        total_weeks: int = 35,
        teacher_name: Optional[str] = None,
        semester: str = "Học kỳ 1",
        overwrite: bool = True,
        preserve_taught: bool = True
    ) -> Dict[str, Any]:
        """
        Automatically generate Sổ Báo Giảng entries for ALL weeks (Tuần 1 -> total_weeks, default 35).
        Advances lesson numbers seamlessly from PPCT across the entire school year.
        Preserves already marked 'is_taught' flags if preserve_taught=True.
        """
        # Parse Monday start date of Week 1
        try:
            base_monday = datetime.strptime(semester_start_date_str, "%Y-%m-%d")
        except Exception:
            try:
                base_monday = datetime.strptime(semester_start_date_str, "%d/%m/%Y")
            except Exception:
                base_monday = datetime.utcnow()

        # Query TKB slots
        q = db.query(TKBSlotModel)
        if teacher_name and teacher_name.strip() and teacher_name != "Tất cả":
            q = q.filter(TKBSlotModel.teacher_name == teacher_name.strip())
        
        slots = q.order_by(TKBSlotModel.day_of_week.asc(), TKBSlotModel.period.asc()).all()
        if not slots:
            return {
                "total_weeks": 0,
                "total_entries": 0,
                "teacher_name": teacher_name or "Giáo viên",
                "message": "Không tìm thấy dữ liệu Thời khóa biểu. Vui lòng nạp TKB trước."
            }

        # Collect existing taught status if preserving
        taught_map = {}
        if preserve_taught:
            existing = db.query(SoBaoGiangEntryModel)
            if teacher_name and teacher_name.strip() and teacher_name != "Tất cả":
                existing = existing.filter(SoBaoGiangEntryModel.teacher_name == teacher_name.strip())
            for e in existing.all():
                if e.is_taught:
                    taught_map[(e.week_number, e.day_of_week, e.period, e.class_name)] = (e.is_taught, e.taught_at, e.status)

        # Clear existing entries if overwrite
        if overwrite:
            del_q = db.query(SoBaoGiangEntryModel)
            if teacher_name and teacher_name.strip() and teacher_name != "Tất cả":
                del_q = del_q.filter(SoBaoGiangEntryModel.teacher_name == teacher_name.strip())
            del_q.delete()
            db.commit()

        # Query PPCT items
        ppct_items = db.query(PPCTModel).order_by(PPCTModel.lesson_number.asc()).all()
        
        # Group PPCT by (grade, subject)
        ppct_map: Dict[tuple, List[PPCTModel]] = {}
        for item in ppct_items:
            key = (item.grade.strip().lower(), item.subject.strip().lower())
            if key not in ppct_map:
                ppct_map[key] = []
            ppct_map[key].append(item)

        eff_teacher = teacher_name if teacher_name and teacher_name != "Tất cả" else "Giáo viên bộ môn"

        # Continuous lesson counter for each (class_name, subject_group) across all 35 weeks
        class_subj_lesson_counters: Dict[tuple, int] = {}
        for s in slots:
            sg = normalize_subject_group(s.subject)
            k = (s.class_name.strip(), sg)
            if k not in class_subj_lesson_counters:
                class_subj_lesson_counters[k] = 0

        all_generated_entries = []

        for week_num in range(1, total_weeks + 1):
            week_monday = base_monday + timedelta(days=(week_num - 1) * 7)
            week_monday_str = week_monday.strftime("%Y-%m-%d")

            for s in slots:
                day_offset = s.day_of_week - 2
                slot_date = week_monday + timedelta(days=day_offset)
                date_formatted = slot_date.strftime("%d/%m/%Y")

                grade = extract_grade_from_class(s.class_name)
                sg = normalize_subject_group(s.subject)
                counter_key = (s.class_name.strip(), sg)

                cur_idx = class_subj_lesson_counters.get(counter_key, 0)
                class_subj_lesson_counters[counter_key] = cur_idx + 1

                ppct_list = find_matching_ppct_list(ppct_map, grade, s.subject)

                if ppct_list:
                    week_matches = [p for p in ppct_list if p.week == week_num]
                    if week_matches:
                        sub_idx = cur_idx % len(week_matches)
                        target_p = week_matches[sub_idx]
                        lesson_title = target_p.lesson_title
                        ppct_lesson_num = target_p.lesson_number
                        notes = target_p.notes or ""
                    elif cur_idx < len(ppct_list):
                        target_p = ppct_list[cur_idx]
                        lesson_title = target_p.lesson_title
                        ppct_lesson_num = target_p.lesson_number
                        notes = target_p.notes or ""
                    else:
                        lesson_title = f"{s.subject} - Tiết {cur_idx + 1}"
                        ppct_lesson_num = cur_idx + 1
                        notes = ""
                else:
                    lesson_title, ppct_lesson_num, notes = get_default_lesson_info(s.subject, week_num, cur_idx)

                # Check preserved taught status
                prev_info = taught_map.get((week_num, s.day_of_week, s.period, s.class_name))
                is_taught_val = prev_info[0] if prev_info else False
                taught_at_val = prev_info[1] if prev_info else None
                status_val = prev_info[2] if prev_info else "pending"

                entry = SoBaoGiangEntryModel(
                    teacher_name=s.teacher_name or eff_teacher,
                    week_number=week_num,
                    start_date=week_monday_str,
                    day_of_week=s.day_of_week,
                    date_str=date_formatted,
                    period=s.period,
                    class_name=s.class_name,
                    subject=s.subject,
                    ppct_lesson_number=ppct_lesson_num,
                    lesson_title=lesson_title,
                    notes=notes,
                    is_custom=False,
                    is_taught=is_taught_val,
                    taught_at=taught_at_val,
                    status=status_val
                )
                db.add(entry)
                all_generated_entries.append(entry)

        db.commit()

        return {
            "total_weeks": total_weeks,
            "total_entries": len(all_generated_entries),
            "teacher_name": eff_teacher,
            "message": f"Đã tự động sinh thành công {len(all_generated_entries)} tiết dạy cho toàn bộ {total_weeks} tuần năm học!"
        }


    @staticmethod
    def _expand_entries_with_empty_periods(entries: List[SoBaoGiangEntryModel]) -> List[Dict[str, Any]]:
        """Expand entries to include empty rows for free periods on teaching days."""
        if not entries:
            return []
        by_day: Dict[int, List[SoBaoGiangEntryModel]] = {}
        for e in entries:
            if e.day_of_week not in by_day:
                by_day[e.day_of_week] = []
            by_day[e.day_of_week].append(e)
            
        expanded = []
        for day_num in sorted(by_day.keys()):
            day_entries = by_day[day_num]
            date_str = day_entries[0].date_str if day_entries else ""
            max_p = max((e.period for e in day_entries), default=5)
            
            if max_p <= 5:
                periods = list(range(1, 6))
            else:
                periods = list(range(1, max(10, max_p) + 1))
                
            period_map = {e.period: e for e in day_entries}
            
            for p in periods:
                if p in period_map:
                    expanded.append({
                        "is_empty": False,
                        "entry": period_map[p],
                        "day_of_week": day_num,
                        "date_str": date_str,
                        "period": p
                    })
                else:
                    expanded.append({
                        "is_empty": True,
                        "entry": None,
                        "day_of_week": day_num,
                        "date_str": date_str,
                        "period": p
                    })
        return expanded

    @staticmethod
    def export_excel(entries: List[SoBaoGiangEntryModel], week_number: int, teacher_name: str) -> bytes:
        """Export Sổ Báo Giảng to styled Excel (.xlsx) file with empty rows for free periods"""
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = f"Tuần {week_number}"
        ws.views.sheetView[0].showGridLines = True

        # Styles
        title_font = Font(name="Times New Roman", size=15, bold=True, color="1F4E78")
        sub_font = Font(name="Times New Roman", size=11, bold=True, italic=True)
        header_font = Font(name="Times New Roman", size=10, bold=True, color="FFFFFF")
        regular_font = Font(name="Times New Roman", size=10)
        bold_font = Font(name="Times New Roman", size=10, bold=True)
        empty_font = Font(name="Times New Roman", size=10, italic=True, color="888888")
        
        header_fill = PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid")
        zebra_fill = PatternFill(start_color="F2F7FA", end_color="F2F7FA", fill_type="solid")
        empty_fill = PatternFill(start_color="FAFAFA", end_color="FAFAFA", fill_type="solid")
        
        thin_border = Border(
            left=Side(style='thin', color='BFBFBF'),
            right=Side(style='thin', color='BFBFBF'),
            top=Side(style='thin', color='BFBFBF'),
            bottom=Side(style='thin', color='BFBFBF')
        )
        
        center_align = Alignment(horizontal="center", vertical="center", wrap_text=True)
        left_align = Alignment(horizontal="left", vertical="center", wrap_text=True)

        # Title block
        ws.merge_cells("A1:G1")
        ws["A1"] = "SỔ BÁO GIẢNG VÀ THEO DÕI TIẾN ĐỘ DẠY HỌC"
        ws["A1"].font = title_font
        ws["A1"].alignment = center_align
        ws.row_dimensions[1].height = 28

        ws.merge_cells("A2:G2")
        ws["A2"] = f"TUẦN {week_number} | GIÁO VIÊN: {teacher_name.upper()}"
        ws["A2"].font = sub_font
        ws["A2"].alignment = center_align
        ws.row_dimensions[2].height = 20

        # Header Row
        headers = [
            ("Thứ / Ngày", 14),
            ("Tiết TKB", 10),
            ("Lớp", 10),
            ("Môn học", 12),
            ("Tiết PPCT", 11),
            ("Tên bài dạy / Nội dung giảng dạy", 42),
            ("Ghi chú / Thiết bị ĐDDH", 24)
        ]

        ws.row_dimensions[4].height = 25
        for col_i, (h_title, width) in enumerate(headers, 1):
            col_letter = openpyxl.utils.get_column_letter(col_i)
            cell = ws.cell(row=4, column=col_i, value=h_title)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = center_align
            cell.border = thin_border
            ws.column_dimensions[col_letter].width = width

        # Data Rows with Empty Periods
        expanded_items = SoBaoGiangService._expand_entries_with_empty_periods(entries)
        start_row = 5
        
        for idx, item in enumerate(expanded_items):
            row_num = start_row + idx
            ws.row_dimensions[row_num].height = 22
            is_empty = item["is_empty"]
            entry = item["entry"]

            day_label = f"{DAY_VIETNAMESE.get(item['day_of_week'], 'Thứ')} ({item['date_str']})"
            
            if is_empty:
                row_fill = empty_fill
                row_data = [
                    (day_label, center_align, bold_font),
                    (f"Tiết {item['period']}", center_align, empty_font),
                    ("-", center_align, empty_font),
                    ("-", center_align, empty_font),
                    ("-", center_align, empty_font),
                    ("-", center_align, empty_font),
                    ("-", center_align, empty_font),
                ]
            else:
                is_zebra = idx % 2 == 1
                row_fill = zebra_fill if is_zebra else None
                formatted_ppct_lesson = format_ppct_lesson_str(entry.ppct_lesson_number, entry.notes, entry.lesson_title)
                row_data = [
                    (day_label, center_align, bold_font),
                    (f"Tiết {entry.period}", center_align, regular_font),
                    (entry.class_name, center_align, bold_font),
                    (entry.subject, center_align, regular_font),
                    (formatted_ppct_lesson, center_align, bold_font),
                    (entry.lesson_title, left_align, regular_font),
                    (entry.notes or "", left_align, regular_font),
                ]

            for col_i, (val, align, font_style) in enumerate(row_data, 1):
                cell = ws.cell(row=row_num, column=col_i, value=val)
                cell.font = font_style
                cell.alignment = align
                cell.border = thin_border
                if row_fill:
                    cell.fill = row_fill

        # Signature Footer
        last_row = start_row + len(expanded_items) + 2
        ws.cell(row=last_row, column=2, value="NGƯỜI LẬP BIỂU").font = bold_font
        ws.cell(row=last_row, column=2).alignment = center_align
        ws.cell(row=last_row, column=6, value="TỔ TRƯỞNG CHUYÊN MÔN").font = bold_font
        ws.cell(row=last_row, column=6).alignment = center_align

        out = io.BytesIO()
        wb.save(out)
        out.seek(0)
        return out.getvalue()

    @staticmethod
    def export_word(entries: List[SoBaoGiangEntryModel], week_number: int, teacher_name: str) -> bytes:
        """Export Sổ Báo Giảng to formatted Word (.docx) document with empty rows for free periods"""
        doc = Document()
        
        # Set landscape page orientation or tight margins
        for section in doc.sections:
            section.top_margin = Inches(0.6)
            section.bottom_margin = Inches(0.6)
            section.left_margin = Inches(0.6)
            section.right_margin = Inches(0.6)

        # Header Title
        title_p = doc.add_paragraph()
        title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = title_p.add_run("SỔ BÁO GIẢNG GIẢNG DẠY")
        run.bold = True
        run.font.name = "Times New Roman"
        run.font.size = Pt(15)
        run.font.color.rgb = RGBColor(31, 78, 120)

        sub_p = doc.add_paragraph()
        sub_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        sub_run = sub_p.add_run(f"Tuần {week_number}  |  Giáo viên: {teacher_name}")
        sub_run.italic = True
        sub_run.font.name = "Times New Roman"
        sub_run.font.size = Pt(11)

        # Main Table
        table = doc.add_table(rows=1, cols=7)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        table.style = 'Table Grid'

        # Headers
        headers = ["Thứ / Ngày", "Tiết TKB", "Lớp", "Môn", "Tiết PPCT", "Tên bài dạy", "Ghi chú / ĐDDH"]
        hdr_cells = table.rows[0].cells
        for i, h in enumerate(headers):
            hdr_cells[i].text = h
            hdr_cells[i].paragraphs[0].runs[0].bold = True
            hdr_cells[i].paragraphs[0].runs[0].font.name = "Times New Roman"
            hdr_cells[i].paragraphs[0].runs[0].font.size = Pt(10)
            hdr_cells[i].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER

        # Rows with Empty Periods
        expanded_items = SoBaoGiangService._expand_entries_with_empty_periods(entries)
        for item in expanded_items:
            row_cells = table.add_row().cells
            day_text = f"{DAY_VIETNAMESE.get(item['day_of_week'], 'Thứ')} ({item['date_str']})"
            is_empty = item["is_empty"]
            entry = item["entry"]

            if is_empty:
                vals = [
                    day_text,
                    f"Tiết {item['period']}",
                    "-",
                    "-",
                    "-",
                    "-",
                    "-"
                ]
            else:
                formatted_ppct = format_ppct_lesson_str(entry.ppct_lesson_number, entry.notes, entry.lesson_title)
                vals = [
                    day_text,
                    f"Tiết {entry.period}",
                    entry.class_name,
                    entry.subject,
                    formatted_ppct,
                    entry.lesson_title,
                    entry.notes or ""
                ]
                
            for i, v in enumerate(vals):
                row_cells[i].text = str(v)
                p = row_cells[i].paragraphs[0]
                if p.runs:
                    p.runs[0].font.name = "Times New Roman"
                    p.runs[0].font.size = Pt(9.5)
                    if is_empty:
                        p.runs[0].font.italic = True
                if i in [0, 1, 2, 3, 4] or is_empty:
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER

        # Footer Signatures
        doc.add_paragraph()
        sig_table = doc.add_table(rows=1, cols=2)
        sig_table.alignment = WD_TABLE_ALIGNMENT.CENTER
        sig_cells = sig_table.rows[0].cells
        
        p1 = sig_cells[0].paragraphs[0]
        p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r1 = p1.add_run("NGƯỜI LẬP BIỂU\n(Ký và ghi rõ họ tên)")
        r1.bold = True
        r1.font.name = "Times New Roman"

        p2 = sig_cells[1].paragraphs[0]
        p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r2 = p2.add_run("TỔ TRƯỞNG CHUYÊN MÔN\n(Ký và ghi rõ họ tên)")
        r2.bold = True
        r2.font.name = "Times New Roman"

        out = io.BytesIO()
        doc.save(out)
        out.seek(0)
        return out.getvalue()
