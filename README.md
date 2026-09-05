# Anchor

**Anchor is a closed, student-to-student ride network for the trips a Cal Poly student cannot miss.**

It is not an Uber clone and it is not a public ride marketplace. Anchor helps verified Cal Poly students coordinate voluntary rides to fixed-time commitments—clinical shifts, labs, internships, airport/train departures, and late transit gaps—when walking, biking, or existing transit will not work.

The product promise is simple: **when a ride falls through, Anchor gets the student to their commitment without making them send ten group-chat messages.**

## The distinct system

Anchor combines four systems into one deliberate workflow:

1. **Anchor trips** — riders state an arrival deadline and a destination zone, not a public home address.
2. **Route-fit matching** — drivers offer a voluntary route window and seat count; Anchor ranks candidates using arrival reliability, time slack, rough detour, and user-set ride preferences.
3. **Mutual handoff** — a driver and rider must both accept before the pickup detail is revealed. Exact locations disappear when the trip ends.
4. **Fallback mesh** — if a confirmed driver cancels, Anchor immediately finds compatible nearby offers and alerts only eligible students.

See [PRODUCT_DESIGN.md](PRODUCT_DESIGN.md) for the product experience, [ARCHITECTURE.md](ARCHITECTURE.md) for the technical system, and [SAFETY_AND_TRUST.md](SAFETY_AND_TRUST.md) for the non-negotiable trust model.

## Why this can win a Cal Poly hackathon

- It solves a narrow, high-stakes student problem rather than building a generic social or marketplace app.
- Its “driver cancels, fallback appears” demo is visible, understandable, and memorable in 90 seconds.
- It uses AI only where it improves coordination: translating a rider’s natural-language constraint into structured matching preferences and explaining a match. It never makes safety decisions or automatically confirms rides.
- It fits Cal Poly’s hands-on culture: a practical system designed around real schedules, real transportation gaps, and student trust.
- The architecture demonstrates mature engineering: verified membership, explicit consent, privacy-by-default location handling, auditable state transitions, and concurrency-safe seat reservation.

## The weekend MVP

Build one reliable, high-polish loop:

```text
Rider posts “Downtown clinic by 7:45 AM”
  → Anchor finds a verified student driver with one seat
  → both accept the match
  → pickup zone becomes visible
  → driver cancels in the demo
  → Fallback Mesh proposes a replacement ride
  → both check in and complete the trip
```

The complete MVP, four-person split, and demo script are in [BUILD_PLAN.md](BUILD_PLAN.md). The test and security acceptance criteria are in [TEST_PLAN.md](TEST_PLAN.md).

## Scope and safety boundary

Anchor is a planning and connection layer for voluntary, student-to-student carpools. It does **not** process payment, promise transportation, perform background checks, track students continuously, guarantee arrival, or replace emergency services. For the hackathon, Cal Poly verification, vehicle/insurance eligibility, and safety reporting are clearly marked as demo flows unless integrated with an approved real provider.

## Documentation map

| Document | Purpose |
| --- | --- |
| [PRODUCT_DESIGN.md](PRODUCT_DESIGN.md) | Specific user, experience, differentiators, visual direction, and 90-second pitch |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Services, data model, matching, state machines, privacy model, and API contracts |
| [SAFETY_AND_TRUST.md](SAFETY_AND_TRUST.md) | Verification, consent, location minimization, reporting, and MVP safety limits |
| [BUILD_PLAN.md](BUILD_PLAN.md) | Four-person ownership, six-hour delivery plan, seeded demo data, and demo runbook |
| [TEST_PLAN.md](TEST_PLAN.md) | Functional, concurrency, security, accessibility, and demo test cases |
