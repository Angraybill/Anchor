export const zoneIds = [
  "north-campus",
  "campus-core",
  "downtown",
  "public-transit-hub",
  "airport-terminal"
] as const;

export type ZoneId = (typeof zoneIds)[number];
export type StudentId = `student-${string}`;
export type OfferId = `offer-${string}`;
export type MatchId = `match-${string}`;
export type ReportId = `report-${string}`;

export type VerificationState = "demo_verified" | "pending" | "suspended";
export type OfferStatus = "active" | "paused" | "full" | "expired" | "cancelled";
export type MatchState = "candidate" | "driver_offered" | "confirmed" | "declined" | "expired" | "cancelled";
export type CancellationReason = "driver_change" | "vehicle_issue" | "schedule_change" | "other";
export type SafetyCategory = "unsafe_behavior" | "harassment" | "identity_concern" | "other";

export type Student = {
  id: StudentId;
  displayName: string;
  verificationState: VerificationState;
  communityId: string;
};

export type RouteOffer = {
  id: OfferId;
  driverId: StudentId;
  communityId: string;
  originZone: ZoneId;
  originLocation: string;
  destinationZone: ZoneId;
  destinationLocation: string;
  departureStart: string;
  departureEnd: string;
  seatsOpen: number;
  status: OfferStatus;
};

export type Match = {
  id: MatchId;
  offerId: OfferId;
  riderId: StudentId;
  state: MatchState;
  expiresAt: string;
};

export type PickupReveal = {
  matchId: MatchId;
  publicLandmark: string;
  visibleAfter: string;
  expiresAt: string;
};

export type MatchEvent = {
  id: string;
  matchId: MatchId;
  actorId: StudentId;
  type: "driver_offered" | "rider_accepted" | "cancelled" | "reported";
  createdAt: string;
};

export type CreateRouteOfferInput = Omit<RouteOffer, "id" | "driverId" | "communityId" | "status">;

export type ReportReceipt = { id: ReportId; createdAt: string };

export class AnchorCommandError extends Error {
  constructor(
    public readonly code: "UNAUTHORIZED" | "INVALID_STATE" | "NO_SEAT" | "EXPIRED" | "NOT_FOUND" | "VALIDATION",
    message: string
  ) {
    super(message);
  }
}

export interface AnchorClient {
  readonly currentActor: Student;
  setDemoActor(studentId: StudentId): void;
  createRouteOffer(input: CreateRouteOfferInput): Promise<RouteOffer>;
  listOpenOffers(): RouteOffer[];
  joinRouteOffer(offerId: OfferId, pickupLocation: string): Promise<Match>;
  offerSeat(matchId: MatchId): Promise<Match>;
  acceptRide(matchId: MatchId): Promise<Match>;
  declineMatch(matchId: MatchId): Promise<Match>;
  cancelMatch(matchId: MatchId, reason: CancellationReason): Promise<Match>;
  getPickupReveal(matchId: MatchId): Promise<PickupReveal | null>;
  createSafetyReport(matchId: MatchId, category: SafetyCategory): Promise<ReportReceipt>;
  subscribe(listener: () => void): () => void;
}
