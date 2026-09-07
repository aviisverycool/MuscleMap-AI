import { useState } from "react";
import { supabase } from "../supabase";
import { authenticatedApiFetch, apiErrorMessage } from "../api";
import { EQUIPMENT_OPTIONS, getAccountPreferences } from "../preferences";

export default function PersonalizationSettings({ user, chatBusy }) {
  const [preferences, setPreferences] = useState(() => getAccountPreferences(user.user_metadata));
  const [saved, setSaved] = useState(preferences);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const busy = saving || clearing;
  const dirty = JSON.stringify(preferences) !== JSON.stringify(saved);

  function change(field, value) {
    setPreferences((current) => ({ ...current, [field]: value }));
    setFeedback(null);
  }

  function toggleEquipment(id) {
    const selected = preferences.equipment || [];
    change("equipment", selected.includes(id)
      ? selected.filter((item) => item !== id)
      : [...selected, id]);
  }

  async function savePreferences(event) {
    event.preventDefault();
    if (busy || !dirty) return;
    setSaving(true);
    setFeedback(null);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { fitness_preferences: preferences },
      });
      if (error) throw error;
      setSaved(preferences);
      setFeedback({ type: "success", message: "Preferences saved. They apply to your next message on every device." });
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "Could not save preferences. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  async function clearMemory() {
    if (busy || chatBusy) return;
    setClearing(true);
    setFeedback(null);
    try {
      const response = await authenticatedApiFetch("/memory", { method: "DELETE" });
      if (!response.ok) throw new Error(await apiErrorMessage(response, "Could not clear AI memory. Please try again."));
      setConfirmClear(false);
      setFeedback({ type: "success", message: "AI memory cleared across all chats. Your saved chats, units and equipment are unchanged." });
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "Could not clear AI memory. Please try again." });
    } finally {
      setClearing(false);
    }
  }

  return (
    <form onSubmit={savePreferences} className="personalization-settings">
      <section className="settings-section">
        <h3 className="settings-section-title">Workout preferences</h3>
        <fieldset className="preference-fieldset" disabled={busy}>
          <legend className="settings-field-label">Units</legend>
          <div className="preference-options">
            {[["metric", "Metric", "kg · cm · km"], ["imperial", "Imperial", "lb · ft/in · miles"]].map(([value, label, hint]) => (
              <label key={value} className={`preference-choice ${preferences.units === value ? "selected" : ""}`}>
                <input type="radio" name="units" value={value} checked={preferences.units === value} onChange={() => change("units", value)} />
                <span><strong>{label}</strong><small>{hint}</small></span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="preference-fieldset settings-field-spaced" disabled={busy}>
          <legend className="settings-field-label">Available equipment</legend>
          <p className="settings-field-hint">Choose what you have so workout suggestions fit your setup.</p>
          <div className="equipment-shortcuts">
            <button type="button" aria-pressed={preferences.equipment === null} onClick={() => change("equipment", null)}>Not specified</button>
            <button type="button" aria-pressed={preferences.equipment?.length === 0} onClick={() => change("equipment", [])}>Bodyweight only</button>
          </div>
          <div className="equipment-options">
            {EQUIPMENT_OPTIONS.map(([id, label]) => (
              <label key={id} className={`preference-choice ${preferences.equipment?.includes(id) ? "selected" : ""}`}>
                <input type="checkbox" checked={preferences.equipment?.includes(id) || false} onChange={() => toggleEquipment(id)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="settings-section">
        <h3 className="settings-section-title">AI memory</h3>
        <label className="memory-toggle-row">
          <span><strong>Remember chat context</strong><small>Use previous messages and remembered details within each conversation.</small></span>
          <input type="checkbox" role="switch" checked={preferences.memory_enabled} onChange={(event) => change("memory_enabled", event.target.checked)} disabled={busy} />
        </label>
        <p className="settings-field-hint">
          When off, each new message is answered on its own and no new AI memory is saved.
          Your units and equipment still apply. Existing memory stays until you clear it.
        </p>
        <button className="settings-save-btn" type="submit" disabled={busy || !dirty}>
          {saving ? "Saving…" : "Save preferences"}
        </button>
        {feedback && <p className={`settings-feedback ${feedback.type}`} role={feedback.type === "error" ? "alert" : "status"}>{feedback.message}</p>}

        <div className="memory-clear-panel">
          <div className="settings-field-label">Clear AI memory</div>
          <p className="settings-field-hint">Start fresh in all conversations. This clears remembered details and AI context, while keeping your visible chat history and account preferences.</p>
          {chatBusy && <p className="settings-field-hint">Wait for the current reply to finish before clearing memory.</p>}
          {confirmClear ? (
            <div className="memory-clear-confirm">
              <p>Clear remembered context from all chats? This cannot be undone.</p>
              <div className="memory-clear-actions">
                <button className="settings-delete-btn" type="button" disabled={busy || chatBusy} onClick={clearMemory}>{clearing ? "Clearing…" : "Confirm clear memory"}</button>
                <button className="settings-save-btn" type="button" disabled={busy} onClick={() => setConfirmClear(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <button className="settings-save-btn" type="button" disabled={busy || chatBusy} onClick={() => { setConfirmClear(true); setFeedback(null); }}>Clear AI memory…</button>
          )}
        </div>
      </section>
    </form>
  );
}
