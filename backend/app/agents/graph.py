import logging
from typing import Any, Dict
from langgraph.graph import StateGraph, START, END

from app.agents.state import AnalystState
from app.agents.nodes.understanding import question_understanding_node
from app.agents.nodes.context_analyzer import context_analyzer_node
from app.agents.nodes.planner import query_planner_node
from app.agents.nodes.executor import execution_node
from app.agents.nodes.validator import validation_node
from app.agents.nodes.visualizer import visualization_node
from app.agents.nodes.insight_generator import insight_generation_node

logger = logging.getLogger(__name__)


def build_analyst_graph():
    """
    Constructs and compiles the end-to-end multi-agent LangGraph workflow:
    Understanding -> Context Analysis -> Query Planning -> Execution -> Validation -> Visualization -> Insight Generation.
    """
    workflow = StateGraph(AnalystState)

    # Register agent nodes
    workflow.add_node("understanding", question_understanding_node)
    workflow.add_node("context_analyzer", context_analyzer_node)
    workflow.add_node("planner", query_planner_node)
    workflow.add_node("executor", execution_node)
    workflow.add_node("validator", validation_node)
    workflow.add_node("visualizer", visualization_node)
    workflow.add_node("insight_generator", insight_generation_node)

    # Establish linear agent topology
    workflow.add_edge(START, "understanding")
    workflow.add_edge("understanding", "context_analyzer")
    workflow.add_edge("context_analyzer", "planner")
    workflow.add_edge("planner", "executor")
    workflow.add_edge("executor", "validator")
    workflow.add_edge("validator", "visualizer")
    workflow.add_edge("visualizer", "insight_generator")
    workflow.add_edge("insight_generator", END)

    app = workflow.compile()
    return app


# Compiled global graph instance
analyst_graph = build_analyst_graph()


def run_analyst_agent(
    question: str,
    dataset_id: str,
    file_path: str,
    file_type: str,
    dataset_profile: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Executes the multi-agent graph on input state and returns the aggregated output.
    """
    initial_state: AnalystState = {
        "question": question,
        "dataset_id": dataset_id,
        "file_path": file_path,
        "file_type": file_type,
        "dataset_profile": dataset_profile,
        "intent": None,
        "query_plan": None,
        "generated_sql": None,
        "raw_result": None,
        "validation": None,
        "chart_config": None,
        "findings": None,
        "recommendations": None,
        "final_response": None,
        "error": None
    }

    try:
        final_state = analyst_graph.invoke(initial_state)
        return final_state
    except Exception as e:
        logger.exception("Agent graph execution failed.")
        return {
            "question": question,
            "final_response": f"An error occurred during agent execution: {str(e)}",
            "findings": None,
            "recommendations": [],
            "generated_sql": None,
            "chart_config": None,
            "raw_result": {"success": False, "error": str(e), "rows": [], "columns": []},
            "error": str(e)
        }
