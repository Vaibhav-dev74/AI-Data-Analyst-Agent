import os
import re
import time
from typing import Any, Dict, List, Optional
import duckdb
import pandas as pd
import sqlparse
from sqlparse.sql import Statement


class SQLSecurityError(Exception):
    """Raised when a query violates security policies."""
    pass


class DuckDBSqlTool:
    """
    Secure sandboxed DuckDB query execution engine.
    Ensures that only read-only analytical queries (SELECT, WITH) are executed against
    the isolated registered dataset.
    """

    FORBIDDEN_KEYWORDS = {
        "DROP", "DELETE", "INSERT", "UPDATE", "ALTER", "CREATE", "TRUNCATE",
        "REPLACE", "EXEC", "EXECUTE", "PRAGMA", "ATTACH", "DETACH", "COPY",
        "EXPORT", "IMPORT", "INSTALL", "LOAD", "SYSTEM", "SHUTDOWN", "CALL",
        "CHECKPOINT", "VACUUM"
    }

    @classmethod
    def validate_sql(cls, query: str) -> str:
        """
        Validates the SQL query against strict read-only allowlists.
        Throws SQLSecurityError if suspicious or prohibited operations are detected.
        """
        clean_query = query.strip()
        # Remove markdown code block fences if present
        clean_query = re.sub(r"^```sql\s*", "", clean_query, flags=re.IGNORECASE)
        clean_query = re.sub(r"^```\s*", "", clean_query)
        clean_query = re.sub(r"```$", "", clean_query).strip()

        # Remove trailing semicolons
        clean_query = re.sub(r";+\s*$", "", clean_query)

        if not clean_query:
            raise SQLSecurityError("Empty query provided.")

        parsed = sqlparse.parse(clean_query)
        if len(parsed) != 1:
            raise SQLSecurityError("Multiple SQL statements in a single execution are prohibited.")

        stmt: Statement = parsed[0]
        stmt_type = stmt.get_type().upper()

        if stmt_type not in ("SELECT", "UNKNOWN"):
            raise SQLSecurityError(f"Prohibited SQL statement type '{stmt_type}'. Only SELECT queries are permitted.")

        # Check upper tokens against forbidden keywords
        upper_query = clean_query.upper()
        tokens = re.findall(r"\b[A-Z_]+\b", upper_query)
        for token in tokens:
            if token in cls.FORBIDDEN_KEYWORDS:
                raise SQLSecurityError(f"Security restriction: keyword '{token}' is strictly forbidden.")

        # Ensure reasonable LIMIT is set
        if not re.search(r"\bLIMIT\s+\d+", upper_query):
            clean_query = f"{clean_query} LIMIT 500"

        return clean_query

    @classmethod
    def execute_query(
        cls,
        file_path: str,
        query: str,
        file_type: str = "csv"
    ) -> Dict[str, Any]:
        """
        Executes a safe read-only query against a dataset file by registering it as 'dataset' and 'data'.
        """
        start_time = time.time()
        try:
            validated_query = cls.validate_sql(query)
        except SQLSecurityError as se:
            return {
                "success": False,
                "columns": [],
                "rows": [],
                "row_count": 0,
                "execution_time_ms": round((time.time() - start_time) * 1000, 2),
                "query": query,
                "error": f"Security Violation: {str(se)}"
            }

        con = duckdb.connect(database=":memory:", read_only=False)
        try:
            normalized_path = file_path.replace("\\", "/")

            if file_type.lower() == "csv":
                con.execute(f"CREATE VIEW dataset AS SELECT * FROM read_csv_auto('{normalized_path}', header=True, sample_size=200000, ignore_errors=true);")
            elif file_type.lower() in ("xlsx", "xls"):
                # Read via pandas and register directly in DuckDB
                excel_df = pd.read_excel(file_path)
                con.register("dataset", excel_df)
            else:
                con.execute(f"CREATE VIEW dataset AS SELECT * FROM read_csv_auto('{normalized_path}', ignore_errors=true);")

            con.execute("CREATE VIEW data AS SELECT * FROM dataset;")

            # Execute validated query
            result_df = con.execute(validated_query).fetchdf()

            execution_time = round((time.time() - start_time) * 1000, 2)

            # Replace NaNs/Infs for valid JSON serialization
            result_df = result_df.where(pd.notnull(result_df), None)

            columns = list(result_df.columns)
            # Normalize timestamp and object columns
            for col in columns:
                if "datetime" in str(result_df[col].dtype).lower() or "date" in str(result_df[col].dtype).lower():
                    result_df[col] = result_df[col].astype(str)

            rows = result_df.to_dict(orient="records")

            return {
                "success": True,
                "columns": columns,
                "rows": rows,
                "row_count": len(rows),
                "execution_time_ms": execution_time,
                "query": validated_query,
                "error": None
            }
        except Exception as e:
            return {
                "success": False,
                "columns": [],
                "rows": [],
                "row_count": 0,
                "execution_time_ms": round((time.time() - start_time) * 1000, 2),
                "query": query,
                "error": f"SQL Execution Error: {str(e)}"
            }
        finally:
            con.close()
