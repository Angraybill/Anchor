import type { Match, PickupReveal, RouteOffer, Student } from "./contracts";

export const DEMO_COMMUNITY_ID = "community-poly-passenger";
export const JORDAN_ID = "student-jordan" as const;
export const MAYA_ID = "student-maya" as const;
export const SAM_ID = "student-sam" as const;
export const ALEX_ID = "student-alex" as const;
export const MAYA_OFFER_ID = "offer-maya-downtown" as const;
export const SAM_OFFER_ID = "offer-sam-downtown" as const;
export const MAYA_MATCH_ID = "match-maya-jordan" as const;
export const SAM_MATCH_ID = "match-sam-jordan" as const;

export const demoStudents: Student[] = [
  { id: JORDAN_ID, displayName: "Jordan", verificationState: "demo_verified", communityId: DEMO_COMMUNITY_ID },
  { id: MAYA_ID, displayName: "Maya", verificationState: "demo_verified", communityId: DEMO_COMMUNITY_ID },
  { id: SAM_ID, displayName: "Sam", verificationState: "demo_verified", communityId: DEMO_COMMUNITY_ID },
  { id: ALEX_ID, displayName: "Alex", verificationState: "demo_verified", communityId: DEMO_COMMUNITY_ID }
];

export const demoOffers: RouteOffer[] = [
  {
    id: MAYA_OFFER_ID,
    driverId: MAYA_ID,
    communityId: DEMO_COMMUNITY_ID,
    originZone: "north-campus",
    originLocation: "North Campus",
    destinationZone: "downtown",
    destinationLocation: "Downtown SLO",
    departureStart: "2026-09-06T06:55:00-07:00",
    departureEnd: "2026-09-06T07:05:00-07:00",
    seatsOpen: 1,
    status: "active"
  },
  {
    id: SAM_OFFER_ID,
    driverId: SAM_ID,
    communityId: DEMO_COMMUNITY_ID,
    originZone: "campus-core",
    originLocation: "Campus Core",
    destinationZone: "downtown",
    destinationLocation: "Downtown SLO",
    departureStart: "2026-09-06T07:05:00-07:00",
    departureEnd: "2026-09-06T07:10:00-07:00",
    seatsOpen: 1,
    status: "active"
  }
];

export const demoMatches: Match[] = [
  {
    id: MAYA_MATCH_ID,
    offerId: MAYA_OFFER_ID,
    riderId: JORDAN_ID,
    state: "candidate",
    expiresAt: "2026-09-06T06:50:00-07:00"
  },
  {
    id: SAM_MATCH_ID,
    offerId: SAM_OFFER_ID,
    riderId: JORDAN_ID,
    state: "candidate",
    expiresAt: "2026-09-06T07:00:00-07:00"
  }
];

export const demoPickupReveal: PickupReveal = {
  matchId: MAYA_MATCH_ID,
  publicLandmark: "North Campus Library entrance",
  visibleAfter: "2026-09-06T06:45:00-07:00",
  expiresAt: "2026-09-06T08:15:00-07:00"
};

export const DEMO_ONLY_LABEL = "Demo route estimates and student verification";
