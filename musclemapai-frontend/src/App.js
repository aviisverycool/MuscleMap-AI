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

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

const EyeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeOffIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

// ── Settings Modal ─────────────────────────────────────
function SettingsModal({ user, onClose, theme, onToggleTheme }) {
  const [activeTab, setActiveTab] = useState("profile");
  const [displayName, setDisplayName] = useState(
    user.user_metadata?.display_name || user.email?.split("@")[0] || ""
  );
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error', msg }
  const [saving, setSaving] = useState(false);

  function showFeedback(type, msg) {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 3500);
  }

  async function saveDisplayName() {
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { display_name: displayName },
    });
    setSaving(false);
    if (error) showFeedback("error", error.message);
    else showFeedback("success", "Display name updated!");
  }

  async function saveEmail() {
    if (!newEmail.trim()) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setSaving(false);
    if (error) showFeedback("error", error.message);
    else showFeedback("success", "Confirmation sent to new email address.");
  }

  async function savePassword() {
    if (newPassword !== confirmPassword) {
      showFeedback("error", "Passwords don't match.");
      return;
    }
    if (newPassword.length < 6) {
      showFeedback("error", "Password must be at least 6 characters.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (error) showFeedback("error", error.message);
    else {
      showFeedback("success", "Password updated!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  async function deleteAccount() {
    if (deleteConfirm !== "DELETE") return;
    setSaving(true);
    // Sign out — actual deletion requires an admin/edge function in production
    await supabase.auth.signOut();
    setSaving(false);
  }

  const tabs = [
    { id: "profile", label: "Profile" },
    { id: "email", label: "Email" },
    { id: "password", label: "Password" },
    { id: "appearance", label: "Appearance" },
    { id: "danger", label: "Danger Zone" },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="settings-header">
          <h2>Account Settings</h2>
          <button className="modal-close-btn" onClick={onClose}><CloseIcon /></button>
        </div>

        <div className="settings-body">
          {/* Tabs */}
          <div className="settings-tabs">
            {tabs.map((t) => (
              <button
                key={t.id}
                className={`settings-tab ${activeTab === t.id ? "active" : ""} ${t.id === "danger" ? "danger-tab" : ""}`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="settings-content">
            {feedback && (
              <div className={`settings-feedback ${feedback.type}`}>
                {feedback.msg}
              </div>
            )}

            {/* PROFILE */}
            {activeTab === "profile" && (
              <div className="settings-section">
                <div className="settings-field-label">Display Name</div>
                <p className="settings-field-hint">This is how your name appears in chats.</p>
                <input
                  className="settings-input"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your display name"
                />
                <div className="settings-field-label" style={{ marginTop: 20 }}>Email</div>
                <input
                  className="settings-input"
                  type="text"
                  value={user.email}
                  disabled
                />
                <button className="settings-save-btn" onClick={saveDisplayName} disabled={saving}>
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            )}

            {/* EMAIL */}
            {activeTab === "email" && (
              <div className="settings-section">
                <div className="settings-field-label">Current Email</div>
                <input className="settings-input" type="text" value={user.email} disabled />
                <div className="settings-field-label" style={{ marginTop: 20 }}>New Email Address</div>
                <p className="settings-field-hint">A confirmation link will be sent to the new address.</p>
                <input
                  className="settings-input"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="new@email.com"
                />
                <button className="settings-save-btn" onClick={saveEmail} disabled={saving || !newEmail.trim()}>
                  {saving ? "Saving…" : "Update Email"}
                </button>
              </div>
            )}

            {/* PASSWORD */}
            {activeTab === "password" && (
              <div className="settings-section">
                <div className="settings-field-label">New Password</div>
                <p className="settings-field-hint">Must be at least 6 characters.</p>
                <div className="pw-field-wrap">
                  <input
                    className="settings-input"
                    type={showNewPw ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password"
                  />
                  <button className="pw-toggle" onClick={() => setShowNewPw((v) => !v)}>
                    {showNewPw ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                <div className="settings-field-label" style={{ marginTop: 16 }}>Confirm Password</div>
                <div className="pw-field-wrap">
                  <input
                    className="settings-input"
                    type={showCurrentPw ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                  <button className="pw-toggle" onClick={() => setShowCurrentPw((v) => !v)}>
                    {showCurrentPw ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                <button
                  className="settings-save-btn"
                  onClick={savePassword}
                  disabled={saving || !newPassword || !confirmPassword}
                >
                  {saving ? "Saving…" : "Update Password"}
                </button>
              </div>
            )}

            {/* APPEARANCE */}
            {activeTab === "appearance" && (
              <div className="settings-section">
                <div className="settings-field-label">Theme</div>
                <p className="settings-field-hint">Choose your preferred color scheme.</p>
                <div className="theme-toggle-row">
                  <button
                    className={`theme-option ${theme === "dark" ? "active" : ""}`}
                    onClick={() => theme !== "dark" && onToggleTheme()}
                  >
                    <MoonIcon />
                    <span>Dark</span>
                  </button>
                  <button
                    className={`theme-option ${theme === "light" ? "active" : ""}`}
                    onClick={() => theme !== "light" && onToggleTheme()}
                  >
                    <SunIcon />
                    <span>Light</span>
                  </button>
                </div>
                <div className="theme-preview">
                  <div className={`preview-card ${theme}`}>
                    <div className="preview-bar" />
                    <div className="preview-line short" />
                    <div className="preview-line" />
                    <div className="preview-line short" />
                  </div>
                </div>
              </div>
            )}

            {/* DANGER ZONE */}
            {activeTab === "danger" && (
              <div className="settings-section">
                <div className="danger-box">
                  <div className="danger-box-title">Delete Account</div>
                  <p className="settings-field-hint" style={{ marginBottom: 16 }}>
                    This action is permanent and cannot be undone. All your conversations and data will be lost.
                  </p>
                  <div className="settings-field-label">Type <strong>DELETE</strong> to confirm</div>
                  <input
                    className="settings-input danger-input"
                    type="text"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder="DELETE"
                  />
                  <button
                    className="settings-delete-btn"
                    onClick={deleteAccount}
                    disabled={deleteConfirm !== "DELETE" || saving}
                  >
                    {saving ? "Deleting…" : "Permanently Delete Account"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [authData, setAuthData] = useState({ email: "", password: "" });
  const [authMode, setAuthMode] = useState("signin");
  const [theme, setTheme] = useState("dark"); // 'dark' | 'light'
  const [showSettings, setShowSettings] = useState(false);

  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [conversationData, setConversationData] = useState({});
  const [conversationOrder, setConversationOrder] = useState([]);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Apply theme to root
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationData, loading]);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user || null)
    );
    return () => listener.subscription.unsubscribe();
  }, []);

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

      if (error) { console.error("Error loading conversations:", error); return; }

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

  function handleTextareaChange(e) {
    setMessage(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 180) + "px";
  }

  function newConversation() {
    const id = crypto.randomUUID();
    const title = "New Chat";
    setConversationData((prev) => ({ ...prev, [id]: { title, messages: [] } }));
    setConversationOrder((prev) => [id, ...prev]);
    setCurrentConversationId(id);
  }

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

  async function sendMessage() {
    if (!message.trim() || loading) return;
    setLoading(true);

    const userMsg = message;
    setMessage("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    let convId = currentConversationId;
    if (convId === null) {
      convId = crypto.randomUUID();
      setCurrentConversationId(convId);
      setConversationData((prev) => ({ ...prev, [convId]: { title: "New Chat", messages: [] } }));
      setConversationOrder((prev) => [convId, ...prev]);
    }

    setConversationData((prev) => ({
      ...prev,
      [convId]: {
        ...prev[convId],
        messages: [...(prev[convId]?.messages ?? []), { role: "user", text: userMsg }],
      },
    }));

    try {
      const res = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: convId, message: userMsg }),
      });
      const data = await res.json();

      setConversationData((prev) => {
        const isFirstMessage = prev[convId].messages.length === 1;
        const updatedMessages = [...prev[convId].messages, { role: "assistant", text: data.message }];
        const updatedConv = { ...prev[convId], messages: updatedMessages };

        if (isFirstMessage) {
          generateTitle(userMsg).then((title) => {
            setConversationData((latest) => ({ ...latest, [convId]: { ...latest[convId], title } }));
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
        const updatedMessages = [...prev[convId].messages, { role: "assistant", text: "Sorry, something went wrong. Please try again." }];
        saveConversation(convId, updatedMessages, prev[convId].title);
        return { ...prev, [convId]: { ...prev[convId], messages: updatedMessages } };
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
              <button className="auth-primary" onClick={async () => {
                const { error } = await supabase.auth.signInWithPassword({ email: authData.email, password: authData.password });
                if (error) alert(error.message);
              }}>Sign In</button>
              <button onClick={() => setAuthMode("signup")}>Don't have an account? Sign Up</button>
            </>
          ) : (
            <>
              <button className="auth-primary" onClick={async () => {
                const { error } = await supabase.auth.signUp({ email: authData.email, password: authData.password });
                if (error) alert(error.message);
                else alert("Check your email to verify your account.");
              }}>Sign Up</button>
              <button onClick={() => setAuthMode("signin")}>Already have an account? Sign In</button>
            </>
          )}
        </div>
      </div>
    );
  }

  const currentMessages = conversationData[currentConversationId]?.messages ?? [];
  const currentTitle = conversationData[currentConversationId]?.title ?? "MuscleMap AI";
  const displayName = user.user_metadata?.display_name || user.email?.[0]?.toUpperCase() || "U";

  // ── MAIN APP ───────────────────────────────────────────
  return (
    <div className="layout" style={{ backgroundImage: `url(${bg})` }}>
      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          user={user}
          onClose={() => setShowSettings(false)}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}

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
          <button className="sidebar-btn theme-sidebar-btn" onClick={toggleTheme}>
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </button>
          <button className="sidebar-btn" onClick={() => setShowSettings(true)}>
            <SettingsIcon /> Account Settings
          </button>
          <button className="sidebar-btn" onClick={() => supabase.auth.signOut()}>
            <LogoutIcon /> Sign Out
          </button>
        </div>
      </div>

      {/* ── MAIN CHAT ── */}
      <div className="main-chat">
        <div className="chat-topbar">{currentTitle}</div>

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
                  {m.role === "assistant" && <div className="msg-avatar assistant">M</div>}
                  <div className="msg-bubble">{m.text}</div>
                  {m.role === "user" && (
                    <div className="msg-avatar user">
                      {user.user_metadata?.display_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
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
                <div className="typing-dots"><span /><span /><span /></div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

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
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                }}
              />
              <button className="send-btn" onClick={sendMessage} disabled={!message.trim() || loading}>
                <SendIcon />
              </button>
            </div>
            <div className="input-hint">MuscleMap AI can make mistakes. Verify important info.</div>
          </div>
        </div>
      </div>
    </div>
  );
}