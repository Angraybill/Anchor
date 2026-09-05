# Anchor Security Review

Reviewed: 2026-09-05
Scope: the TypeScript demo client, Supabase migration, and pickup-reveal Edge Functions in this repository.

## Security model confirmed

- A student identity is derived from `auth.uid()` through `current_student_id()`; match commands do not accept a client-supplied rider, driver, or seat owner.
- Active-community membership is evaluated against both the student membership and the pilot community's active flag.
- Row-level security restricts request and match reads to the appropriate rider or match participants. `pickup_reveals` has no client read policy.
- Every state change is a `security definer` database command that checks the actor and state. The last seat is locked and decremented in the same transaction as confirmation.
- Pickup data is encrypted with a server secret, decrypted only by `get-pickup-reveal`, and returned only to confirmed/in-progress match participants before its TTL.
- Candidate-facing records use zones, not addresses. The confirmation function only allows a public landmark that is approved for the request pickup zone.
- Match events are append-only from the application perspective: clients have no insert/update policy, and server commands add the events.
- CORS only reflects the configured application origin. Authentication and RLS remain the authorization controls; CORS is not relied on as an access-control boundary.

## Findings and fixes

| ID | Finding | Resolution |
| --- | --- | --- |
| SEC-01 | Rider and driver cancellation had been conflated in the local prototype. A rider cancellation could cancel the driver offer and start Rescue. | Fixed in `DemoAnchorClient`: only a confirmed driver cancellation enters Rescue; a rider cancellation releases the seat and ends their request. Covered by an automated test. |
| SEC-02 | Confirmation accepted any globally approved landmark, even if it was unrelated to the request pickup zone. | `confirm-match` now reads the authorized request under RLS and checks the landmark against a zone-specific allowlist before acceptance. |
| SEC-03 | Database RPC errors could be returned to the browser verbatim. | `confirm-match` now returns a stable conflict message while retaining server-side diagnostic logging. |
| SEC-04 | Local candidate filtering did not consider a prior block/report relationship. | The prototype now records the pair locally after a report and excludes blocked pairs from candidate eligibility. The production matcher must use `student_blocks` in its candidate query. |
| SEC-05 | Drivers and riders had broad direct-update policies that could bypass the command model and alter capacity or request state. | Removed client update policies for offers and requests. Future edits, pauses, and cancellations must use authenticated server commands with explicit state checks. |
| SEC-06 | PostgreSQL functions are executable by `PUBLIC` unless explicitly revoked. | Revoked `PUBLIC` execution on every state-changing function, then granted execution only to `authenticated`. |
| SEC-07 | An existing match could otherwise be offered or accepted after the pilot community was deactivated. | Offer and acceptance commands now require the acting student to remain an active member of an active community. |

## Automated tests completed

Run `npm test` for the current executable suite. It exercises:

- candidate filtering and owner-only candidate access;
- mutual acceptance and no pickup reveal before confirmation;
- simultaneous final-seat acceptance (one succeeds, one conflicts);
- pickup privacy for a non-participant and after a cancelled handoff;
- driver cancellation entering Rescue while rider cancellation does not;
- unauthorized offers, stale acceptance, input validation, and server-derived offer ownership.

## Required Supabase integration checks

These checks are intentionally not claimed as completed until the migration and Edge Functions are deployed to a non-production Supabase project.

- [ ] Apply the migration with the Supabase CLI or dashboard and run the SQL/RLS advisor.
- [ ] Use two authenticated test students to verify the primary driver-offer/rider-accept flow.
- [ ] Race two `accept_match` requests against a one-seat offer; assert one conflict, no negative seat count, one `rider_accepted` event, and one reveal row.
- [ ] Attempt every RPC as a nonparticipant, suspended student, unauthenticated user, and user outside the pilot community; each must fail without data disclosure.
- [ ] Confirm a candidate cannot select a landmark outside the request pickup zone and that a raw RPC failure exposes no database error text.
- [ ] Verify neither REST nor direct SQL select access can read `pickup_reveals`; only `get-pickup-reveal` should return a valid, unexpired result to a confirmed participant.
- [ ] Confirm cancellation makes the previous pickup reveal unavailable and rescue candidates cannot see the previous driver or pickup details.
- [ ] Enable a test `PICKUP_REVEAL_ENCRYPTION_KEY`, rotate it in a staging procedure, and ensure no secret or precise pickup value is present in logs, analytics, browser bundles, or `.env.example`.

## Residual prototype limitations

- `accept_match` is executable by authenticated users because the Edge Function forwards the caller's identity to preserve server-derived authorization. Its encrypted-detail argument cannot be meaningfully read without the server key, but a direct caller could submit unusable ciphertext. Treat Edge Function use as the supported path and add a database-issued one-time confirmation token before any production deployment.
- The demo client is a behavior model, not a security boundary. Actual authorization must be tested against deployed RLS and Edge Functions.
- Verification, routing, notification, moderation, and route estimates are demo-only until backed by vetted services. This is not a transportation, identity-verification, emergency-response, or background-check system.
