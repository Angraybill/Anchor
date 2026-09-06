import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type SupabaseDatabase = {
  public: {
    Tables: {
      rides: {
        Row: {
          id: string;
          driver_id: string | null;
          driver_name: string;
          origin_location: string;
          destination_location: string;
          departure_start: string;
          departure_end: string;
          seats_open: number;
          cost_cents: number;
          max_detour_minutes: number;
          status: "active" | "full" | "cancelled" | "expired";
          created_at: string;
        };
        Insert: Omit<
          SupabaseDatabase["public"]["Tables"]["rides"]["Row"],
          "id" | "created_at"
        >;
        Update: Partial<
          SupabaseDatabase["public"]["Tables"]["rides"]["Insert"]
        >;
      };
    };
    Functions: {
      join_ride: {
        Args: { target_ride_id: string; pickup_location: string };
        Returns: SupabaseDatabase["public"]["Tables"]["rides"]["Row"];
      };
    };
  };
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

export function requireSupabase(): SupabaseClient {
  if (!supabase)
    throw new Error(
      "Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.",
    );
  return supabase;
}
