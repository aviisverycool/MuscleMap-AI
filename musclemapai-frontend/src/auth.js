function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export const DEMO_ACCOUNT_EMAIL = (
  import.meta.env.VITE_DEMO_ACCOUNT_EMAIL || ""
).trim().toLowerCase();

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
