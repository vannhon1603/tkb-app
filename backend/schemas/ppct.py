from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class PPCTItemBase(BaseModel):
    grade: str
    subject: str
    week: int = 1
    lesson_number: int
    lesson_title: str
    notes: Optional[str] = None
    semester: Optional[str] = "Học kỳ 1"

class PPCTItemCreate(PPCTItemBase):
    pass

class PPCTItemUpdate(BaseModel):
    grade: Optional[str] = None
    subject: Optional[str] = None
    week: Optional[int] = None
    lesson_number: Optional[int] = None
    lesson_title: Optional[str] = None
    notes: Optional[str] = None
    semester: Optional[str] = None

class PPCTItemResponse(PPCTItemBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class PPCTBulkUploadResponse(BaseModel):
    total_imported: int
    grade: str
    subject: str
    items: List[PPCTItemResponse]
