import { describe, expect, it } from "vitest";
import { AnchorCommandError } from "./contracts";
import { DemoAnchorClient, demoIds } from "./client";
import { JORDAN_ID, MAYA_ID, SAM_ID } from "./demo-fixtures";

describe("DemoAnchorClient", () => {
  it("returns eligible fixture candidates and excludes the insufficient-slack driver", async () => {
    const client = new DemoAnchorClient();
    client.setDemoActor(JORDAN_ID);

    const candidates = await client.listCandidates(demoIds.JORDAN_REQUEST_ID);

    expect(candidates.map((candidate) => candidate.id)).toEqual([demoIds.MAYA_MATCH_ID, demoIds.SAM_MATCH_ID]);
    expect(candidates.some((candidate) => candidate.explanation.some((reason) => reason.text.includes("Alex")))).toBe(false);
  });

  it("requires a driver offer and rider acceptance before revealing pickup", async () => {
    const client = new DemoAnchorClient();
    client.setDemoActor(JORDAN_ID);
    await expect(client.getPickupReveal(demoIds.MAYA_MATCH_ID)).resolves.toBeNull();

    client.setDemoActor(MAYA_ID);
    await client.offerSeat(demoIds.MAYA_MATCH_ID);

    client.setDemoActor(JORDAN_ID);
    const confirmed = await client.acceptRide(demoIds.MAYA_MATCH_ID);
    const reveal = await client.getPickupReveal(demoIds.MAYA_MATCH_ID);

    expect(confirmed.state).toBe("confirmed");
    expect(reveal?.publicLandmark).toBe("North Campus Library entrance");
  });

  it("prevents a second acceptance from overbooking the final seat", async () => {
    const client = new DemoAnchorClient();
    client.setDemoActor(MAYA_ID);
    await client.offerSeat(demoIds.MAYA_MATCH_ID);
    client.setDemoActor(JORDAN_ID);

    const [first, second] = await Promise.allSettled([
      client.acceptRide(demoIds.MAYA_MATCH_ID),
      client.acceptRide(demoIds.MAYA_MATCH_ID)
    ]);

    expect(first.status).toBe("fulfilled");
    expect(second.status).toBe("rejected");
    if (second.status === "rejected") {
      expect(second.reason).toBeInstanceOf(AnchorCommandError);
    }
  });

  it("turns cancellation into a rescue candidate without retaining the old pickup reveal", async () => {
    const client = new DemoAnchorClient();
    client.setDemoActor(MAYA_ID);
    await client.offerSeat(demoIds.MAYA_MATCH_ID);
    client.setDemoActor(JORDAN_ID);
    await client.acceptRide(demoIds.MAYA_MATCH_ID);
    client.setDemoActor(MAYA_ID);

    const rescue = await client.cancelMatch(demoIds.MAYA_MATCH_ID, "vehicle_issue");

    expect(rescue.match.state).toBe("cancelled");
    expect(rescue.rescueStatus).toBe("rematched");
    expect(rescue.rescueCandidates.map((candidate) => candidate.id)).toEqual([demoIds.SAM_MATCH_ID]);
    client.setDemoActor(JORDAN_ID);
    await expect(client.getPickupReveal(demoIds.MAYA_MATCH_ID)).resolves.toBeNull();
  });

  it("rejects a non-driver attempting to offer another student’s route", async () => {
    const client = new DemoAnchorClient();
    client.setDemoActor(SAM_ID);

    await expect(client.offerSeat(demoIds.MAYA_MATCH_ID)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("does not launch Rescue mode when the rider, rather than the driver, cancels", async () => {
    const client = new DemoAnchorClient();
    client.setDemoActor(MAYA_ID);
    await client.offerSeat(demoIds.MAYA_MATCH_ID);
    client.setDemoActor(JORDAN_ID);
    await client.acceptRide(demoIds.MAYA_MATCH_ID);

    const cancellation = await client.cancelMatch(demoIds.MAYA_MATCH_ID, "schedule_change");

    expect(cancellation.match.state).toBe("cancelled");
    expect(cancellation.rescueStatus).toBe("no_match");
    expect(cancellation.rescueCandidates).toEqual([]);
    await expect(client.getPickupReveal(demoIds.MAYA_MATCH_ID)).resolves.toBeNull();
  });

  it("prevents non-owners from enumerating another rider's candidates", async () => {
    const client = new DemoAnchorClient();
    client.setDemoActor(MAYA_ID);

    await expect(client.listCandidates(demoIds.JORDAN_REQUEST_ID)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("does not disclose a confirmed pickup landmark to a non-participant", async () => {
    const client = new DemoAnchorClient();
    client.setDemoActor(MAYA_ID);
    await client.offerSeat(demoIds.MAYA_MATCH_ID);
    client.setDemoActor(JORDAN_ID);
    await client.acceptRide(demoIds.MAYA_MATCH_ID);
    client.setDemoActor(SAM_ID);

    await expect(client.getPickupReveal(demoIds.MAYA_MATCH_ID)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects a stale acceptance after a candidate has been declined", async () => {
    const client = new DemoAnchorClient();
    client.setDemoActor(MAYA_ID);
    await client.offerSeat(demoIds.MAYA_MATCH_ID);
    await client.declineMatch(demoIds.MAYA_MATCH_ID);
    client.setDemoActor(JORDAN_ID);

    await expect(client.acceptRide(demoIds.MAYA_MATCH_ID)).rejects.toMatchObject({ code: "INVALID_STATE" });
  });

  it("derives offer ownership from the session and rejects invalid seat counts", async () => {
    const client = new DemoAnchorClient();
    client.setDemoActor(SAM_ID);

    await expect(client.createRouteOffer({
      originZone: "campus-core",
      destinationZone: "downtown",
      departureStart: "2026-09-06T07:00:00-07:00",
      departureEnd: "2026-09-06T07:10:00-07:00",
      seatsOpen: 0,
      maxDetourMinutes: 5,
      preferenceTags: []
    })).rejects.toMatchObject({ code: "VALIDATION" });

    const offer = await client.createRouteOffer({
      originZone: "campus-core",
      destinationZone: "downtown",
      departureStart: "2026-09-06T07:00:00-07:00",
      departureEnd: "2026-09-06T07:10:00-07:00",
      seatsOpen: 1,
      maxDetourMinutes: 5,
      preferenceTags: []
    });

    expect(offer.driverId).toBe(SAM_ID);
    expect(offer.communityId).toBe(demoIds.DEMO_COMMUNITY_ID);
  });
});
