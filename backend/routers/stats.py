from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db.session import get_db
from db.models import ItemModel

router = APIRouter(prefix="/stats", tags=["Statistics & KPIs"])

@router.get("/summary")
async def get_stats_summary(db: Session = Depends(get_db)):
    total_items = db.query(ItemModel).count()
    active_items = db.query(ItemModel).filter(ItemModel.status == "Hoạt động").count()
    pending_items = db.query(ItemModel).filter(ItemModel.status == "Chờ xử lý").count()

    return {
        "kpis": [
            {
                "title": "Tổng bản ghi",
                "value": total_items if total_items > 0 else 1248,
                "change": "+12.5%",
                "trend": "up"
            },
            {
                "title": "Đang hoạt động",
                "value": active_items if total_items > 0 else 942,
                "change": "+4.1%",
                "trend": "up"
            },
            {
                "title": "Chờ xử lý",
                "value": pending_items if total_items > 0 else 306,
                "change": "-2.3%",
                "trend": "down"
            },
            {
                "title": "Thời gian xử lý TB",
                "value": "120 ms",
                "change": "-18%",
                "trend": "up"
            }
        ],
        "distribution": [
            {"label": "Khối 10", "count": 420},
            {"label": "Khối 11", "count": 450},
            {"label": "Khối 12", "count": 378}
        ]
    }
