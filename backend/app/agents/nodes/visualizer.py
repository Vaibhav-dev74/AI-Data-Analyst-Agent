from typing import Any, Dict
from app.agents.state import AnalystState
from app.tools.visualization_tool import VisualizationTool


def visualization_node(state: AnalystState) -> Dict[str, Any]:
    """
    Visualization Agent: analyzes result columns, row cardinality, and user intent
    to recommend the optimal interactive chart format.
    """
    raw_result = state.get("raw_result") or {}
    validation = state.get("validation") or {}

    if not validation.get("is_valid") or not raw_result.get("rows"):
        return {"chart_config": None}

    columns = raw_result.get("columns", [])
    rows = raw_result.get("rows", [])
    question = state.get("question", "")

    chart_config = VisualizationTool.recommend_chart(
        columns=columns,
        rows=rows,
        question=question
    )

    return {"chart_config": chart_config}
