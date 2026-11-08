from typing import Any, Dict
from app.agents.state import AnalystState


def validation_node(state: AnalystState) -> Dict[str, Any]:
    """
    Validator Agent: audits execution output for sanity, non-emptiness,
    and factual grounding before downstream visualization and insight generation.
    """
    raw_result = state.get("raw_result") or {}
    success = raw_result.get("success", False)
    rows = raw_result.get("rows", [])
    columns = raw_result.get("columns", [])
    row_count = raw_result.get("row_count", 0)

    is_valid = True
    warnings = []

    if not success:
        is_valid = False
        warnings.append(raw_result.get("error", "Execution failed."))

    elif row_count == 0:
        is_valid = False
        warnings.append("The query returned 0 matching records. Criteria may be overly restrictive.")

    else:
        # Check for all-null columns
        for col in columns:
            col_vals = [r.get(col) for r in rows]
            if all(v is None for v in col_vals):
                warnings.append(f"Column '{col}' contains only null values in the result set.")

    validation_summary = {
        "is_valid": is_valid,
        "row_count": row_count,
        "column_count": len(columns),
        "warnings": warnings,
        "execution_time_ms": raw_result.get("execution_time_ms", 0.0)
    }

    return {"validation": validation_summary}
