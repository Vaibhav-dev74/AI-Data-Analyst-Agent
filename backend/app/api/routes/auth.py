from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.security import (
    create_access_token, create_refresh_token, decode_token, hash_password, verify_password
)
from app.models import User, UserActivity
from app.schemas.auth import (
    PasswordResetConfirm, PasswordResetRequest, RefreshTokenRequest, TokenResponse,
    UserLogin, UserOut, UserRegister
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    """Registers a new user account with secure password hashing."""
    existing = db.query(User).filter(User.email == user_in.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    user = User(
        email=user_in.email.lower(),
        hashed_password=hash_password(user_in.password),
        full_name=user_in.full_name,
        role="analyst"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Log initial user activity
    activity = UserActivity(
        user_id=user.id,
        action="user_registered",
        details={"email": user.email}
    )
    db.add(activity)
    db.commit()

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserOut.model_validate(user)
    )


@router.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Authenticates user and returns JWT access and refresh tokens."""
    user = db.query(User).filter(User.email == credentials.email.lower()).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Please contact support."
        )

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    # Activity log
    activity = UserActivity(
        user_id=user.id,
        action="user_logged_in",
        details={"client": "web"}
    )
    db.add(activity)
    db.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserOut.model_validate(user)
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(request: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Exchanges a valid refresh token for a fresh access token."""
    payload = decode_token(request.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token."
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive."
        )

    new_access_token = create_access_token(user.id)
    new_refresh_token = create_refresh_token(user.id)

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        user=UserOut.model_validate(user)
    )


@router.get("/me", response_model=UserOut)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Returns the authenticated user's profile."""
    return UserOut.model_validate(current_user)


@router.post("/reset-password-request")
def request_password_reset(payload: PasswordResetRequest, db: Session = Depends(get_db)):
    """Generates password reset token (returns mock token in development)."""
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user:
        # Avoid user enumeration
        return {"message": "If this email is registered, password reset instructions have been sent."}

    reset_token = create_access_token(user.id, expires_delta=timedelta(hours=1))
    return {
        "message": "Password reset token generated.",
        "reset_token": reset_token  # Provided for local dev verification
    }


@router.post("/reset-password-confirm")
def confirm_password_reset(payload: PasswordResetConfirm, db: Session = Depends(get_db)):
    """Resets user password with valid reset token."""
    token_data = decode_token(payload.token)
    if not token_data or token_data.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token."
        )

    user = db.query(User).filter(User.id == token_data.get("sub")).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    user.hashed_password = hash_password(payload.new_password)
    db.commit()

    return {"message": "Password has been successfully updated. You may now log in."}
