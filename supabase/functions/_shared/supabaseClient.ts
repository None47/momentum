import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

function requireSupabaseEnv(key: string): string {
  const value = Deno.env.get(key)?.trim();
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

export function getSupabaseAdminClient() {
  const url =
    Deno.env.get("SUPABASE_URL")?.trim() ??
    Deno.env.get("NEXT_PUBLIC_SUPABASE_URL")?.trim() ??
    requireSupabaseEnv("SUPABASE_URL");

  const serviceRoleKey = requireSupabaseEnv("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
