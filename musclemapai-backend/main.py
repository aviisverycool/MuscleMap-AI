import os
from fastapi import FastAPI, HTTPException
from starlette.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from models import ChatRequest, ChatResponse, TitleRequest, TitleResponse
from input import generate_response, load_memory, API_KEY, PROVIDER, ask_model
import uvicorn

@asynccontextmanager
async def lifespan(app: FastAPI):
    load_memory()
    if not API_KEY:
        print("ERROR: GROQ_API_KEY or CEREBRAS_API_KEY not found in .env!")
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

@app.get("/api")
def root():
    return {"status": "Musclemap AI is running"}

@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    try:
        response = generate_response(req.message, req.session_id, req.body_part)
        return ChatResponse(message=response)
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
