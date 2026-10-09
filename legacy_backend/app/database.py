import logging
import time
from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import settings

logger = logging.getLogger(__name__)

# pool_pre_ping detects stale/dropped connections (e.g. a transient private-
# network blip on Railway) and transparently replaces them before a request
# tries to use them, instead of surfacing a raw connection error.
engine = create_engine(settings.database_url, pool_pre_ping=True)

sessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base — all SQLAlchemy models inherit from this
class Base(DeclarativeBase):
    pass

# Dependency - used in route handelrs to get a db sessions
def get_db():
    db = sessionLocal()

    try:
        yield db
    finally:
        db.close()

# On some hosts (Railway) the DB service's private DNS can lag a few
# seconds behind the backend's own startup, so the first connection
# attempt at import time needs a few retries rather than a hard crash.
def create_tables_with_retry(max_attempts: int = 5, delay_seconds: float = 3.0) -> None:
    for attempt in range(1, max_attempts + 1):
        try:
            Base.metadata.create_all(bind=engine)
            return
        except OperationalError:
            if attempt == max_attempts:
                raise
            time.sleep(delay_seconds)

# Called at app startup. Tables were already created on some earlier
# successful boot, so a schema-check failure here (e.g. a private-network
# blip that outlasts the retry budget) shouldn't crash-loop the whole
# container — better to start serving traffic and let real request-time
# DB errors surface normally than to hard-fail on this one check.
def initialize_database() -> None:
    try:
        create_tables_with_retry(max_attempts=8, delay_seconds=5.0)
    except OperationalError:
        logger.error(
            "Could not verify/create database tables after retrying — "
            "continuing startup since the schema likely already exists "
            "from an earlier successful boot."
        )