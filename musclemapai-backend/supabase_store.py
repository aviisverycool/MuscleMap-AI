import os
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "") or os.getenv("SUPABASE_ANON_KEY", "")
ENABLED = bool(SUPABASE_URL and SUPABASE_KEY)

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
