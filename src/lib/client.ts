import {
  AnchorCommandError,
  type AnchorClient,
  type AnchorRequest,
  type CancelResult,
  type CancellationReason,
  type CreateAnchorRequestInput,
  type CreateRouteOfferInput,
  type Match,
  type MatchEvent,
  type MatchId,
  type OfferId,
  type PickupReveal,
  type ReportReceipt,
  type RouteOffer,
  type SafetyCategory,
  type Student,
  type StudentId,
  type ZoneId,
  zoneIds,
} from "./contracts";
import {
  DEMO_COMMUNITY_ID,
  JORDAN_ID,
  JORDAN_REQUEST_ID,
  MAYA_MATCH_ID,
  SAM_MATCH_ID,
  demoMatches,
  demoOffers,
  demoPickupReveal,
  demoRequests,
  demoStudents,
} from "./demo-fixtures";

type DemoState = {
  students: Student[];
  offers: RouteOffer[];
  requests: AnchorRequest[];
  matches: Match[];
  events: MatchEvent[];
  pickupReveals: PickupReveal[];
};

const clone = <T>(value: T): T => structuredClone(value);
const isoNow = () => new Date().toISOString();
const fixtureExpiry = "2099-09-06T08:15:00.000Z";
const randomId = () => {
  if (typeof globalThis.crypto?.randomUUID === "function")
    return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

function isZone(value: string): value is ZoneId {
  return (zoneIds as readonly string[]).includes(value);
}

export class DemoAnchorClient implements AnchorClient {
  private actorId: StudentId = JORDAN_ID;
  private readonly listeners = new Set<() => void>();
  private readonly state: DemoState = {
    students: clone(demoStudents),
    offers: clone(demoOffers),
    requests: clone(demoRequests),
    matches: clone(demoMatches).map((match) => ({
      ...match,
      expiresAt: fixtureExpiry,
    })),
    events: [],
    pickupReveals: [
      {
        ...clone(demoPickupReveal),
        visibleAfter: isoNow(),
        expiresAt: fixtureExpiry,
      },
    ],
  };

  get currentActor(): Student {
    const actor = this.state.students.find(
      (student) => student.id === this.actorId,
    );
    if (!actor)
      throw new AnchorCommandError(
        "UNAUTHORIZED",
        "The selected demo student is unavailable.",
      );
    return clone(actor);
  }

  snapshotMatches(requestId: string): Match[] {
    return clone(
      this.state.matches.filter((match) => match.requestId === requestId),
    );
  }

  snapshotRequest(requestId: string): AnchorRequest {
    const request = this.state.requests.find((item) => item.id === requestId);
    if (!request)
      throw new AnchorCommandError("NOT_FOUND", "Request not found.");
    return clone(request);
  }

  snapshotOffers(): RouteOffer[] {
    return clone(this.state.offers);
  }

  snapshotOffer(offerId: OfferId): RouteOffer {
    return clone(this.getOffer(offerId));
  }

  snapshotStudent(studentId: StudentId): Student {
    const student = this.state.students.find((item) => item.id === studentId);
    if (!student)
      throw new AnchorCommandError("NOT_FOUND", "Student not found.");
    return clone(student);
  }

  setDemoActor(studentId: StudentId): void {
    if (!this.state.students.some((student) => student.id === studentId)) {
      throw new AnchorCommandError(
        "UNAUTHORIZED",
        "This demo account does not exist.",
      );
    }
    this.actorId = studentId;
    this.notify();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async createRouteOffer(input: CreateRouteOfferInput): Promise<RouteOffer> {
    this.requireVerifiedActor();
    this.validateOfferInput(input);
    const offer: RouteOffer = {
      ...clone(input),
      id: `offer-${randomId()}` as RouteOffer["id"],
      driverId: this.actorId,
      communityId: this.currentActor.communityId,
      status: "active",
    };
    this.state.offers.push(offer);
    this.notify();
    return clone(offer);
  }

  listOpenOffers(): RouteOffer[] {
    return clone(
      this.state.offers.filter(
        (offer) => offer.status === "active" && offer.seatsOpen > 0,
      ),
    );
  }

  async joinRouteOffer(
    offerId: OfferId,
    pickupLocation: string,
  ): Promise<Match> {
    this.requireVerifiedActor();
    const offer = this.getOffer(offerId);
    if (offer.driverId === this.actorId)
      throw new AnchorCommandError(
        "VALIDATION",
        "You cannot join your own ride.",
      );
    if (!this.offerIsEligible(offerId))
      throw new AnchorCommandError(
        "NO_SEAT",
        "That ride no longer has an open seat.",
      );
    if (!pickupLocation.trim())
      throw new AnchorCommandError("VALIDATION", "Add a pickup location.");
    const request = await this.createAnchorRequest({
      pickupZone: offer.originZone,
      pickupLocation: pickupLocation.trim(),
      destinationZone: offer.destinationZone,
      destinationLocation: offer.destinationLocation,
      arriveBy: offer.departureEnd,
      flexibilityMinutes: 15,
      preferences: offer.preferenceTags,
    });
    const match: Match = {
      id: `match-${randomId()}` as MatchId,
      offerId,
      requestId: request.id,
      state: "confirmed",
      arrivalSlackMinutes: 15,
      detourMinutes: offer.maxDetourMinutes,
      explanation: [
        {
          kind: "detour",
          text: `${offer.maxDetourMinutes}-minute maximum detour.`,
        },
      ],
      expiresAt: fixtureExpiry,
    };
    offer.seatsOpen -= 1;
    if (offer.seatsOpen === 0) offer.status = "full";
    request.status = "confirmed";
    this.state.matches.push(match);
    this.state.pickupReveals.push({
      matchId: match.id,
      publicLandmark: pickupLocation.trim(),
      visibleAfter: isoNow(),
      expiresAt: fixtureExpiry,
    });
    this.addEvent(match.id, "rider_accepted");
    this.notify();
    return clone(match);
  }

  async createAnchorRequest(
    input: CreateAnchorRequestInput,
  ): Promise<AnchorRequest> {
    this.requireVerifiedActor();
    this.validateRequestInput(input);
    const request: AnchorRequest = {
      ...clone(input),
      id: `request-${randomId()}` as AnchorRequest["id"],
      riderId: this.actorId,
      communityId: this.currentActor.communityId,
      status: "open",
    };
    this.state.requests.push(request);
    this.notify();
    return clone(request);
  }

  async listCandidates(requestId: AnchorRequest["id"]): Promise<Match[]> {
    const request = this.getRequest(requestId);
    if (request.riderId !== this.actorId)
      throw new AnchorCommandError(
        "UNAUTHORIZED",
        "Only the rider can view their candidates.",
      );
    return clone(
      this.state.matches.filter(
        (match) =>
          match.requestId === requestId &&
          match.state === "candidate" &&
          this.offerIsEligible(match.offerId),
      ),
    );
  }

  async offerSeat(matchId: MatchId): Promise<Match> {
    const match = this.getMatch(matchId);
    const offer = this.getOffer(match.offerId);
    if (offer.driverId !== this.actorId)
      throw new AnchorCommandError(
        "UNAUTHORIZED",
        "Only the driver can offer this seat.",
      );
    if (match.state !== "candidate")
      throw new AnchorCommandError(
        "INVALID_STATE",
        "This candidate can no longer receive an offer.",
      );
    if (!this.offerIsEligible(offer.id))
      throw new AnchorCommandError(
        "NO_SEAT",
        "This route no longer has an eligible seat.",
      );
    match.state = "driver_offered";
    this.addEvent(match.id, "driver_offered");
    this.notify();
    return clone(match);
  }

  async acceptRide(matchId: MatchId): Promise<Match> {
    const match = this.getMatch(matchId);
    const request = this.getRequest(match.requestId);
    const offer = this.getOffer(match.offerId);
    if (request.riderId !== this.actorId)
      throw new AnchorCommandError(
        "UNAUTHORIZED",
        "Only the rider can accept this ride.",
      );
    if (match.state !== "driver_offered")
      throw new AnchorCommandError(
        "INVALID_STATE",
        "The driver has not offered this seat.",
      );
    if (!this.offerIsEligible(offer.id))
      throw new AnchorCommandError(
        "NO_SEAT",
        "That seat was just taken or is unavailable.",
      );
    offer.seatsOpen -= 1;
    if (offer.seatsOpen === 0) offer.status = "full";
    match.state = "confirmed";
    request.status = "confirmed";
    this.addEvent(match.id, "rider_accepted");
    this.notify();
    return clone(match);
  }

  async declineMatch(matchId: MatchId): Promise<Match> {
    const match = this.getMatch(matchId);
    if (!this.isParticipant(match))
      throw new AnchorCommandError(
        "UNAUTHORIZED",
        "Only a match participant can decline.",
      );
    if (match.state !== "candidate" && match.state !== "driver_offered") {
      throw new AnchorCommandError(
        "INVALID_STATE",
        "This match can no longer be declined.",
      );
    }
    match.state = "declined";
    this.notify();
    return clone(match);
  }

  async cancelMatch(
    matchId: MatchId,
    _reason: CancellationReason,
  ): Promise<CancelResult> {
    const match = this.getMatch(matchId);
    if (!this.isParticipant(match))
      throw new AnchorCommandError(
        "UNAUTHORIZED",
        "Only a match participant can cancel.",
      );
    if (match.state !== "confirmed" && match.state !== "in_progress") {
      throw new AnchorCommandError(
        "INVALID_STATE",
        "Only an active ride can be cancelled.",
      );
    }
    match.state = "cancelled";
    const request = this.getRequest(match.requestId);
    request.status = "rescue_pending";
    const cancelledOffer = this.getOffer(match.offerId);
    cancelledOffer.seatsOpen += 1;
    if (cancelledOffer.status === "full") cancelledOffer.status = "active";
    this.addEvent(match.id, "cancelled");
    const rescueCandidates = this.state.matches.filter(
      (candidate) =>
        candidate.requestId === match.requestId &&
        candidate.id !== match.id &&
        candidate.state === "candidate" &&
        this.offerIsEligible(candidate.offerId),
    );
    request.status = rescueCandidates.length ? "matched" : "no_match";
    this.notify();
    return {
      match: clone(match),
      rescueCandidates: clone(rescueCandidates),
      rescueStatus: rescueCandidates.length ? "rematched" : "no_match",
    };
  }

  async checkIn(matchId: MatchId): Promise<Match> {
    const match = this.getMatch(matchId);
    if (!this.isParticipant(match))
      throw new AnchorCommandError(
        "UNAUTHORIZED",
        "Only a confirmed participant can check in.",
      );
    if (match.state !== "confirmed" && match.state !== "in_progress")
      throw new AnchorCommandError(
        "INVALID_STATE",
        "This ride is not ready for check-in.",
      );
    match.state = "in_progress";
    this.addEvent(match.id, "checked_in");
    this.notify();
    return clone(match);
  }

  async completeMatch(matchId: MatchId): Promise<Match> {
    const match = this.getMatch(matchId);
    if (!this.isParticipant(match))
      throw new AnchorCommandError(
        "UNAUTHORIZED",
        "Only a participant can complete this ride.",
      );
    if (match.state !== "in_progress")
      throw new AnchorCommandError(
        "INVALID_STATE",
        "Check in before completing this ride.",
      );
    match.state = "completed";
    this.getRequest(match.requestId).status = "completed";
    this.addEvent(match.id, "completed");
    this.notify();
    return clone(match);
  }

  async getPickupReveal(matchId: MatchId): Promise<PickupReveal | null> {
    const match = this.getMatch(matchId);
    if (!this.isParticipant(match))
      throw new AnchorCommandError(
        "UNAUTHORIZED",
        "Only match participants can view pickup details.",
      );
    if (match.state !== "confirmed" && match.state !== "in_progress")
      return null;
    const reveal = this.state.pickupReveals.find(
      (item) => item.matchId === matchId,
    );
    if (!reveal || new Date(reveal.expiresAt) <= new Date()) return null;
    return clone(reveal);
  }

  async createSafetyReport(
    matchId: MatchId,
    _category: SafetyCategory,
  ): Promise<ReportReceipt> {
    const match = this.getMatch(matchId);
    if (!this.isParticipant(match))
      throw new AnchorCommandError(
        "UNAUTHORIZED",
        "Only a participant can report a match.",
      );
    this.addEvent(match.id, "reported");
    this.notify();
    return {
      id: `report-${randomId()}` as ReportReceipt["id"],
      createdAt: isoNow(),
    };
  }

  private getOffer(id: RouteOffer["id"]): RouteOffer {
    const offer = this.state.offers.find((item) => item.id === id);
    if (!offer)
      throw new AnchorCommandError("NOT_FOUND", "Route offer not found.");
    return offer;
  }

  private getRequest(id: AnchorRequest["id"]): AnchorRequest {
    const request = this.state.requests.find((item) => item.id === id);
    if (!request)
      throw new AnchorCommandError("NOT_FOUND", "Anchor request not found.");
    return request;
  }

  private getMatch(id: MatchId): Match {
    const match = this.state.matches.find((item) => item.id === id);
    if (!match) throw new AnchorCommandError("NOT_FOUND", "Match not found.");
    return match;
  }

  private offerIsEligible(offerId: RouteOffer["id"]): boolean {
    const offer = this.getOffer(offerId);
    return offer.status === "active" && offer.seatsOpen > 0;
  }

  private isParticipant(match: Match): boolean {
    const offer = this.getOffer(match.offerId);
    const request = this.getRequest(match.requestId);
    return offer.driverId === this.actorId || request.riderId === this.actorId;
  }

  private requireVerifiedActor(): void {
    if (this.currentActor.verificationState !== "demo_verified") {
      throw new AnchorCommandError(
        "UNAUTHORIZED",
        "A verified student session is required.",
      );
    }
  }

  private validateOfferInput(input: CreateRouteOfferInput): void {
    if (!input.originLocation.trim() || !input.destinationLocation.trim()) {
      throw new AnchorCommandError(
        "VALIDATION",
        "Add a pickup and destination location.",
      );
    }
    if (
      !isZone(input.originZone) ||
      !isZone(input.destinationZone) ||
      input.originZone === input.destinationZone
    ) {
      throw new AnchorCommandError(
        "VALIDATION",
        "Choose two different supported route zones.",
      );
    }
    if (
      !Number.isInteger(input.seatsOpen) ||
      input.seatsOpen < 1 ||
      input.seatsOpen > 4
    ) {
      throw new AnchorCommandError(
        "VALIDATION",
        "Offer between one and four seats.",
      );
    }
    if (
      !Number.isInteger(input.costCents) ||
      input.costCents < 0 ||
      input.costCents > 10000
    ) {
      throw new AnchorCommandError(
        "VALIDATION",
        "Cost share must be between $0 and $100 per passenger.",
      );
    }
    if (
      !Number.isInteger(input.maxDetourMinutes) ||
      input.maxDetourMinutes < 0 ||
      input.maxDetourMinutes > 20
    ) {
      throw new AnchorCommandError(
        "VALIDATION",
        "Maximum detour must be between 0 and 20 minutes.",
      );
    }
  }

  private validateRequestInput(input: CreateAnchorRequestInput): void {
    if (!input.pickupLocation.trim() || !input.destinationLocation.trim()) {
      throw new AnchorCommandError(
        "VALIDATION",
        "Add a pickup and destination location.",
      );
    }
    if (
      !isZone(input.pickupZone) ||
      !isZone(input.destinationZone) ||
      input.pickupZone === input.destinationZone
    ) {
      throw new AnchorCommandError(
        "VALIDATION",
        "Choose two different supported request zones.",
      );
    }
    if (
      !Number.isInteger(input.flexibilityMinutes) ||
      input.flexibilityMinutes < 0 ||
      input.flexibilityMinutes > 30
    ) {
      throw new AnchorCommandError(
        "VALIDATION",
        "Flexibility must be between 0 and 30 minutes.",
      );
    }
    if (Number.isNaN(Date.parse(input.arriveBy)))
      throw new AnchorCommandError(
        "VALIDATION",
        "Enter a valid arrive-by time.",
      );
  }

  private addEvent(matchId: MatchId, type: MatchEvent["type"]): void {
    this.state.events.push({
      id: randomId(),
      matchId,
      actorId: this.actorId,
      type,
      createdAt: isoNow(),
    });
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const demoClient = new DemoAnchorClient();
export const demoIds = {
  JORDAN_ID,
  JORDAN_REQUEST_ID,
  MAYA_MATCH_ID,
  SAM_MATCH_ID,
  DEMO_COMMUNITY_ID,
};
