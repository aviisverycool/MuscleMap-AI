import os
from uuid import UUID
from fastapi import FastAPI, HTTPException
from starlette.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from models import ChatRequest, ChatResponse, TitleRequest, TitleResponse
from input import (
    API_KEY,
    PROVIDER,
    ask_model,
    delete_session_memory,
    generate_response,
    load_memory,
    purge_legacy_unscoped_memory,
)
import uvicorn

@asynccontextmanager
async def lifespan(app: FastAPI):
    load_memory()
    try:
        purge_legacy_unscoped_memory()
    except Exception as e:
        print(f"Warning: could not purge legacy unscoped memory: {e}")
    if not API_KEY:
        print("ERROR: no AI provider key found in .env!")
    else:
        print(f"Using {PROVIDER} for AI responses")
    yield

app = FastAPI(title="Musclemap AI", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _conversation_id(value):
    try:
        return str(UUID(str(value)))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid conversation id")

@app.get("/api")
def root():
    return {"status": "Musclemap AI is running"}

@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    session_id = _conversation_id(req.session_id)
    try:
        response = generate_response(req.message, session_id, req.body_part)
        return ChatResponse(message=response)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/chat/{session_id}")
def delete_chat_memory(session_id: str):
    session_id = _conversation_id(session_id)
    try:
        delete_session_memory(session_id)
        return {"deleted": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/title", response_model=TitleResponse)
def generate_title(req: TitleRequest):
    try:
        prompt = f"""Give this conversation a short 4-6 word title based on the user's first message.
Respond with ONLY the title, no quotes, no punctuation at the end.

User message: {req.message}"""

        # record=False so title generation never pollutes conversation history
        title = ask_model(prompt, record=False, structured=False).strip().strip('"').strip("'")
        if title.startswith("{"):
            # The model returned an error JSON object (e.g. bad API key)
            return {"title": "New Chat"}
        return {"title": title}
    except Exception as e:
        return {"title": "New Chat"}

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=not os.getenv("RENDER"))
