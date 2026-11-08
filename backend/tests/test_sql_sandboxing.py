import pytest
from app.tools.sql_tool import DuckDBSqlTool, SQLSecurityError


def test_sql_validation_allowlist():
    valid_query = "SELECT product_name, SUM(revenue) FROM dataset GROUP BY product_name"
    validated = DuckDBSqlTool.validate_sql(valid_query)
    assert "LIMIT" in validated
    assert "SELECT" in validated


def test_sql_validation_blocks_destructive_keywords():
    destructive_queries = [
        "DROP TABLE dataset",
        "DELETE FROM dataset WHERE 1=1",
        "INSERT INTO dataset VALUES (1, 'hack')",
        "UPDATE dataset SET revenue = 0",
        "ALTER TABLE dataset DROP COLUMN revenue",
        "PRAGMA version",
        "SELECT * FROM dataset; DROP TABLE dataset"
    ]
    for q in destructive_queries:
        with pytest.raises(SQLSecurityError):
            DuckDBSqlTool.validate_sql(q)


def test_duckdb_execution_on_csv():
    res = DuckDBSqlTool.execute_query(
        file_path="sample_datasets/sales_data.csv",
        query="SELECT region, SUM(revenue) as total_rev FROM dataset GROUP BY region ORDER BY total_rev DESC",
        file_type="csv"
    )
    assert res["success"] is True
    assert len(res["rows"]) > 0
    assert "region" in res["columns"]
    assert "total_rev" in res["columns"]
    assert res["execution_time_ms"] > 0
