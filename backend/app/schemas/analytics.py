from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class AnalyzeRequest(BaseModel):
    dataset_id: str
    operation: str  # "summary", "correlation", "group_by", "sql"
    parameters: Optional[Dict[str, Any]] = None
    sql_query: Optional[str] = None


class AnalyzeResponse(BaseModel):
    operation: str
    dataset_id: str
    columns: List[str]
    rows: List[Dict[str, Any]]
    row_count: int
    execution_time_ms: float
    chart_config: Optional[Dict[str, Any]] = None
    summary_stats: Optional[Dict[str, Any]] = None
    explanation: Optional[str] = None
