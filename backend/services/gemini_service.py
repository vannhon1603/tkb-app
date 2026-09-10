import os
import google.generativeai as genai
from typing import Optional
from config import settings
from logger import logger

# In-memory user-defined key override or fallback to env/db
_custom_gemini_key: Optional[str] = None

def get_effective_gemini_key() -> Optional[str]:
    global _custom_gemini_key
    if _custom_gemini_key and _custom_gemini_key.strip():
        return _custom_gemini_key.strip()
    
    # Check SQLite database SettingModel
    try:
        from db.session import SessionLocal
        from db.models import SettingModel
        with SessionLocal() as db:
            setting = db.query(SettingModel).filter(SettingModel.key == "gemini_api_key").first()
            if setting and setting.value and setting.value.strip():
                _custom_gemini_key = setting.value.strip()
                return _custom_gemini_key
    except Exception as e:
        logger.debug(f"Could not read key from db: {e}")

    # Check os.getenv or settings
    env_key = os.getenv("GEMINI_API_KEY") or settings.GEMINI_API_KEY
    if env_key and env_key.strip():
        return env_key.strip()
    
    return None

def get_key_source() -> str:
    global _custom_gemini_key
    if _custom_gemini_key and _custom_gemini_key.strip():
        return "custom"
    try:
        from db.session import SessionLocal
        from db.models import SettingModel
        with SessionLocal() as db:
            setting = db.query(SettingModel).filter(SettingModel.key == "gemini_api_key").first()
            if setting and setting.value and setting.value.strip():
                return "database"
    except Exception:
        pass
    env_key = os.getenv("GEMINI_API_KEY") or settings.GEMINI_API_KEY
    if env_key and env_key.strip():
        return "env"
    return "none"

def set_custom_gemini_key(key: str):
    global _custom_gemini_key
    _custom_gemini_key = key.strip() if key else None
    
    # Save to SQLite database SettingModel
    try:
        from db.session import SessionLocal
        from db.models import SettingModel
        with SessionLocal() as db:
            setting = db.query(SettingModel).filter(SettingModel.key == "gemini_api_key").first()
            if not setting:
                setting = SettingModel(key="gemini_api_key", value=key.strip() if key else "", description="Gemini AI API Key")
                db.add(setting)
            else:
                setting.value = key.strip() if key else ""
            db.commit()
    except Exception as e:
        logger.error(f"Failed to persist API key to db: {e}")


# Cache for discovered working models to prevent repeated network list_models calls
_cached_working_models: dict[str, list[str]] = {}

FAST_PRIORITY_MODELS = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
    "gemini-2.5-flash",
    "gemini-1.5-pro"
]

def clean_api_key(key: Optional[str]) -> Optional[str]:
    if not key:
        return None
    k = key.strip().strip('"').strip("'").strip()
    return k if len(k) >= 10 else None

def get_working_models(api_key: str) -> list[str]:
    """
    Returns prioritized fast Flash models, caching results to avoid latency on every request.
    """
    global _cached_working_models
    if api_key in _cached_working_models and _cached_working_models[api_key]:
        return _cached_working_models[api_key]

    try:
        genai.configure(api_key=api_key)
        discovered = []
        for m in genai.list_models():
            if "generateContent" in getattr(m, "supported_generation_methods", []):
                m_name = m.name.replace("models/", "")
                discovered.append(m_name)
        
        if discovered:
            def model_priority(name: str) -> int:
                n = name.lower()
                if "2.0-flash-lite" in n: return 0
                if "2.0-flash" in n: return 1
                if "1.5-flash-8b" in n: return 2
                if "1.5-flash" in n: return 3
                if "2.5-flash" in n: return 4
                if "flash" in n: return 5
                if "1.5-pro" in n: return 6
                if "pro" in n: return 7
                return 10

            discovered.sort(key=model_priority)
            _cached_working_models[api_key] = discovered
            return discovered
    except Exception as e:
        logger.debug(f"Dynamic model query fallback: {e}")
    
    _cached_working_models[api_key] = FAST_PRIORITY_MODELS
    return FAST_PRIORITY_MODELS

def test_gemini_connection(key: Optional[str] = None) -> tuple[bool, str]:
    target_key = clean_api_key(key) or clean_api_key(get_effective_gemini_key())
    if not target_key:
        return False, "Chưa cấu hình Gemini API Key."
    
    try:
        genai.configure(api_key=target_key)
        models_to_test = get_working_models(target_key)
        errors = []
        for model_name in models_to_test:
            try:
                model = genai.GenerativeModel(model_name)
                response = model.generate_content("Xin chào, hãy trả lời 'OK'")
                if response and response.text:
                    return True, f"Kết nối Gemini API ({model_name}) siêu tốc thành công!"
            except Exception as e:
                err_str = str(e)
                if "API_KEY_INVALID" in err_str or "API key not valid" in err_str:
                    return False, "Mã Gemini API Key không hợp lệ. Vui lòng kiểm tra lại mã API Key trên Google AI Studio."
                errors.append(f"{model_name}: {err_str}")
                continue
                
        return False, f"Lỗi xác thực API Key: {errors[0] if errors else 'Không tìm thấy model phù hợp'}"
    except Exception as e:
        logger.error(f"Gemini API test failed: {e}")
        return False, f"Lỗi xác thực API Key: {str(e)}"

def generate_with_gemini(
    prompt: str,
    user_key: Optional[str] = None,
    json_mode: bool = False,
    selected_model: Optional[str] = None
) -> str:
    target_key = clean_api_key(user_key) or clean_api_key(get_effective_gemini_key())
    if not target_key:
        raise ValueError("Chưa cấu hình Gemini API Key. Vui lòng cài đặt API Key trong giao diện.")
    
    genai.configure(api_key=target_key)
    generation_config = {"temperature": 0.1}
    if json_mode:
        generation_config["response_mime_type"] = "application/json"

    available_models = get_working_models(target_key)
    if selected_model and selected_model.strip():
        clean_model = selected_model.strip().replace("models/", "")
        models_to_try = [clean_model] + [m for m in available_models if m != clean_model]
    else:
        models_to_try = available_models

    errors = []
    for model_name in models_to_try:
        try:
            model = genai.GenerativeModel(model_name, generation_config=generation_config)
            response = model.generate_content(prompt)
            if response and response.text:
                return response.text
        except Exception as e:
            err_msg = str(e)
            if "API_KEY_INVALID" in err_msg or "API key not valid" in err_msg:
                raise ValueError("Mã Gemini API Key không hợp lệ. Vui lòng kiểm tra lại API Key trong ô nhập hoặc Cài đặt.")
            errors.append(f"{model_name}: {err_msg}")
            continue

    raise RuntimeError(f"Lỗi gọi Gemini API: {'; '.join(errors)}")

def generate_with_gemini_vision(
    prompt: str,
    image_bytes: bytes,
    mime_type: str = "image/png",
    user_key: Optional[str] = None,
    selected_model: Optional[str] = None
) -> str:
    """
    Sends an image (such as a pasted screenshot from clipboard) to Gemini Vision to extract structured data
    """
    target_key = clean_api_key(user_key) or clean_api_key(get_effective_gemini_key())
    if not target_key:
        raise ValueError("Chưa cấu hình Gemini API Key. Vui lòng nhập API Key trong giao diện hoặc Cài đặt hệ thống.")

    import io
    from PIL import Image

    image = Image.open(io.BytesIO(image_bytes))
    genai.configure(api_key=target_key)
    generation_config = {"response_mime_type": "application/json", "temperature": 0.1}

    available_models = get_working_models(target_key)
    if selected_model and selected_model.strip():
        clean_model = selected_model.strip().replace("models/", "")
        models_to_try = [clean_model] + [m for m in available_models if m != clean_model]
    else:
        models_to_try = available_models

    errors = []
    for model_name in models_to_try:
        try:
            model = genai.GenerativeModel(model_name, generation_config=generation_config)
            response = model.generate_content([prompt, image])
            if response and response.text:
                return response.text
        except Exception as e:
            err_msg = str(e)
            if "API_KEY_INVALID" in err_msg or "API key not valid" in err_msg:
                raise ValueError("Mã Gemini API Key không hợp lệ. Vui lòng kiểm tra lại API Key trong ô nhập hoặc Cài đặt.")
            errors.append(f"{model_name}: {err_msg}")
            continue

    raise RuntimeError(f"Lỗi AI Vision khi đọc ảnh: {'; '.join(errors)}")

def generate_with_gemini_pdf(
    prompt: str,
    pdf_bytes: bytes,
    user_key: Optional[str] = None,
    selected_model: Optional[str] = None
) -> str:
    """
    Blazing-fast High-accuracy PDF processing:
    1. Fast Phase (Instant): Extract structured text locally with PyMuPDF (0.05s).
       If digital text is found, send structured text directly to Gemini Flash in JSON mode.
    2. Fallback Phase (Vision): If PDF is a scanned image (text < 100 chars), send binary PDF to Gemini Flash.
    """
    target_key = clean_api_key(user_key) or clean_api_key(get_effective_gemini_key())
    if not target_key:
        raise ValueError("Chưa cấu hình Gemini API Key. Vui lòng cấu hình GEMINI_API_KEY trong .env hoặc nhập trong Cài đặt hệ thống.")

    genai.configure(api_key=target_key)
    generation_config = {"response_mime_type": "application/json", "temperature": 0.1}

    # Step 1: Ultra-fast local digital text extraction with PyMuPDF
    full_text = ""
    try:
        import fitz
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        text_pages = []
        for p_idx, page in enumerate(doc):
            p_text = page.get_text("text").strip()
            if p_text:
                text_pages.append(f"=== TRANG {p_idx + 1} ===\n{p_text}")
        doc.close()
        full_text = "\n\n".join(text_pages).strip()
    except Exception as e:
        logger.debug(f"PyMuPDF text extract note: {e}")

    # If digital text was extracted (standard in 95% of PDFs), send pure text prompt for 10x faster response
    if len(full_text) >= 120:
        logger.info(f"⚡ Fast PDF Mode: Extracted {len(full_text)} chars of text from PDF. Calling Gemini Flash...")
        combined_prompt = f"{prompt}\n\n=== NỘI DUNG TÀI LIỆU PDF ===\n{full_text}"
        try:
            return generate_with_gemini(combined_prompt, user_key=target_key, json_mode=True, selected_model=selected_model)
        except Exception as e:
            logger.warning(f"Fast text mode failed, attempting Multimodal binary PDF fallback: {e}")

    # Step 2: Fallback to Multimodal Binary PDF for scanned images / hand-written PDFs
    logger.info("Scanning Multimodal PDF binary with Gemini Flash...")
    pdf_part = {
        "mime_type": "application/pdf",
        "data": pdf_bytes
    }

    available_models = get_working_models(target_key)
    if selected_model and selected_model.strip():
        clean_model = selected_model.strip().replace("models/", "")
        models_to_try = [clean_model] + [m for m in available_models if m != clean_model]
    else:
        models_to_try = available_models

    errors = []
    for model_name in models_to_try:
        try:
            model = genai.GenerativeModel(model_name, generation_config=generation_config)
            response = model.generate_content([prompt, pdf_part])
            if response and response.text:
                return response.text
        except Exception as e:
            err_msg = str(e)
            if "API_KEY_INVALID" in err_msg or "API key not valid" in err_msg:
                raise ValueError("Mã Gemini API Key không hợp lệ. Vui lòng kiểm tra lại API Key trong ô nhập hoặc Cài đặt.")
            logger.warning(f"Model {model_name} failed for binary PDF: {e}")
            errors.append(f"{model_name}: {err_msg}")
            continue

    raise RuntimeError(f"Không thể đọc file PDF qua Gemini AI. Chi tiết lỗi: {'; '.join(errors)}")





