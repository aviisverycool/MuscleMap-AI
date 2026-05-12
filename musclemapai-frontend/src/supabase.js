import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://lrlwogzmorgcakepkvqz.supabase.co";
const supabaseKey = "sb_publishable_P1MFK71oBAPLZw8AguCvUw_6Xi3Es77";

export const supabase = createClient(supabaseUrl, supabaseKey);