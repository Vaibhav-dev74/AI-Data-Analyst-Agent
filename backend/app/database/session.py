from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings


def build_sqlalchemy_url(raw_url: str) -> str:
    """
    Prepares the SQLAlchemy connection URL:
    - Uses explicit psycopg2 driver when available (compatible with both SQLAlchemy 2.0 and 2.1+
      and safe with Supabase PgBouncer transaction pooler on port 6543).
    - Ensures SSL is enabled for Supabase hosts when sslmode is omitted.
    """
    url = raw_url
    if url.startswith("postgresql://"):
        try:
            import psycopg2  # noqa: F401
            url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
        except ImportError:
            pass

    if ("supabase.co" in url or "supabase.com" in url) and "sslmode=" not in url:
        separator = "&" if "?" in url else "?"
        url = f"{url}{separator}sslmode=require"
    return url


db_url = build_sqlalchemy_url(settings.DATABASE_URL)

# Configure engine depending on database dialect
engine_kwargs = {"pool_pre_ping": True}

if db_url.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # Conservative pool sizing safe for Render Free Tier + Supabase Free Session/Transaction Pooler
    engine_kwargs["pool_size"] = 5
    engine_kwargs["max_overflow"] = 10
    engine_kwargs["pool_recycle"] = 300

engine = create_engine(
    db_url,
    **engine_kwargs
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
