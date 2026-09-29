"""Password hashing and JWT token utilities.

Uses `bcrypt` directly (passlib is unmaintained and incompatible with bcrypt 5.x).
Uses `python-jose` for JWT signing/verification.
"""
from __future__ import annotations

import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
from jose import JWTError, jwt

from app.config import get_settings

settings = get_settings()

# bcrypt has a hard 72-byte limit on the input password.
_BCRYPT_MAX_BYTES = 72


# ─────────────────────────────────────────────────────────────────────────
# Password hashing
# ─────────────────────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    """Hash a plaintext password with bcrypt. Returns the bcrypt hash string."""
    pw = password.encode("utf-8")
    if len(pw) > _BCRYPT_MAX_BYTES:
        raise ValueError(
            f"Password is too long ({len(pw)} bytes). "
            f"Maximum is {_BCRYPT_MAX_BYTES} bytes when UTF-8 encoded."
        )
    return bcrypt.hashpw(pw, bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Constant-time verify a plaintext password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except (ValueError, TypeError):
        return False


# ─────────────────────────────────────────────────────────────────────────
# JWT
# ─────────────────────────────────────────────────────────────────────────

def _create_token(
    subject: str | int,
    token_type: str,
    expires_delta: timedelta,
    extra_claims: dict[str, Any] | None = None,
) -> tuple[str, str, datetime]:
    """Create a signed JWT.

    Returns (encoded_token, jti, expires_at).
    """
    now = datetime.now(timezone.utc)
    expires_at = now + expires_delta
    jti = uuid.uuid4().hex

    payload: dict[str, Any] = {
        "sub": str(subject),
        "type": token_type,
        "jti": jti,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    if extra_claims:
        payload.update(extra_claims)

    token = jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)
    return token, jti, expires_at


def create_access_token(
    user_id: int,
    extra_claims: dict[str, Any] | None = None,
) -> tuple[str, datetime]:
    """Create a short-lived access token. Returns (token, expires_at)."""
    token, _jti, expires_at = _create_token(
        subject=user_id,
        token_type="access",
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
        extra_claims=extra_claims,
    )
    return token, expires_at


def create_refresh_token(user_id: int) -> tuple[str, str, datetime]:
    """Create a long-lived refresh token.

    Returns (token, jti, expires_at). Caller is expected to store a hash of
    the token so a leaked DB row cannot be replayed directly.
    """
    return _create_token(
        subject=user_id,
        token_type="refresh",
        expires_delta=timedelta(days=settings.refresh_token_expire_days),
    )


def decode_token(token: str) -> dict[str, Any]:
    """Decode and verify a JWT. Raises JWTError on any failure."""
    return jwt.decode(
        token,
        settings.secret_key,
        algorithms=[settings.algorithm],
    )


def hash_token(token: str) -> str:
    """SHA-256 hex digest of a token (used to store refresh tokens safely)."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def verify_token_hash(token: str, token_hash: str) -> bool:
    """Constant-time compare a token against its stored hash."""
    return hmac.compare_digest(hash_token(token), token_hash)


def generate_opaque_token(nbytes: int = 32) -> str:
    """Generate a random URL-safe token (for password reset, invitations, etc.)."""
    return secrets.token_urlsafe(nbytes)