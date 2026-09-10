from typing import List, Optional
from sqlalchemy.orm import Session
from db.models import ItemModel
from schemas.item import ItemCreate, ItemUpdate

class ItemService:
    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 100) -> List[ItemModel]:
        return db.query(ItemModel).offset(skip).limit(limit).all()

    @staticmethod
    def get_by_id(db: Session, item_id: int) -> Optional[ItemModel]:
        return db.query(ItemModel).filter(ItemModel.id == item_id).first()

    @staticmethod
    def get_by_code(db: Session, code: str) -> Optional[ItemModel]:
        return db.query(ItemModel).filter(ItemModel.code == code).first()

    @staticmethod
    def create(db: Session, item_in: ItemCreate) -> ItemModel:
        db_item = ItemModel(
            code=item_in.code,
            name=item_in.name,
            category=item_in.category,
            priority=item_in.priority,
            status=item_in.status,
            description=item_in.description,
        )
        db.add(db_item)
        db.commit()
        db.refresh(db_item)
        return db_item

    @staticmethod
    def update(db: Session, item_id: int, item_in: ItemUpdate) -> Optional[ItemModel]:
        db_item = ItemService.get_by_id(db, item_id)
        if not db_item:
            return None
        
        update_data = item_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_item, key, value)
            
        db.commit()
        db.refresh(db_item)
        return db_item

    @staticmethod
    def delete(db: Session, item_id: int) -> bool:
        db_item = ItemService.get_by_id(db, item_id)
        if not db_item:
            return False
        db.delete(db_item)
        db.commit()
        return True
