from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class TKBSlotBase(BaseModel):
    teacher_name: str = "Giáo viên"
    class_name: str
    subject: str
    day_of_week: int # 2..7
    period: int      # 1..10
    session: Optional[str] = "Sáng"
    room: Optional[str] = None
    semester: Optional[str] = "Học kỳ 1"

class TKBSlotCreate(TKBSlotBase):
    pass

class TKBSlotUpdate(BaseModel):
    teacher_name: Optional[str] = None
    class_name: Optional[str] = None
    subject: Optional[str] = None
    day_of_week: Optional[int] = None
    period: Optional[int] = None
    session: Optional[str] = None
    room: Optional[str] = None
    semester: Optional[str] = None

class TKBSlotResponse(TKBSlotBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class TKBUploadResponse(BaseModel):
    total_slots: int
    teachers: List[str]
    classes: List[str]
    slots: List[TKBSlotResponse]
