import os
import logging
from uuid import UUID

from fastapi import Depends, FastAPI, HTTPException
from starlette.datastructures import MutableHeaders
from starlette.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from models import ChatRequest, ChatResponse, TitleRequest, TitleResponse
from input import (
    API_KEY,
    PROVIDER,
    ask_model,
    delete_session_memory,
    evict_user_memory,
    generate_response,
    load_memory,
    purge_legacy_unscoped_memory,
)
from security import (
    AuthenticatedUser,
    enforce_rate_limit,
    get_current_user,
    scoped_conversation_id,
)
from supabase_store import delete_auth_user, delete_user_data
import uvicorn


logger = logging.getLogger(__name__)
MAX_REQUEST_BODY_BYTES = 32 * 1024


class RequestBodyLimitMiddleware:
    def __init__(self, app, max_bytes):
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope.get("method") not in {"POST", "PUT", "PATCH"}:
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers", []))
        try:
            content_length = int(headers.get(b"content-length", b"0"))
        except ValueError:
            content_length = self.max_bytes + 1
        if content_length > self.max_bytes:
            await JSONResponse(
                {"detail": "Request body is too large"}, status_code=413
            )(scope, receive, send)
            return

        messages = []
        received = 0
        while True:
            message = await receive()
            messages.append(message)
            if message["type"] == "http.disconnect":
                break
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > self.max_bytes:
                    await JSONResponse(
                        {"detail": "Request body is too large"}, status_code=413
                    )(scope, receive, send)
                    return
                if not message.get("more_body", False):
                    break

        async def replay_receive():
            if messages:
                return messages.pop(0)
            return await receive()

        await self.app(scope, replay_receive, send)


class SecurityHeadersMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        async def send_with_security_headers(message):
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                headers["Cache-Control"] = "no-store"
                headers["Cross-Origin-Resource-Policy"] = "same-origin"
                headers["Referrer-Policy"] = "no-referrer"
                headers["X-Content-Type-Options"] = "nosniff"
                headers["X-Frame-Options"] = "DENY"
            await send(message)

        await self.app(scope, receive, send_with_security_headers)


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


app = FastAPI(
    title="Musclemap AI",
    version="1.2.0",
    lifespan=lifespan,
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

app.add_middleware(RequestBodyLimitMiddleware, max_bytes=MAX_REQUEST_BODY_BYTES)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv(
            "ALLOWED_ORIGINS",
            "" if os.getenv("VERCEL") else "http://localhost:3000,http://127.0.0.1:3000",
        ).split(",")
        if origin.strip()
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
app.add_middleware(SecurityHeadersMiddleware)


@app.get("/api")
def root():
    return {"status": "Musclemap AI is running"}


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest, user: AuthenticatedUser = Depends(get_current_user)):
    enforce_rate_limit(user.id, "chat-minute", limit=12, window_seconds=60)
    enforce_rate_limit(user.id, "chat-hour", limit=120, window_seconds=3600)
    session_id = scoped_conversation_id(user.id, str(req.session_id))
    try:
        response = generate_response(req.message, session_id, req.body_part)
        return ChatResponse(message=response)
    except Exception:
        logger.exception("Chat generation failed")
        raise HTTPException(status_code=500, detail="Unable to generate a response")


@app.delete("/api/chat/{session_id}")
def delete_chat_memory(
    session_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
):
    enforce_rate_limit(user.id, "delete-chat-minute", limit=60, window_seconds=60)
    scoped_session_id = scoped_conversation_id(user.id, str(session_id))
    try:
        delete_session_memory(scoped_session_id)
        return {"deleted": True}
    except Exception:
        logger.exception("Conversation memory deletion failed")
        raise HTTPException(status_code=500, detail="Unable to delete conversation memory")


@app.post("/api/title", response_model=TitleResponse)
def generate_title(req: TitleRequest, user: AuthenticatedUser = Depends(get_current_user)):
    enforce_rate_limit(user.id, "title-minute", limit=12, window_seconds=60)
    try:
        prompt = f"""Give this conversation a short 4-6 word title based on the user's first message.
Respond with ONLY the title, no quotes, no punctuation at the end.

User message: {req.message}"""

        # record=False so title generation never pollutes conversation history
        title = ask_model(
            prompt,
            record=False,
            structured=False,
            use_persona=False,
            include_history=False,
            max_tokens=24,
        ).strip().strip('"').strip("'")
        if title.startswith("{"):
            # The model returned an error JSON object (e.g. bad API key)
            return {"title": "New Chat"}
        return {"title": title}
    except Exception as e:
        logger.warning("Title generation failed: %s", type(e).__name__)
        return {"title": "New Chat"}


@app.delete("/api/account")
def delete_account(user: AuthenticatedUser = Depends(get_current_user)):
    enforce_rate_limit(user.id, "delete-account", limit=3, window_seconds=3600)
    if not user.was_recently_authenticated():
        raise HTTPException(status_code=403, detail="Recent reauthentication is required")
    try:
        delete_user_data(user.id)
        evict_user_memory(user.id)
        delete_auth_user(user.id)
        return {"deleted": True}
    except Exception:
        logger.exception("Account deletion failed")
        raise HTTPException(status_code=500, detail="Unable to delete the account")


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=not os.getenv("RENDER"))
