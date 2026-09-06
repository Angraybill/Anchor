export const zoneIds = [
  "north-campus",
  "campus-core",
  "downtown",
  "public-transit-hub",
  "airport-terminal",
] as const;

export type ZoneId = (typeof zoneIds)[number];
export type StudentId = `student-${string}`;
export type OfferId = `offer-${string}`;
export type RequestId = `request-${string}`;
export type MatchId = `match-${string}`;
export type ReportId = `report-${string}`;

export type VerificationState = "demo_verified" | "pending" | "suspended";
export type OfferStatus =
  | "active"
  | "paused"
  | "full"
  | "expired"
  | "cancelled";
export type RequestStatus =
  | "draft"
  | "open"
  | "matched"
  | "confirmed"
  | "rescue_pending"
  | "completed"
  | "cancelled"
  | "no_match";
export type MatchState =
  | "candidate"
  | "driver_offered"
  | "confirmed"
  | "declined"
  | "expired"
  | "cancelled"
  | "in_progress"
  | "completed";
export type PreferenceTag = "quiet_ride" | "small_bag" | "accessible_pickup";
export type CancellationReason =
  | "driver_change"
  | "vehicle_issue"
  | "schedule_change"
  | "other";
export type SafetyCategory =
  | "unsafe_behavior"
  | "harassment"
  | "identity_concern"
  | "other";

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
  maxDetourMinutes: number;
  status: OfferStatus;
  preferenceTags: PreferenceTag[];
};

export type AnchorRequest = {
  id: RequestId;
  riderId: StudentId;
  communityId: string;
  pickupZone: ZoneId;
  pickupLocation: string;
  destinationZone: ZoneId;
  destinationLocation: string;
  arriveBy: string;
  flexibilityMinutes: number;
  preferences: PreferenceTag[];
  status: RequestStatus;
};

export type MatchExplanation = {
  kind: "arrival_slack" | "detour" | "preference";
  text: string;
};

export type Match = {
  id: MatchId;
  offerId: OfferId;
  requestId: RequestId;
  state: MatchState;
  arrivalSlackMinutes: number;
  detourMinutes: number;
  explanation: MatchExplanation[];
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
  type:
    | "driver_offered"
    | "rider_accepted"
    | "cancelled"
    | "checked_in"
    | "completed"
    | "reported";
  createdAt: string;
};

export type CreateRouteOfferInput = Omit<
  RouteOffer,
  "id" | "driverId" | "communityId" | "status"
>;
export type CreateAnchorRequestInput = Omit<
  AnchorRequest,
  "id" | "riderId" | "communityId" | "status"
>;

export type CancelResult = {
  match: Match;
  rescueCandidates: Match[];
  rescueStatus: "rematched" | "no_match";
};

export type ReportReceipt = { id: ReportId; createdAt: string };

export class AnchorCommandError extends Error {
  constructor(
    public readonly code:
      | "UNAUTHORIZED"
      | "INVALID_STATE"
      | "NO_SEAT"
      | "EXPIRED"
      | "NOT_FOUND"
      | "VALIDATION",
    message: string,
  ) {
    super(message);
  }
}

export interface AnchorClient {
  readonly currentActor: Student;
  setDemoActor(studentId: StudentId): void;
  createRouteOffer(input: CreateRouteOfferInput): Promise<RouteOffer>;
  listOpenOffers(): RouteOffer[];
  listJoinedPassengerNames(offerId: OfferId): string[];
  joinRouteOffer(offerId: OfferId, pickupLocation: string): Promise<Match>;
  createAnchorRequest(input: CreateAnchorRequestInput): Promise<AnchorRequest>;
  listCandidates(requestId: RequestId): Promise<Match[]>;
  offerSeat(matchId: MatchId): Promise<Match>;
  acceptRide(matchId: MatchId): Promise<Match>;
  declineMatch(matchId: MatchId): Promise<Match>;
  cancelMatch(
    matchId: MatchId,
    reason: CancellationReason,
  ): Promise<CancelResult>;
  checkIn(matchId: MatchId): Promise<Match>;
  completeMatch(matchId: MatchId): Promise<Match>;
  getPickupReveal(matchId: MatchId): Promise<PickupReveal | null>;
  createSafetyReport(
    matchId: MatchId,
    category: SafetyCategory,
  ): Promise<ReportReceipt>;
  subscribe(listener: () => void): () => void;
}
