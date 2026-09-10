import io
import re
import json
from typing import List, Dict, Any, Optional, Tuple
import openpyxl
from docx import Document
from logger import logger
from services.gemini_service import generate_with_gemini, get_effective_gemini_key

def clean_text(val: Any) -> str:
    if val is None:
        return ""
    # Replace multiple spaces, newlines with single space
    s = str(val).replace("\r", " ").replace("\n", " ")
    return re.sub(r'\s+', ' ', s).strip()

def is_preamble_or_summary_row(clean_cells: List[str]) -> bool:
    row_text = " ".join(clean_cells).lower()
    if not row_text:
        return True
    # Calculations like (18 tuần) x (3 tiết) = 54 tiết, tổng số tiết, học kỳ 1: (18 tuần)
    if re.search(r'\(\s*\d+\s*tuần\s*\)\s*x|\d+\s*tuần\s*x|\d+\s*tiết\s*=\s*\d+|tổng\s*số\s*tiết|học\s*kỳ\s*[i|v|x|\d]+[:\s]*\(|chuyên\s*đề[:\s]*\(', row_text):
        return True
    if re.search(r'phân\s*phối\s*chương\s*trình|kế\s*hoạch\s*dạy\s*học|khung\s*kế\s*hoạch|áp\s*dụng\s*từ\s*năm|năm\s*học\s*20\d\d', row_text) and len(clean_cells) <= 4:
        return True
    return False

def is_valid_lesson_title(title: str) -> bool:
    if not title:
        return False
    s = clean_text(title)
    if len(s) < 2:
        return False
    s_lower = s.lower()
    
    # Check preamble / summary patterns
    if re.search(r'\(\s*\d+\s*tuần\s*\)\s*x|\d+\s*tuần\s*x|\d+\s*tiết\s*=\s*\d+|tổng\s*số\s*tiết', s_lower):
        return False
    if re.search(r'^\s*(?:học\s*kỳ|hoc\s*ky)\s*[i|v|x|\d]+[:\s\(\)]*$', s_lower):
        return False
    if re.search(r'^\s*(?:học\s*kỳ|hoc\s*ky)\s*[i|v|x|\d]+[:\s]*\(.*tiết\)', s_lower):
        return False
    if re.search(r'^\s*(?:chương|chuong)\s+[ivxlcdm\d]+[:\s]*$', s_lower):
        return False
    if re.search(r'^\s*(?:chuyên\s*đề|chuyen\s*de)\s+\d+[:\s]*$', s_lower):
        return False
    # Pure Chapter header with duration e.g. "CHƯƠNG VI. HÀM SỐ, ĐỒ THỊ VÀ ỨNG DỤNG (13 tiết)"
    if re.search(r'^\s*(?:chương|chuong)\s+[ivxlcdm\d]+[\.:\s]+.*(?:\(\s*\d+\s*tiết\s*\))\s*$', s_lower):
        return False
    # Pure Specialized Topic header with duration e.g. "CHUYÊN ĐỀ 1: HỆ PHƯƠNG TRÌNH... (10 tiết)"
    if re.search(r'^\s*(?:chuyên\s*đề|chuyen\s*de)\s+\d+[\.:\s]+.*(?:\(\s*\d+\s*tiết\s*\))\s*$', s_lower):
        return False
    # Pure Subject / Unit header with duration e.g. "CHỦ ĐỀ 1... (12 tiết)"
    if re.search(r'^\s*(?:chủ\s*đề|chu\s*de)\s+[ivxlcdm\d]+[\.:\s]+.*(?:\(\s*\d+\s*tiết\s*\))\s*$', s_lower):
        return False
    # Headers
    if s_lower in [
        "tên bài dạy", "tên bài học", "nội dung bài học", "tên bài", "chủ đề", "bài học", 
        "chương/bài", "chuyên đề học tập", "tiết", "tiết ppct", "tiết cđ", "số tiết", 
        "thời lượng", "ghi chú", "dddh", "đddh", "nội dung", "tuần", "stt", "tt", "stt / tuần"
    ]:
        return False
    return True

def detect_column_indices(header_row: List[str]) -> Dict[str, int]:
    col_map = {}
    for idx, cell in enumerate(header_row):
        c = clean_text(cell).lower()
        if not c:
            continue
        
        # Week detection
        if re.search(r'\btuần\b|\btuan\b|\bweek\b|thời\s*điểm', c) and "col_week" not in col_map:
            col_map["col_week"] = idx
        # Lesson number detection (Tiết PPCT, Tiết CĐ, Tiết chuyên đề)
        elif re.search(r'tiết\s*ppct|tiết\s*theo\s*ppct|tiết\s*chuyên\s*đề|tiết\s*cđ|tiết\s*thứ|tiết\s*số|\btiết\b|\btiet\b', c) and "col_lesson_num" not in col_map:
            col_map["col_lesson_num"] = idx
        # Duration detection (Số tiết)
        elif re.search(r'số\s*tiết|so\s*tiet|thời\s*lượng|thoi\s*luong', c) and "col_duration" not in col_map:
            col_map["col_duration"] = idx
        # Lesson / Specialized topic title detection
        elif re.search(r'tên\s*bài|tên\s*chuyên\s*đề|chuyên\s*đề|nội\s*dung|bài\s*học|bài\s*dạy|chủ\s*đề|tên\s*chủ\s*đề|mạch\s*kiến\s*thức|ten\s*bai', c) and "col_title" not in col_map:
            col_map["col_title"] = idx
        # Notes / Equipment detection
        elif re.search(r'ghi\s*chú|ghi\s*chu|đddh|dddh|thiết\s*bị|thiet\s*bi|dụng\s*cụ|chuẩn\s*bị|đồ\s*dùng|notes?', c) and "col_notes" not in col_map:
            col_map["col_notes"] = idx
        # STT detection
        elif re.search(r'^stt$|^tt$|^no\.?$', c) and "col_stt" not in col_map:
            col_map["col_stt"] = idx
            
    return col_map

def extract_lesson_numbers(val_str: str, current_num: int = 1) -> List[int]:
    """
    Parses ranges like: '1-3', '1, 2, 3', '4 -> 5', '12', 'Tiết 1, 2'
    """
    s = clean_text(val_str).lower()
    # Check for range: '1-3', '1..3', '1 đến 3', '1 -> 3'
    range_match = re.search(r'(\d+)\s*(?:-|–|\.\.|đến|->|to)\s*(\d+)', s)
    if range_match:
        start_n = int(range_match.group(1))
        end_n = int(range_match.group(2))
        if 1 <= start_n <= end_n <= 300 and (end_n - start_n) <= 10:
            return list(range(start_n, end_n + 1))
            
    # Check for comma / semicolon separated numbers: '1, 2, 3'
    nums = [int(n) for n in re.findall(r'\b\d+\b', s)]
    if nums:
        # Filter realistic lesson numbers
        valid_nums = [n for n in nums if 1 <= n <= 300]
        if valid_nums:
            return valid_nums
            
    return [current_num]

def excel_to_text(file_bytes: bytes) -> str:
    """Converts Excel workbook sheets into clean markdown table text for AI processing"""
    try:
        wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
        sheets_text = []
        for sheet in wb.worksheets:
            rows = list(sheet.iter_rows(values_only=True))
            if not rows:
                continue
            lines = []
            for r in rows:
                clean_r = [clean_text(c) for c in r if c is not None and clean_text(c)]
                if clean_r:
                    lines.append(" | ".join(clean_r))
            if lines:
                sheets_text.append(f"=== SHEET: {sheet.title} ===\n" + "\n".join(lines))
        return "\n\n".join(sheets_text)
    except Exception as e:
        logger.warning(f"excel_to_text failed: {e}")
        return ""

def word_to_text(file_bytes: bytes) -> str:
    """Converts Word document tables & paragraphs into clean text for AI processing"""
    try:
        doc = Document(io.BytesIO(file_bytes))
        sections = []
        for idx, table in enumerate(doc.tables):
            lines = []
            for r in table.rows:
                cells = [clean_text(c.text) for c in r.cells]
                if any(cells):
                    lines.append(" | ".join(cells))
            if lines:
                sections.append(f"=== BẢNG {idx + 1} ===\n" + "\n".join(lines))
        p_lines = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        if p_lines:
            sections.append("=== NỘI DUNG VĂN BẢN ===\n" + "\n".join(p_lines))
        return "\n\n".join(sections)
    except Exception as e:
        logger.warning(f"word_to_text failed: {e}")
        return ""

def extract_ppct_with_gemini(
    content_name: str,
    text_content: str = "",
    default_grade: str = "Khối 10",
    default_subject: str = "Toán",
    pdf_bytes: Optional[bytes] = None,
    selected_model: Optional[str] = None
) -> Optional[List[Dict[str, Any]]]:
    """
    Sends PPCT file directly to Gemini Flash AI for fast, 100% accurate extraction.
    """
    gemini_key = get_effective_gemini_key()
    if not gemini_key:
        logger.info("Chưa cấu hình Gemini API Key, chuyển sang chế độ đọc cục bộ.")
        return None

    prompt = f"""
Bạn là chuyên gia số hóa chương trình giáo dục phổ thông (GDPT 2018) Việt Nam bậc THPT.
Nhiệm vụ: Trích xuất TOÀN BỘ VÀ CHÍNH XÁC 100% danh sách các tiết Phân phối chương trình (PPCT) môn {default_subject} {default_grade} từ {content_name}.

ĐẶC BIỆT CHÚ Ý VỀ CẤU TRÚC VÀ QUY TẮC SỐ HÓA:
1. ĐẦY ĐỦ CẢ NĂM (HỌC KỲ 1 VÀ HỌC KỲ 2):
   - Môn Toán THPT chuẩn gồm 140 tiết/năm (105 tiết chính khóa + 35 tiết chuyên đề học tập).
   - BẮT BUỘC trích xuất trọn vẹn từ Tuần 1 đến Tuần 35, bao gồm cả Học kỳ 1 (Tuần 1..18) và Học kỳ 2 (Tuần 19..35). Tuyệt đối không được dừng lại giữa chừng!

2. TÁCH RỜI TỪNG TIẾT HỌC:
   - Mỗi phần tử trong mảng đại diện cho ĐÚNG 1 TIẾT HỌC (1 period).
   - Nếu một bài học kéo dài nhiều tiết (ví dụ: 'Bài 1: Tính đơn điệu và cực trị (3 tiết)' hoặc cột Tiết ghi '1-3' hoặc '1, 2, 3'):
     -> BẮT BUỘC tạo 3 phần tử riêng biệt với lesson_number lần lượt là 1, 2, 3 và lesson_title là 'Bài 1: Tính đơn điệu và cực trị (Tiết 1)', 'Bài 1: Tính đơn điệu và cực trị (Tiết 2)', 'Bài 1: Tính đơn điệu và cực trị (Tiết 3)'.

3. CHƯƠNG TRÌNH CHÍNH KHÓA & CHUYÊN ĐỀ HỌC TẬP (BẢNG SONG SONG HOẶC BẢNG NỐI TIẾP):
   - Phần Chính khóa: Đánh số lesson_number từ 1 đến 105.
   - Phần Chuyên đề học tập: Đánh số lesson_number từ 106 đến 140 (tương ứng 105 + số tiết CĐ, ví dụ Tiết 1 CĐ ghi 106, Tiết 35 CĐ ghi 140).
   - Ghi chú: Đối với các tiết Chuyên đề học tập, BẮT BUỘC ghi "Chuyên đề" vào trường notes.

4. BỎ QUA TIÊU ĐỀ PHÂN ĐOẠN KHÔNG PHẢI TIẾT DẠY:
   - Tuyệt đối không tạo dòng cho các tiêu đề chương/chủ đề không có số tiết cụ thể (ví dụ: "CHƯƠNG I. ỨNG DỤNG ĐẠO HÀM (15 tiết)", "CHUYÊN ĐỀ 1: ...").
   - Bỏ qua các dòng phân bổ công thức thời lượng "(18 tuần) x (3 tiết) = 54 tiết".

TRẢ VỀ DUY NHẤT MỘT MẢNG JSON HỢP LỆ (mảng JSON thuần túy [ ... ]):
[
  {{
    "week": 1,
    "lesson_number": 1,
    "lesson_title": "§1. Mệnh đề",
    "notes": ""
  }},
  {{
    "week": 1,
    "lesson_number": 106,
    "lesson_title": "CĐ1-§1. Hệ phương trình bậc nhất ba ẩn",
    "notes": "Chuyên đề"
  }}
]
"""
    try:
        from services.gemini_service import generate_with_gemini_pdf
        if pdf_bytes:
            raw_result = generate_with_gemini_pdf(prompt=prompt, pdf_bytes=pdf_bytes, user_key=gemini_key, selected_model=selected_model)
        else:
            full_prompt = f"{prompt}\n\n=== NỘI DUNG TÀI LIỆU ===\n{text_content}"
            raw_result = generate_with_gemini(prompt=full_prompt, user_key=gemini_key, json_mode=True, selected_model=selected_model)

        cleaned = (raw_result or "").strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        parsed_list = None
        try:
            parsed_list = json.loads(cleaned)
        except Exception:
            match = re.search(r'\[\s*\{.*\}\s*\]', cleaned, re.DOTALL)
            if match:
                parsed_list = json.loads(match.group(0))
            else:
                match_arr = re.search(r'\[\s*\[.*\]\s*\]', cleaned, re.DOTALL)
                if match_arr:
                    parsed_list = json.loads(match_arr.group(0))

        if isinstance(parsed_list, list) and len(parsed_list) > 0:
            items = []
            current_lesson_num = 1
            for itm in parsed_list:
                if isinstance(itm, (list, tuple)) and len(itm) >= 3:
                    w = int(itm[0] or 1)
                    raw_lnum = itm[1]
                    title = str(itm[2] or "Bài học").strip()
                    notes = str(itm[3] if len(itm) > 3 else "").strip()
                elif isinstance(itm, dict):
                    w = int(itm.get("week") or 1)
                    raw_lnum = itm.get("lesson_number")
                    title = str(itm.get("lesson_title") or "Bài học").strip()
                    notes = str(itm.get("notes") or "").strip()
                else:
                    continue

                if not is_valid_lesson_title(title):
                    continue

                is_cd = ("chuyên đề" in title.lower() or "cđ" in title.lower() or "chuyên đề" in notes.lower())
                
                # Check if lesson_number is a string range like "1-3" or "1, 2"
                lesson_nums = []
                if isinstance(raw_lnum, str) and re.search(r'\d+', raw_lnum):
                    lesson_nums = extract_lesson_numbers(raw_lnum, current_lesson_num)
                elif isinstance(raw_lnum, (int, float)):
                    lesson_nums = [int(raw_lnum)]
                else:
                    lesson_nums = [current_lesson_num]

                for idx_n, l_num in enumerate(lesson_nums):
                    sub_title = title
                    if len(lesson_nums) > 1 and not re.search(r'tiết\s*\d+', title.lower()):
                        sub_title = f"{title} (Tiết {idx_n + 1})"

                    assigned_num = l_num
                    if is_cd or l_num > 105:
                        if "chuyên đề" not in notes.lower():
                            notes = f"Chuyên đề{(' - ' + notes) if notes else ''}"
                        if assigned_num <= 35:
                            assigned_num = 105 + assigned_num

                    items.append({
                        "grade": default_grade,
                        "subject": default_subject,
                        "week": w,
                        "lesson_number": assigned_num,
                        "lesson_title": sub_title,
                        "notes": notes,
                        "semester": "Học kỳ 1" if w <= 18 else "Học kỳ 2"
                    })
                    current_lesson_num = max(current_lesson_num, assigned_num + 1)

            logger.info(f"✨ Gemini AI đã trích xuất thành công {len(items)} tiết PPCT!")
            return items
    except Exception as e:
        logger.warning(f"Gemini AI PPCT extraction error: {e}")
        return None

def parse_ppct_excel(file_bytes: bytes, default_grade: str = "Khối 10", default_subject: str = "Toán") -> List[Dict[str, Any]]:
    """Parse PPCT from Excel file (.xlsx, .xls) with smart Gemini AI primary extraction and local fallback"""
    # 1. Primary: Gemini Flash AI
    txt = excel_to_text(file_bytes)
    if txt:
        ai_items = extract_ppct_with_gemini(
            f"File Excel môn {default_subject} {default_grade}",
            text_content=txt,
            default_grade=default_grade,
            default_subject=default_subject
        )
        if ai_items and len(ai_items) >= 10:
            return ai_items

    # 2. Fallback: Local heuristic parser
    wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
    items = []
    
    for sheet in wb.worksheets:
        rows = list(sheet.iter_rows(values_only=True))
        if not rows:
            continue
            
        header_idx = -1
        col_map = {}
        is_dual_table = False
        
        # Scan first 20 rows for header
        for idx, row in enumerate(rows[:20]):
            clean_row = [clean_text(c) for c in row if c is not None]
            clean_row_str = " ".join(clean_row).lower()
            if ("chương" in clean_row_str or "bài" in clean_row_str) and ("chuyên đề" in clean_row_str or "tiết cđ" in clean_row_str or "cđ" in clean_row_str):
                header_idx = idx
                is_dual_table = True
                break
            detected = detect_column_indices(clean_row)
            if "col_title" in detected or ("col_lesson_num" in detected and "col_week" in detected):
                header_idx = idx
                col_map = detected
                break
                
        current_week = 1
        current_lesson_num = 1
        current_cd_num = 1
        start_row = header_idx + 1 if header_idx >= 0 else 0
        
        for row in rows[start_row:]:
            if not row or not any(row):
                continue
                
            clean_cells = [clean_text(c) for c in row]
            if not any(clean_cells) or is_preamble_or_summary_row(clean_cells):
                continue

            # Skip repeated header row
            row_joined = " ".join(clean_cells).lower()
            if ("chương/bài" in row_joined and "chuyên đề" in row_joined) or ("tiết ppct" in row_joined and "tiết cđ" in row_joined):
                continue
                
            # Extract week
            if "col_week" in col_map and col_map["col_week"] < len(clean_cells):
                w_str = clean_cells[col_map["col_week"]]
                w_nums = re.findall(r'\d+', w_str)
                if w_nums:
                    try:
                        w_val = int(w_nums[0])
                        if 1 <= w_val <= 52:
                            current_week = w_val
                    except Exception:
                        pass
            elif len(clean_cells) >= 1:
                w_nums = re.findall(r'\d+', clean_cells[0])
                if w_nums and len(w_nums[0]) <= 2 and int(w_nums[0]) <= 52:
                    current_week = int(w_nums[0])

            # CASE A: Dual-column parallel table (>= 5 columns)
            if is_dual_table or len(clean_cells) >= 5:
                t1_str = clean_cells[1] if len(clean_cells) > 1 else ""
                title1_str = clean_cells[2] if len(clean_cells) > 2 else ""
                # Only extract main lesson if there is a valid title AND the Tiết cell is not empty / has numbers
                if title1_str and is_valid_lesson_title(title1_str) and re.search(r'\d+', t1_str):
                    nums1 = extract_lesson_numbers(t1_str, current_lesson_num)
                    for idx_n, l_num in enumerate(nums1):
                        sub_t = title1_str
                        if len(nums1) > 1 and not re.search(r'tiết\s*\d+', title1_str.lower()):
                            sub_t = f"{title1_str} (Tiết {idx_n + 1})"
                        items.append({
                            "grade": default_grade,
                            "subject": default_subject,
                            "week": current_week,
                            "lesson_number": l_num,
                            "lesson_title": sub_t,
                            "notes": "",
                            "semester": "Học kỳ 1" if current_week <= 18 else "Học kỳ 2"
                        })
                        current_lesson_num = max(current_lesson_num, l_num + 1)

                t2_str = clean_cells[3] if len(clean_cells) > 3 else ""
                title2_str = clean_cells[4] if len(clean_cells) > 4 else ""
                # Only extract CD lesson if there is a valid title AND the Tiết CĐ cell is not empty / has numbers
                if title2_str and is_valid_lesson_title(title2_str) and re.search(r'\d+', t2_str):
                    nums2 = extract_lesson_numbers(t2_str, current_cd_num)
                    for idx_n, l_num in enumerate(nums2):
                        sub_t = title2_str
                        if len(nums2) > 1 and not re.search(r'tiết\s*\d+', title2_str.lower()):
                            sub_t = f"{title2_str} (Tiết {idx_n + 1})"
                        assigned_num = l_num if l_num > 105 else (105 + l_num)
                        items.append({
                            "grade": default_grade,
                            "subject": default_subject,
                            "week": current_week,
                            "lesson_number": assigned_num,
                            "lesson_title": sub_t,
                            "notes": "Chuyên đề",
                            "semester": "Học kỳ 1" if current_week <= 18 else "Học kỳ 2"
                        })
                        current_cd_num = max(current_cd_num, l_num + 1)
                continue

            # Extract title
            title_str = ""
            if "col_title" in col_map and col_map["col_title"] < len(clean_cells):
                title_str = clean_cells[col_map["col_title"]]
            elif len(clean_cells) >= 3:
                candidates = [c for c in clean_cells if len(c) > 3 and not re.match(r'^\d+$', c)]
                if candidates:
                    title_str = candidates[0]
            elif len(clean_cells) >= 1:
                title_str = clean_cells[-1]

            if not title_str or not is_valid_lesson_title(title_str):
                continue
                
            # Extract notes
            notes_str = ""
            if "col_notes" in col_map and col_map["col_notes"] < len(clean_cells):
                notes_str = clean_cells[col_map["col_notes"]]

            is_cd = ("chuyên đề" in title_str.lower() or "cđ" in title_str.lower() or "chuyên đề" in notes_str.lower())
            if is_cd and "chuyên đề" not in notes_str.lower():
                notes_str = f"Chuyên đề{(' - ' + notes_str) if notes_str else ''}"

            # Extract lesson numbers (handles ranges 1-2, 1,2)
            lesson_num_str = ""
            if "col_lesson_num" in col_map and col_map["col_lesson_num"] < len(clean_cells):
                lesson_num_str = clean_cells[col_map["col_lesson_num"]]
                
            lesson_nums = extract_lesson_numbers(lesson_num_str, current_lesson_num)
            
            for idx_n, l_num in enumerate(lesson_nums):
                sub_title = title_str
                if len(lesson_nums) > 1 and not re.search(r'tiết\s*\d+', title_str.lower()):
                    sub_title = f"{title_str} (Tiết {idx_n + 1})"
                    
                assigned_num = l_num
                if is_cd and l_num <= 35:
                    assigned_num = 105 + l_num

                items.append({
                    "grade": default_grade,
                    "subject": default_subject,
                    "week": current_week,
                    "lesson_number": assigned_num,
                    "lesson_title": sub_title,
                    "notes": notes_str,
                    "semester": "Học kỳ 1" if current_week <= 18 else "Học kỳ 2"
                })
                current_lesson_num = max(current_lesson_num, l_num + 1)

    return items

def parse_ppct_word(file_bytes: bytes, default_grade: str = "Khối 10", default_subject: str = "Toán") -> List[Dict[str, Any]]:
    """Parse PPCT from Word document (.docx) with Gemini AI primary extraction and local fallback"""
    # 1. Primary: Gemini Flash AI
    txt = word_to_text(file_bytes)
    if txt:
        ai_items = extract_ppct_with_gemini(
            f"File Word (.docx) môn {default_subject} {default_grade}",
            text_content=txt,
            default_grade=default_grade,
            default_subject=default_subject
        )
        if ai_items and len(ai_items) >= 10:
            return ai_items

    # 2. Fallback: Local heuristic parser
    doc = Document(io.BytesIO(file_bytes))
    items = []
    current_week = 1
    current_lesson_num = 1
    current_cd_num = 1

    # 1. Process all tables
    for table in doc.tables:
        if not table.rows:
            continue
            
        header_row = [clean_text(cell.text) for cell in table.rows[0].cells]
        col_map = detect_column_indices(header_row)
        header_joined = " ".join(header_row).lower()
        is_dual_table = ("chương" in header_joined or "bài" in header_joined) and ("chuyên đề" in header_joined or "tiết cđ" in header_joined or "cđ" in header_joined)
        
        start_row_idx = 1 if (is_dual_table or col_map.get("col_title") is not None or col_map.get("col_lesson_num") is not None) else 0

        for row in table.rows[start_row_idx:]:
            clean_cells = [clean_text(cell.text) for cell in row.cells]
            if not any(clean_cells) or is_preamble_or_summary_row(clean_cells):
                continue
                
            # If row repeats header
            if any("tên bài" in c.lower() or "tiết" in c.lower() for c in clean_cells[:3]):
                continue

            # Extract week
            if "col_week" in col_map and col_map["col_week"] < len(clean_cells):
                w_str = clean_cells[col_map["col_week"]]
                w_nums = re.findall(r'\d+', w_str)
                if w_nums:
                    try:
                        w_val = int(w_nums[0])
                        if 1 <= w_val <= 52:
                            current_week = w_val
                    except Exception:
                        pass
            elif len(clean_cells) >= 1:
                w_nums = re.findall(r'\d+', clean_cells[0])
                if w_nums and len(w_nums[0]) <= 2 and int(w_nums[0]) <= 52:
                    current_week = int(w_nums[0])

            # CASE A: Dual-column parallel table
            if is_dual_table or len(clean_cells) >= 5:
                t1_str = clean_cells[1] if len(clean_cells) > 1 else ""
                title1_str = clean_cells[2] if len(clean_cells) > 2 else ""
                # Only extract main lesson if there is a valid title AND the Tiết cell is not empty / has numbers
                if title1_str and is_valid_lesson_title(title1_str) and re.search(r'\d+', t1_str):
                    nums1 = extract_lesson_numbers(t1_str, current_lesson_num)
                    for idx_n, l_num in enumerate(nums1):
                        sub_t = title1_str
                        if len(nums1) > 1 and not re.search(r'tiết\s*\d+', title1_str.lower()):
                            sub_t = f"{title1_str} (Tiết {idx_n + 1})"
                        items.append({
                            "grade": default_grade,
                            "subject": default_subject,
                            "week": current_week,
                            "lesson_number": l_num,
                            "lesson_title": sub_t,
                            "notes": "",
                            "semester": "Học kỳ 1" if current_week <= 18 else "Học kỳ 2"
                        })
                        current_lesson_num = max(current_lesson_num, l_num + 1)

                t2_str = clean_cells[3] if len(clean_cells) > 3 else ""
                title2_str = clean_cells[4] if len(clean_cells) > 4 else ""
                # Only extract CD lesson if there is a valid title AND the Tiết CĐ cell is not empty / has numbers
                if title2_str and is_valid_lesson_title(title2_str) and re.search(r'\d+', t2_str):
                    nums2 = extract_lesson_numbers(t2_str, current_cd_num)
                    for idx_n, l_num in enumerate(nums2):
                        sub_t = title2_str
                        if len(nums2) > 1 and not re.search(r'tiết\s*\d+', title2_str.lower()):
                            sub_t = f"{title2_str} (Tiết {idx_n + 1})"
                        assigned_num = l_num if l_num > 105 else (105 + l_num)
                        items.append({
                            "grade": default_grade,
                            "subject": default_subject,
                            "week": current_week,
                            "lesson_number": assigned_num,
                            "lesson_title": sub_t,
                            "notes": "Chuyên đề",
                            "semester": "Học kỳ 1" if current_week <= 18 else "Học kỳ 2"
                        })
                        current_cd_num = max(current_cd_num, l_num + 1)
                continue

            # Extract title
            title_str = ""
            if "col_title" in col_map and col_map["col_title"] < len(clean_cells):
                title_str = clean_cells[col_map["col_title"]]
            elif len(clean_cells) >= 3:
                candidates = [c for c in clean_cells if len(c) > 3 and not re.match(r'^\d+$', c)]
                if candidates:
                    title_str = candidates[0]
            elif len(clean_cells) >= 1:
                title_str = clean_cells[-1]

            if not title_str or not is_valid_lesson_title(title_str):
                continue

            # Extract notes
            notes_str = ""
            if "col_notes" in col_map and col_map["col_notes"] < len(clean_cells):
                notes_str = clean_cells[col_map["col_notes"]]

            is_cd = ("chuyên đề" in title_str.lower() or "cđ" in title_str.lower() or "chuyên đề" in notes_str.lower())
            if is_cd and "chuyên đề" not in notes_str.lower():
                notes_str = f"Chuyên đề{(' - ' + notes_str) if notes_str else ''}"

            # Extract lesson numbers
            lesson_num_str = ""
            if "col_lesson_num" in col_map and col_map["col_lesson_num"] < len(clean_cells):
                lesson_num_str = clean_cells[col_map["col_lesson_num"]]
                
            lesson_nums = extract_lesson_numbers(lesson_num_str, current_lesson_num)

            for idx_n, l_num in enumerate(lesson_nums):
                sub_title = title_str
                if len(lesson_nums) > 1 and not re.search(r'tiết\s*\d+', title_str.lower()):
                    sub_title = f"{title_str} (Tiết {idx_n + 1})"
                    
                assigned_num = l_num
                if is_cd and l_num <= 35:
                    assigned_num = 105 + l_num

                items.append({
                    "grade": default_grade,
                    "subject": default_subject,
                    "week": current_week,
                    "lesson_number": assigned_num,
                    "lesson_title": sub_title,
                    "notes": notes_str,
                    "semester": "Học kỳ 1" if current_week <= 18 else "Học kỳ 2"
                })
                current_lesson_num = max(current_lesson_num, l_num + 1)

    return items

def parse_pdf_tables(file_bytes: bytes, default_grade: str = "Khối 10", default_subject: str = "Toán") -> List[Dict[str, Any]]:
    """
    Extract PPCT tables from all pages using pdfplumber with support for:
    1. Dual-column parallel tables (Week | Lesson 1..3 | Main Lesson | Lesson CĐ | Chuyên đề học tập)
    2. Standard single-track tables with notes column
    """
    import pdfplumber

    items = []
    strategies = [
        {"vertical_strategy": "lines", "horizontal_strategy": "lines", "snap_tolerance": 3},
        {"vertical_strategy": "text", "horizontal_strategy": "text", "snap_tolerance": 4},
        {} # Default auto
    ]

    for strategy in strategies:
        try:
            page_items = []
            current_week = 1
            current_main_lesson = 1
            current_cd_lesson = 1
            is_dual_table = False

            # 1. Pre-scan all pages to check if this PDF contains dual parallel tables (Chính khóa + Chuyên đề)
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                for page in pdf.pages:
                    pre_tables = page.extract_tables(table_settings=strategy) if strategy else page.extract_tables()
                    for pt in pre_tables or []:
                        for pr in (pt or [])[:5]:
                            clean_pr = " ".join(clean_text(c).lower() for c in pr if c is not None)
                            if ("chương" in clean_pr or "bài" in clean_pr) and ("chuyên đề" in clean_pr or "tiết cđ" in clean_pr or "cđ" in clean_pr):
                                is_dual_table = True
                                break
                            if len(pr) >= 5 and any("cđ" in str(c).lower() or "chuyên đề" in str(c).lower() for c in pr[2:]):
                                is_dual_table = True
                                break
                        if is_dual_table:
                            break
                    if is_dual_table:
                        break

                for page in pdf.pages:
                    tables = page.extract_tables(table_settings=strategy) if strategy else page.extract_tables()
                    if not tables:
                        continue

                    for table in tables:
                        if not table:
                            continue

                        # Check header row in current table
                        header_idx = -1
                        for r_idx, r in enumerate(table[:3]):
                            clean_r = [clean_text(c).lower() for c in r if c is not None]
                            r_text = " ".join(clean_r)
                            
                            if ("chương" in r_text or "bài" in r_text) and ("chuyên đề" in r_text or "tiết cđ" in r_text or "cđ" in r_text):
                                header_idx = r_idx
                                is_dual_table = True
                                break
                            elif "tiết" in r_text and ("bài" in r_text or "nội dung" in r_text or "chủ đề" in r_text):
                                header_idx = r_idx
                                break

                        start_r = header_idx + 1 if header_idx >= 0 else 0

                        for row in table[start_r:]:
                            if not row or not any(row):
                                continue

                            clean_cells = [clean_text(c) for c in row]
                            if not any(clean_cells) or is_preamble_or_summary_row(clean_cells):
                                continue

                            # Skip repeated header row
                            row_joined = " ".join(clean_cells).lower()
                            if ("chương/bài" in row_joined and "chuyên đề" in row_joined) or ("tiết ppct" in row_joined and "tiết cđ" in row_joined):
                                continue

                            # Update current_week if Col 0 contains a week number
                            w_nums = re.findall(r'\b\d+\b', clean_cells[0])
                            if w_nums and len(w_nums[0]) <= 2 and int(w_nums[0]) <= 52:
                                current_week = int(w_nums[0])

                            # === CASE A: DUAL-COLUMN PARALLEL TABLE (5 columns: Tuần | Tiết | Bài | Tiết CĐ | Chuyên đề) ===
                            if is_dual_table or len(clean_cells) >= 5:
                                # 1. Extract Left Side (Chính khóa)
                                t1_str = clean_cells[1] if len(clean_cells) > 1 else ""
                                title1_str = clean_cells[2] if len(clean_cells) > 2 else ""

                                # Only extract main lesson if there is a valid title AND the Tiết cell is not empty / has numbers
                                if title1_str and is_valid_lesson_title(title1_str) and re.search(r'\d+', t1_str):
                                    nums1 = extract_lesson_numbers(t1_str, current_main_lesson)
                                    for idx_n, l_num in enumerate(nums1):
                                        sub_t = title1_str
                                        if len(nums1) > 1 and not re.search(r'tiết\s*\d+', title1_str.lower()):
                                            sub_t = f"{title1_str} (Tiết {idx_n + 1})"
                                        page_items.append({
                                            "grade": default_grade,
                                            "subject": default_subject,
                                            "week": current_week,
                                            "lesson_number": l_num,
                                            "lesson_title": sub_t,
                                            "notes": "",
                                            "semester": "Học kỳ 1" if current_week <= 18 else "Học kỳ 2"
                                        })
                                        current_main_lesson = max(current_main_lesson, l_num + 1)

                                # 2. Extract Right Side (Chuyên đề học tập)
                                t2_str = clean_cells[3] if len(clean_cells) > 3 else ""
                                title2_str = clean_cells[4] if len(clean_cells) > 4 else ""

                                # Only extract CD lesson if there is a valid title AND the Tiết CĐ cell is not empty / has numbers
                                if title2_str and is_valid_lesson_title(title2_str) and re.search(r'\d+', t2_str):
                                    nums2 = extract_lesson_numbers(t2_str, current_cd_lesson)
                                    for idx_n, l_num in enumerate(nums2):
                                        sub_t = title2_str
                                        if len(nums2) > 1 and not re.search(r'tiết\s*\d+', title2_str.lower()):
                                            sub_t = f"{title2_str} (Tiết {idx_n + 1})"
                                        
                                        # Number specialized lessons sequentially after regular lessons (106..140)
                                        assigned_num = l_num if l_num > 105 else (105 + l_num)
                                        page_items.append({
                                            "grade": default_grade,
                                            "subject": default_subject,
                                            "week": current_week,
                                            "lesson_number": assigned_num,
                                            "lesson_title": sub_t,
                                            "notes": "Chuyên đề",
                                            "semester": "Học kỳ 1" if current_week <= 18 else "Học kỳ 2"
                                        })
                                        current_cd_lesson = max(current_cd_lesson, l_num + 1)
                                continue

                            # === CASE B: STANDARD SINGLE-TRACK TABLE ===
                            col_map = detect_column_indices(clean_cells)
                            title_str = ""
                            if "col_title" in col_map and col_map["col_title"] < len(clean_cells):
                                title_str = clean_cells[col_map["col_title"]]
                            elif len(clean_cells) >= 3:
                                candidates = [c for c in clean_cells if len(c) > 3 and not re.match(r'^\d+$', c)]
                                if candidates:
                                    title_str = candidates[0]
                            elif len(clean_cells) >= 1:
                                title_str = clean_cells[-1]

                            if not title_str or not is_valid_lesson_title(title_str):
                                continue

                            notes_str = clean_cells[col_map["col_notes"]] if ("col_notes" in col_map and col_map["col_notes"] < len(clean_cells)) else ""
                            is_cd = ("chuyên đề" in title_str.lower() or "cđ" in title_str.lower() or "chuyên đề" in notes_str.lower())
                            if is_cd and "chuyên đề" not in notes_str.lower():
                                notes_str = f"Chuyên đề{(' - ' + notes_str) if notes_str else ''}"

                            l_str = clean_cells[col_map["col_lesson_num"]] if ("col_lesson_num" in col_map and col_map["col_lesson_num"] < len(clean_cells)) else ""
                            lesson_nums = extract_lesson_numbers(l_str, current_main_lesson)

                            for idx_n, l_num in enumerate(lesson_nums):
                                sub_t = title_str
                                if len(lesson_nums) > 1 and not re.search(r'tiết\s*\d+', title_str.lower()):
                                    sub_t = f"{title_str} (Tiết {idx_n + 1})"

                                assigned_num = l_num
                                if is_cd and l_num <= 35:
                                    assigned_num = 105 + l_num

                                page_items.append({
                                    "grade": default_grade,
                                    "subject": default_subject,
                                    "week": current_week,
                                    "lesson_number": assigned_num,
                                    "lesson_title": sub_t,
                                    "notes": notes_str,
                                    "semester": "Học kỳ 1" if current_week <= 18 else "Học kỳ 2"
                                })
                                current_main_lesson = max(current_main_lesson, l_num + 1)

            if len(page_items) > len(items):
                items = page_items
                if len(items) >= 50:
                    break
        except Exception as e:
            logger.warning(f"Strategy {strategy} failed: {e}")

    return items


def parse_ppct_text_lines(lines: List[str], default_grade: str = "Khối 10", default_subject: str = "Toán") -> List[Dict[str, Any]]:
    """
    Parses PPCT line-by-line using regular expressions and heuristics.
    """
    items = []
    current_week = 1
    current_lesson_num = 1

    for line in lines:
        s = clean_text(line)
        if not s or len(s) < 3 or is_preamble_or_summary_row([s]):
            continue

        # Skip document title / school header lines
        if any(w in s.lower() for w in ["phân phối chương trình", "kế hoạch dạy học", "trường thpt", "tổ toán", "năm học 20"]):
            continue

        # Check delimiters first: tab (\t), pipe (|), semicolon (;), multi-space
        parts = []
        if "\t" in line:
            parts = [clean_text(p) for p in line.split("\t") if clean_text(p)]
        elif "|" in line:
            parts = [clean_text(p) for p in line.split("|") if clean_text(p)]
        elif ";" in line:
            parts = [clean_text(p) for p in line.split(";") if clean_text(p)]
        elif re.search(r'\s{3,}', s):
            parts = [clean_text(p) for p in re.split(r'\s{3,}', s) if clean_text(p)]

        # If it's a single text line without table delimiters, check for standalone week header: e.g. "TUẦN 1"
        if len(parts) < 2:
            week_match = re.match(r'^(?:tuần|tuan|week)\s*(\d+)[:\s\.\-–\(]', s, re.IGNORECASE) or re.match(r'^(?:tuần|tuan|week)\s*(\d+)$', s, re.IGNORECASE)
            if week_match and not re.search(r'\btiết\b|\btiet\b|\bbài\b|\bbai\b', s, re.IGNORECASE):
                try:
                    w_val = int(week_match.group(1))
                    if 1 <= w_val <= 52:
                        current_week = w_val
                        continue
                except Exception:
                    pass

        if len(parts) >= 2:
            # Skip table header line
            if any("tên bài" in p.lower() or "tiết ppct" in p.lower() for p in parts[:3]):
                continue

            # Check dual table in parts: 5 parts e.g. [Tuần, Tiết, Bài, Tiết CĐ, Chuyên đề]
            if len(parts) >= 5:
                # Week
                w_nums = re.findall(r'\d+', parts[0])
                if w_nums and int(w_nums[0]) <= 52:
                    current_week = int(w_nums[0])
                
                # Main lesson
                m_num_str = parts[1]
                m_title = parts[2]
                if m_title and is_valid_lesson_title(m_title) and re.search(r'\d+', m_num_str):
                    m_nums = extract_lesson_numbers(m_num_str, current_lesson_num)
                    for idx_n, l_num in enumerate(m_nums):
                        sub_title = m_title
                        if len(m_nums) > 1 and not re.search(r'tiết\s*\d+', m_title.lower()):
                            sub_title = f"{m_title} (Tiết {idx_n + 1})"
                        items.append({
                            "grade": default_grade,
                            "subject": default_subject,
                            "week": current_week,
                            "lesson_number": l_num,
                            "lesson_title": sub_title,
                            "notes": "",
                            "semester": "Học kỳ 1" if current_week <= 18 else "Học kỳ 2"
                        })
                        current_lesson_num = max(current_lesson_num, l_num + 1)

                # CD lesson
                cd_num_str = parts[3]
                cd_title = parts[4]
                if cd_title and is_valid_lesson_title(cd_title) and re.search(r'\d+', cd_num_str):
                    cd_nums = extract_lesson_numbers(cd_num_str, 1)
                    for idx_n, l_num in enumerate(cd_nums):
                        sub_title = cd_title
                        if len(cd_nums) > 1 and not re.search(r'tiết\s*\d+', cd_title.lower()):
                            sub_title = f"{cd_title} (Tiết {idx_n + 1})"
                        assigned_num = l_num if l_num > 105 else (105 + l_num)
                        items.append({
                            "grade": default_grade,
                            "subject": default_subject,
                            "week": current_week,
                            "lesson_number": assigned_num,
                            "lesson_title": sub_title,
                            "notes": "Chuyên đề",
                            "semester": "Học kỳ 1" if current_week <= 18 else "Học kỳ 2"
                        })
                continue

            detected = detect_column_indices(parts)
            
            # Check week in parts
            if "col_week" in detected and detected["col_week"] < len(parts):
                w_nums = re.findall(r'\d+', parts[detected["col_week"]])
                if w_nums and int(w_nums[0]) <= 52:
                    current_week = int(w_nums[0])
            elif re.match(r'^\d+$', parts[0]) and int(parts[0]) <= 52:
                current_week = int(parts[0])

            # Check lesson number
            l_num_str = ""
            if "col_lesson_num" in detected and detected["col_lesson_num"] < len(parts):
                l_num_str = parts[detected["col_lesson_num"]]
            elif len(parts) >= 2 and re.match(r'^\d+', parts[1]):
                l_num_str = parts[1]
            elif re.match(r'^\d+', parts[0]):
                l_num_str = parts[0]

            lesson_nums = extract_lesson_numbers(l_num_str, current_lesson_num)

            # Check title
            title_str = ""
            if "col_title" in detected and detected["col_title"] < len(parts):
                title_str = parts[detected["col_title"]]
            elif len(parts) >= 3:
                candidates = [p for p in parts if len(p) > 3 and not re.match(r'^\d+$', p)]
                if candidates:
                    title_str = candidates[0]
            else:
                title_str = parts[-1]

            if title_str and is_valid_lesson_title(title_str):
                notes_str = parts[detected["col_notes"]] if ("col_notes" in detected and detected["col_notes"] < len(parts)) else (parts[3] if len(parts) > 3 else "")
                is_cd = ("chuyên đề" in title_str.lower() or "cđ" in title_str.lower() or "chuyên đề" in notes_str.lower())
                if is_cd and "chuyên đề" not in notes_str.lower():
                    notes_str = f"Chuyên đề{(' - ' + notes_str) if notes_str else ''}"

                for idx_n, l_num in enumerate(lesson_nums):
                    sub_title = title_str
                    if len(lesson_nums) > 1 and not re.search(r'tiết\s*\d+', title_str.lower()):
                        sub_title = f"{title_str} (Tiết {idx_n + 1})"
                        
                    assigned_num = l_num
                    if is_cd and l_num <= 35:
                        assigned_num = 105 + l_num

                    items.append({
                        "grade": default_grade,
                        "subject": default_subject,
                        "week": current_week,
                        "lesson_number": assigned_num,
                        "lesson_title": sub_title,
                        "notes": notes_str,
                        "semester": "Học kỳ 1" if current_week <= 18 else "Học kỳ 2"
                    })
                    current_lesson_num = max(current_lesson_num, l_num + 1)
                continue

        # Regex pattern 1: "Tuần 1 - Tiết 1, 2: Tên bài" or "Tuần 1: Tiết 1 - Tên bài"
        m1 = re.search(r'(?:tuần|tuan)\s*(\d+)[\s:\-\.]+(?:tiết|tiet)\s*([\d\s,\-–đến]+)[:\s\-\.]+(.+)', s, re.IGNORECASE)
        if m1:
            title_str = clean_text(m1.group(3))
            if not is_valid_lesson_title(title_str):
                continue
            try:
                current_week = int(m1.group(1))
            except Exception:
                pass
            lesson_nums = extract_lesson_numbers(m1.group(2), current_lesson_num)
            is_cd = ("chuyên đề" in title_str.lower() or "cđ" in title_str.lower())
            notes_str = "Chuyên đề" if is_cd else ""
            for idx_n, l_num in enumerate(lesson_nums):
                sub_title = title_str
                if len(lesson_nums) > 1 and not re.search(r'tiết\s*\d+', title_str.lower()):
                    sub_title = f"{title_str} (Tiết {idx_n + 1})"
                assigned_num = (105 + l_num) if (is_cd and l_num <= 35) else l_num
                items.append({
                    "grade": default_grade,
                    "subject": default_subject,
                    "week": current_week,
                    "lesson_number": assigned_num,
                    "lesson_title": sub_title,
                    "notes": notes_str,
                    "semester": "Học kỳ 1" if current_week <= 18 else "Học kỳ 2"
                })
                current_lesson_num = max(current_lesson_num, l_num + 1)
            continue

        # Regex pattern 2: "Tiết 1: Tên bài (Tuần 1)" or "Tiết 1 - Tên bài"
        m2 = re.search(r'^(?:tiết|tiet)\s*([\d\s,\-–đến]+)[:\s\-\.]+(.+?)(?:\s*\((?:tuần|tuan)\s*(\d+)\))?$', s, re.IGNORECASE)
        if m2:
            title_str = clean_text(m2.group(2))
            if not is_valid_lesson_title(title_str):
                continue
            if m2.group(3):
                try:
                    current_week = int(m2.group(3))
                except Exception:
                    pass
            lesson_nums = extract_lesson_numbers(m2.group(1), current_lesson_num)
            is_cd = ("chuyên đề" in title_str.lower() or "cđ" in title_str.lower())
            notes_str = "Chuyên đề" if is_cd else ""
            for idx_n, l_num in enumerate(lesson_nums):
                sub_title = title_str
                if len(lesson_nums) > 1 and not re.search(r'tiết\s*\d+', title_str.lower()):
                    sub_title = f"{title_str} (Tiết {idx_n + 1})"
                assigned_num = (105 + l_num) if (is_cd and l_num <= 35) else l_num
                items.append({
                    "grade": default_grade,
                    "subject": default_subject,
                    "week": current_week,
                    "lesson_number": assigned_num,
                    "lesson_title": sub_title,
                    "notes": notes_str,
                    "semester": "Học kỳ 1" if current_week <= 18 else "Học kỳ 2"
                })
                current_lesson_num = max(current_lesson_num, l_num + 1)
            continue

        # Regex pattern 3: Numbered list "1. Bài 1: Mệnh đề" or "Bài 1: Mệnh đề (2 tiết)"
        m3 = re.search(r'^(?:bài\s*\d+|[\d]+)[\.:\-\s]+(.+?)(?:\s*\((\d+)\s*tiết\))?$', s, re.IGNORECASE)
        if m3 and len(m3.group(1)) >= 4:
            title_str = clean_text(m3.group(1))
            if not is_valid_lesson_title(title_str):
                continue
            duration = int(m3.group(2)) if m3.group(2) else 1
            is_cd = ("chuyên đề" in title_str.lower() or "cđ" in title_str.lower())
            notes_str = "Chuyên đề" if is_cd else ""
            for idx_n in range(duration):
                sub_title = title_str
                if duration > 1:
                    sub_title = f"{title_str} (Tiết {idx_n + 1})"
                assigned_num = (105 + current_lesson_num) if (is_cd and current_lesson_num <= 35) else current_lesson_num
                items.append({
                    "grade": default_grade,
                    "subject": default_subject,
                    "week": current_week,
                    "lesson_number": assigned_num,
                    "lesson_title": sub_title,
                    "notes": notes_str,
                    "semester": "Học kỳ 1" if current_week <= 18 else "Học kỳ 2"
                })
                current_lesson_num += 1

    return items

def parse_ppct_pdf(
    file_bytes: bytes,
    default_grade: str = "Khối 10",
    default_subject: str = "Toán",
    selected_model: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Lightning-fast Hybrid PPCT PDF Parser:
    Step 1 (AI Primary): Direct Gemini Flash processing in JSON mode for 100% accurate extraction.
    Step 2 (Fallback): High-speed local table engine parses 5-column parallel tables.
    Step 3 (Fallback): High-speed local text engine parses line-by-line digital text.
    """
    # 1. STEP 1: GEMINI FLASH AI DIRECT EXTRACTION (PRIMARY)
    ai_items = extract_ppct_with_gemini(
        f"File PDF môn {default_subject} {default_grade}",
        default_grade=default_grade,
        default_subject=default_subject,
        pdf_bytes=file_bytes,
        selected_model=selected_model
    )
    if ai_items and len(ai_items) >= 10:
        return ai_items

    # 2. STEP 2: INSTANT LOCAL TABLE EXTRACTION (FALLBACK)
    try:
        table_items = parse_pdf_tables(file_bytes, default_grade=default_grade, default_subject=default_subject)
        if len(table_items) >= 20:
            logger.info(f"⚡ Đã bóc tách {len(table_items)} tiết PPCT từ bảng PDF (Fallback local)!")
            return table_items
    except Exception as e:
        logger.warning(f"Local table extraction error: {e}")

    # 3. STEP 3: INSTANT LOCAL TEXT ENGINE (FALLBACK)
    try:
        import fitz
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        all_lines = []
        for page in doc:
            text = page.get_text("text")
            if text:
                all_lines.extend(text.splitlines())
        doc.close()

        text_items = parse_ppct_text_lines(all_lines, default_grade=default_grade, default_subject=default_subject)
        if len(text_items) >= 20:
            logger.info(f"⚡ Đã bóc tách {len(text_items)} tiết PPCT từ văn bản PDF (Fallback local)!")
            return text_items
    except Exception as e:
        logger.warning(f"Local text extraction error: {e}")

    return table_items if 'table_items' in locals() and table_items else []


def parse_ppct_text(
    raw_text: str,
    default_grade: str = "Khối 10",
    default_subject: str = "Toán",
    selected_model: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Parse PPCT directly from pasted text / clipboard with Gemini Flash AI primary and local fallback"""
    # 1. Primary: Gemini Flash AI
    ai_items = extract_ppct_with_gemini(
        f"Văn bản PPCT dán môn {default_subject} {default_grade}",
        text_content=raw_text,
        default_grade=default_grade,
        default_subject=default_subject,
        selected_model=selected_model
    )
    if ai_items and len(ai_items) >= 1:
        return ai_items

    # 2. Fallback: Local line parsing
    lines = [clean_text(line) for line in raw_text.splitlines() if clean_text(line)]
    return parse_ppct_text_lines(lines, default_grade=default_grade, default_subject=default_subject)

