import re
from typing import Any, Dict, List
from app.agents.state import AnalystState


def context_analyzer_node(state: AnalystState) -> Dict[str, Any]:
    """
    Context Agent: maps abstract metrics and dimensions extracted from the user question
    onto actual schema columns, verifying data types and compatibility.
    """
    profile = state.get("dataset_profile", {})
    columns_overview = profile.get("columns_overview", [])
    intent = state.get("intent", {}) or {}

    available_cols = [c["name"] for c in columns_overview]
    num_cols = [c["name"] for c in columns_overview if c.get("type") == "numeric"]
    cat_cols = [c["name"] for c in columns_overview if c.get("type") in ("categorical", "text")]
    date_cols = [c["name"] for c in columns_overview if c.get("type") == "datetime"]

    matched_metrics = []
    matched_dimensions = []

    # Map requested metrics to actual numeric columns
    requested_metrics = intent.get("metrics", [])
    for req in requested_metrics:
        req_clean = str(req).lower()
        for col in num_cols:
            if req_clean in col.lower() or col.lower() in req_clean:
                if col not in matched_metrics:
                    matched_metrics.append(col)

    # If no metric matched yet, search whole question for numeric column names
    q_lower = state["question"].lower()
    for col in num_cols:
        col_clean = col.lower().replace("_", " ")
        if col_clean in q_lower or col.lower() in q_lower:
            if col not in matched_metrics:
                matched_metrics.append(col)

    # Fallback to primary numeric column (e.g., revenue, sales, amount, profit, price) if still empty
    if not matched_metrics and num_cols:
        priority_keywords = ["revenue", "sales", "amount", "profit", "total", "price", "cost", "value"]
        for kw in priority_keywords:
            for col in num_cols:
                if kw in col.lower():
                    matched_metrics.append(col)
                    break
            if matched_metrics:
                break
        if not matched_metrics:
            matched_metrics.append(num_cols[0])

    # Map dimensions
    requested_dims = intent.get("dimensions", [])
    for req in requested_dims:
        req_clean = str(req).lower()
        for col in cat_cols + date_cols:
            if req_clean in col.lower() or col.lower() in req_clean:
                if col not in matched_dimensions:
                    matched_dimensions.append(col)

    # Search question for categorical or date columns
    for col in cat_cols + date_cols:
        col_clean = col.lower().replace("_", " ")
        if col_clean in q_lower or col.lower() in q_lower:
            if col not in matched_dimensions:
                matched_dimensions.append(col)

    # Date trend check
    if intent.get("intent") == "trend_over_time" and date_cols:
        if date_cols[0] not in matched_dimensions:
            matched_dimensions.insert(0, date_cols[0])

    context_summary = {
        "matched_metrics": matched_metrics,
        "matched_dimensions": matched_dimensions,
        "date_column": date_cols[0] if date_cols else None,
        "numeric_columns": num_cols,
        "categorical_columns": cat_cols,
        "datetime_columns": date_cols
    }

    # Enrich intent with verified context
    enriched_intent = dict(intent)
    enriched_intent["context_summary"] = context_summary

    return {"intent": enriched_intent}
