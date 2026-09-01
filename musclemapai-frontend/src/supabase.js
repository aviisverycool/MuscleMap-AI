import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.REACT_APP_SUPABASE_URL ||
  "https://lrlwogzmorgcakepkvqz.supabase.co";
const supabaseKey =
  process.env.REACT_APP_SUPABASE_ANON_KEY ||
  "sb_publishable_P1MFK71oBAPLZw8AguCvUw_6Xi3Es77";

export const supabase = createClient(supabaseUrl, supabaseKey);

export function getAuthRedirectUrl() {
  const configuredUrl = process.env.REACT_APP_SITE_URL?.trim();
  const appUrl = configuredUrl || window.location.origin;
  return `${appUrl.replace(/\/+$/, "")}/`;
}
