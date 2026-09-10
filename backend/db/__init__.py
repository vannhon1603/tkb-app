from sqlalchemy import text
from db.base import Base
from db.session import engine, SessionLocal, get_db
from db.models import ItemModel, SettingModel, PPCTModel, TKBSlotModel, SoBaoGiangEntryModel

def init_db():
    Base.metadata.create_all(bind=engine)
    
    # Safe SQLite migrations for newly added columns
    with engine.connect() as conn:
        try:
            result = conn.execute(text("PRAGMA table_info(so_bao_giang_entries);"))
            columns = [row[1] for row in result.fetchall()]
            
            if "is_taught" not in columns:
                conn.execute(text("ALTER TABLE so_bao_giang_entries ADD COLUMN is_taught BOOLEAN DEFAULT 0;"))
            if "status" not in columns:
                conn.execute(text("ALTER TABLE so_bao_giang_entries ADD COLUMN status VARCHAR(20) DEFAULT 'pending';"))
            if "taught_at" not in columns:
                conn.execute(text("ALTER TABLE so_bao_giang_entries ADD COLUMN taught_at DATETIME;"))
            conn.commit()
        except Exception as e:
            print(f"Migration error (non-fatal): {e}")
