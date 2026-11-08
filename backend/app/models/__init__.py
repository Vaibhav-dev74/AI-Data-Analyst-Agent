import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Text, Integer, BigInteger, Boolean, DateTime, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from app.database.session import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default="analyst")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    # Relationships
    datasets = relationship("Dataset", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("AnalysisSession", back_populates="user", cascade="all, delete-orphan")
    reports = relationship("GeneratedReport", back_populates="user", cascade="all, delete-orphan")
    activities = relationship("UserActivity", back_populates="user", cascade="all, delete-orphan")


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(20), nullable=False)  # csv, xlsx, xls
    file_size = Column(BigInteger, default=0)
    row_count = Column(BigInteger, default=0)
    column_count = Column(Integer, default=0)
    status = Column(String(50), default="processing")  # processing, ready, error
    metadata_profile = Column(JSON, nullable=True)  # Overview stats, missingness, summaries
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    # Relationships
    user = relationship("User", back_populates="datasets")
    columns = relationship("DatasetColumn", back_populates="dataset", cascade="all, delete-orphan")
    sessions = relationship("AnalysisSession", back_populates="dataset", cascade="all, delete-orphan")
    reports = relationship("GeneratedReport", back_populates="dataset", cascade="all, delete-orphan")


class DatasetColumn(Base):
    __tablename__ = "dataset_columns"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    dataset_id = Column(String(36), ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    column_name = Column(String(255), nullable=False)
    data_type = Column(String(50), nullable=False)  # numeric, categorical, datetime, text, boolean
    null_count = Column(Integer, default=0)
    unique_count = Column(Integer, default=0)
    sample_values = Column(JSON, nullable=True)
    statistics = Column(JSON, nullable=True)  # min, max, mean, std, median, quartiles

    # Relationships
    dataset = relationship("Dataset", back_populates="columns")


class AnalysisSession(Base):
    __tablename__ = "analysis_sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    dataset_id = Column(String(36), ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), default="New Analysis Session")
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    # Relationships
    user = relationship("User", back_populates="sessions")
    dataset = relationship("Dataset", back_populates="sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan", order_by="ChatMessage.created_at")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("analysis_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)
    chart_config = Column(JSON, nullable=True)  # Recommended chart type, keys, axes, title
    query_sql = Column(Text, nullable=True)  # DuckDB SQL executed
    analytical_method = Column(String(100), nullable=True)  # e.g., "DuckDB SQL Aggregation", "Pandas Descriptive Stats"
    created_at = Column(DateTime, default=utc_now)

    # Relationships
    session = relationship("AnalysisSession", back_populates="messages")
    result = relationship("AnalysisResult", back_populates="message", uselist=False, cascade="all, delete-orphan")


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    message_id = Column(String(36), ForeignKey("chat_messages.id", ondelete="CASCADE"), nullable=False, index=True)
    raw_data = Column(JSON, nullable=True)  # Rows and columns from execution
    summary_metrics = Column(JSON, nullable=True)
    findings = Column(Text, nullable=True)
    recommendations = Column(JSON, nullable=True)  # list of recommendations
    created_at = Column(DateTime, default=utc_now)

    # Relationships
    message = relationship("ChatMessage", back_populates="result")


class GeneratedReport(Base):
    __tablename__ = "generated_reports"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    dataset_id = Column(String(36), ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    format = Column(String(20), nullable=False)  # pdf, excel, csv
    file_path = Column(String(500), nullable=False)
    executive_summary = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    # Relationships
    user = relationship("User", back_populates="reports")
    dataset = relationship("Dataset", back_populates="reports")


class PredictionModel(Base):
    __tablename__ = "prediction_models"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    dataset_id = Column(String(36), ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    model_type = Column(String(100), nullable=False)  # forecast, anomaly, clustering
    target_column = Column(String(255), nullable=True)
    metrics = Column(JSON, nullable=True)  # r2, rmse, mae, silhouette_score, etc.
    parameters = Column(JSON, nullable=True)
    results = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=utc_now)


class UserActivity(Base):
    __tablename__ = "user_activity"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    action = Column(String(100), nullable=False)  # uploaded_dataset, ran_query, generated_report, etc.
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    # Relationships
    user = relationship("User", back_populates="activities")
