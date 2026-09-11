from sqlalchemy import text
from db.base import Base
from db.session import engine, SessionLocal, get_db
from db.models import ItemModel, SettingModel, PPCTModel, TKBSlotModel, SoBaoGiangEntryModel

def init_db():
    Base.metadata.create_all(bind=engine)
    
    # Safe SQLite migrations for newly added columns
    with engine.connect() as conn:
        try:
            # 1. so_bao_giang_entries migrations
            result = conn.execute(text("PRAGMA table_info(so_bao_giang_entries);"))
            columns = [row[1] for row in result.fetchall()]
            
            if "is_taught" not in columns:
                conn.execute(text("ALTER TABLE so_bao_giang_entries ADD COLUMN is_taught BOOLEAN DEFAULT 0;"))
            if "status" not in columns:
                conn.execute(text("ALTER TABLE so_bao_giang_entries ADD COLUMN status VARCHAR(20) DEFAULT 'pending';"))
            if "taught_at" not in columns:
                conn.execute(text("ALTER TABLE so_bao_giang_entries ADD COLUMN taught_at DATETIME;"))
            if "user_id" not in columns:
                conn.execute(text("ALTER TABLE so_bao_giang_entries ADD COLUMN user_id VARCHAR(100) DEFAULT 'default_user';"))
            
            # 2. tkb_slots migrations
            tkb_info = conn.execute(text("PRAGMA table_info(tkb_slots);"))
            tkb_cols = [row[1] for row in tkb_info.fetchall()]
            if "from_week" not in tkb_cols:
                conn.execute(text("ALTER TABLE tkb_slots ADD COLUMN from_week INTEGER DEFAULT 1;"))
            if "to_week" not in tkb_cols:
                conn.execute(text("ALTER TABLE tkb_slots ADD COLUMN to_week INTEGER DEFAULT 35;"))
            if "user_id" not in tkb_cols:
                conn.execute(text("ALTER TABLE tkb_slots ADD COLUMN user_id VARCHAR(100) DEFAULT 'default_user';"))

            # 3. ppct_items migrations
            ppct_info = conn.execute(text("PRAGMA table_info(ppct_items);"))
            ppct_cols = [row[1] for row in ppct_info.fetchall()]
            if "user_id" not in ppct_cols:
                conn.execute(text("ALTER TABLE ppct_items ADD COLUMN user_id VARCHAR(100) DEFAULT 'default_user';"))

            # 4. Other tables migrations
            for table_name in ["students", "attendance", "bonus_points", "tasks", "settings"]:
                try:
                    t_info = conn.execute(text(f"PRAGMA table_info({table_name});"))
                    t_cols = [row[1] for row in t_info.fetchall()]
                    if t_cols and "user_id" not in t_cols:
                        conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN user_id VARCHAR(100) DEFAULT 'default_user';"))
                except Exception:
                    pass

            conn.commit()
        except Exception as e:
            print(f"Migration error (non-fatal): {e}")
