from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class SoBaoGiangEntryBase(BaseModel):
    teacher_name: str
    week_number: int
    start_date: str # YYYY-MM-DD
    day_of_week: int
    date_str: str   # DD/MM/YYYY
    period: int
    class_name: str
    subject: str
    ppct_lesson_number: Optional[int] = None
    lesson_title: str
    notes: Optional[str] = None
    is_custom: Optional[bool] = False
    is_taught: Optional[bool] = False
    status: Optional[str] = "pending" # "pending", "completed", "delayed"
    taught_at: Optional[datetime] = None

class SoBaoGiangEntryCreate(SoBaoGiangEntryBase):
    pass

class SoBaoGiangEntryUpdate(BaseModel):
    ppct_lesson_number: Optional[int] = None
    lesson_title: Optional[str] = None
    notes: Optional[str] = None
    class_name: Optional[str] = None
    subject: Optional[str] = None
    is_taught: Optional[bool] = None
    status: Optional[str] = None

class SoBaoGiangEntryResponse(SoBaoGiangEntryBase):
    id: int
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class GenerateSoBaoGiangRequest(BaseModel):
    teacher_name: Optional[str] = None
    week_number: int
    start_date: str # YYYY-MM-DD (Thứ Hai của tuần)
    semester: Optional[str] = "Học kỳ 1"
    overwrite: Optional[bool] = True

class GenerateAllWeeksRequest(BaseModel):
    teacher_name: Optional[str] = None
    semester_start_date: str # YYYY-MM-DD (Thứ Hai của Tuần 1)
    total_weeks: Optional[int] = 35
    semester: Optional[str] = "Học kỳ 1"
    overwrite: Optional[bool] = True
    preserve_taught: Optional[bool] = True

class GenerateAllWeeksResponse(BaseModel):
    total_weeks: int
    total_entries: int
    teacher_name: str
    message: str

class SoBaoGiangWeekResponse(BaseModel):
    week_number: int
    start_date: str
    teacher_name: str
    total_entries: int
    entries: List[SoBaoGiangEntryResponse]

class ToggleTaughtRequest(BaseModel):
    is_taught: Optional[bool] = None # if None, toggles current value

class BatchToggleTaughtRequest(BaseModel):
    week_number: Optional[int] = None
    entry_ids: Optional[List[int]] = None
    teacher_name: Optional[str] = None
    is_taught: bool = True

class BatchToggleTaughtResponse(BaseModel):
    updated_count: int
    is_taught: bool
    message: str

class ProgressStatsResponse(BaseModel):
    total_lessons: int
    taught_lessons: int
    pending_lessons: int
    delayed_lessons: int
    completion_rate: float
    by_class: Dict[str, Dict[str, int]]
    by_subject: Dict[str, Dict[str, int]]

