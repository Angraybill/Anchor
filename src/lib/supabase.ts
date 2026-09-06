import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type SupabaseDatabase = {
  public: {
    Tables: {
      rides: {
        Row: {
          id: string;
          driver_name: string;
          origin_location: string;
          destination_location: string;
          departure_start: string;
          departure_end: string;
          seats_open: number;
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
      ride_passengers: {
        Row: {
          id: string;
          ride_id: string;
          passenger_name: string;
          pickup_location: string;
          joined_at: string;
        };
        Insert: Omit<
          SupabaseDatabase["public"]["Tables"]["ride_passengers"]["Row"],
          "id" | "joined_at"
        >;
        Update: Partial<
          SupabaseDatabase["public"]["Tables"]["ride_passengers"]["Insert"]
        >;
      };
    };
    Functions: {
      join_ride: {
        Args: {
          target_ride_id: string;
          pickup_location: string;
          passenger_name: string;
        };
        Returns: SupabaseDatabase["public"]["Tables"]["rides"]["Row"];
      };
      list_ride_passengers: {
        Args: { target_ride_id: string; driver_name: string };
        Returns: SupabaseDatabase["public"]["Tables"]["ride_passengers"]["Row"][];
      };
      list_driver_rides: {
        Args: { driver_name: string };
        Returns: SupabaseDatabase["public"]["Tables"]["rides"]["Row"][];
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
