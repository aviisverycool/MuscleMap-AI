export const DEMO_ACCOUNT_EMAIL = "demo@musclemap-ai.example";

export function resolveAuthEmail(email, action) {
  const trimmedEmail = email.trim();
  if (action === "signin" && trimmedEmail.toLowerCase() === "demo") {
    return DEMO_ACCOUNT_EMAIL;
  }
  return trimmedEmail;
}
