from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class SettingBase(BaseModel):
    key: str
    value: str
    description: Optional[str] = None

class SettingCreate(SettingBase):
    pass

class SettingResponse(SettingBase):
    id: int
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
