import json
import re
from typing import Any, Dict
from app.agents.state import AnalystState
from app.agents.llm_provider import LLMProvider


def query_planner_node(state: AnalystState) -> Dict[str, Any]:
    """
    Query Planner Agent: Selects analytical strategy and generates verified DuckDB SQL query.
    """
    question = state["question"]
    profile = state.get("dataset_profile", {})
    columns_overview = profile.get("columns_overview", [])
    intent = state.get("intent", {}) or {}
    ctx = intent.get("context_summary", {}) or {}

    schema_details = [f"{c['name']} ({c['type']})" for c in columns_overview]
    table_name = "dataset"

    prompt = f"""
You are a Staff Data Engineer & Analytics Expert.
Generate an accurate, performant, read-only DuckDB SQL query to answer the user question.

User Question: "{question}"
Target Table Name: {table_name}
Columns Available:
{', '.join(schema_details)}

Context Insights:
- Matched Metrics: {ctx.get('matched_metrics', [])}
- Matched Dimensions: {ctx.get('matched_dimensions', [])}
- Date Column: {ctx.get('date_column')}
- Parsed Intent: {intent.get('intent')}
- Suggested Limit: {intent.get('target_row_limit', 15)}

CRITICAL DUCKDB SQL RULES:
1. ONLY generate a single SELECT query. Never use DROP, INSERT, UPDATE, DELETE, ALTER, or PRAGMA.
2. If column names contain spaces or special characters, wrap them in double quotes like "Column Name".
3. For date grouping, you can use: strftime(CAST("date_col" AS DATE), '%Y-%m') AS month
4. Always aggregate metrics appropriately (e.g., SUM("revenue") AS total_revenue, ROUND(AVG("price"), 2) AS avg_price).
5. Always order results meaningfully (e.g., ORDER BY total_revenue DESC).
6. Always include a reasonable LIMIT clause (e.g., LIMIT 10, or up to 50 for time series).

Return ONLY a valid JSON object with keys:
- "analytical_method": (e.g., "DuckDB SQL Aggregation", "DuckDB Time-Series Window")
- "sql_query": the raw SQL query string
- "explanation": one sentence explaining what this query computes
"""
    system_instruction = "You are a senior SQL architect. Respond with valid JSON only."

    sql_query = None
    analytical_method = "DuckDB SQL Aggregation"
    explanation = "Computing aggregated results from dataset."

    try:
        response_text = LLMProvider.generate_completion(
            prompt=prompt,
            system_instruction=system_instruction,
            json_output=True,
            temperature=0.0
        )
        clean_text = re.sub(r"^```json\s*", "", response_text, flags=re.IGNORECASE)
        clean_text = re.sub(r"^```\s*", "", clean_text)
        clean_text = re.sub(r"```$", "", clean_text).strip()
        parsed = json.loads(clean_text)

        sql_query = parsed.get("sql_query")
        analytical_method = parsed.get("analytical_method", analytical_method)
        explanation = parsed.get("explanation", explanation)
    except Exception:
        pass

    # Heuristic fallback generator if LLM was unavailable or produced invalid output
    if not sql_query or "SELECT" not in sql_query.upper():
        matched_metrics = ctx.get("matched_metrics", [])
        matched_dims = ctx.get("matched_dimensions", [])
        metric_col = f'"{matched_metrics[0]}"' if matched_metrics else "*"
        limit = intent.get("target_row_limit") or 10

        q_intent = intent.get("intent", "aggregation")

        if q_intent == "trend_over_time" and ctx.get("date_column"):
            date_col = f'"{ctx["date_column"]}"'
            m_expr = f'ROUND(SUM({metric_col}), 2) AS total_{matched_metrics[0]}' if matched_metrics else 'COUNT(*) AS record_count'
            sql_query = f"""
            SELECT 
                CAST({date_col} AS VARCHAR) AS period,
                {m_expr}
            FROM {table_name}
            WHERE {date_col} IS NOT NULL
            GROUP BY 1
            ORDER BY 1 ASC
            LIMIT 50
            """.strip()
            analytical_method = "DuckDB Time-Series Trend Analysis"
            explanation = "Aggregating metrics across chronological periods."

        elif matched_dims and matched_metrics:
            dim_col = f'"{matched_dims[0]}"'
            sql_query = f"""
            SELECT 
                {dim_col} AS category,
                ROUND(SUM({metric_col}), 2) AS total_{matched_metrics[0]}
            FROM {table_name}
            WHERE {dim_col} IS NOT NULL
            GROUP BY {dim_col}
            ORDER BY total_{matched_metrics[0]} DESC
            LIMIT {limit}
            """.strip()
            analytical_method = "DuckDB Categorical Aggregation"
            explanation = f"Aggregating {matched_metrics[0]} grouped by {matched_dims[0]}."

        elif matched_metrics:
            sql_query = f"""
            SELECT 
                ROUND(SUM({metric_col}), 2) AS total_{matched_metrics[0]},
                ROUND(AVG({metric_col}), 2) AS avg_{matched_metrics[0]},
                ROUND(MIN({metric_col}), 2) AS min_{matched_metrics[0]},
                ROUND(MAX({metric_col}), 2) AS max_{matched_metrics[0]},
                COUNT(*) AS total_records
            FROM {table_name}
            """.strip()
            analytical_method = "DuckDB Summary Statistics"
            explanation = f"Calculating overall summary metrics for {matched_metrics[0]}."

        else:
            sql_query = f"SELECT * FROM {table_name} LIMIT 20"
            analytical_method = "DuckDB Table Exploration"
            explanation = "Retrieving sample rows from dataset."

    return {
        "query_plan": {
            "analytical_method": analytical_method,
            "explanation": explanation,
        },
        "generated_sql": sql_query
    }
