import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://lrlwogzmorgcakepkvqz.supabase.co";
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_P1MFK71oBAPLZw8AguCvUw_6Xi3Es77";

export const supabase = createClient(supabaseUrl, supabaseKey);

export function getAuthRedirectUrl() {
  const configuredUrl = import.meta.env.VITE_SITE_URL?.trim();
  const appUrl = configuredUrl || window.location.origin;
  return `${appUrl.replace(/\/+$/, "")}/`;
}
