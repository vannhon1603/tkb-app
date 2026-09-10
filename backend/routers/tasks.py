from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from db.session import get_db
from db.models import TaskModel
from schemas.tasks import TaskCreate, TaskUpdate, TaskResponse

router = APIRouter(prefix="/tasks", tags=["Tasks"])

@router.get("/", response_model=List[TaskResponse])
def get_tasks(
    completed: Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(TaskModel)
    if completed is not None:
        query = query.filter(TaskModel.completed == completed)
    return query.order_by(TaskModel.completed.asc(), TaskModel.id.desc()).all()

@router.post("/", response_model=TaskResponse)
def create_task(data: TaskCreate, db: Session = Depends(get_db)):
    task = TaskModel(
        title=data.title.strip(),
        due_date=data.due_date,
        priority=data.priority or "Trung bình",
        completed=data.completed or False
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

@router.put("/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, data: TaskUpdate, db: Session = Depends(get_db)):
    task = db.query(TaskModel).filter(TaskModel.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Không tìm thấy công việc")
    
    if data.title is not None:
        task.title = data.title.strip()
    if data.due_date is not None:
        task.due_date = data.due_date
    if data.priority is not None:
        task.priority = data.priority
    if data.completed is not None:
        task.completed = data.completed

    db.commit()
    db.refresh(task)
    return task

@router.delete("/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(TaskModel).filter(TaskModel.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Không tìm thấy công việc")
    db.delete(task)
    db.commit()
    return {"status": "success", "message": "Đã xóa công việc"}
