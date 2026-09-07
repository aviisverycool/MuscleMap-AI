import { supabase } from "./supabase";

const API_BASE_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? "/api" : "http://localhost:8000/api");

export async function authenticatedApiFetch(path, options = {}) {
  const { data, error } = await supabase.auth.getSession();
  const accessToken = data?.session?.access_token;
  if (error || !accessToken) throw new Error("Your session has expired. Please sign in again.");
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${accessToken}`);
  return fetch(`${API_BASE_URL}${path}`, { ...options, headers });
}

export async function apiErrorMessage(response, fallback) {
  try {
    const payload = await response.json();
    return typeof payload?.detail === "string" ? payload.detail : fallback;
  } catch {
    return fallback;
  }
}
