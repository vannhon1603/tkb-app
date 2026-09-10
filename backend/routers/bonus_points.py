from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from db.session import get_db
from db.models import BonusPointModel, StudentModel
from schemas.bonus_points import BonusPointCreate, BonusPointResponse, StudentRankResponse

router = APIRouter(prefix="/bonus-points", tags=["Bonus Points"])

@router.get("/", response_model=List[BonusPointResponse])
def get_bonus_points(
    class_name: Optional[str] = Query(None),
    student_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(BonusPointModel)
    if class_name:
        query = query.filter(BonusPointModel.class_name == class_name)
    if student_id:
        query = query.filter(BonusPointModel.student_id == student_id)
    return query.order_by(BonusPointModel.id.desc()).all()

@router.post("/", response_model=BonusPointResponse)
def add_bonus_point(data: BonusPointCreate, db: Session = Depends(get_db)):
    record = BonusPointModel(
        student_id=data.student_id,
        class_name=data.class_name,
        points=data.points,
        date=data.date,
        reason=data.reason or ("Phát biểu tốt" if data.points > 0 else "Vi phạm")
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record

@router.get("/leaderboard", response_model=List[StudentRankResponse])
def get_leaderboard(class_name: Optional[str] = Query(None), db: Session = Depends(get_db)):
    students_query = db.query(StudentModel)
    if class_name:
        students_query = students_query.filter(StudentModel.class_name == class_name)
    students = students_query.all()

    rankings = []
    for s in students:
        records = db.query(BonusPointModel).filter(BonusPointModel.student_id == s.id).all()
        total = sum(r.points for r in records)
        pos = sum(1 for r in records if r.points > 0)
        neg = sum(1 for r in records if r.points < 0)
        rankings.append(StudentRankResponse(
            student_id=s.id,
            student_name=s.name,
            class_name=s.class_name,
            total_points=total,
            positive_count=pos,
            negative_count=neg
        ))

    rankings.sort(key=lambda x: x.total_points, reverse=True)
    return rankings

@router.delete("/{record_id}")
def delete_bonus_point(record_id: int, db: Session = Depends(get_db)):
    record = db.query(BonusPointModel).filter(BonusPointModel.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi")
    db.delete(record)
    db.commit()
    return {"status": "success"}
