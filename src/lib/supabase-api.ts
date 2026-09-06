import { requireSupabase, type SupabaseDatabase } from "./supabase";
import type { CreateRouteOfferInput } from "./contracts";

type Ride = SupabaseDatabase["public"]["Tables"]["rides"]["Row"];

export type JoinedRide = {
  ride: Ride;
  pickupLocation: string;
  joinedAt: string;
};

export type MyRides = {
  offered: Ride[];
  joined: JoinedRide[];
};

async function requireCurrentUser() {
  const client = requireSupabase();
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Sign in before using live rides.");
  return { client, user: data.user };
}

export async function listOpenRides(): Promise<Ride[]> {
  const { client, user } = await requireCurrentUser();
  const { data, error } = await client
    .from("rides")
    .select("*")
    .eq("status", "active")
    .neq("driver_id", user.id)
    .gt("seats_open", 0)
    .order("departure_start");
  if (error) throw error;
  return data ?? [];
}

export async function postCurrentRide(
  input: CreateRouteOfferInput,
  driverName = "Cal Poly driver",
): Promise<Ride> {
  const { client, user } = await requireCurrentUser();
  const { data, error } = await client
    .from("rides")
    .insert({
      driver_id: user.id,
      driver_name: driverName,
      origin_location: input.originLocation,
      destination_location: input.destinationLocation,
      departure_start: input.departureStart,
      departure_end: input.departureEnd,
      seats_open: input.seatsOpen,
      cost_cents: input.costCents,
      max_detour_minutes: input.maxDetourMinutes,
      status: "active",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function joinRide(
  rideId: string,
  pickupLocation: string,
): Promise<Ride> {
  const { client } = await requireCurrentUser();
  const { data, error } = await client.rpc("join_ride", {
    target_ride_id: rideId,
    pickup_location: pickupLocation,
  });
  if (error) throw error;
  return data as Ride;
}

export async function listMyRides(): Promise<MyRides> {
  const { client, user } = await requireCurrentUser();
  const [offeredResult, joinedResult] = await Promise.all([
    client
      .from("rides")
      .select("*")
      .eq("driver_id", user.id)
      .in("status", ["active", "full"])
      .order("departure_start"),
    client
      .from("ride_passengers")
      .select("ride_id, pickup_location, joined_at, ride:rides(*)")
      .eq("rider_id", user.id)
      .order("joined_at", { ascending: false }),
  ]);

  if (offeredResult.error) throw offeredResult.error;
  if (joinedResult.error) throw joinedResult.error;

  const joined = (joinedResult.data ?? []).flatMap((row) => {
    const ride = row.ride as unknown as Ride | null;
    if (!ride) return [];
    return [
      {
        ride,
        pickupLocation: row.pickup_location as string,
        joinedAt: row.joined_at as string,
      },
    ];
  });

  return {
    offered: (offeredResult.data ?? []) as Ride[],
    joined,
  };
}
