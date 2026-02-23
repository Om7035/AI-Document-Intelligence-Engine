"""
SQLAlchemy session — NOT USED in current implementation.
Storage is handled by app.db.json_store (JSON-based).
Kept for reference only.
"""
# from sqlalchemy import create_engine
# from sqlalchemy.orm import sessionmaker
# from app.core.config import settings
#
# engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False})
# SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
