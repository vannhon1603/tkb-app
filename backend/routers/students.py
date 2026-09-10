from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from db.session import get_db
from db.models import StudentModel
from schemas.students import StudentCreate, StudentBulkCreate, StudentResponse

router = APIRouter(prefix="/students", tags=["Students"])

@router.get("/", response_model=List[StudentResponse])
def get_students(
    class_name: Optional[str] = Query(None, description="Lọc theo tên lớp"),
    db: Session = Depends(get_db)
):
    query = db.query(StudentModel)
    if class_name:
        query = query.filter(StudentModel.class_name == class_name)
    return query.order_by(StudentModel.class_name, StudentModel.name).all()

@router.get("/classes", response_model=List[str])
def get_student_classes(db: Session = Depends(get_db)):
    results = db.query(StudentModel.class_name).distinct().all()
    return [r[0] for r in results if r[0]]

@router.post("/", response_model=StudentResponse)
def create_student(data: StudentCreate, db: Session = Depends(get_db)):
    student = StudentModel(
        class_name=data.class_name.strip(),
        name=data.name.strip(),
        gender=data.gender or "Nam",
        notes=data.notes
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student

@router.post("/bulk", response_model=List[StudentResponse])
def bulk_create_students(data: StudentBulkCreate, db: Session = Depends(get_db)):
    created = []
    cls = data.class_name.strip()
    for name in data.names:
        clean_name = name.strip()
        if clean_name:
            student = StudentModel(class_name=cls, name=clean_name)
            db.add(student)
            created.append(student)
    db.commit()
    for s in created:
        db.refresh(s)
    return created

@router.delete("/{student_id}")
def delete_student(student_id: int, db: Session = Depends(get_db)):
    student = db.query(StudentModel).filter(StudentModel.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Không tìm thấy học sinh")
    db.delete(student)
    db.commit()
    return {"status": "success", "message": "Đã xóa học sinh"}
