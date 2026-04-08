function readEnv(key: string): string | undefined {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

export function getSupabaseUrl(): string {
  const value = readEnv("NEXT_PUBLIC_SUPABASE_URL") ?? readEnv("SUPABASE_URL");
  if (!value) {
    throw new Error("Missing Supabase URL. Set NEXT_PUBLIC_SUPABASE_URL.");
  }
  return value;
}

export function getSupabaseAnonKey(): string {
  const value = readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") ?? readEnv("SUPABASE_ANON_KEY");
  if (!value) {
    throw new Error("Missing Supabase anon key. Set NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  return value;
}

export function getSupabaseServiceRoleKey(): string {
  const value = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!value) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
  }
  return value;
}
