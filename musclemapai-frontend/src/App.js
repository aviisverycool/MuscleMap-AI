import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "./supabase";
import "./App.css";
import bg from "./background-minimal.png";

// ── Icons ──────────────────────────────────────────────
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

const ChatIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const SettingsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

const LogoutIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

// ── Main App ───────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [authData, setAuthData] = useState({ email: "", password: "" });
  const [authMode, setAuthMode] = useState("signin");

  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [conversationData, setConversationData] = useState({});
  // Track order of conversations for sidebar (newest first)
  const [conversationOrder, setConversationOrder] = useState([]);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationData, loading]);

  // Auth listener
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user || null)
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  // Load conversations from Supabase when user logs in
  useEffect(() => {
    if (!user) {
      setConversationData({});
      setConversationOrder([]);
      setCurrentConversationId(null);
      return;
    }

    async function loadConversations() {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading conversations:", error);
        return;
      }

      if (data && data.length > 0) {
        const formatted = {};
        const order = [];
        data.forEach((c) => {
          formatted[c.id] = { title: c.title, messages: c.messages || [] };
          order.push(c.id);
        });
        setConversationData(formatted);
        setConversationOrder(order);
      }
    }

    loadConversations();
  }, [user]);

  // Save conversation to Supabase
  const saveConversation = useCallback(async (convId, messages, title) => {
    if (!user) return;
    const { error } = await supabase.from("conversations").upsert({
      id: convId,
      user_id: user.id,
      title,
      messages,
      updated_at: new Date().toISOString(),
    });
    if (error) console.error("Error saving conversation:", error);
  }, [user]);

  // Auto-resize textarea
  function handleTextareaChange(e) {
    setMessage(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 180) + "px";
  }

  // New conversation
  function newConversation() {
    const id = crypto.randomUUID();
    const title = "New Chat";
    setConversationData((prev) => ({
      ...prev,
      [id]: { title, messages: [] },
    }));
    setConversationOrder((prev) => [id, ...prev]);
    setCurrentConversationId(id);
  }

  // Generate AI title from first message
  async function generateTitle(firstMessage) {
    try {
      const res = await fetch("http://localhost:8000/title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: firstMessage }),
      });
      const data = await res.json();
      return data.title || "New Chat";
    } catch {
      return "New Chat";
    }
  }

  // Send message
  async function sendMessage() {
    if (!message.trim() || loading) return;
    setLoading(true);

    const userMsg = message;
    setMessage("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    // Auto-create a conversation if none is active
    let convId = currentConversationId;
    if (convId === null) {
      convId = crypto.randomUUID();
      setCurrentConversationId(convId);
      setConversationData((prev) => ({
        ...prev,
        [convId]: { title: "New Chat", messages: [] },
      }));
      setConversationOrder((prev) => [convId, ...prev]);
    }

    // Optimistically add user message
    setConversationData((prev) => ({
      ...prev,
      [convId]: {
        ...prev[convId],
        messages: [
          ...(prev[convId]?.messages ?? []),
          { role: "user", text: userMsg },
        ],
      },
    }));

    try {
      const res = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: convId,
          message: userMsg,
        }),
      });

      const data = await res.json();

      // Build the updated messages array
      setConversationData((prev) => {
        const isFirstMessage = prev[convId].messages.length === 1; // only user msg so far
        const updatedMessages = [
          ...prev[convId].messages,
          { role: "assistant", text: data.message },
        ];

        const updatedConv = {
          ...prev[convId],
          messages: updatedMessages,
        };

        // Generate AI title after first exchange and save
        if (isFirstMessage) {
          generateTitle(userMsg).then((title) => {
            setConversationData((latest) => ({
              ...latest,
              [convId]: { ...latest[convId], title },
            }));
            saveConversation(convId, updatedMessages, title);
          });
        } else {
          saveConversation(convId, updatedMessages, prev[convId].title);
        }

        return { ...prev, [convId]: updatedConv };
      });

    } catch (err) {
      console.error("Frontend → Backend error:", err);
      setConversationData((prev) => {
        const updatedMessages = [
          ...prev[convId].messages,
          { role: "assistant", text: "Sorry, something went wrong. Please try again." },
        ];
        saveConversation(convId, updatedMessages, prev[convId].title);
        return {
          ...prev,
          [convId]: { ...prev[convId], messages: updatedMessages },
        };
      });
    }

    setLoading(false);
  }

  // ── AUTH SCREEN ────────────────────────────────────────
  if (!user) {
    return (
      <div className="page">
        <div className="auth-card">
          <h1>MuscleMap AI</h1>
          <p>{authMode === "signin" ? "Sign in to continue" : "Create your account"}</p>

          <input
            type="email"
            placeholder="Email"
            value={authData.email}
            onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && document.querySelector(".auth-primary")?.click()}
          />

          <input
            type="password"
            placeholder="Password"
            value={authData.password}
            onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && document.querySelector(".auth-primary")?.click()}
          />

          {authMode === "signin" ? (
            <>
              <button
                className="auth-primary"
                onClick={async () => {
                  const { error } = await supabase.auth.signInWithPassword({
                    email: authData.email,
                    password: authData.password,
                  });
                  if (error) alert(error.message);
                }}
              >
                Sign In
              </button>
              <button onClick={() => setAuthMode("signup")}>
                Don't have an account? Sign Up
              </button>
            </>
          ) : (
            <>
              <button
                className="auth-primary"
                onClick={async () => {
                  const { error } = await supabase.auth.signUp({
                    email: authData.email,
                    password: authData.password,
                  });
                  if (error) alert(error.message);
                  else alert("Check your email to verify your account.");
                }}
              >
                Sign Up
              </button>
              <button onClick={() => setAuthMode("signin")}>
                Already have an account? Sign In
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const currentMessages = conversationData[currentConversationId]?.messages ?? [];
  const currentTitle = conversationData[currentConversationId]?.title ?? "MuscleMap AI";

  // ── MAIN APP ───────────────────────────────────────────
  return (
    <div className="layout" style={{ backgroundImage: `url(${bg})` }}>
      {/* ── SIDEBAR ── */}
      <div className="sidebar">
        <div className="sidebar-header">MuscleMap AI</div>

        <button className="new-chat-btn" onClick={newConversation}>
          <PlusIcon /> New Chat
        </button>

        <div className="convo-section-label">Recent</div>

        <div className="conversation-list">
          {conversationOrder.map((id) => {
            const c = conversationData[id];
            if (!c) return null;
            return (
              <div
                key={id}
                className={`conversation-item ${currentConversationId === id ? "active" : ""}`}
                onClick={() => setCurrentConversationId(id)}
              >
                {c.title}
              </div>
            );
          })}
        </div>

        <div className="sidebar-footer">
          <button className="sidebar-btn">
            <SettingsIcon /> Account Settings
          </button>
          <button className="sidebar-btn" onClick={() => supabase.auth.signOut()}>
            <LogoutIcon /> Sign Out
          </button>
        </div>
      </div>

      {/* ── MAIN CHAT ── */}
      <div className="main-chat">
        {/* Top bar */}
        <div className="chat-topbar">{currentTitle}</div>

        {/* Message feed */}
        <div className="response-box">
          {currentMessages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-title">MuscleMap AI</div>
              <div>How can I help you today?</div>
            </div>
          ) : (
            currentMessages.map((m, i) => (
              <div key={i} className={`msg-row ${m.role}`}>
                <div className="msg-inner">
                  {m.role === "assistant" && (
                    <div className="msg-avatar assistant">M</div>
                  )}
                  <div className="msg-bubble">{m.text}</div>
                  {m.role === "user" && (
                    <div className="msg-avatar user">
                      {user.email?.[0]?.toUpperCase() ?? "U"}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="loader-row">
              <div className="loader-inner">
                <div className="msg-avatar assistant">M</div>
                <div className="typing-dots">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="input-area">
          <div>
            <div className="input-bar">
              <textarea
                ref={textareaRef}
                placeholder="Message MuscleMap AI..."
                value={message}
                rows={1}
                onChange={handleTextareaChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <button
                className="send-btn"
                onClick={sendMessage}
                disabled={!message.trim() || loading}
              >
                <SendIcon />
              </button>
            </div>
            <div className="input-hint">
              MuscleMap AI can make mistakes. Verify important info.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}