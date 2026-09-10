from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from db.session import get_db
from db.models import AttendanceModel, StudentModel
from schemas.attendance import AttendanceCreate, AttendanceResponse

router = APIRouter(prefix="/attendance", tags=["Attendance"])

@router.get("/", response_model=List[AttendanceResponse])
def get_attendance(
    class_name: Optional[str] = Query(None),
    date: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(AttendanceModel)
    if class_name:
        query = query.filter(AttendanceModel.class_name == class_name)
    if date:
        query = query.filter(AttendanceModel.date == date)
    return query.all()

@router.post("/", response_model=AttendanceResponse)
def set_attendance(data: AttendanceCreate, db: Session = Depends(get_db)):
    # Update existing record if exists for this student & date, otherwise create
    record = db.query(AttendanceModel).filter(
        AttendanceModel.student_id == data.student_id,
        AttendanceModel.date == data.date
    ).first()

    if record:
        record.status = data.status
        record.notes = data.notes
        record.class_name = data.class_name
    else:
        record = AttendanceModel(
            student_id=data.student_id,
            class_name=data.class_name,
            date=data.date,
            status=data.status,
            notes=data.notes
        )
        db.add(record)

    db.commit()
    db.refresh(record)
    return record

@router.delete("/")
def delete_attendance(student_id: int, date: str, db: Session = Depends(get_db)):
    record = db.query(AttendanceModel).filter(
        AttendanceModel.student_id == student_id,
        AttendanceModel.date == date
    ).first()
    if record:
        db.delete(record)
        db.commit()
    return {"status": "success"}
