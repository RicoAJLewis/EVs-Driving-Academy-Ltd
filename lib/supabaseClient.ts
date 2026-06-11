import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export function getSupabaseConfigStatus() {
  return {
    supabaseUrlExists: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKeyExists: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  };
}

export function getSupabaseUrlHostname() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return "";
  }

  try {
    return new URL(supabaseUrl).hostname;
  } catch {
    return "Invalid Supabase URL";
  }
}

export function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabaseAnonKey);
  }

  return browserClient;
}
