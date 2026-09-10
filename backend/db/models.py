from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from datetime import datetime
from db.base import Base

class ItemModel(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    category = Column(String(100), default="Chung")
    priority = Column(String(50), default="Trung bình")
    status = Column(String(50), default="Hoạt động")
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class SettingModel(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, index=True, nullable=False)
    value = Column(Text, nullable=False)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class PPCTModel(Base):
    __tablename__ = "ppct_items"

    id = Column(Integer, primary_key=True, index=True)
    grade = Column(String(50), index=True, nullable=False)        # Khối 10, Khối 11, Khối 12...
    subject = Column(String(100), index=True, nullable=False)     # Toán, Ngữ văn, Vật lí...
    week = Column(Integer, index=True, default=1)                 # Tuần 1..35
    lesson_number = Column(Integer, index=True, nullable=False)   # Tiết PPCT (1, 2, 3...)
    lesson_title = Column(String(500), nullable=False)            # Tên bài dạy
    notes = Column(Text, nullable=True)                           # Ghi chú / ĐDDH
    semester = Column(String(50), default="Học kỳ 1")
    created_at = Column(DateTime, default=datetime.utcnow)

class TKBSlotModel(Base):
    __tablename__ = "tkb_slots"

    id = Column(Integer, primary_key=True, index=True)
    teacher_name = Column(String(150), index=True, default="Giáo viên")
    class_name = Column(String(50), index=True, nullable=False)   # 10A1, 11B2...
    subject = Column(String(100), index=True, nullable=False)
    day_of_week = Column(Integer, index=True, nullable=False)     # 2 = Thứ 2, ..., 7 = Thứ 7
    period = Column(Integer, index=True, nullable=False)          # 1..10 (1-5 sáng, 6-10 chiều)
    session = Column(String(20), default="Sáng")
    room = Column(String(50), nullable=True)
    semester = Column(String(50), default="Học kỳ 1")
    created_at = Column(DateTime, default=datetime.utcnow)

class SoBaoGiangEntryModel(Base):
    __tablename__ = "so_bao_giang_entries"

    id = Column(Integer, primary_key=True, index=True)
    teacher_name = Column(String(150), index=True, nullable=False)
    week_number = Column(Integer, index=True, nullable=False)
    start_date = Column(String(20), index=True, nullable=False)   # YYYY-MM-DD
    day_of_week = Column(Integer, nullable=False)                 # 2..7
    date_str = Column(String(20), nullable=False)                 # DD/MM/YYYY
    period = Column(Integer, nullable=False)                      # Tiết TKB
    class_name = Column(String(50), nullable=False)
    subject = Column(String(100), nullable=False)
    ppct_lesson_number = Column(Integer, nullable=True)           # Tiết PPCT
    lesson_title = Column(String(500), nullable=False)            # Tên bài dạy
    notes = Column(Text, nullable=True)
    is_custom = Column(Boolean, default=False)
    is_taught = Column(Boolean, default=False, nullable=False)     # Tick đã dạy
    status = Column(String(20), default="pending")                 # "pending", "completed", "delayed"
    taught_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class StudentModel(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    class_name = Column(String(50), index=True, nullable=False)
    name = Column(String(150), nullable=False)
    gender = Column(String(10), default="Nam")
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class AttendanceModel(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, index=True, nullable=False)
    class_name = Column(String(50), index=True, nullable=False)
    date = Column(String(20), index=True, nullable=False)         # YYYY-MM-DD
    status = Column(String(20), default="present")                # "present", "excused", "unexcused", "late"
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class BonusPointModel(Base):
    __tablename__ = "bonus_points"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, index=True, nullable=False)
    class_name = Column(String(50), index=True, nullable=False)
    points = Column(Integer, nullable=False)                      # +1, -1, +2...
    date = Column(String(20), index=True, nullable=False)         # YYYY-MM-DD
    reason = Column(String(255), default="Phát biểu tốt")
    created_at = Column(DateTime, default=datetime.utcnow)

class TaskModel(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    due_date = Column(String(20), nullable=True)                  # YYYY-MM-DD
    priority = Column(String(50), default="Trung bình")           # "Cao", "Trung bình", "Thấp"
    completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

