from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class BonusPointBase(BaseModel):
    student_id: int
    class_name: str
    points: int  # +1, -1, +2
    date: str    # YYYY-MM-DD
    reason: Optional[str] = "Phát biểu tốt"

class BonusPointCreate(BonusPointBase):
    pass

class BonusPointResponse(BonusPointBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class StudentRankResponse(BaseModel):
    student_id: int
    student_name: str
    class_name: str
    total_points: int
    positive_count: int
    negative_count: int
