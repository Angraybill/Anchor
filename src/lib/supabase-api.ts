import { requireSupabase, type SupabaseDatabase } from "./supabase";
import type { CreateRouteOfferInput } from "./contracts";

type Ride = SupabaseDatabase["public"]["Tables"]["rides"]["Row"];

export async function listOpenRides(): Promise<Ride[]> {
  const { data, error } = await requireSupabase().from("rides").select("*").eq("status", "active").gt("seats_open", 0).order("departure_start");
  if (error) throw error;
  return data ?? [];
}

export async function postCurrentRide(input: CreateRouteOfferInput): Promise<Ride> {
  const { data, error } = await requireSupabase().from("rides").insert({
    driver_name: "Cal Poly driver", origin_location: input.originLocation, destination_location: input.destinationLocation,
    departure_start: input.departureStart, departure_end: input.departureEnd, seats_open: input.seatsOpen,
    max_detour_minutes: input.maxDetourMinutes, status: "active"
  }).select().single();
  if (error) throw error;
  return data;
}

export async function joinRide(rideId: string, pickupLocation: string): Promise<Ride> {
  const { data, error } = await requireSupabase().rpc("join_ride", { target_ride_id: rideId, requested_pickup_location: pickupLocation });
  if (error) throw error;
  return data as Ride;
}
