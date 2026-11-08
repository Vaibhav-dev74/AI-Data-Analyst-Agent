from typing import Any, Dict
from app.agents.state import AnalystState
from app.tools.sql_tool import DuckDBSqlTool


def execution_node(state: AnalystState) -> Dict[str, Any]:
    """
    Executor Agent: executes the planned DuckDB SQL query against the sandboxed dataset.
    """
    file_path = state["file_path"]
    file_type = state["file_type"]
    query = state.get("generated_sql")

    if not query:
        return {
            "raw_result": {
                "success": False,
                "error": "No executable query was generated.",
                "rows": [],
                "columns": [],
                "row_count": 0
            }
        }

    exec_result = DuckDBSqlTool.execute_query(
        file_path=file_path,
        query=query,
        file_type=file_type
    )

    # If first execution fails (e.g. column quote issue), attempt safe fallback query
    if not exec_result["success"]:
        fallback_query = "SELECT * FROM dataset LIMIT 10"
        fallback_result = DuckDBSqlTool.execute_query(
            file_path=file_path,
            query=fallback_query,
            file_type=file_type
        )
        if fallback_result["success"]:
            fallback_result["warning"] = f"Initial query failed ({exec_result.get('error')}). Fallback table view executed."
            return {"raw_result": fallback_result, "generated_sql": fallback_query}

    return {"raw_result": exec_result}
