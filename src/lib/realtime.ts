import type { RealtimeChannel } from "@supabase/supabase-js";
import { requireSupabase } from "./supabase";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type MatchRealtimeEvent = {
  event: string;
  payload: unknown;
};

export function matchTopic(matchId: string): string {
  if (!uuidPattern.test(matchId)) throw new Error("A valid match ID is required for realtime updates.");
  return `anchor:match:${matchId}`;
}

/**
 * Connects only after an authenticated session exists. The database permits read-only
 * broadcasts on this private topic exclusively for the match's rider or driver.
 */
export async function subscribeToMatchUpdates(
  matchId: string,
  onEvent: (event: MatchRealtimeEvent) => void
): Promise<() => void> {
  const client = requireSupabase();
  const { data: { session } } = await client.auth.getSession();
  if (!session) throw new Error("Sign in before subscribing to ride updates.");

  await client.realtime.setAuth(session.access_token);
  const channel: RealtimeChannel = client
    .channel(matchTopic(matchId), { config: { private: true } })
    .on("broadcast", { event: "*" }, (payload) => onEvent({ event: payload.event, payload }))
    .subscribe();

  const { data: authListener } = client.auth.onAuthStateChange((_event, nextSession) => {
    if (nextSession?.access_token) void client.realtime.setAuth(nextSession.access_token);
  });

  return () => {
    authListener.subscription.unsubscribe();
    void client.removeChannel(channel);
  };
}
