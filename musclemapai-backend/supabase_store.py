import os
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
SERVICE_ROLE_ENABLED = bool(SUPABASE_URL and SUPABASE_KEY)
ENABLED = SERVICE_ROLE_ENABLED

PROFILE_TABLE = "backend_profile"
HISTORY_TABLE = "backend_history"
STATE_TABLE = "backend_state"

if not ENABLED:
    print("WARNING: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set. Falling back to local files.")


def _headers():
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }


def _fetch(table, column, value):
    try:
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/{table}",
            params={"select": "*", column: f"eq.{value}"},
            headers=_headers(),
            timeout=10,
        )
        if r.status_code != 200:
            print(f"Supabase fetch error {r.status_code}: {r.text[:200]}")
            return None
        rows = r.json()
        return rows[0] if rows else None
    except Exception as e:
        print(f"Supabase fetch failed: {e}")
        return None


def _upsert(table, payload):
    try:
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/{table}",
            headers={**_headers(), "Prefer": "resolution=merge-duplicates,return=minimal"},
            json=payload,
            timeout=10,
        )
        if r.status_code not in (200, 201, 204):
            print(f"Supabase upsert error {r.status_code}: {r.text[:200]}")
    except Exception as e:
        print(f"Supabase upsert failed: {e}")


def _delete(table, column, value):
    if not ENABLED:
        return True
    try:
        r = requests.delete(
            f"{SUPABASE_URL}/rest/v1/{table}",
            params={column: f"eq.{value}"},
            headers=_headers(),
            timeout=10,
        )
        if r.status_code not in (200, 204):
            print(f"Supabase delete error {r.status_code}: {r.text[:200]}")
            return False
        return True
    except Exception as e:
        print(f"Supabase delete failed: {e}")
        return False


def _delete_filter(table, column, expression):
    if not ENABLED:
        return False
    try:
        response = requests.delete(
            f"{SUPABASE_URL}/rest/v1/{table}",
            params={column: expression},
            headers={**_headers(), "Prefer": "return=minimal"},
            timeout=10,
        )
        if response.status_code not in (200, 204):
            print(f"Supabase delete error {response.status_code}: {response.text[:200]}")
            return False
        return True
    except Exception as e:
        print(f"Supabase delete failed: {e}")
        return False


def consume_rate_limit(key, limit, window_seconds):
    if not SERVICE_ROLE_ENABLED:
        raise RuntimeError("Shared rate limiting is not configured")
    try:
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/consume_backend_rate_limit",
            headers=_headers(),
            json={
                "p_key": key,
                "p_limit": limit,
                "p_window_seconds": window_seconds,
            },
            timeout=10,
        )
        if response.status_code != 200:
            raise RuntimeError(f"Rate limiter returned status {response.status_code}")
        rows = response.json()
        if not isinstance(rows, list) or not rows or not isinstance(rows[0], dict):
            raise RuntimeError("Rate limiter returned an invalid response")
        return bool(rows[0].get("allowed")), max(0, int(rows[0].get("retry_after", 0)))
    except (requests.RequestException, TypeError, ValueError) as exc:
        raise RuntimeError("Shared rate limiter request failed") from exc


def delete_user_data(user_id):
    """Delete frontend and backend data before removing the auth account."""
    if not SERVICE_ROLE_ENABLED:
        raise RuntimeError("Supabase service role is not configured")

    scoped_prefix = f"{user_id}:*"
    deletions = (
        ("conversations", "user_id", f"eq.{user_id}"),
        (PROFILE_TABLE, "id", f"like.{scoped_prefix}"),
        (HISTORY_TABLE, "session_id", f"like.{scoped_prefix}"),
        (STATE_TABLE, "session_id", f"like.{scoped_prefix}"),
        ("backend_rate_limit", "rate_key", f"like.{scoped_prefix}"),
    )
    failed = [
        table
        for table, column, expression in deletions
        if not _delete_filter(table, column, expression)
    ]
    if failed:
        raise RuntimeError(f"Could not delete user data from: {', '.join(failed)}")


def delete_auth_user(user_id):
    if not SERVICE_ROLE_ENABLED:
        raise RuntimeError("Supabase service role is not configured")
    try:
        response = requests.delete(
            f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}",
            headers=_headers(),
            timeout=10,
        )
    except requests.RequestException as exc:
        raise RuntimeError("Could not reach the authentication service") from exc
    if response.status_code not in (200, 204):
        raise RuntimeError(f"Authentication service returned status {response.status_code}")


# ====== USER PROFILE ======
def load_profile(session_id):
    if not ENABLED:
        return None
    row = _fetch(PROFILE_TABLE, "id", session_id)
    if not row:
        return {}
    return row.get("data") if isinstance(row.get("data"), dict) else {}


def save_profile(session_id, profile):
    if not ENABLED:
        return
    _upsert(PROFILE_TABLE, {"id": session_id, "data": profile})


def clear_profile(session_id):
    return _delete(PROFILE_TABLE, "id", session_id)


# ====== CHAT HISTORY ======
def load_history(session_id):
    if not ENABLED:
        return None
    row = _fetch(HISTORY_TABLE, "session_id", session_id)
    if not row:
        return None
    messages = row.get("messages")
    return messages if isinstance(messages, list) else None


def save_history(session_id, messages):
    if not ENABLED:
        return
    _upsert(HISTORY_TABLE, {"session_id": session_id, "messages": messages})


def clear_history(session_id):
    return _delete(HISTORY_TABLE, "session_id", session_id)


# ====== PENDING STATE (follow-up question) ======
def load_state(session_id):
    if not ENABLED:
        return None
    row = _fetch(STATE_TABLE, "session_id", session_id)
    if not row:
        return None
    return {"context": row.get("context"), "request": row.get("request")}


def save_state(session_id, context, request):
    if not ENABLED:
        return
    _upsert(STATE_TABLE, {"session_id": session_id, "context": context, "request": request})


def clear_state(session_id):
    return _delete(STATE_TABLE, "session_id", session_id)
