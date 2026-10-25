export const DEMO_ACCOUNT_EMAIL = (
  import.meta.env.VITE_DEMO_ACCOUNT_EMAIL || ""
).trim().toLowerCase();

export function isDemoAlias(email) {
  return email.trim().toLowerCase() === "demo";
}

export function isDemoAccountIdentifier(email) {
  const normalizedEmail = email.trim().toLowerCase();
  return normalizedEmail === "demo" || Boolean(
    DEMO_ACCOUNT_EMAIL && normalizedEmail === DEMO_ACCOUNT_EMAIL
  );
}

export function resolveAuthAction(email, action) {
  return action === "signup" && isDemoAccountIdentifier(email) ? "signin" : action;
}

export function resolveAuthEmail(email, action) {
  const trimmedEmail = email.trim();
  if (action === "signin" && isDemoAlias(trimmedEmail)) {
    return DEMO_ACCOUNT_EMAIL;
  }
  return trimmedEmail;
}
