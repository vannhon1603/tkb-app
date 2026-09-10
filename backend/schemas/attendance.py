from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class AttendanceBase(BaseModel):
    student_id: int
    class_name: str
    date: str  # YYYY-MM-DD
    status: str = "present"  # "present", "excused", "unexcused", "late"
    notes: Optional[str] = None

class AttendanceCreate(AttendanceBase):
    pass

class AttendanceResponse(AttendanceBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
