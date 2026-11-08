import json
import re
from typing import Any, Dict
from app.agents.state import AnalystState
from app.agents.llm_provider import LLMProvider


def question_understanding_node(state: AnalystState) -> Dict[str, Any]:
    """
    Analyzes natural language question, extracts analytical intent, target metrics,
    dimensions, and temporal or categorical filters.
    """
    question = state["question"]
    columns_overview = state.get("dataset_profile", {}).get("columns_overview", [])
    col_names = [c["name"] for c in columns_overview]

    prompt = f"""
You are an expert Data Analyst Agent. Analyze the user question relative to the dataset schema.

User Question: "{question}"
Available Columns: {col_names}

Extract:
1. intent: (e.g., "top_n", "trend_over_time", "aggregation_sum_avg", "distribution", "correlation", "filter_lookup")
2. metrics: list of relevant numeric metric names mentioned or implied (e.g., revenue, sales, profit, quantity)
3. dimensions: list of categorical or date dimensions (e.g., product, category, region, month, customer)
4. filters: any conditions or date ranges (e.g., "last 6 months", "status = completed")
5. target_row_limit: integer limit if specified or implied (e.g., 5 for "top 5")

Return ONLY a valid JSON object with keys: intent, metrics, dimensions, filters, target_row_limit.
"""
    system_instruction = "You are a senior data analyst specializing in semantic intent parsing. Always respond with pure valid JSON."
    
    intent_data = None
    try:
        response_text = LLMProvider.generate_completion(
            prompt=prompt,
            system_instruction=system_instruction,
            json_output=True,
            temperature=0.0
        )
        # Parse JSON
        clean_text = re.sub(r"^```json\s*", "", response_text, flags=re.IGNORECASE)
        clean_text = re.sub(r"^```\s*", "", clean_text)
        clean_text = re.sub(r"```$", "", clean_text).strip()
        intent_data = json.loads(clean_text)
    except Exception:
        # Fallback heuristic parser
        q_lower = question.lower()
        limit_match = re.search(r"\btop\s+(\d+)\b", q_lower)
        target_limit = int(limit_match.group(1)) if limit_match else 10

        intent = "aggregation_sum_avg"
        if "top" in q_lower:
            intent = "top_n"
        elif any(w in q_lower for w in ["trend", "monthly", "yearly", "over time", "by month"]):
            intent = "trend_over_time"
        elif "correlation" in q_lower:
            intent = "correlation"
        elif "distribution" in q_lower or "outlier" in q_lower:
            intent = "distribution"

        intent_data = {
            "intent": intent,
            "metrics": [],
            "dimensions": [],
            "filters": [],
            "target_row_limit": target_limit
        }

    return {"intent": intent_data}
