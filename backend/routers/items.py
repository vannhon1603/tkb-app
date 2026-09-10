from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from db.session import get_db
from schemas.item import ItemCreate, ItemUpdate, ItemResponse
from services.item_service import ItemService

router = APIRouter(prefix="/items", tags=["Items & Data Management"])

@router.get("/", response_model=List[ItemResponse])
async def list_items(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    return ItemService.get_all(db, skip=skip, limit=limit)

@router.get("/{item_id}", response_model=ItemResponse)
async def get_item(item_id: int, db: Session = Depends(get_db)):
    item = ItemService.get_by_id(db, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Bản ghi không tồn tại")
    return item

@router.post("/", response_model=ItemResponse, status_code=201)
async def create_item(item_in: ItemCreate, db: Session = Depends(get_db)):
    existing = ItemService.get_by_code(db, item_in.code)
    if existing:
        raise HTTPException(status_code=400, detail="Mã bản ghi đã tồn tại")
    return ItemService.create(db, item_in)

@router.put("/{item_id}", response_model=ItemResponse)
async def update_item(item_id: int, item_in: ItemUpdate, db: Session = Depends(get_db)):
    updated = ItemService.update(db, item_id, item_in)
    if not updated:
        raise HTTPException(status_code=404, detail="Bản ghi không tồn tại")
    return updated

@router.delete("/{item_id}")
async def delete_item(item_id: int, db: Session = Depends(get_db)):
    success = ItemService.delete(db, item_id)
    if not success:
        raise HTTPException(status_code=404, detail="Bản ghi không tồn tại")
    return {"status": "success", "message": "Đã xóa bản ghi thành công"}
