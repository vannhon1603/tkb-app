from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class StudentBase(BaseModel):
    class_name: str
    name: str
    gender: Optional[str] = "Nam"
    notes: Optional[str] = None

class StudentCreate(StudentBase):
    pass

class StudentBulkCreate(BaseModel):
    class_name: str
    names: List[str]

class StudentResponse(StudentBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
