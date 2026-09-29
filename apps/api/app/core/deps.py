"""Shared FastAPI dependencies: current user, permission checks."""
from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token
from app.db import get_db
from app.models import User

bearer_scheme = HTTPBearer(auto_error=False)

_UNAUTHENTICATED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Not authenticated",
    headers={"WWW-Authenticate": "Bearer"},
)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """Decode the bearer token and load the user. Raises 401 on any failure."""
    if credentials is None or not credentials.credentials:
        raise _UNAUTHENTICATED

    try:
        payload = decode_token(credentials.credentials)
    except JWTError:
        raise _UNAUTHENTICATED

    if payload.get("type") != "access":
        raise _UNAUTHENTICATED

    sub = payload.get("sub")
    if sub is None:
        raise _UNAUTHENTICATED

    try:
        user_id = int(sub)
    except (TypeError, ValueError):
        raise _UNAUTHENTICATED

    user = (
        await db.execute(select(User).where(User.id == user_id))
    ).scalar_one_or_none()

    if user is None:
        raise _UNAUTHENTICATED

    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not active",
        )

    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


async def get_current_superuser(user: CurrentUser) -> User:
    if not user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superuser privileges required",
        )
    return user


CurrentSuperuser = Annotated[User, Depends(get_current_superuser)]


def user_permission_codes(user: User) -> set[str]:
    """Collect all permission codes granted to the user via their roles."""
    codes: set[str] = set()
    for role in user.roles or []:
        for perm in role.permissions or []:
            codes.add(perm.code)
    return codes


def require_permission(code: str):
    """Dependency factory: rejects the request if the user lacks the permission.

    Superusers always pass. Usage:

        @router.get("/x")
        async def x(user: User = Depends(require_permission("students.view"))):
            ...
    """

    async def _checker(user: CurrentUser) -> User:
        if user.is_superuser:
            return user
        if code not in user_permission_codes(user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing required permission: {code}",
            )
        return user

    return _checker


def client_ip(request: Request) -> str | None:
    """Best-effort client IP for audit logs."""
    if request.client is None:
        return None
    return request.client.host