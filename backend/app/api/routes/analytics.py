import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models import Dataset, User, UserActivity
from app.schemas.analytics import AnalyzeRequest, AnalyzeResponse
from app.tools.pandas_tool import PandasAnalyticsTool
from app.tools.sql_tool import DuckDBSqlTool
from app.tools.visualization_tool import VisualizationTool

router = APIRouter(prefix="/analytics", tags=["Analytics & Operations"])


@router.post("/analyze", response_model=AnalyzeResponse)
def run_analytics_operation(
    req: AnalyzeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Executes an approved analytical operation (SQL, Summary Stats, Correlation, Group-by, Outliers)
    directly against the selected dataset.
    """
    dataset = db.query(Dataset).filter(Dataset.id == req.dataset_id, Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found or access denied.")

    if not os.path.exists(dataset.file_path):
        raise HTTPException(status_code=404, detail="Dataset file missing on disk.")

    op = req.operation.lower()
    params = req.parameters or {}

    # 1. Custom / Generated SQL
    if op == "sql":
        if not req.sql_query:
            raise HTTPException(status_code=400, detail="SQL query required for SQL operation.")
        res = DuckDBSqlTool.execute_query(
            file_path=dataset.file_path,
            query=req.sql_query,
            file_type=dataset.file_type
        )
        if not res["success"]:
            raise HTTPException(status_code=400, detail=res.get("error", "Query failed."))

        cols = res["columns"]
        rows = res["rows"]
        chart_cfg = VisualizationTool.recommend_chart(cols, rows)
        explanation = f"Executed DuckDB SQL query in {res['execution_time_ms']}ms."

        return AnalyzeResponse(
            operation="sql",
            dataset_id=dataset.id,
            columns=cols,
            rows=rows,
            row_count=len(rows),
            execution_time_ms=res["execution_time_ms"],
            chart_config=chart_cfg,
            explanation=explanation
        )

    # 2. Descriptive Statistics
    elif op == "summary":
        cols = params.get("columns")
        res = PandasAnalyticsTool.descriptive_statistics(
            file_path=dataset.file_path,
            file_type=dataset.file_type,
            columns=cols
        )
        if "error" in res:
            raise HTTPException(status_code=400, detail=res["error"])

        return AnalyzeResponse(
            operation="summary",
            dataset_id=dataset.id,
            columns=res["columns"],
            rows=res["rows"],
            row_count=len(res["rows"]),
            execution_time_ms=res["execution_time_ms"],
            chart_config=None,
            explanation="Computed parametric summary statistics across numeric dimensions."
        )

    # 3. Correlation Matrix
    elif op == "correlation":
        cols = params.get("columns")
        res = PandasAnalyticsTool.correlation_matrix(
            file_path=dataset.file_path,
            file_type=dataset.file_type,
            columns=cols
        )
        if "error" in res:
            raise HTTPException(status_code=400, detail=res["error"])

        return AnalyzeResponse(
            operation="correlation",
            dataset_id=dataset.id,
            columns=res["matrix_columns"],
            rows=res["matrix_rows"],
            row_count=len(res["matrix_rows"]),
            execution_time_ms=res["execution_time_ms"],
            summary_stats={"top_pairs": res["top_correlated_pairs"]},
            explanation="Computed Pearson correlation coefficients across numerical attributes."
        )

    # 4. Group & Aggregate
    elif op == "group_by":
        group_col = params.get("group_by")
        agg_col = params.get("metric")
        agg_func = params.get("function", "sum")
        if not group_col or not agg_col:
            raise HTTPException(status_code=400, detail="Missing 'group_by' or 'metric' parameter.")

        res = PandasAnalyticsTool.group_and_aggregate(
            file_path=dataset.file_path,
            group_by_col=group_col,
            agg_col=agg_col,
            agg_func=agg_func,
            file_type=dataset.file_type
        )
        if "error" in res:
            raise HTTPException(status_code=400, detail=res["error"])

        cols = res["columns"]
        rows = res["rows"]
        chart_cfg = VisualizationTool.recommend_chart(cols, rows)

        return AnalyzeResponse(
            operation="group_by",
            dataset_id=dataset.id,
            columns=cols,
            rows=rows,
            row_count=len(rows),
            execution_time_ms=res["execution_time_ms"],
            chart_config=chart_cfg,
            explanation=f"Aggregated {agg_col} ({agg_func}) by {group_col}."
        )

    # 5. Outlier Detection
    elif op == "outliers":
        col = params.get("column")
        if not col:
            raise HTTPException(status_code=400, detail="Missing 'column' parameter.")

        res = PandasAnalyticsTool.detect_outliers_iqr(
            file_path=dataset.file_path,
            column=col,
            file_type=dataset.file_type
        )
        if "error" in res:
            raise HTTPException(status_code=400, detail=res["error"])

        return AnalyzeResponse(
            operation="outliers",
            dataset_id=dataset.id,
            columns=[col, "status"],
            rows=res["sample_outliers"],
            row_count=res["outlier_count"],
            execution_time_ms=res["execution_time_ms"],
            summary_stats={
                "outlier_count": res["outlier_count"],
                "outlier_percent": res["outlier_percent"],
                "iqr": res["iqr"],
                "lower_bound": res["lower_bound"],
                "upper_bound": res["upper_bound"]
            },
            explanation=f"Identified {res['outlier_count']} outliers ({res['outlier_percent']}%) in {col} using IQR."
        )

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported operation '{op}'.")
