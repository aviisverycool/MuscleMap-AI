import requests
import os
import json
import re
from dotenv import load_dotenv
load_dotenv()

# ====== SETUP ======
CEREBRAS_URL = "https://api.cerebras.ai/v1/chat/completions"
MODEL = "llama3.1-8b"
API_KEY = os.getenv("CEREBRAS_API_KEY")

# ====== MEMORY FILE ======
MEMORY_FILE = "memory.json"

# ====== MEMORY ======
chat_history = []
last_context = None
last_request = None

user_profile = {
    "goals": [],
    "injuries": [],
    "preferences": []
}

# ====== LOAD/SAVE MEMORY ======
def load_memory():
    global user_profile
    if os.path.exists(MEMORY_FILE):
        try:
            with open(MEMORY_FILE, "r") as f:
                user_profile = json.load(f)
        except:
            pass


def save_memory():
    with open(MEMORY_FILE, "w") as f:
        json.dump(user_profile, f)

# ====== PROFILE UPDATE ======
def update_user_profile(text):
    t = text.lower()

    if "run" in t and "running" not in user_profile["goals"]:
        user_profile["goals"].append("running")

    if "knee pain" in t and "knee" not in user_profile["injuries"]:
        user_profile["injuries"].append("knee")

    if ("5-10" in t or "5 to 10" in t) and "short workouts" not in user_profile["preferences"]:
        user_profile["preferences"].append("short workouts")

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
    has_number = bool(re.search(r'\\b\\d+\\s*(day|week|month)', t))
    return has_plan_kw and not has_number

# ====== STRICT JSON VALIDATION ======
def validate_json_structure(data):
    required_keys = {"intro", "stretches", "advice", "question"}

    if not isinstance(data, dict):
        return False

    if set(data.keys()) != required_keys:
        return False

    if not isinstance(data["stretches"], list):
        return False

    for item in data["stretches"]:
        if not all(k in item for k in ("step", "name", "text")):
            return False

    return True

# ====== MAIN LOGIC ======
def generate_response(text):
    global last_context, last_request

    update_user_profile(text)

    casual = get_casual_reply(text)
    if casual:
        return casual

    if last_context:
        combined = f"{last_request} for {text}"
        raw = safe_model_call(build_prompt(combined))
        last_context = None
        last_request = None
        return format_response(raw)

    if needs_duration(text):
        question = "How many days would you like the plan to cover?"
        last_context = question
        last_request = text
        return question

    raw = safe_model_call(build_prompt(text))

    try:
        data = json.loads(raw)
        question = data.get("question", "").strip()
        if question:
            last_context = question
            last_request = text
    except:
        pass

    return format_response(raw)

# ====== PROMPT BUILDER ======
def build_prompt(user_text):
    profile_block = f"User profile: {json.dumps(user_profile)}"

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
- ALL 4 keys MUST exist
- NEVER add extra keys
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

User request: {user_text}

ONLY OUTPUT JSON.
"""

# ====== SAFE MODEL CALL (RETRY) ======
def safe_model_call(prompt, retries=3):
    for _ in range(retries):
        raw = ask_model(prompt)
        try:
            data = json.loads(raw)
            if validate_json_structure(data):
                return raw
        except:
            pass

        prompt += "\nREMEMBER: OUTPUT MUST BE VALID JSON ONLY."

    return '{"intro":"Error formatting response","stretches":[],"advice":"Please try again.","question":""}'

# ====== API CALL ======
def ask_model(prompt):
    global chat_history

    messages = chat_history[-10:] + [
        {"role": "user", "content": prompt}
    ]

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

    data = {
        "model": MODEL,
        "messages": messages,
        "temperature": 0,
        "max_tokens": 2200
    }

    response = requests.post(CEREBRAS_URL, headers=headers, json=data)

    if response.status_code != 200:
        return '{"intro":"API Error","stretches":[],"advice":"Check connection","question":""}'

    response_text = response.json()["choices"][0]["message"]["content"].strip()

    chat_history.append({"role": "user", "content": prompt})
    chat_history.append({"role": "assistant", "content": response_text})

    return response_text

# ====== FORMAT OUTPUT ======
def format_response(raw):
    try:
        data = json.loads(raw)
    except Exception:
        return "[Formatting error]\n" + raw

    intro = data.get("intro", "").strip()
    stretches = data.get("stretches", [])
    advice = data.get("advice", "").strip()
    question = data.get("question", "").strip()

    output = []

    if intro:
        output.append(intro)

    if stretches:
        output.append("")
        for s in stretches:
            output.append(f"* {s['name']}: {s['text']}")  # ← only line that changed

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
