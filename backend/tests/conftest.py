import os
import sys

os.environ["LANGCHAIN_TRACING_V2"] = "false"
os.environ["LANGSMITH_TRACING"] = "false"
os.environ["AI_PROVIDER"] = "mock"

# Ensure backend root is on Python module path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.database import get_db
from app.database.session import Base
from app.main import app

# Isolated test database
TEST_DATABASE_URL = "sqlite:///./test_insightiq.db"

test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(autouse=True)
def setup_test_db():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def client():
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def authenticated_client(client):
    # Register & login test user
    client.post("/api/auth/register", json={
        "email": "analyst@insightiq.ai",
        "password": "Password123!",
        "full_name": "Senior Data Analyst"
    })
    res = client.post("/api/auth/login", json={
        "email": "analyst@insightiq.ai",
        "password": "Password123!"
    })
    token = res.json()["access_token"]
    client.headers = {"Authorization": f"Bearer {token}"}
    return client
