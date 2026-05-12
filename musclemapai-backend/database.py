import json
import os

DB_FILE = "memory.json"

def load_db():
    if not os.path.exists(DB_FILE):
        return {}
    with open(DB_FILE, "r") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return {}

def save_db(data):
    with open(DB_FILE, "w") as f:
        json.dump(data, f, indent=4)

def get_profile(session_id):
    db = load_db()
    return db.get(session_id, {})

def save_profile(session_id, profile):
    db = load_db()
    db[session_id] = profile
    save_db(db)