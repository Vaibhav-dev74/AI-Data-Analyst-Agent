import json
import math
import numpy as np
import pandas as pd

from app.core.config import Settings
from app.core.json_utils import sanitize_for_json
from app.tools.sql_tool import DuckDBSqlTool
from app.tools.visualization_tool import VisualizationTool


def test_settings_production_normalization():
    s1 = Settings(
        DATABASE_URL='"postgres://user:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres"',
        CORS_ORIGINS='["https://app.vercel.app", "http://localhost:5173"]',
        GEMINI_API_KEY="  'AIzaFakeKey123'  ",
    )
    assert s1.DATABASE_URL == "postgresql://user:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
    assert s1.cors_origins_list == ["https://app.vercel.app", "http://localhost:5173"]
    assert s1.GEMINI_API_KEY == "AIzaFakeKey123"

    s2 = Settings(
        DATABASE_URL="",
        CORS_ORIGINS="https://one.vercel.app, https://two.vercel.app",
    )
    assert s2.DATABASE_URL == "sqlite:///./insightiq.db"
    assert s2.cors_origins_list == ["https://one.vercel.app", "https://two.vercel.app"]


def test_strict_json_sanitization_with_nan_inf():
    payload = {
        "rows": [
            {"a": 1.5, "b": float("nan"), "c": float("inf")},
            {"a": np.int64(42), "b": np.float64(np.nan), "c": np.bool_(True)},
        ]
    }
    clean = sanitize_for_json(payload)
    # Must serialize cleanly under strict RFC 8259 allow_nan=False (PostgreSQL JSON compliant)
    dumped = json.dumps(clean, allow_nan=False)
    assert '"b": null' in dumped
    assert '"c": null' in dumped
    assert '"a": 42' in dumped


def test_nan_csv_preview_and_sql_execution(authenticated_client, tmp_path):
    csv_file = tmp_path / "messy_metrics.csv"
    df = pd.DataFrame({
        "region": ["North", "South", "East", "West"],
        "revenue": [100.5, np.nan, 250.0, 175.25],
        "units": [10, 5, np.nan, 12],
    })
    df.to_csv(csv_file, index=False)

    with open(csv_file, "rb") as f:
        up = authenticated_client.post(
            "/api/datasets/upload",
            files={"file": ("messy_metrics.csv", f, "text/csv")},
        )
    assert up.status_code == 201
    dataset_id = up.json()["id"]

    # Preview with float64 NaNs must return valid RFC 8259 JSON
    prev = authenticated_client.get(f"/api/datasets/{dataset_id}/preview")
    assert prev.status_code == 200
    rows = prev.json()["rows"]
    assert rows[1]["revenue"] is None

    # Analytics SQL query with NULL float cell must succeed and serialize without NaN errors
    sql_res = authenticated_client.post("/api/analytics/analyze", json={
        "dataset_id": dataset_id,
        "operation": "sql",
        "sql_query": "SELECT region, revenue FROM dataset ORDER BY region",
    })
    assert sql_res.status_code == 200
    sql_rows = sql_res.json()["rows"]
    json.dumps(sql_rows, allow_nan=False)


def test_visualization_tool_handles_leading_nulls():
    cols = ["category", "revenue"]
    rows = [
        {"category": "Unknown", "revenue": None},
        {"category": "Hardware", "revenue": 4200.0},
        {"category": "Software", "revenue": 6800.0},
    ]
    chart = VisualizationTool.recommend_chart(cols, rows, question="Revenue by category")
    assert chart is not None
    assert chart["y_axis"] == "revenue"
    assert chart["x_axis"] == "category"
