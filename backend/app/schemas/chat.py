from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict


class ChatRequest(BaseModel):
    dataset_id: str
    message: str
    session_id: Optional[str] = None


class ChartConfig(BaseModel):
    type: str  # bar, line, area, pie, scatter, histogram, heatmap
    title: str
    x_axis: Optional[str] = None
    y_axis: Optional[str] = None
    series_keys: Optional[List[str]] = None
    colors: Optional[List[str]] = None
    data: Optional[List[Dict[str, Any]]] = None


class AnalysisResultOut(BaseModel):
    raw_data: Optional[List[Dict[str, Any]]] = None
    summary_metrics: Optional[Dict[str, Any]] = None
    findings: Optional[str] = None
    recommendations: Optional[List[str]] = None


class MessageOut(BaseModel):
    id: str
    role: str
    content: str
    chart_config: Optional[ChartConfig] = None
    query_sql: Optional[str] = None
    analytical_method: Optional[str] = None
    result: Optional[AnalysisResultOut] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SessionDetail(BaseModel):
    id: str
    title: str
    dataset_id: str
    created_at: datetime
    updated_at: datetime
    messages: List[MessageOut] = []

    model_config = ConfigDict(from_attributes=True)


class SessionSummary(BaseModel):
    id: str
    title: str
    dataset_id: str
    dataset_name: Optional[str] = None
    message_count: int = 0
    created_at: datetime
    updated_at: datetime
