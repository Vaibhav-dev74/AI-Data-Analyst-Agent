import json
import re
from typing import Any, Dict, List
from app.agents.state import AnalystState
from app.agents.llm_provider import LLMProvider


def insight_generation_node(state: AnalystState) -> Dict[str, Any]:
    """
    Insight Generator Agent: Synthesizes executive findings, contextual explanations,
    and business recommendations strictly grounded in computed data.
    """
    question = state["question"]
    raw_result = state.get("raw_result") or {}
    validation = state.get("validation") or {}
    query_plan = state.get("query_plan") or {}

    if not validation.get("is_valid"):
        err = raw_result.get("error") or "The analysis could not return valid data."
        msg = f"I was unable to complete the analysis for '{question}'. Reason: {err}"
        return {
            "findings": msg,
            "recommendations": ["Refine question parameters or check dataset columns."],
            "final_response": msg
        }

    rows = raw_result.get("rows", [])
    columns = raw_result.get("columns", [])
    sample_rows = rows[:10]  # Grounding context

    prompt = f"""
You are a Principal Business Intelligence Analyst.
Analyze the computed query results below to provide executive insights answering the user's question.

User Question: "{question}"
Analytical Method: {query_plan.get('analytical_method', 'SQL Aggregation')}
Result Schema: {columns}
Computed Data (first {len(sample_rows)} rows):
{json.dumps(sample_rows, indent=2)}

CRITICAL GROUNDING RULES:
1. Every numerical statement, percentage, or rank MUST come directly from the computed data. Never hallucinate or invent numbers.
2. Provide a clear, natural conversational answer to the question first.
3. Highlight key trends, top performers, or notable variations.
4. Provide 2 to 3 actionable business recommendations.

Return ONLY a valid JSON object with keys:
- "answer": direct conversational response to the user's question (2-3 sentences)
- "key_findings": bulleted or paragraph summary of primary findings grounded in numbers
- "anomalies": any observed skew or concentration of values
- "recommendations": list of 2-3 specific business recommendations
"""
    system_instruction = "You are an executive BI advisor. Respond with valid JSON only. Ground all statements in provided data."

    answer = None
    findings = None
    recommendations = []

    try:
        response_text = LLMProvider.generate_completion(
            prompt=prompt,
            system_instruction=system_instruction,
            json_output=True,
            temperature=0.1
        )
        clean_text = re.sub(r"^```json\s*", "", response_text, flags=re.IGNORECASE)
        clean_text = re.sub(r"^```\s*", "", clean_text)
        clean_text = re.sub(r"```$", "", clean_text).strip()
        parsed = json.loads(clean_text)

        answer = parsed.get("answer")
        findings = parsed.get("key_findings")
        recommendations = parsed.get("recommendations", [])
    except Exception:
        pass

    # Grounded fallback synthesizer
    if not answer or not findings:
        first_row = rows[0] if rows else {}
        row_count = len(rows)

        # Grounded summary from actual row values
        summary_points = []
        for k, v in first_row.items():
            if isinstance(v, (int, float)):
                summary_points.append(f"{k.replace('_', ' ').title()}: {v:,.2f}" if isinstance(v, float) else f"{k.replace('_', ' ').title()}: {v:,}")
            else:
                summary_points.append(f"Top {k.replace('_', ' ').title()}: {v}")

        metrics_str = ", ".join(summary_points[:4]) if summary_points else "successful query execution"

        answer = f"Based on the analysis of {row_count} records in your dataset, the results show {metrics_str}."
        findings = f"Key observation: {metrics_str}. The top ranked record represents the primary driver in this segment."

        recommendations = [
            "Leverage the top-performing categories identified in this analysis to guide resource allocation.",
            "Monitor lower-performing segments to identify bottlenecks or emerging opportunities."
        ]

    final_response = f"{answer}\n\n**Key Findings:**\n{findings}"

    return {
        "findings": findings,
        "recommendations": recommendations,
        "final_response": final_response
    }
