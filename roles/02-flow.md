# Role 2 — Rider, Driver, and Match Flow

## Your mission

Build the decision-quality core: a rider creates a deadline-bound trip, a driver posts an existing route, and both understand exactly why a candidate is eligible.

## You own

- `src/features/requests/`
- `src/features/offers/`
- `src/features/matches/` candidate list and driver/rider action presentation
- request/offer validation and fixture-backed matching adapters
- unit tests for input validation, eligibility filtering, candidate explanations, and stale/empty state behavior

## You do not own

- global navigation/design primitives (Role 1)
- migrations, RLS, authentication implementation, secret handling, or final server command implementation (Role 4)
- pickup reveal, safety report, cancellation rescue UI, or trust copy (Role 3)

## First build order

1. Build the rider form: pickup zone, destination zone, arrive-by time, flexibility, and preference tags.
2. Reject invalid deadlines, empty zones, past times, negative flexibility, and unsupported zones before calling a service.
3. Build the driver form: origin/destination zone, departure window, seat count, maximum detour, and voluntary-route consent.
4. Render candidate cards from fixtures with exactly two explanations: arrival slack and estimated detour.
5. Add the “Offer seat” action for Maya’s role and a clear waiting state for Jordan.

## Candidate eligibility contract

Never render a candidate if they lack a seat, miss the arrival deadline, exceed maximum detour, are outside community, or are blocked/reported. Do not calculate a public score or show a reliability rank.

## Done when

- Jordan can create the documented 7:45 AM request.
- Maya sees the compatible candidate and Alex is transparently excluded from the fixture result.
- Inputs map exactly to the canonical types.
- Browser code calls shared adapters only; it never writes tables directly.
- Your tests cover the invalid and boundary states listed in `TEST_PLAN.md`.
