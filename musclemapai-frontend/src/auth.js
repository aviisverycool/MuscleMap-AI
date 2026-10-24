export const DEMO_ACCOUNT_EMAIL = "demo@musclemap-ai.example";

export function isDemoAlias(email) {
  return email.trim().toLowerCase() === "demo";
}

export function resolveAuthAction(email, action) {
  return action === "signup" && isDemoAlias(email) ? "signin" : action;
}

export function resolveAuthEmail(email, action) {
  const trimmedEmail = email.trim();
  if (action === "signin" && isDemoAlias(trimmedEmail)) {
    return DEMO_ACCOUNT_EMAIL;
  }
  return trimmedEmail;
}
