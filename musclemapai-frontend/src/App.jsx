import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getAuthRedirectUrl, supabase } from "./supabase";
import "./App.css";
import bg from "./background-minimal.png";
import BodyMap3D from "./components/BodyMap3D";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? "/api" : "http://localhost:8000/api");
const TITLE_STOP_WORDS = new Set([
  "a", "an", "and", "are", "about", "can", "could", "do", "for", "how",
  "i", "is", "me", "my", "of", "please", "tell", "the", "to", "what",
  "would", "you",
]);

function fallbackConversationTitle(message) {
  const words = message.match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)?/g) || [];
  const meaningful = words.filter((word) => !TITLE_STOP_WORDS.has(word.toLowerCase()));
  const selected = (meaningful.length ? meaningful : words).slice(0, 6);
  if (!selected.length) return "New Chat";
  return selected
    .map((word) => (word === word.toUpperCase() ? word : word[0].toUpperCase() + word.slice(1)))
    .join(" ");
}

async function authenticatedApiFetch(path, options = {}) {
  const { data, error } = await supabase.auth.getSession();
  const accessToken = data?.session?.access_token;
  if (error || !accessToken) throw new Error("Your session has expired. Please sign in again.");

  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${accessToken}`);
  return fetch(`${API_BASE_URL}${path}`, { ...options, headers });
}

async function apiErrorMessage(response, fallback) {
  try {
    const payload = await response.json();
    return typeof payload?.detail === "string" ? payload.detail : fallback;
  } catch {
    return fallback;
  }
}

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

const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

const PencilIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const MenuIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="18" x2="20" y2="18" />
  </svg>
);

const CollapseSidebarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <line x1="9" y1="4" x2="9" y2="20" />
    <polyline points="14 9 11 12 14 15" />
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

function renderMarkdown(text) {
  if (!text) return null;

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        table({ children }) {
          return (
            <div className="markdown-table-wrapper">
              <table>{children}</table>
            </div>
          );
        },
        a({ href, children }) {
          return <a href={href} target="_blank" rel="noreferrer">{children}</a>;
        },
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

function TypewriterText({ text, animate, onComplete, onProgress }) {
  const [visibleLength, setVisibleLength] = useState(animate ? 0 : text.length);
  const onCompleteRef = useRef(onComplete);
  const onProgressRef = useRef(onProgress);

  onCompleteRef.current = onComplete;
  onProgressRef.current = onProgress;

  useEffect(() => {
    if (!animate) {
      setVisibleLength(text.length);
      return undefined;
    }

    let position = 0;
    let ticks = 0;
    let timeoutId;
    const charactersPerTick = Math.max(4, Math.ceil(text.length / 160));

    setVisibleLength(0);

    const revealNext = () => {
      position = Math.min(position + charactersPerTick, text.length);
      ticks += 1;
      setVisibleLength(position);

      if (ticks % 8 === 0 || position === text.length) {
        onProgressRef.current?.();
      }

      if (position < text.length) {
        timeoutId = window.setTimeout(revealNext, 10);
      } else {
        onCompleteRef.current?.();
      }
    };

    timeoutId = window.setTimeout(revealNext, 60);
    return () => window.clearTimeout(timeoutId);
  }, [animate, text]);

  return renderMarkdown(text.slice(0, visibleLength));
}

const SCOPE_REDIRECTS = [
  "I'm focused on fitness, movement, recovery, nutrition, and general wellness. Ask me about a workout, body area, injury-safe exercise, or health goal.",
  "I'm focused on health, fitness, nutrition, recovery, and wellbeing. Ask me a health or fitness question.",
];

function cleanAssistantText(text, previousMessage) {
  if (typeof text !== "string") return "";

  let cleaned = text;
  for (const redirect of SCOPE_REDIRECTS) {
    cleaned = cleaned.replace(redirect, "").trim();
  }

  if (cleaned) return cleaned;

  const previousText = previousMessage?.role === "user"
    ? previousMessage.text.toLowerCase().replace(/[^\w\s]/g, "").trim()
    : "";
  if (["what is my name", "whats my name", "do you know my name"].includes(previousText)) {
    return "I don't know your name unless you tell me — and I won't guess or make one up.";
  }

  // Keep a genuine standalone redirect for other unrelated requests.
  return text;
}

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
  const [displayName, setDisplayName] = useState(
    user.user_metadata?.display_name || user.email?.split("@")[0] || ""
  );
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
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
    const { error } = await supabase.auth.updateUser(
      { email: newEmail },
      { emailRedirectTo: getAuthRedirectUrl() }
    );
    setSaving(false);
    if (error) showFeedback("error", error.message);
    else showFeedback("success", "Confirmation sent to new email address.");
  }

  async function savePassword() {
    if (newPassword !== confirmPassword) {
      showFeedback("error", "Passwords don't match.");
      return;
    }
    if (newPassword.length < 12) {
      showFeedback("error", "Password must be at least 12 characters.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (error) showFeedback("error", error.message);
    else {
      showFeedback("success", "Password updated!");
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  async function deleteAccount() {
    if (deleteConfirm !== "DELETE" || !deletePassword) return;
    setSaving(true);
    try {
      const { error: reauthenticationError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: deletePassword,
      });
      if (reauthenticationError) {
        showFeedback("error", "Current password is incorrect.");
        return;
      }

      const response = await authenticatedApiFetch("/account", { method: "DELETE" });
      if (!response.ok) {
        throw new Error(await apiErrorMessage(response, "Account deletion failed."));
      }
      await supabase.auth.signOut({ scope: "local" });
    } catch (error) {
      showFeedback("error", error.message || "Account deletion failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Account Settings</h2>
          <button className="modal-close-btn" onClick={onClose}><CloseIcon /></button>
        </div>

        <div className="settings-body">
          <div className="settings-content">
            {feedback && (
              <div className={`settings-feedback ${feedback.type}`}>
                {feedback.msg}
              </div>
            )}

            <section className="settings-section">
              <h3 className="settings-section-title">Profile</h3>
              <div className="settings-field-label">Display Name</div>
              <p className="settings-field-hint">This is how your name appears in chats.</p>
              <input
                className="settings-input"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name"
              />
              <button className="settings-save-btn" onClick={saveDisplayName} disabled={saving}>
                {saving ? "Saving…" : "Save Display Name"}
              </button>
            </section>

            <section className="settings-section">
              <h3 className="settings-section-title">Email</h3>
              <div className="settings-field-label">Current Email</div>
              <input className="settings-input" type="text" value={user.email} disabled />
              <div className="settings-field-label settings-field-spaced">New Email Address</div>
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
            </section>

            <section className="settings-section">
              <h3 className="settings-section-title">Password</h3>
              <div className="settings-field-label">New Password</div>
              <p className="settings-field-hint">Must be at least 12 characters.</p>
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
              <div className="settings-field-label settings-field-spaced">Confirm Password</div>
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
            </section>

            <section className="settings-section">
              <h3 className="settings-section-title">Appearance</h3>
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
            </section>

            <section className="settings-section">
              <h3 className="settings-section-title">Danger Zone</h3>
              <div className="danger-box">
                <div className="danger-box-title">Delete Account</div>
                <p className="settings-field-hint" style={{ marginBottom: 16 }}>
                  This action is permanent and cannot be undone. All your conversations and data will be lost.
                </p>
                <div className="settings-field-label">Current password</div>
                <input
                  className="settings-input danger-input"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Current password"
                  autoComplete="current-password"
                />
                <div className="settings-field-label settings-field-spaced">
                  Type <strong>DELETE</strong> to confirm
                </div>
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
                  disabled={deleteConfirm !== "DELETE" || !deletePassword || saving}
                >
                  {saving ? "Deleting…" : "Permanently Delete Account"}
                </button>
              </div>
            </section>
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
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("musclemap-theme") || "dark";
    } catch {
      return "dark";
    }
  }); // 'dark' | 'light'
  const [showSettings, setShowSettings] = useState(false);
  const [showBodyMap, setShowBodyMap] = useState(false);
  const [isMobileLayout, setIsMobileLayout] = useState(() => (
    typeof window !== "undefined" && window.matchMedia("(max-width: 760px)").matches
  ));
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => (
    typeof window === "undefined" || !window.matchMedia("(max-width: 760px)").matches
  ));

  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [conversationData, setConversationData] = useState({});
  const [conversationOrder, setConversationOrder] = useState([]);

  const [message, setMessage] = useState("");
  const [selectedBodyPart, setSelectedBodyPart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [typingTarget, setTypingTarget] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [conversationError, setConversationError] = useState("");
  const renameInputRef = useRef(null);

  const responseBoxRef = useRef(null);
  const textareaRef = useRef(null);
  const savedIdsRef = useRef(new Set()); // conversation ids that exist in Supabase
  const deletedConversationIdsRef = useRef(new Set());

  // Apply theme to root + persist
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("musclemap-theme", theme);
    } catch {
      // ignore
    }
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 760px)");
    const handleLayoutChange = (event) => {
      setIsMobileLayout(event.matches);
      setIsSidebarOpen(!event.matches);
    };

    setIsMobileLayout(mediaQuery.matches);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleLayoutChange);
      return () => mediaQuery.removeEventListener("change", handleLayoutChange);
    }

    mediaQuery.addListener(handleLayoutChange);
    return () => mediaQuery.removeListener(handleLayoutChange);
  }, []);

  useEffect(() => {
    if (!isMobileLayout || !isSidebarOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsSidebarOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileLayout, isSidebarOpen]);

  function toggleTheme() {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }

  function toggleSidebar() {
    setIsSidebarOpen((open) => {
      if (!open && isMobileLayout) setShowBodyMap(false);
      return !open;
    });
  }

  function closeSidebarOnMobile() {
    if (isMobileLayout) setIsSidebarOpen(false);
  }

  const scrollMessagesToBottom = useCallback((behavior = "smooth") => {
    const container = responseBoxRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior });
  }, []);

  useEffect(() => {
    scrollMessagesToBottom("smooth");
  }, [conversationData, loading, scrollMessagesToBottom]);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user || null)
    );
    return () => {
      try {
        listener?.subscription?.unsubscribe?.();
      } catch (e) {
        // ignore
      }
    };
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

      const formatted = {};
      const order = [];
      (data || []).forEach((c) => {
        formatted[c.id] = { title: c.title, messages: c.messages || [] };
        order.push(c.id);
      });
      setConversationData(formatted);
      setConversationOrder(order);
      savedIdsRef.current = new Set(order);
      setCurrentConversationId((prev) => {
        if (prev && formatted[prev]) return prev;
        return order[0] ?? null;
      });
    }

    loadConversations();
  }, [user]);

  const saveConversation = useCallback(async (convId, messages, title) => {
    if (!user || deletedConversationIdsRef.current.has(convId)) return;

    const { data, error: lookupError } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", convId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (lookupError) {
      console.error("Error checking conversation ownership:", lookupError);
      return;
    }
    if (deletedConversationIdsRef.current.has(convId)) return;

    if (data) {
      const { error } = await supabase
        .from("conversations")
        .update({ title, messages, updated_at: new Date().toISOString() })
        .eq("id", convId)
        .eq("user_id", user.id);
      if (error) console.error("Error saving conversation:", error);
      else savedIdsRef.current.add(convId);
    } else {
      const { error } = await supabase
        .from("conversations")
        .insert([{ id: convId, user_id: user.id, title, messages, updated_at: new Date().toISOString() }]);
      if (error) console.error("Error creating conversation:", error);
      else savedIdsRef.current.add(convId);
    }
  }, [user]);

  // Delete conversation
  async function deleteConversation(e, id) {
    e.stopPropagation();
    setConversationError("");
    deletedConversationIdsRef.current.add(id);

    try {
      const backendResponse = await authenticatedApiFetch(`/chat/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!backendResponse.ok) {
        throw new Error(await apiErrorMessage(
          backendResponse,
          `Conversation deletion failed (${backendResponse.status}).`
        ));
      }
    } catch (error) {
      deletedConversationIdsRef.current.delete(id);
      console.error("Error deleting backend conversation memory:", error);
      setConversationError(error?.message || "Conversation deletion failed. Please try again.");
      return;
    }

    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      deletedConversationIdsRef.current.delete(id);
      console.error("Error deleting conversation:", error);
      setConversationError(error.message || "Conversation deletion failed. Please try again.");
      return;
    }
    savedIdsRef.current.delete(id);
    setConversationData((prev) => { const next = { ...prev }; delete next[id]; return next; });
    setConversationOrder((prev) => prev.filter((cid) => cid !== id));
    if (currentConversationId === id) setCurrentConversationId(null);
  }

  // Start renaming
  function startRename(e, id, currentTitle) {
    e.stopPropagation();
    setRenamingId(id);
    setRenameValue(currentTitle);
    setTimeout(() => renameInputRef.current?.focus(), 50);
  }

  // Confirm rename
  async function confirmRename(id) {
    const trimmed = renameValue.trim();
    if (!trimmed) { setRenamingId(null); return; }
    setConversationData((prev) => ({ ...prev, [id]: { ...prev[id], title: trimmed } }));
    setRenamingId(null);
    // Only touch the DB if the conversation has actually been persisted;
    // otherwise a brand-new chat would error on a row that doesn't exist yet.
    if (!savedIdsRef.current.has(id)) return;
    await supabase
      .from("conversations")
      .update({ title: trimmed })
      .eq("id", id)
      .eq("user_id", user?.id);
  }

  function handleTextareaChange(e) {
    setMessage(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 260) + "px";
  }

  const handleBodyPartSelect = useCallback((bodyPart) => {
    setSelectedBodyPart(bodyPart);
    window.requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 260) + "px";
    });
  }, []);

  function newConversation() {
    const id = crypto.randomUUID();
    setSelectedBodyPart(null);
    setTypingTarget(null);
    const title = "New Chat";
    setConversationData((prev) => ({ ...prev, [id]: { title, messages: [] } }));
    setConversationOrder((prev) => [id, ...prev]);
    setCurrentConversationId(id);
    closeSidebarOnMobile();
  }

  async function generateTitle(firstMessage) {
    const fallback = fallbackConversationTitle(firstMessage);
    try {
      const res = await authenticatedApiFetch("/title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: firstMessage }),
      });
      if (!res.ok) throw new Error(await apiErrorMessage(res, "Title generation failed."));
      const data = await res.json();
      return data.title?.trim() || fallback;
    } catch {
      return fallback;
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

    const priorMessages = conversationData[convId]?.messages ?? [];
    const updatedMessages = [...priorMessages, { role: "user", text: userMsg }];

    setConversationData((prev) => ({
      ...prev,
      [convId]: { ...prev[convId], messages: updatedMessages },
    }));

    const isFirstMessage = updatedMessages.length === 1;

    try {
      const res = await authenticatedApiFetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: convId,
          message: userMsg,
          body_part: selectedBodyPart,
        }),
      });
      if (!res.ok) throw new Error(await apiErrorMessage(res, "Message request failed."));
      const data = await res.json();

      // A response that finishes after its conversation was deleted must not
      // recreate either the visible chat or its hidden backend memory.
      if (deletedConversationIdsRef.current.has(convId)) return;

      const nextMessages = [...updatedMessages, { role: "assistant", text: data.message }];
      setTypingTarget({ conversationId: convId, messageIndex: updatedMessages.length });

      setConversationData((prev) => ({
        ...prev,
        [convId]: { ...prev[convId], messages: nextMessages },
      }));

      if (isFirstMessage) {
        const title = await generateTitle(userMsg);
        setConversationData((prev) => ({ ...prev, [convId]: { ...prev[convId], title } }));
        saveConversation(convId, nextMessages, title);
      } else {
        saveConversation(convId, nextMessages, conversationData[convId]?.title ?? "New Chat");
      }
    } catch (err) {
      if (deletedConversationIdsRef.current.has(convId)) return;
      console.error("Frontend → Backend error:", err);
      const errorDetail = err?.message || "The request could not be completed.";
      const errorMessages = [
        ...updatedMessages,
        { role: "assistant", text: `Sorry, ${errorDetail} Please try again.` },
      ];
      setTypingTarget({ conversationId: convId, messageIndex: updatedMessages.length });
      setConversationData((prev) => ({
        ...prev,
        [convId]: { ...prev[convId], messages: errorMessages },
      }));
      saveConversation(convId, errorMessages, conversationData[convId]?.title ?? "New Chat");
    } finally {
      setLoading(false);
    }
  }

  // ── AUTH SCREEN ────────────────────────────────────────
  if (!user) {
    return (
      <div className="page" style={{ backgroundImage: `url(${bg})` }}>
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
                try {
                  const { error } = await supabase.auth.signInWithPassword({ email: authData.email, password: authData.password });
                  if (error) {
                    alert(error.message || "Sign-in failed");
                  }
                } catch (err) {
                  console.error("Sign-in error:", err);
                  alert(err.message || String(err) || "Network error: failed to fetch");
                }
              }}>Sign In</button>
              <button onClick={() => setAuthMode("signup")}>Don't have an account? Sign Up</button>
            </>
          ) : (
            <>
              <button className="auth-primary" onClick={async () => {
                try {
                  if (authData.password.length < 12) {
                    alert("Password must be at least 12 characters.");
                    return;
                  }
                  const { error } = await supabase.auth.signUp({
                    email: authData.email,
                    password: authData.password,
                    options: { emailRedirectTo: getAuthRedirectUrl() },
                  });
                  if (error) alert(error.message);
                  else alert("Check your email to verify your account.");
                } catch (err) {
                  console.error("Sign-up error:", err);
                  alert(err.message || String(err) || "Network error: failed to fetch");
                }
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
  const displayName = user.user_metadata?.display_name || user.email?.split("@")[0] || "";

  // ── MAIN APP ───────────────────────────────────────────
  return (
    <div
      className={`layout ${isSidebarOpen ? "sidebar-open" : "sidebar-collapsed"}`}
      style={{ backgroundImage: `url(${bg})` }}
    >
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
      <aside
        id="app-sidebar"
        className="sidebar"
        aria-label="Conversation navigation"
        aria-hidden={!isSidebarOpen}
        inert={isSidebarOpen ? undefined : ""}
      >
        <div className="sidebar-header">
          <span>MuscleMap AI</span>
          <button
            type="button"
            className="sidebar-collapse-btn"
            aria-label="Collapse sidebar"
            onClick={() => setIsSidebarOpen(false)}
          >
            <CollapseSidebarIcon />
          </button>
        </div>

        <button className="new-chat-btn" onClick={newConversation}>
          <PlusIcon /> New Chat
        </button>

        <div className="convo-section-label">Recent</div>

        <div className="conversation-list">
          {conversationOrder.map((id) => {
            const c = conversationData[id];
            if (!c) return null;
            const isRenaming = renamingId === id;
            return (
              <div
                key={id}
                className={`conversation-item ${currentConversationId === id ? "active" : ""}`}
                onClick={() => {
                  if (isRenaming) return;
                  setCurrentConversationId(id);
                  closeSidebarOnMobile();
                }}
              >
                {isRenaming ? (
                  <div className="rename-row" onClick={(e) => e.stopPropagation()}>
                    <input
                      ref={renameInputRef}
                      className="rename-input"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") confirmRename(id);
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                    />
                    <button className="convo-action-btn confirm" onClick={() => confirmRename(id)}><CheckIcon /></button>
                    <button className="convo-action-btn cancel" onClick={() => setRenamingId(null)}><CloseIcon /></button>
                  </div>
                ) : (
                  <>
                    <span className="convo-title">{c.title}</span>
                    <div className="convo-actions">
                      <button className="convo-action-btn" title="Rename" onClick={(e) => startRename(e, id, c.title)}><PencilIcon /></button>
                      <button className="convo-action-btn delete" title="Delete" onClick={(e) => deleteConversation(e, id)}><TrashIcon /></button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {conversationError && (
          <div className="conversation-error" role="alert">{conversationError}</div>
        )}

        <div className="sidebar-footer">
          <button className="sidebar-btn theme-sidebar-btn" onClick={toggleTheme}>
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </button>
          <button className="sidebar-btn" onClick={() => {
            setShowSettings(true);
            closeSidebarOnMobile();
          }}>
            <SettingsIcon /> Account Settings
          </button>
          <button className="sidebar-btn" onClick={() => supabase.auth.signOut()}>
            <LogoutIcon /> Sign Out
          </button>
        </div>
      </aside>

      <button
        type="button"
        className="sidebar-backdrop"
        aria-hidden="true"
        tabIndex={-1}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* ── MAIN CHAT ── */}
      <div className="main-chat">
        <div className="chat-topbar">
          <button
            type="button"
            className="sidebar-toggle-btn"
            aria-label={isSidebarOpen ? "Collapse sidebar" : "Open sidebar"}
            aria-controls="app-sidebar"
            aria-expanded={isSidebarOpen}
            onClick={toggleSidebar}
          >
            <MenuIcon />
          </button>
          <div className="chat-topbar-title">{currentTitle}</div>
        </div>

        <div className="response-box" ref={responseBoxRef}>
          {currentMessages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-copy">
                <div className="empty-state-title">MuscleMap AI</div>
                <div>Ask a question or open the Body Map tab to select an area.</div>
              </div>
            </div>
          ) : (
            currentMessages.map((m, i) => (
              <div key={i} className={`msg-row ${m.role}`}>
                <div className="msg-inner">
                  {m.role === "assistant" && <div className="msg-avatar assistant">M</div>}
                  <div className="msg-bubble">
                    {m.role === "assistant" ? (
                      <TypewriterText
                        text={cleanAssistantText(m.text, currentMessages[i - 1])}
                        animate={
                          typingTarget?.conversationId === currentConversationId &&
                          typingTarget?.messageIndex === i
                        }
                        onProgress={() => scrollMessagesToBottom("auto")}
                        onComplete={() => {
                          setTypingTarget((current) => (
                            current?.conversationId === currentConversationId &&
                            current?.messageIndex === i
                              ? null
                              : current
                          ));
                        }}
                      />
                    ) : m.text}
                  </div>
                  {m.role === "user" && (
                    <div className="msg-avatar user">
                      {displayName[0]?.toUpperCase() || "U"}
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

          <div />
        </div>

        <button
          type="button"
          className={`body-map-tab ${showBodyMap ? "open" : ""}`}
          aria-expanded={showBodyMap}
          aria-controls="body-map-drawer"
          onClick={() => setShowBodyMap((open) => !open)}
        >
          <span className="body-map-tab-icon" aria-hidden="true">
            {showBodyMap ? "×" : "+"}
          </span>
          <span>Body Map</span>
        </button>

        <aside
          id="body-map-drawer"
          className={`body-map-drawer ${showBodyMap ? "open" : ""}`}
          aria-hidden={!showBodyMap}
        >
          {showBodyMap && (
            <BodyMap3D
              key={currentConversationId || "new-conversation"}
              selectedPart={selectedBodyPart}
              onSelect={handleBodyPartSelect}
            />
          )}
        </aside>

        <div className="input-area">
          <div>
            <div className="input-bar">
              <textarea
                ref={textareaRef}
                placeholder="Message MuscleMap AI..."
                value={message}
                rows={isMobileLayout ? 1 : 3}
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
