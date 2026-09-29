"""Auth-related Pydantic schemas."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=64)
    password: str = Field(..., min_length=1, max_length=128)


class TokenResponse(BaseModel):
    """Returned by /auth/login and /auth/refresh.

    The refresh token itself is delivered as an httpOnly cookie and is
    NOT present in this response body.
    """

    access_token: str
    token_type: str = "bearer"
    expires_at: datetime


class UserOut(BaseModel):
    """Safe representation of a user — never exposes the password hash."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str | None
    full_name: str
    is_superuser: bool
    must_change_password: bool
    roles: list[str]
    permissions: list[str]


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=128)
    new_password: str = Field(..., min_length=8, max_length=72)