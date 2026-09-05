import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function configuredProjectUrl(): string | null {
  const value = import.meta.env.VITE_SUPABASE_URL?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    const localDevelopmentProject = import.meta.env.DEV && ["localhost", "127.0.0.1"].includes(url.hostname);
    if (url.protocol !== "https:" && !localDevelopmentProject) return null;
    if (!localDevelopmentProject && !url.hostname.endsWith(".supabase.co")) return null;
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function isSafeBrowserProjectKey(value: string | undefined): value is string {
  const key = value?.trim();
  if (!key || key.startsWith("sb_secret_")) return false;
  if (key.startsWith("sb_publishable_")) return true;

  // Legacy Supabase keys are JWTs. Decode only to reject a misconfigured service-role key;
  // signature validation remains Supabase's responsibility when the key is used.
  const payload = key.split(".")[1];
  if (!payload) return false;
  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "=");
    return JSON.parse(atob(normalized))?.role === "anon";
  } catch {
    return false;
  }
}

const projectUrl = configuredProjectUrl();
const configuredKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const publishableKey = isSafeBrowserProjectKey(configuredKey) ? configuredKey.trim() : null;

export const isSupabaseConfigured = Boolean(projectUrl && publishableKey);

// Only a browser-safe publishable/anon key is permitted here. Server secrets stay in Edge Functions.
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(projectUrl!, publishableKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      },
      realtime: { params: { eventsPerSecond: 2 } }
    })
  : null;

export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error("Supabase is not configured. Use the demo client or provide a trusted project URL and publishable key.");
  return supabase;
}
