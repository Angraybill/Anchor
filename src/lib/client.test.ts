import { describe, expect, it } from "vitest";
import { AnchorCommandError } from "./contracts";
import { DemoAnchorClient, demoIds } from "./client";
import { JORDAN_ID, MAYA_ID, MAYA_OFFER_ID, SAM_ID } from "./demo-fixtures";

describe("DemoAnchorClient", () => {
  it("returns eligible fixture candidates and excludes the insufficient-slack driver", async () => {
    const client = new DemoAnchorClient();
    client.setDemoActor(JORDAN_ID);

    const candidates = await client.listCandidates(demoIds.JORDAN_REQUEST_ID);

    expect(candidates.map((candidate) => candidate.id)).toEqual([
      demoIds.MAYA_MATCH_ID,
      demoIds.SAM_MATCH_ID,
    ]);
    expect(
      candidates.some((candidate) =>
        candidate.explanation.some((reason) => reason.text.includes("Alex")),
      ),
    ).toBe(false);
  });

  it("requires a driver offer and rider acceptance before revealing pickup", async () => {
    const client = new DemoAnchorClient();
    client.setDemoActor(JORDAN_ID);
    await expect(
      client.getPickupReveal(demoIds.MAYA_MATCH_ID),
    ).resolves.toBeNull();

    client.setDemoActor(MAYA_ID);
    await client.offerSeat(demoIds.MAYA_MATCH_ID);

    client.setDemoActor(JORDAN_ID);
    const confirmed = await client.acceptRide(demoIds.MAYA_MATCH_ID);
    const reveal = await client.getPickupReveal(demoIds.MAYA_MATCH_ID);

    expect(confirmed.state).toBe("confirmed");
    expect(reveal?.publicLandmark).toBe("North Campus");
  });

  it("prevents a second acceptance from overbooking the final seat", async () => {
    const client = new DemoAnchorClient();
    client.setDemoActor(MAYA_ID);
    await client.offerSeat(demoIds.MAYA_MATCH_ID);
    client.setDemoActor(JORDAN_ID);

    const [first, second] = await Promise.allSettled([
      client.acceptRide(demoIds.MAYA_MATCH_ID),
      client.acceptRide(demoIds.MAYA_MATCH_ID),
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

    const rescue = await client.cancelMatch(
      demoIds.MAYA_MATCH_ID,
      "vehicle_issue",
    );

    expect(rescue.match.state).toBe("cancelled");
    expect(rescue.rescueStatus).toBe("rematched");
    expect(rescue.rescueCandidates.map((candidate) => candidate.id)).toEqual([
      demoIds.SAM_MATCH_ID,
    ]);
    expect(client.snapshotOffer(MAYA_OFFER_ID)).toMatchObject({
      seatsOpen: 1,
      status: "active",
    });
    client.setDemoActor(JORDAN_ID);
    await expect(
      client.getPickupReveal(demoIds.MAYA_MATCH_ID),
    ).resolves.toBeNull();
  });

  it("rejects a non-driver attempting to offer another student’s route", async () => {
    const client = new DemoAnchorClient();
    client.setDemoActor(SAM_ID);

    await expect(client.offerSeat(demoIds.MAYA_MATCH_ID)).rejects.toMatchObject(
      { code: "UNAUTHORIZED" },
    );
  });

  it("lets a rider join an open driver offer without publishing a ride request", async () => {
    const client = new DemoAnchorClient();
    client.setDemoActor(JORDAN_ID);

    const joined = await client.joinRouteOffer(
      MAYA_OFFER_ID,
      "Cal Poly Rec Center",
    );
    const offer = client.snapshotOffer(MAYA_OFFER_ID);

    expect(joined.state).toBe("confirmed");
    expect(offer.seatsOpen).toBe(0);
    await expect(client.getPickupReveal(joined.id)).resolves.toMatchObject({
      publicLandmark: "Cal Poly Rec Center",
    });
  });
});
