from typing import Any, Dict, List, Optional
from typing_extensions import TypedDict


class AnalystState(TypedDict):
    # Inputs
    question: str
    dataset_id: str
    file_path: str
    file_type: str
    dataset_profile: Dict[str, Any]

    # Analysis steps
    intent: Optional[Dict[str, Any]]
    query_plan: Optional[Dict[str, Any]]
    generated_sql: Optional[str]
    raw_result: Optional[Dict[str, Any]]
    validation: Optional[Dict[str, Any]]
    chart_config: Optional[Dict[str, Any]]
    findings: Optional[str]
    recommendations: Optional[List[str]]
    final_response: Optional[str]
    error: Optional[str]
