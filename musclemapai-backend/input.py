import requests
import os
import json
import re
from dotenv import load_dotenv
from supabase_store import load_profile, save_profile, load_history, save_history, load_state, save_state, clear_state
load_dotenv()

# ====== SETUP ======
CEREBRAS_URL = "https://api.cerebras.ai/v1/chat/completions"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
CEREBRAS_API_KEY = os.getenv("CEREBRAS_API_KEY")

# Accept a Groq key placed in the project's former Cerebras-only variable so
# existing local deployments keep working while they migrate the variable name.
if not GROQ_API_KEY and CEREBRAS_API_KEY and CEREBRAS_API_KEY.startswith("gsk_"):
    GROQ_API_KEY = CEREBRAS_API_KEY
    CEREBRAS_API_KEY = None

if GROQ_API_KEY:
    PROVIDER = "Groq"
    API_URL = GROQ_URL
    API_KEY = GROQ_API_KEY
    MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b").strip() or "openai/gpt-oss-120b"
    reasoning_setting = os.getenv("GROQ_REASONING_EFFORT", "medium")
else:
    PROVIDER = "Cerebras"
    API_URL = CEREBRAS_URL
    API_KEY = CEREBRAS_API_KEY
    MODEL = os.getenv("CEREBRAS_MODEL", "gpt-oss-120b").strip() or "gpt-oss-120b"
    reasoning_setting = os.getenv("CEREBRAS_REASONING_EFFORT", "medium")

REASONING_EFFORT = reasoning_setting.strip().lower()
if REASONING_EFFORT not in {"low", "medium", "high"}:
    REASONING_EFFORT = "medium"

FITNESS_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "intro": {"type": "string"},
        "stretches": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "step": {"type": "integer"},
                    "name": {"type": "string"},
                    "text": {"type": "string"},
                },
                "required": ["step", "name", "text"],
                "additionalProperties": False,
            },
        },
        "advice": {"type": "string"},
        "question": {"type": "string"},
    },
    "required": ["intro", "stretches", "advice", "question"],
    "additionalProperties": False,
}

# ====== MEMORY FILE ======
MEMORY_FILE = "memory.json"

# ====== MEMORY (per-session; keyed by conversation id) ======
chat_history = {}    # session_id -> list of messages
last_context = {}    # session_id -> pending follow-up question
last_request = {}    # session_id -> user's original request awaiting an answer

user_profile = {
    "goals": [],
    "injuries": [],
    "preferences": []
}

# ====== LOAD/SAVE MEMORY ======
KNOWN_PROFILE_KEYS = ("goals", "injuries", "preferences")

def load_memory():
    global user_profile
    profile = load_profile()
    if profile is None:
        profile = {}
        if os.path.exists(MEMORY_FILE):
            try:
                with open(MEMORY_FILE, "r") as f:
                    profile = json.load(f)
            except Exception:
                profile = {}

    if not isinstance(profile, dict):
        profile = {}

    # Only keep known keys and guarantee they are lists, so stale or
    # corrupted memory files can never crash update_user_profile or leak
    # junk into the LLM prompt.
    user_profile = {
        key: (profile[key] if isinstance(profile.get(key), list) else [])
        for key in KNOWN_PROFILE_KEYS
    }


def save_memory():
    try:
        save_profile(user_profile)
    except Exception as e:
        print(f"Warning: could not save memory to Supabase: {e}")
    try:
        with open(MEMORY_FILE, "w") as f:
            json.dump(user_profile, f)
    except Exception as e:
        print(f"Warning: could not save memory: {e}")

# ====== PROFILE UPDATE ======
def update_user_profile(text):
    t = text.lower()
    changed = False

    negated = bool(re.search(r"\b(?:don'?t|do not|not|never|hate|avoid|no)\b", t))

    if re.search(r"\b(?:run|running|jog|jogging)\b", t) and not negated and "running" not in user_profile["goals"]:
        user_profile["goals"].append("running")
        changed = True

    if re.search(r"\bknee pain\b", t) and not negated and "knee" not in user_profile["injuries"]:
        user_profile["injuries"].append("knee")
        changed = True

    if re.search(r"\b5[- ]?10\b", t) and not negated and "short workouts" not in user_profile["preferences"]:
        user_profile["preferences"].append("short workouts")
        changed = True

    if changed:
        save_memory()

# ====== CASUAL ======
GREETINGS = {"hi", "hello", "hey", "howdy", "sup", "yo", "hiya"}


def get_casual_reply(text):
    t = text.lower().strip()
    t_clean = re.sub(r"[^\w\s]", "", t)
    words = t_clean.split()

    if len(words) <= 3 and any(w in GREETINGS for w in words):
        return "Hey! I'm Musclemap AI — your fitness assistant. Ask me about stretches, workouts, or diet plans!"

    return None

# ====== PLAN DETECTION ======
DURATION_PLAN_KEYWORDS = [
    "diet plan", "meal plan", "nutrition plan",
    "fitness plan", "workout plan", "exercise plan",
    "training plan", "health plan", "routine"
]


def needs_duration(text):
    t = text.lower()
    has_plan_kw = any(kw in t for kw in DURATION_PLAN_KEYWORDS)
    has_number = bool(re.search(r'\b\d+\s*(day|week|month)', t))
    return has_plan_kw and not has_number

# ====== STRICT JSON VALIDATION ======
def _as_str(value):
    return value if isinstance(value, str) else ""

def validate_json_structure(data):
    required_keys = {"intro", "stretches", "advice", "question"}

    if not isinstance(data, dict):
        return False

    # Require at least the required keys (allow the LLM to add bonus keys
    # instead of failing the whole response).
    if not required_keys.issubset(data.keys()):
        return False

    # String fields must actually be strings (LLMs sometimes emit null)
    for key in ("intro", "advice", "question"):
        if not isinstance(data[key], str):
            return False

    if not isinstance(data["stretches"], list):
        return False

    for item in data["stretches"]:
        if not isinstance(item, dict):
            return False
        if not all(k in item for k in ("step", "name", "text")):
            return False
        if not isinstance(item["name"], str) or not isinstance(item["text"], str):
            return False

    return True

# ====== MAIN LOGIC ======
def _get_history(session_id):
    if session_id not in chat_history:
        stored = load_history(session_id)
        chat_history[session_id] = stored if stored is not None else []
    return chat_history[session_id]


def _load_state(session_id):
    if session_id in last_context or session_id in last_request:
        return
    state = load_state(session_id)
    if state:
        last_context[session_id] = state["context"]
        last_request[session_id] = state["request"]


def _set_state(session_id, question, request):
    last_context[session_id] = question
    last_request[session_id] = request
    try:
        save_state(session_id, question, request)
    except Exception as e:
        print(f"Warning: could not save state to Supabase: {e}")


def _clear_state(session_id):
    last_context.pop(session_id, None)
    last_request.pop(session_id, None)
    try:
        clear_state(session_id)
    except Exception as e:
        print(f"Warning: could not clear state in Supabase: {e}")


def generate_response(text, session_id="default", body_part=None):
    update_user_profile(text)

    casual = get_casual_reply(text)
    if casual:
        # A greeting changes the subject — drop any pending follow-up
        # question so it can't hijack the user's next real message.
        _clear_state(session_id)
        return casual

    _load_state(session_id)
    pending = last_context.get(session_id)
    if pending:
        combined = f"{last_request.get(session_id)} for {text}"
        raw = safe_model_call(build_prompt(combined, body_part), session_id)
        _clear_state(session_id)
        return format_response(raw)

    if needs_duration(text):
        question = "How many days would you like the plan to cover?"
        _set_state(session_id, question, text)
        return question

    raw = safe_model_call(build_prompt(text, body_part), session_id)

    try:
        data = json.loads(raw)
        question = _as_str(data.get("question")).strip()
        if question:
            _set_state(session_id, question, text)
    except:
        pass

    return format_response(raw)

# ====== PROMPT BUILDER ======
def build_prompt(user_text, body_part=None):
    profile_block = f"User profile: {json.dumps(user_profile)}"
    selected_body_part = body_part.strip()[:80] if isinstance(body_part, str) else ""
    body_context_block = (
        f"Selected body area from the body map: {json.dumps(selected_body_part)}"
        if selected_body_part
        else "Selected body area from the body map: none"
    )

    return f"""
You must output ONLY valid JSON. No text before or after.

STRICT SCHEMA:
{{
  "intro": string,
  "stretches": [
    {{"step": integer, "name": string, "text": string}}
  ],
  "advice": string,
  "question": string
}}

HARD RULES:
- ALL required keys MUST exist.
- Do not include keys that are not listed in the schema.
- NEVER output text outside JSON
- stretches must ALWAYS be a list (can be empty [])
- question must ALWAYS exist ("" if none)
- If the user describes a specific muscle or pain location, always address that exact location
- Never recommend stretches that could worsen acute injuries
- If pain sounds serious (sharp, sudden, radiating), advise seeing a professional

BEHAVIOR RULES:
- Do NOT ask for clarification if you can infer intent
- Always try to answer first
- Keep responses concise and useful
- You specialize in fitness, but you can also create travel health plans and wellness advice when relevant
- Make sure stretches are relevant to the prompt that the user gives, do not generalize the stretches.
- Stretches must target the EXACT muscle or body part the user mentions
- If the user says "lower back," every stretch must address the lower back specifically, not general back health
- If the user says "tight hamstrings after running," stretches must account for post-running muscle state, not just hamstrings in isolation
- Never recommend a stretch unless it directly addresses the user's specific complaint

{profile_block}
{body_context_block}

User request: {user_text}

Use Markdown formatting for readability when helpful. You may include bullet lists and markdown tables inside JSON string values.
ONLY OUTPUT JSON.
"""

# ====== SAFE MODEL CALL (RETRY) ======
def safe_model_call(prompt, session_id="default", retries=3):
    for attempt in range(retries):
        # Only record the final attempt so failed retries don't pollute history
        raw = ask_model(prompt, session_id, record=(attempt == retries - 1))
        try:
            data = json.loads(raw)
            if validate_json_structure(data):
                return raw
        except:
            pass

        prompt += "\nREMEMBER: OUTPUT MUST BE VALID JSON ONLY."

    return '{"intro":"Error formatting response","stretches":[],"advice":"Please try again.","question":""}'

# ====== API CALL =====
def ask_model(prompt, session_id="default", record=True, structured=True):
    if not API_KEY:
        print("ERROR: GROQ_API_KEY or CEREBRAS_API_KEY not set in .env")
        return json.dumps({
            "intro": "API Error: no AI provider key is configured",
            "stretches": [],
            "advice": "Add GROQ_API_KEY to musclemapai-backend/.env",
            "question": "",
        })

    history = _get_history(session_id)
    messages = history[-10:] + [{"role": "user", "content": prompt}]

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

    data = {
        "model": MODEL,
        "messages": messages,
        "temperature": 0,
        "max_tokens": 4000
    }

    if MODEL.endswith("gpt-oss-120b"):
        data["reasoning_effort"] = REASONING_EFFORT

    if structured:
        data["response_format"] = {
            "type": "json_schema",
            "json_schema": {
                "name": "fitness_response",
                "strict": True,
                "schema": FITNESS_RESPONSE_SCHEMA,
            },
        }

    try:
        response = requests.post(API_URL, headers=headers, json=data, timeout=60)
    except requests.RequestException as e:
        print(f"API request failed: {e}")
        return json.dumps({
            "intro": f"API Error: could not reach {PROVIDER}",
            "stretches": [],
            "advice": "Check your network connection",
            "question": "",
        })

    if response.status_code != 200:
        detail = "Unknown error"
        try:
            error_data = response.json()
            detail = error_data.get("message")
            if not detail and isinstance(error_data.get("error"), dict):
                detail = error_data["error"].get("message")
            detail = detail or response.text
        except Exception:
            detail = response.text
        print(f"{PROVIDER} API Error {response.status_code}: {detail}")
        return json.dumps({
            "intro": f"API Error ({response.status_code}): {detail}",
            "stretches": [],
            "advice": "Check connection",
            "question": "",
        })

    response_text = response.json()["choices"][0]["message"]["content"].strip()

    if record:
        history.append({"role": "user", "content": prompt})
        history.append({"role": "assistant", "content": response_text})
        # Bound the in-memory history to avoid unbounded growth
        if len(history) > 30:
            del history[: len(history) - 30]
        try:
            save_history(session_id, history)
        except Exception as e:
            print(f"Warning: could not save history to Supabase: {e}")

    return response_text

# ====== FORMAT OUTPUT ======
def format_response(raw):
    try:
        data = json.loads(raw)
    except Exception:
        return "[Formatting error]\n" + raw

    intro = _as_str(data.get("intro")).strip()
    stretches = data.get("stretches", [])
    advice = _as_str(data.get("advice")).strip()
    question = _as_str(data.get("question")).strip()

    output = []

    if intro:
        output.append(intro)

    if stretches:
        output.append("")
        for s in stretches:
            if isinstance(s, dict):
                output.append(f"* {_as_str(s.get('name'))}: {_as_str(s.get('text'))}")

    if advice:
        output.append("")
        output.append(advice)

    if question:
        output.append("")
        output.append(question)

    return "\n".join(output)

# ====== MAIN LOOP ======
def main():
    print("\nMusclemap-AI")
    print("Type 'exit' to quit")

    if not API_KEY:
        print("ERROR: API key not found.")
        return

    load_memory()

    while True:
        user_input = input("> ").strip()

        if user_input.lower() in ("exit", "quit"):
            break

        if user_input:
            response = generate_response(user_input)
            print("\n" + response + "\n")
            save_memory()

if __name__ == "__main__":
    main()
