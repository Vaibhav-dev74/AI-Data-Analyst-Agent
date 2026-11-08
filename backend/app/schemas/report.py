from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict


class ReportGenerateRequest(BaseModel):
    dataset_id: str
    title: str = "Executive Data Intelligence Report"
    format: str = "pdf"  # "pdf" or "excel"
    sections: Optional[List[str]] = [
        "executive_summary",
        "dataset_overview",
        "kpi_metrics",
        "trends",
        "statistical_findings",
        "recommendations"
    ]


class ReportOut(BaseModel):
    id: str
    title: str
    format: str
    dataset_id: str
    dataset_name: Optional[str] = None
    file_size_bytes: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReportDetail(ReportOut):
    executive_summary: Optional[Dict[str, Any]] = None
    download_url: str
