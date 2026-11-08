from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.security import hash_password, verify_password
from app.models import AnalysisSession, ChatMessage, Dataset, GeneratedReport, User, UserActivity
from app.schemas.auth import UserOut
from app.schemas.user import DashboardStats, UserPasswordChange, UserProfileUpdate

router = APIRouter(prefix="/users", tags=["Users & Dashboard"])


@router.get("/profile", response_model=UserOut)
def get_profile(current_user: User = Depends(get_current_user)):
    """Returns the authenticated user's account details."""
    return UserOut.model_validate(current_user)


@router.patch("/profile", response_model=UserOut)
def update_profile(
    updates: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Updates user full name or email address."""
    if updates.full_name:
        current_user.full_name = updates.full_name
    if updates.email:
        existing = db.query(User).filter(User.email == updates.email.lower(), User.id != current_user.id).first()
        if existing:
            raise HTTPException(status_code=400, detail="This email is already in use by another account.")
        current_user.email = updates.email.lower()

    db.commit()
    db.refresh(current_user)
    return UserOut.model_validate(current_user)


@router.post("/change-password")
def change_password(
    payload: UserPasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Updates account password after verifying the existing password."""
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password verification failed.")

    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password changed successfully."}


@router.get("/dashboard-stats", response_model=DashboardStats)
def get_dashboard_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Calculates live KPI metrics and recent audit trail activities for the user dashboard."""
    total_datasets = db.query(Dataset).filter(Dataset.user_id == current_user.id).count()
    total_analyses = db.query(AnalysisSession).filter(AnalysisSession.user_id == current_user.id).count()
    total_reports = db.query(GeneratedReport).filter(GeneratedReport.user_id == current_user.id).count()

    # Total chat messages
    total_messages = (
        db.query(ChatMessage)
        .join(AnalysisSession, ChatMessage.session_id == AnalysisSession.id)
        .filter(AnalysisSession.user_id == current_user.id)
        .count()
    )

    # Recent activities
    activities = (
        db.query(UserActivity)
        .filter(UserActivity.user_id == current_user.id)
        .order_by(UserActivity.created_at.desc())
        .limit(8)
        .all()
    )

    activity_list = [
        {
            "id": a.id,
            "action": a.action,
            "details": a.details,
            "timestamp": a.created_at.isoformat()
        }
        for a in activities
    ]

    return DashboardStats(
        total_datasets=total_datasets,
        total_analyses=total_analyses,
        total_reports=total_reports,
        total_messages=total_messages,
        recent_activity=activity_list
    )
