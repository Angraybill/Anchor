import { describe, expect, it } from "vitest";
import { AnchorCommandError } from "./contracts";
import { DemoAnchorClient, demoIds } from "./client";
import { JORDAN_ID, MAYA_ID, MAYA_OFFER_ID, SAM_ID } from "./demo-fixtures";

describe("DemoAnchorClient", () => {
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

  it("releases a cancelled ride's seat without retaining the old pickup reveal", async () => {
    const client = new DemoAnchorClient();
    client.setDemoActor(MAYA_ID);
    await client.offerSeat(demoIds.MAYA_MATCH_ID);
    client.setDemoActor(JORDAN_ID);
    await client.acceptRide(demoIds.MAYA_MATCH_ID);
    client.setDemoActor(MAYA_ID);

    const cancelled = await client.cancelMatch(demoIds.MAYA_MATCH_ID, "vehicle_issue");
    const offer = client.snapshotOffer(MAYA_OFFER_ID);

    expect(cancelled.state).toBe("cancelled");
    expect(offer.seatsOpen).toBe(1);
    expect(offer.status).toBe("active");
    client.setDemoActor(JORDAN_ID);
    await expect(client.getPickupReveal(demoIds.MAYA_MATCH_ID)).resolves.toBeNull();
  });

  it("rejects a non-driver attempting to offer another student’s route", async () => {
    const client = new DemoAnchorClient();
    client.setDemoActor(SAM_ID);

    await expect(client.offerSeat(demoIds.MAYA_MATCH_ID)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("lets a rider join an open driver offer", async () => {
    const client = new DemoAnchorClient();
    client.setDemoActor(JORDAN_ID);

    const joined = await client.joinRouteOffer(MAYA_OFFER_ID, "Cal Poly Rec Center");
    const offer = client.snapshotOffer(MAYA_OFFER_ID);

    expect(joined.state).toBe("confirmed");
    expect(offer.seatsOpen).toBe(0);
    await expect(client.getPickupReveal(joined.id)).resolves.toMatchObject({
      publicLandmark: "North Campus public entrance"
    });
    expect(client.snapshotCommittedRiders(MAYA_OFFER_ID).map((rider) => rider.displayName)).toEqual(["Jordan"]);
  });
});
