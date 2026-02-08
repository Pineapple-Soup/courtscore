from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from app.core.config import settings


engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def init_db():
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        from app.database.models import User
        admin_user = db.query(User).filter(User.email == settings.ADMIN_EMAIL).first()

        if not admin_user:
            import bcrypt, uuid
            admin_user = User(
                id=str(uuid.uuid4()),
                email=settings.ADMIN_EMAIL,
                name="Admin",
                role="admin",
                hashed_password=bcrypt.hashpw(settings.ADMIN_PASSWORD.encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
            )
            db.add(admin_user)
            db.commit()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()