# Role 4 — Platform, Security, and Live Demo

## Your mission

Create the secure foundation that turns three polished feature branches into one real, two-session product. You own truth, concurrency, and deployment—not visual polish.

## You own

- project scaffold, dependency selection, deployment, and environment template
- `supabase/migrations/`, RLS policies, auth/session boundary, seed data
- `supabase/functions/` server commands and route-estimate adapter
- `src/lib/contracts.ts`, `src/lib/client.ts`, `src/lib/demo-fixtures.ts`
- realtime subscriptions, command error mapping, audit/event ledger, test setup

## You do not own

- global visual styling (Role 1)
- rider/driver form interaction design and candidate card presentation (Role 2)
- safety/rescue page presentation or content beyond the secure command behavior it relies on (Role 3)

## First build order

1. Scaffold React/TypeScript and Supabase. Add no secret to the client; commit `.env.example` only.
2. Implement canonical types and exact fixture data from `IMPLEMENTATION_CONTRACT.md` so other teams can begin immediately.
3. Create student, community, offer, request, match, event, pickup-reveal, and report tables with UUIDs and row-level policies.
4. Add authenticated commands for offer, accept, decline, cancel-and-rescue, check-in, complete, and report.
5. Make `acceptRide` transactional: lock/conditionally update offer seat count, confirm match, create events, then allow pickup reveal.
6. Add realtime updates for only authorized request/match participants.
7. Seed Jordan, Maya, Sam, Alex, the single pilot community, and deterministic route outcomes. Add a clearly hidden demo-session switcher.

## Non-negotiable platform tests

- An account outside the pilot community cannot list, read, or mutate offer/request/match data.
- Candidate/driver cannot read pickup reveal before confirmation.
- Two concurrent final-seat accepts produce exactly one confirmed match and never a negative seat count.
- Cancellation event begins rescue only while deadline remains viable.
- Rescue candidates contain no previous participant’s exact pickup detail.
- Client actor IDs do not determine authorization; commands use server session identity.

## Done when

- The two-browser Jordan/Maya/Sam demo runs without manual database edits.
- All command outcomes are auditable through append-only match events.
- Route fixtures and every mock behavior are visibly marked demo-only.
- A fresh teammate can clone, configure documented environment variables, seed, and run the product from the README.
