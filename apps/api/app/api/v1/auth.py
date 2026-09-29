"""Authentication endpoints: login, refresh, me, logout."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.deps import CurrentUser, client_ip, user_permission_codes
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_token,
    verify_password,
)
from app.db import get_db
from app.models import RefreshToken, User
from app.schemas.auth import LoginRequest, TokenResponse, UserOut

router = APIRouter()
settings = get_settings()

REFRESH_COOKIE_NAME = "rgs_refresh_token"
REFRESH_COOKIE_PATH = f"{settings.api_v1_prefix}/auth"

# Login hardening
MAX_FAILED_ATTEMPTS = 10
LOCKOUT_MINUTES = 15


def _cookie_kwargs() -> dict:
    """Cookie options — hardened in production, permissive in dev."""
    is_dev = settings.app_env != "production"
    return {
        "httponly": True,
        "secure": not is_dev,
        "samesite": "lax",
        "path": REFRESH_COOKIE_PATH,
    }


def _serialize_user(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        is_superuser=user.is_superuser,
        must_change_password=user.must_change_password,
        roles=[r.name for r in (user.roles or [])],
        permissions=sorted(user_permission_codes(user)),
    )


async def _issue_tokens(
    user: User,
    response: Response,
    db: AsyncSession,
    request: Request | None = None,
) -> TokenResponse:
    """Create access + refresh tokens, persist the refresh hash, set cookie."""
    access_token, expires_at = create_access_token(user.id)
    refresh_token, _jti, refresh_expires_at = create_refresh_token(user.id)

    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_token(refresh_token),
            expires_at=refresh_expires_at,
            created_at=datetime.now(timezone.utc),
            user_agent=(request.headers.get("user-agent") if request else None),
            ip_address=(client_ip(request) if request else None),
        )
    )
    await db.flush()

    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        expires=refresh_expires_at,
        **_cookie_kwargs(),
    )

    return TokenResponse(access_token=access_token, expires_at=expires_at)


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    user = (
        await db.execute(select(User).where(User.username == payload.username))
    ).scalar_one_or_none()

    generic_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid username or password",
    )

    if user is None:
        raise generic_error

    now = datetime.now(timezone.utc)
    if user.locked_until is not None and user.locked_until > now:
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="Account temporarily locked due to too many failed attempts. Try again later.",
        )

    if not verify_password(payload.password, user.hashed_password):
        user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
        if user.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
            from datetime import timedelta

            user.locked_until = now + timedelta(minutes=LOCKOUT_MINUTES)
        await db.flush()
        raise generic_error

    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not active",
        )

    # Successful login
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login_at = now
    await db.flush()

    return await _issue_tokens(user, response, db, request)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token"
        )

    try:
        payload = decode_token(token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        )

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type"
        )

    token_hash = hash_token(token)
    stored = (
        await db.execute(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        )
    ).scalar_one_or_none()

    if stored is None or stored.revoked_at is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token revoked or unknown",
        )

    if stored.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired"
        )

    user = (
        await db.execute(select(User).where(User.id == stored.user_id))
    ).scalar_one_or_none()

    if user is None or user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User unavailable"
        )

    # Rotate: revoke the old refresh token, issue a fresh one
    stored.revoked_at = datetime.now(timezone.utc)
    await db.flush()

    return await _issue_tokens(user, response, db, request)


@router.get("/me", response_model=UserOut)
async def me(current_user: CurrentUser) -> UserOut:
    return _serialize_user(current_user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    request: Request,
    response: Response,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Revoke all of the caller's refresh tokens and clear the cookie."""
    tokens = (
        await db.execute(
            select(RefreshToken).where(
                RefreshToken.user_id == current_user.id,
                RefreshToken.revoked_at.is_(None),
            )
        )
    ).scalars().all()

    now = datetime.now(timezone.utc)
    for t in tokens:
        t.revoked_at = now

    await db.flush()

    response.delete_cookie(key=REFRESH_COOKIE_NAME, path=REFRESH_COOKIE_PATH)
    return Response(status_code=status.HTTP_204_NO_CONTENT)