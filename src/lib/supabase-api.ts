import { requireSupabase, type SupabaseDatabase } from "./supabase";
import type { CreateRouteOfferInput } from "./contracts";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Ride = SupabaseDatabase["public"]["Tables"]["rides"]["Row"];
const JOINED_RIDES_CACHE_KEY = "poly-passenger:joined-rides";

export type JoinedRide = {
  ride: Ride;
  pickupLocation: string;
  joinedAt: string;
};

export type MyRides = {
  offered: Ride[];
  joined: JoinedRide[];
};

async function readJoinedRideCache(): Promise<JoinedRide[]> {
  try {
    const value = await AsyncStorage.getItem(JOINED_RIDES_CACHE_KEY);
    if (!value) return [];
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is JoinedRide =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as JoinedRide).joinedAt === "string" &&
        typeof (entry as JoinedRide).pickupLocation === "string" &&
        typeof (entry as JoinedRide).ride?.id === "string",
    );
  } catch {
    return [];
  }
}

export async function cacheJoinedRide(joinedRide: JoinedRide): Promise<void> {
  try {
    const cached = await readJoinedRideCache();
    const next = [
      joinedRide,
      ...cached.filter((entry) => entry.ride.id !== joinedRide.ride.id),
    ].slice(0, 50);
    await AsyncStorage.setItem(JOINED_RIDES_CACHE_KEY, JSON.stringify(next));
  } catch {
    // A storage failure must not make an accepted ride disappear from the UI.
  }
}

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
  const [offeredResult, joinedResult, cachedJoined] = await Promise.all([
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
    readJoinedRideCache(),
  ]);

  if (offeredResult.error) throw offeredResult.error;
  const remoteJoined = joinedResult.error
    ? []
    : (joinedResult.data ?? []).flatMap((row) => {
        const ride = row.ride as unknown as Ride | null;
        return ride
          ? [{ ride, pickupLocation: row.pickup_location as string, joinedAt: row.joined_at as string }]
          : [];
      });
  const remoteIds = new Set(remoteJoined.map((joined) => joined.ride.id));
  const joined = [...remoteJoined, ...cachedJoined.filter((joined) => !remoteIds.has(joined.ride.id))];

  return {
    offered: (offeredResult.data ?? []) as Ride[],
    joined,
  };
}
