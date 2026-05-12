from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from models import ChatRequest, ChatResponse
from input import generate_response, load_memory, API_KEY
import uvicorn

@asynccontextmanager
async def lifespan(app: FastAPI):
    load_memory()
    if not API_KEY:
        print("ERROR: CEREBRAS_API_KEY not found in .env!")
    yield

app = FastAPI(title="Musclemap AI", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "Musclemap AI is running"}

@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    try:
        response = generate_response(req.message)
        return ChatResponse(message=response)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)