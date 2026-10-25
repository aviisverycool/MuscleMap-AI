function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

const configuredDemoEmail = (
  import.meta.env.VITE_DEMO_ACCOUNT_EMAIL || ""
).trim().toLowerCase();

// The shared CAC judges account. This is a real, confirmed Supabase user, so
// the `demo` alias keeps working even if the hosting environment forgets to
// set VITE_DEMO_ACCOUNT_EMAIL. The value is not a secret; the password lives
// in the README.
export const DEMO_ACCOUNT_EMAIL =
  configuredDemoEmail || "demo@musclemap-ai.example";

export function isDemoAlias(email) {
  return normalizeText(email).toLowerCase() === "demo";
}

export function isDemoAccountIdentifier(email) {
  const normalizedEmail = normalizeText(email).toLowerCase();
  return normalizedEmail === "demo" || Boolean(
    DEMO_ACCOUNT_EMAIL && normalizedEmail === DEMO_ACCOUNT_EMAIL
  );
}

export function resolveAuthAction(email, action) {
  const normalizedAction = normalizeText(action).toLowerCase();
  return normalizedAction === "signup" && isDemoAccountIdentifier(email) ? "signin" : normalizedAction || action;
}

export function resolveAuthEmail(email, action) {
  const normalizedAction = normalizeText(action).toLowerCase();
  const trimmedEmail = normalizeText(email);
  if (normalizedAction === "signin" && isDemoAlias(trimmedEmail)) {
    return DEMO_ACCOUNT_EMAIL;
  }
  return trimmedEmail;
}
