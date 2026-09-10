import io
import re
import openpyxl
from docx import Document
from typing import List, Dict, Any, Tuple, Optional
from logger import logger

DAY_NAME_MAP = {
    "hai": 2, "thứ 2": 2, "thứ hai": 2, "t2": 2, "thứ ba": 3, "thứ 3": 3, "ba": 3, "t3": 3,
    "thứ tư": 4, "thứ 4": 4, "tư": 4, "t4": 4, "thứ năm": 5, "thứ 5": 5, "năm": 5, "t5": 5,
    "thứ sáu": 6, "thứ 6": 6, "sáu": 6, "t6": 6, "thứ bảy": 7, "thứ 7": 7, "bảy": 7, "t7": 7,
}

def parse_tkb_cell(cell_str: str, default_subject: str = "Toán") -> Tuple[Optional[str], Optional[str]]:
    """Extract class name and subject from a cell like '10A1 (Toán)' or 'Toán 10A2' or 'HĐTN 10A1' or '12B1'"""
    if not cell_str or not cell_str.strip():
        return None, None
    s = cell_str.strip()
    
    # Check for Class patterns like 10A1, 10A12, 11B2, 12C3, 10/1, 11/2...
    class_match = re.search(r'\b(1[0-2][A-Za-z0-9_\-\.\/]+)\b', s)
    class_name = class_match.group(1) if class_match else None
    
    # Extract subject
    cleaned_subject = default_subject
    subject_patterns = [
        "HĐTN, HN", "HĐTN - HN", "HĐTN-HN", "HĐTN", "Hoạt động trải nghiệm", "Trải nghiệm hướng nghiệp", "Trải nghiệm", "Hướng nghiệp",
        "Chào cờ", "Sinh hoạt dưới cờ", "SHDC",
        "Sinh hoạt lớp", "Sinh hoạt chủ nhiệm", "SHL", "SHCN",
        "Toán", "Văn", "Ngữ văn", "Tiếng Anh", "Anh", "Lí", "Vật lí", "Vật lý", 
        "Hóa", "Hóa học", "Sinh", "Sinh học", "Sử", "Lịch sử", "Địa", "Địa lí", "Địa lý", 
        "GDKT&PL", "GDCD", "Giáo dục công dân", "Tin", "Tin học",
        "Công nghệ", "Thể dục", "GDTC", "GDQP", "Quốc phòng"
    ]
    for subj in subject_patterns:
        if re.search(r'(?:\b|_|\s|^)' + re.escape(subj) + r'(?:\b|_|\s|$)', s, re.IGNORECASE):
            if "hđtn" in subj.lower() or "trải nghiệm" in subj.lower():
                cleaned_subject = "HĐTN"
            elif "chào cờ" in subj.lower() or "shdc" in subj.lower():
                cleaned_subject = "Chào cờ"
            elif "sinh hoạt" in subj.lower() or "shl" in subj.lower() or "shcn" in subj.lower():
                cleaned_subject = "Sinh hoạt lớp"
            else:
                cleaned_subject = subj
            break

    if class_name:
        return class_name, cleaned_subject
    elif cleaned_subject in ["Chào cờ", "Sinh hoạt dưới cờ"]:
        return "Chào cờ", "Chào cờ"
    return None, None

def parse_tkb_excel(file_bytes: bytes, default_teacher: str = "Giáo viên") -> List[Dict[str, Any]]:
    """Parse Timetable (TKB) from Excel file"""
    wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
    sheet = wb.active
    rows = list(sheet.iter_rows(values_only=True))
    if not rows:
        return []

    slots = []
    
    # Check if table is a Matrix with Day columns (Thứ 2..Thứ 7)
    day_cols: Dict[int, int] = {} # col_index -> day_of_week (2..7)
    header_row_idx = -1
    
    for r_idx, row in enumerate(rows[:10]):
        for c_idx, cell in enumerate(row):
            if cell is None:
                continue
            c_str = str(cell).strip().lower()
            for k, day_num in DAY_NAME_MAP.items():
                if k in c_str:
                    day_cols[c_idx] = day_num
                    header_row_idx = r_idx
                    break
        if len(day_cols) >= 3:
            break

    if day_cols and header_row_idx >= 0:
        # Matrix format
        current_period = 1
        for row in rows[header_row_idx + 1:]:
            if not any(row):
                continue
            # Try to read period from first columns
            period_candidate = None
            for c_val in row[:3]:
                if c_val is not None:
                    nums = re.findall(r'\b([1-9]|10)\b', str(c_val).strip())
                    if nums:
                        try:
                            period_candidate = int(nums[0])
                            break
                        except Exception:
                            pass
            period = period_candidate if period_candidate is not None else current_period
            current_period = period + 1 if period < 10 else 1

            for col_idx, day_num in day_cols.items():
                if col_idx < len(row) and row[col_idx] is not None:
                    cell_val = str(row[col_idx]).strip()
                    class_name, subject = parse_tkb_cell(cell_val)
                    if class_name:
                        slots.append({
                            "teacher_name": default_teacher,
                            "class_name": class_name,
                            "subject": subject or "Toán",
                            "day_of_week": day_num,
                            "period": period,
                            "session": "Sáng" if period <= 5 else "Chiều",
                            "semester": "Học kỳ 1"
                        })
    else:
        # List / Table format: Thứ | Tiết | Lớp | Môn | GV
        for row in rows[1:]:
            if not any(row) or len(row) < 3:
                continue
            row_str = [str(c).strip() if c is not None else "" for c in row]
            day_num = 2
            for k, d in DAY_NAME_MAP.items():
                if k in row_str[0].lower():
                    day_num = d
                    break
            nums = re.findall(r'\d+', row_str[1])
            period = int(nums[0]) if nums else 1
            class_name = row_str[2] if len(row_str) > 2 else ""
            subject = row_str[3] if len(row_str) > 3 and row_str[3] else "Toán"
            teacher = row_str[4] if len(row_str) > 4 and row_str[4] else default_teacher

            if class_name:
                slots.append({
                    "teacher_name": teacher,
                    "class_name": class_name,
                    "subject": subject,
                    "day_of_week": day_num,
                    "period": period,
                    "session": "Sáng" if period <= 5 else "Chiều",
                    "semester": "Học kỳ 1"
                })

    return slots

def parse_tkb_pdf(file_bytes: bytes, default_teacher: str = "Giáo viên") -> List[Dict[str, Any]]:
    """Parse Timetable (TKB) from PDF document using pdfplumber, PyMuPDF, and Gemini AI fallback"""
    import json
    import fitz # PyMuPDF
    import pdfplumber
    from services.gemini_service import generate_with_gemini, get_effective_gemini_key

    slots = []

    # 1. Try extracting tables via pdfplumber
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables()
                for table in tables:
                    for row in table[1:]:
                        clean_row = [str(c).strip() if c is not None else "" for c in row]
                        if not any(clean_row) or len(clean_row) < 3:
                            continue
                        
                        day_num = 2
                        for k, d in DAY_NAME_MAP.items():
                            if k in clean_row[0].lower():
                                day_num = d
                                break
                        nums = re.findall(r'\d+', clean_row[1])
                        period = int(nums[0]) if nums else 1
                        class_name = clean_row[2] if len(clean_row) > 2 else ""
                        subject = clean_row[3] if len(clean_row) > 3 and clean_row[3] else "Toán"
                        teacher = clean_row[4] if len(clean_row) > 4 and clean_row[4] else default_teacher

                        if class_name:
                            slots.append({
                                "teacher_name": teacher,
                                "class_name": class_name,
                                "subject": subject,
                                "day_of_week": day_num,
                                "period": period,
                                "session": "Sáng" if period <= 5 else "Chiều",
                                "semester": "Học kỳ 1"
                            })
    except Exception as e:
        logger.error(f"pdfplumber TKB extraction error: {e}")

    if slots:
        return slots

    # 2. Fallback: Extract full text via PyMuPDF and use Gemini AI
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        text_content = "\n".join([page.get_text() for page in doc])

        if text_content.strip() and get_effective_gemini_key():
            prompt = f"""
Bạn là chuyên gia bóc tách dữ liệu lịch dạy. Hãy trích xuất danh sách các tiết dạy từ file Thời Khóa Biểu (TKB) PDF dưới đây.
Trả về DUY NHẤT một JSON Array thuần túy (không kèm markdown ```json), mỗi phần tử là 1 object có cấu trúc:
[
  {{
    "day_of_week": 2, // 2=Thứ 2, 3=Thứ 3, ..., 7=Thứ 7
    "period": 1, // 1..10 (1-5 sáng, 6-10 chiều)
    "class_name": "10A1",
    "subject": "Toán",
    "teacher_name": "{default_teacher}"
  }}
]

Nội dung TKB PDF:
{text_content[:6000]}
"""
            res_text = generate_with_gemini(prompt)
            clean_json = re.sub(r'```json\s*|\s*```', '', res_text).strip()
            parsed_json = json.loads(clean_json)
            if isinstance(parsed_json, list):
                for item in parsed_json:
                    p = int(item.get("period", 1))
                    slots.append({
                        "teacher_name": str(item.get("teacher_name", default_teacher)),
                        "class_name": str(item.get("class_name", "")),
                        "subject": str(item.get("subject", "Toán")),
                        "day_of_week": int(item.get("day_of_week", 2)),
                        "period": p,
                        "session": "Sáng" if p <= 5 else "Chiều",
                        "semester": "Học kỳ 1"
                    })
                return slots
    except Exception as e:
        logger.error(f"Gemini TKB PDF parsing failed: {e}")

    return slots

def parse_tkb_text(raw_text: str, default_teacher: str = "Giáo viên") -> List[Dict[str, Any]]:
    """Parse Timetable from pasted text (TSV matrix or text rows)"""
    import json
    from services.gemini_service import generate_with_gemini, get_effective_gemini_key

    slots = []
    lines = [l for l in raw_text.splitlines() if l.strip()]
    if not lines:
        return []

    # Check if lines are TSV matrix
    day_cols: Dict[int, int] = {}
    header_idx = -1

    for r_idx, line in enumerate(lines[:5]):
        parts = line.split("\t")
        for c_idx, p in enumerate(parts):
            p_clean = p.strip().lower()
            for k, day_num in DAY_NAME_MAP.items():
                if k in p_clean:
                    day_cols[c_idx] = day_num
                    header_idx = r_idx
                    break
        if len(day_cols) >= 3:
            break

    if day_cols and header_idx >= 0:
        current_period = 1
        for line in lines[header_idx + 1:]:
            parts = line.split("\t")
            # period candidate from first elements
            period_candidate = None
            for p_val in parts[:2]:
                nums = re.findall(r'\b([1-9]|10)\b', p_val.strip())
                if nums:
                    try:
                        period_candidate = int(nums[0])
                        break
                    except Exception:
                        pass
            period = period_candidate if period_candidate is not None else current_period
            current_period = period + 1 if period < 10 else 1

            for col_idx, day_num in day_cols.items():
                if col_idx < len(parts) and parts[col_idx].strip():
                    class_name, subject = parse_tkb_cell(parts[col_idx].strip())
                    if class_name:
                        slots.append({
                            "teacher_name": default_teacher,
                            "class_name": class_name,
                            "subject": subject or "Toán",
                            "day_of_week": day_num,
                            "period": period,
                            "session": "Sáng" if period <= 5 else "Chiều",
                            "semester": "Học kỳ 1"
                        })
        if slots:
            return slots

    # Fallback to Gemini AI for unstructured text
    try:
        if get_effective_gemini_key():
            prompt = f"""
Bạn là chuyên gia trích xuất lịch dạy. Hãy chuyển đổi dữ liệu Thời Khóa Biểu sau thành JSON Array thuần túy (không kèm markdown ```json):
[
  {{
    "day_of_week": 2, // 2=Thứ 2, ..., 7=Thứ 7
    "period": 1, // 1..10
    "class_name": "10A1",
    "subject": "Toán",
    "teacher_name": "{default_teacher}"
  }}
]

Dữ liệu:
{raw_text[:6000]}
"""
            res_text = generate_with_gemini(prompt)
            clean_json = re.sub(r'```json\s*|\s*```', '', res_text).strip()
            parsed_json = json.loads(clean_json)
            if isinstance(parsed_json, list):
                for item in parsed_json:
                    p = int(item.get("period", 1))
                    slots.append({
                        "teacher_name": str(item.get("teacher_name", default_teacher)),
                        "class_name": str(item.get("class_name", "")),
                        "subject": str(item.get("subject", "Toán")),
                        "day_of_week": int(item.get("day_of_week", 2)),
                        "period": p,
                        "session": "Sáng" if p <= 5 else "Chiều",
                        "semester": "Học kỳ 1"
                    })
                return slots
    except Exception as e:
        logger.error(f"Gemini TKB text parsing failed: {e}")

    return slots


