# Anchor Architecture

## Architecture principles

Anchor handles two sensitive things—student identity and location—so the architecture makes four promises:

1. A student cannot access another student’s ride data merely by guessing an ID.
2. A seat cannot be overbooked when two riders act at once.
3. Exact pickup locations are hidden until mutual acceptance and automatically expire.
4. Matching is explainable, advisory, and never confirms a ride without both people.

## Proposed stack

| Layer | Choice | Reason |
| --- | --- | --- |
| Client | React + TypeScript + Tailwind | Fast mobile-first iteration and typed state |
| Identity | Cal Poly email verification or an approved campus SSO provider | Closed student-only network; no unverified public accounts |
| Data | Postgres with row-level security | Transactions for seats and database-enforced access rules |
| Realtime | Postgres change stream / managed realtime channel | Match, acceptance, cancellation, and rescue updates without reload |
| API | Server-side functions or a small TypeScript API | Keeps matching, routes, tokens, and notification credentials out of the browser |
| Geospatial | Route/isochrone provider behind the server | Computes coarse detour and arrival estimates without exposing source addresses |
| Notifications | In-app first; push/SMS only after explicit consent | A reliable demo without a noisy or privacy-invasive messaging system |

## System diagram

```text
                         Mobile-first web client
        ┌───────────────────────┼────────────────────────┐
        │                       │                        │
        ▼                       ▼                        ▼
 Verified student session   Read models / realtime    Pickup reveal token
        │                       │                        │
        └───────────────────────┼────────────────────────┘
                                ▼
                 Server-side Anchor orchestration API
             ┌──────────────┬───────────────┬─────────────┐
             ▼              ▼               ▼             ▼
     Membership check   Match engine   Rescue engine  Notification broker
             │              │               │
             └──────────────┴───────┬───────┘
                                    ▼
                    Postgres + RLS + transaction ledger
             students · offers · requests · matches · events
                                    │
                                    ▼
                         Route / travel-time provider
```

The client never calls the route provider directly and never receives another student’s home address. All matching runs on the server with coarse zones until a handoff is mutually accepted.

## Core domains

```text
Student ──< Membership >── Community
Student ──< RouteOffer
Student ──< AnchorRequest
RouteOffer + AnchorRequest ──< Match ──< MatchEvent
Match ── 0..1 PickupReveal
Student ──< TrustEvent / SafetyReport
```

| Table | Essential fields | Responsibility |
| --- | --- | --- |
| `students` | `id`, `school_email`, `display_name`, `verification_state`, `status` | Identity; one account per verified student |
| `communities` | `id`, `name`, `school_domain`, `status` | Closed pilot group such as a cohort or organization |
| `community_memberships` | `community_id`, `student_id`, `role`, `active_at` | Visibility and matching boundary |
| `route_offers` | `id`, `driver_id`, `community_id`, `origin_zone`, `destination_zone`, `depart_window`, `seats_open`, `max_detour_minutes`, `status` | A voluntary pre-existing student route |
| `anchor_requests` | `id`, `rider_id`, `community_id`, `pickup_zone`, `destination_zone`, `arrive_by`, `flexibility_minutes`, `preferences`, `status` | A deadline-first request; no exact address |
| `matches` | `id`, `offer_id`, `request_id`, `state`, `arrival_slack_minutes`, `detour_minutes`, `expires_at` | The mutual-handoff state machine |
| `match_events` | `id`, `match_id`, `actor_id`, `type`, `metadata`, `created_at` | Append-only audit / activity timeline |
| `pickup_reveals` | `match_id`, `encrypted_detail`, `visible_after`, `expires_at` | Exact public pickup instruction, encrypted and TTL-bound |
| `trust_events` | `id`, `student_id`, `kind`, `created_at`, `expires_at` | Private reliability inputs; never public star ratings |
| `safety_reports` | `id`, `reporter_id`, `subject_id`, `match_id`, `category`, `status` | Restricted review queue and automatic rematch exclusion |

Use UUIDs for public resource identifiers. Coordinates or raw addresses are not stored in routine request/offering records; the MVP uses predefined zones and public landmarks.

## State machines

### Request

```text
draft → open → matched → confirmed → completed
                │          │
                │          └── cancelled / expired
                └── rescue_pending → rematched / no_match
```

### Match

```text
candidate → driver_offered → rider_accepted → confirmed → in_progress → completed
     │             │               │                 │
     └── expired   └── declined    └── declined      └── cancelled → rescue
```

No client can jump states. Each transition is an authenticated server command that checks the current state, membership, match participant, remaining seat count, and expiration time.

## Mutual acceptance protocol

1. The matching service creates short-lived `candidate` matches; no notification includes exact pickup information.
2. A driver chooses `offer seat`. The match becomes `driver_offered` and reserves no seat yet.
3. The rider chooses `accept ride` before `expires_at`.
4. In one database transaction, the API verifies the offer is active, decrements `seats_open` only if it remains positive, changes the match to `confirmed`, and writes two `match_events`.
5. Only after confirmation is the encrypted pickup reveal readable by the two match participants.
6. Completion restores no seat because the offer instance has ended; cancellation follows the explicit rescue path.

This design prevents a common ride-marketplace bug: two riders seeing a seat, both accepting, and both believing they are confirmed.

## Deadline-aware matching

Matching is a narrowing pipeline, not an opaque AI decision.

### Eligibility filters

- active, verified student in the same active community;
- driver offer has an open seat and overlapping departure window;
- destination/pickup zones are compatible;
- estimated arrival is no later than the rider’s `arrive_by` time;
- estimated detour does not exceed `max_detour_minutes`;
- neither participant has blocked, reported, or been excluded from the other;
- declared preferences are compatible.

### Ranking

```text
match_score =
  0.45 × normalized_arrival_slack +
  0.30 × normalized_inverse_detour +
  0.15 × reliability_signal +
  0.10 × preference_fit
```

The UI never displays this number. It displays two concrete reasons, such as “arrives 22 minutes before your deadline” and “estimated six-minute detour.”

`reliability_signal` is a bounded, private rolling measure based on completed handoffs and timely cancellations. It is never a star rating, never a public rank, and cannot block a student by itself.

## Fallback Mesh

The rescue engine starts only when a confirmed driver cancels or a ride expires before pickup.

```text
confirmed match cancels
       │
       ▼
is the request still inside its latest-safe-departure window?
       │ yes
       ▼
find eligible open offers → rank → create short-lived rescue candidates
       │                                      │
       │                                      └── limited in-app alert to eligible drivers
       ▼
rider receives up to three offers → mutual acceptance repeats
       │
       └── no valid offer → clear “no match” state + approved fallback guidance
```

The rescue alert contains only high-level route/time context. It does not disclose a rider’s identity or exact pickup detail until the same mutual acceptance protocol completes.

## Privacy and authorization

| Resource | Who can read it | Who can change it |
| --- | --- | --- |
| Route offer | Eligible active students see coarse zones/times; driver sees all own details | Driver only, while active |
| Anchor request | Eligible active students see coarse zones/deadline; rider sees full own details | Rider only, while open |
| Candidate match | Driver and rider only | API transition commands only |
| Pickup reveal | Confirmed driver and rider until TTL expiry | API only; no client updates |
| Trust event | Subject and authorized moderation process as appropriate | Server/event processor only |
| Safety report | Reporter and restricted reviewers | Reporter creates; restricted reviewer resolves |

Enforce these rules in database RLS and in API checks. Browser-side hiding is never treated as authorization.

## API command contracts

```text
POST /route-offers                 Create a voluntary route offer
POST /anchor-requests              Create a deadline-bound rider request
GET  /anchor-requests/:id/matches  Get the caller’s explainable candidates
POST /matches/:id/offer            Driver offers one seat
POST /matches/:id/accept           Rider accepts; atomic seat reservation
POST /matches/:id/decline          Participant declines candidate
POST /matches/:id/cancel           Participant cancels; conditionally launches rescue
POST /matches/:id/check-in         Confirm public pickup arrival
POST /matches/:id/complete         Both participants complete handoff
POST /safety-reports               Create a restricted report and remove future eligibility
```

Commands carry an authenticated session only. The server derives actor identity from that session; it never trusts `driverId`, `riderId`, or a client-provided role in a request body.

## External-service boundaries

| Integration | Permitted use | Never do |
| --- | --- | --- |
| Campus verification | Confirm a student’s school email / approved identity state | Claim a student has passed a background check without one |
| Maps / routes | Produce rough zones, detours, and latest-safe-departure estimates | Send an exact home pickup point to every candidate |
| AI | Parse optional natural-language trip constraints into an editable request; write match explanations | Autonomously match, override preferences, assess safety, or invent arrival predictions |
| Notifications | Notify a participant of state changes after consent | Send open ride requests to the whole campus by default |

## Observability and failure behavior

- Write every state change to `match_events` with actor, old/new state, and correlation ID.
- Measure candidate count, time-to-confirm, cancellation rate, rescue success, and stale-match expiration.
- If travel-time data is unavailable, show only declared route windows and label estimates unavailable; never fabricate an ETA.
- If realtime is unavailable, poll the caller’s own match state; transitions remain server-authoritative.
- If notification delivery fails, show the update in-app. Never mark a ride confirmed based on notification delivery.
