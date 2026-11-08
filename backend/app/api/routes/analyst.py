import os
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.agents.graph import run_analyst_agent
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models import AnalysisResult, AnalysisSession, ChatMessage, Dataset, User, UserActivity
from app.schemas.chat import (
    AnalysisResultOut, ChartConfig, ChatRequest, MessageOut, SessionDetail, SessionSummary
)

router = APIRouter(prefix="/analyst", tags=["AI Analyst Agent"])


@router.post("/chat", response_model=MessageOut)
def chat_with_agent(
    req: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Submits a natural language query to the LangGraph autonomous analyst agent.
    Performs question understanding, schema contextualization, query planning,
    safe DuckDB SQL execution, validation, visualization generation, and insight synthesis.
    """
    dataset = db.query(Dataset).filter(Dataset.id == req.dataset_id, Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found or access denied.")

    if not os.path.exists(dataset.file_path):
        raise HTTPException(status_code=404, detail="Underlying dataset file is missing from storage.")

    # 1. Manage or create session
    session = None
    if req.session_id:
        session = db.query(AnalysisSession).filter(
            AnalysisSession.id == req.session_id,
            AnalysisSession.user_id == current_user.id
        ).first()

    if not session:
        # Generate session title from prompt
        title_snippet = req.message[:40] + ("..." if len(req.message) > 40 else "")
        session = AnalysisSession(
            user_id=current_user.id,
            dataset_id=dataset.id,
            title=title_snippet
        )
        db.add(session)
        db.commit()
        db.refresh(session)

    # 2. Record User Message
    user_msg = ChatMessage(
        session_id=session.id,
        role="user",
        content=req.message
    )
    db.add(user_msg)
    db.commit()

    # 3. Execute LangGraph Agent
    agent_output = run_analyst_agent(
        question=req.message,
        dataset_id=dataset.id,
        file_path=dataset.file_path,
        file_type=dataset.file_type,
        dataset_profile=dataset.metadata_profile or {}
    )

    final_text = agent_output.get("final_response") or "Analysis completed successfully."
    generated_sql = agent_output.get("generated_sql")
    query_plan = agent_output.get("query_plan") or {}
    analytical_method = query_plan.get("analytical_method", "DuckDB Analytical Engine")
    chart_cfg = agent_output.get("chart_config")
    raw_res = agent_output.get("raw_result") or {}
    findings = agent_output.get("findings")
    recommendations = agent_output.get("recommendations", [])

    # 4. Record Assistant Message
    assistant_msg = ChatMessage(
        session_id=session.id,
        role="assistant",
        content=final_text,
        chart_config=chart_cfg,
        query_sql=generated_sql,
        analytical_method=analytical_method
    )
    db.add(assistant_msg)
    db.commit()
    db.refresh(assistant_msg)

    # 5. Record Analysis Result Details
    analysis_res = AnalysisResult(
        message_id=assistant_msg.id,
        raw_data=raw_res.get("rows", []),
        summary_metrics={
            "row_count": raw_res.get("row_count", 0),
            "execution_time_ms": raw_res.get("execution_time_ms", 0.0),
            "columns": raw_res.get("columns", [])
        },
        findings=findings,
        recommendations=recommendations
    )
    db.add(analysis_res)

    # Log activity
    db.add(UserActivity(
        user_id=current_user.id,
        action="ran_query",
        details={"session_id": session.id, "dataset_id": dataset.id, "query_type": analytical_method}
    ))
    db.commit()
    db.refresh(assistant_msg)

    # Convert to schema
    result_out = AnalysisResultOut(
        raw_data=analysis_res.raw_data,
        summary_metrics=analysis_res.summary_metrics,
        findings=analysis_res.findings,
        recommendations=analysis_res.recommendations
    )

    chart_out = ChartConfig(**chart_cfg) if chart_cfg else None

    return MessageOut(
        id=assistant_msg.id,
        role=assistant_msg.role,
        content=assistant_msg.content,
        chart_config=chart_out,
        query_sql=assistant_msg.query_sql,
        analytical_method=assistant_msg.analytical_method,
        result=result_out,
        created_at=assistant_msg.created_at
    )


@router.get("/history", response_model=List[SessionSummary])
def get_user_chat_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves all conversation sessions for the current user."""
    sessions = (
        db.query(AnalysisSession)
        .filter(AnalysisSession.user_id == current_user.id)
        .order_by(AnalysisSession.updated_at.desc())
        .all()
    )

    summaries = []
    for s in sessions:
        ds = db.query(Dataset).filter(Dataset.id == s.dataset_id).first()
        msg_count = db.query(ChatMessage).filter(ChatMessage.session_id == s.id).count()
        summaries.append(SessionSummary(
            id=s.id,
            title=s.title,
            dataset_id=s.dataset_id,
            dataset_name=ds.name if ds else "Unknown Dataset",
            message_count=msg_count,
            created_at=s.created_at,
            updated_at=s.updated_at
        ))
    return summaries


@router.get("/sessions/{session_id}", response_model=SessionDetail)
def get_session_details(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves full conversation transcript with charts, tables, and SQL metadata."""
    session = db.query(AnalysisSession).filter(
        AnalysisSession.id == session_id,
        AnalysisSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Analysis session not found.")

    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )

    msg_outs = []
    for m in messages:
        res_out = None
        if m.result:
            res_out = AnalysisResultOut(
                raw_data=m.result.raw_data,
                summary_metrics=m.result.summary_metrics,
                findings=m.result.findings,
                recommendations=m.result.recommendations
            )
        chart_out = ChartConfig(**m.chart_config) if m.chart_config else None
        msg_outs.append(MessageOut(
            id=m.id,
            role=m.role,
            content=m.content,
            chart_config=chart_out,
            query_sql=m.query_sql,
            analytical_method=m.analytical_method,
            result=res_out,
            created_at=m.created_at
        ))

    return SessionDetail(
        id=session.id,
        title=session.title,
        dataset_id=session.dataset_id,
        created_at=session.created_at,
        updated_at=session.updated_at,
        messages=msg_outs
    )


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Deletes an analysis session and associated messages."""
    session = db.query(AnalysisSession).filter(
        AnalysisSession.id == session_id,
        AnalysisSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    db.delete(session)
    db.commit()
    return None
