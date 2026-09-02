import logging
import os
import threading
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from uuid import UUID

import requests
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from supabase_store import SERVICE_ROLE_ENABLED, consume_rate_limit


logger = logging.getLogger(__name__)
bearer_scheme = HTTPBearer(auto_error=False)

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
SUPABASE_AUTH_KEY = (
    os.getenv("SUPABASE_PUBLISHABLE_KEY", "").strip()
    or os.getenv("SUPABASE_ANON_KEY", "").strip()
    or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
)
IS_PRODUCTION = os.getenv("VERCEL") == "1" or os.getenv("APP_ENV", "").lower() == "production"


@dataclass(frozen=True)
class AuthenticatedUser:
    id: str
    email: str | None = None
    last_sign_in_at: datetime | None = None

    def was_recently_authenticated(self, max_age_minutes=5) -> bool:
        if self.last_sign_in_at is None:
            return False
        return self.last_sign_in_at >= datetime.now(timezone.utc) - timedelta(
            minutes=max_age_minutes
        )


def _parse_supabase_datetime(value):
    if not isinstance(value, str):
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> AuthenticatedUser:
    """Validate a Supabase access token without trusting browser-supplied IDs."""
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not SUPABASE_URL or not SUPABASE_AUTH_KEY:
        logger.error("Supabase authentication is not configured")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is unavailable",
        )

    try:
        response = requests.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={
                "apikey": SUPABASE_AUTH_KEY,
                "Authorization": f"Bearer {credentials.credentials}",
            },
            timeout=10,
        )
    except requests.RequestException:
        logger.exception("Supabase token validation failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is unavailable",
        )

    if response.status_code in {401, 403}:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if response.status_code != 200:
        logger.error("Supabase token validation returned status %s", response.status_code)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is unavailable",
        )

    try:
        payload = response.json()
        user_id = str(UUID(str(payload["id"])))
    except (KeyError, TypeError, ValueError):
        logger.error("Supabase token validation returned an invalid user payload")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is unavailable",
        )

    return AuthenticatedUser(
        id=user_id,
        email=payload.get("email"),
        last_sign_in_at=_parse_supabase_datetime(payload.get("last_sign_in_at")),
    )


def scoped_conversation_id(user_id: str, conversation_id: str) -> str:
    """Create a server-owned storage key that cannot cross user boundaries."""
    return f"{user_id}:{conversation_id}"


_local_rate_limits: dict[str, tuple[float, int]] = {}
_local_rate_limit_lock = threading.Lock()


def _consume_local_rate_limit(key: str, limit: int, window_seconds: int) -> tuple[bool, int]:
    """Development fallback. Production uses the shared Supabase limiter."""
    now = time.monotonic()
    with _local_rate_limit_lock:
        window_start, count = _local_rate_limits.get(key, (now, 0))
        if now - window_start >= window_seconds:
            window_start, count = now, 0
        if count >= limit:
            retry_after = max(1, int(window_seconds - (now - window_start)) + 1)
            return False, retry_after
        _local_rate_limits[key] = (window_start, count + 1)
    return True, 0


def enforce_rate_limit(
    user_id: str,
    bucket: str,
    *,
    limit: int,
    window_seconds: int,
) -> None:
    key = f"{user_id}:{bucket}"
    if SERVICE_ROLE_ENABLED:
        try:
            allowed, retry_after = consume_rate_limit(key, limit, window_seconds)
        except RuntimeError:
            logger.exception("Shared rate limiter failed")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Request protection is temporarily unavailable",
            )
    elif IS_PRODUCTION:
        logger.error("Shared rate limiting is not configured in production")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Request protection is temporarily unavailable",
        )
    else:
        allowed, retry_after = _consume_local_rate_limit(key, limit, window_seconds)

    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please try again shortly.",
            headers={"Retry-After": str(retry_after)},
        )
