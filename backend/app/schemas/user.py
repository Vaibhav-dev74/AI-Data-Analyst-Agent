from typing import Optional
from pydantic import BaseModel, EmailStr


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None


class UserPasswordChange(BaseModel):
    current_password: str
    new_password: str


class DashboardStats(BaseModel):
    total_datasets: int
    total_analyses: int
    total_reports: int
    total_messages: int
    recent_activity: list
