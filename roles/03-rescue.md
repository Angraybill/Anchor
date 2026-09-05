# Role 3 — Mutual Handoff, Rescue, and Trust

## Your mission

Make the highest-stakes moment trustworthy: two students mutually confirm a ride, then a cancellation becomes a clear, privacy-preserving recovery path.

## You own

- `src/features/rescue/`
- `src/features/trust/`
- match detail/timeline UI in `src/features/matches/` after candidate selection
- confirmation, cancellation, no-match, check-in, completion, report/block interfaces
- user-facing privacy, demo-only, and safety copy

## You do not own

- candidate eligibility calculation (Role 2)
- database policy, encrypted/TTL storage, atomic seat transaction, server function implementation (Role 4)
- global styles/component primitives (Role 1)

## First build order

1. Build state views for `driver_offered`, `confirmed`, `cancelled`, `rescue_pending`, `no_match`, and `completed` using fixtures.
2. Show zones before confirmation; only render `PickupRevealCard` for fixture state `confirmed`.
3. Build the Maya cancellation control. It must transition Jordan to Rescue mode, not a generic error.
4. Render Sam as a rescue candidate with the remaining 9-minute arrival slack; never show Maya’s pickup detail in this view.
5. Build a constrained report/block dialog that explains it is a demo reviewer workflow.

## Safety rules you enforce in UI

- No exact pickup text before confirmation.
- No public phone number, public rating, open chat, payment, or continuous tracking UI.
- A cancellation never states or implies that a substitute ride is guaranteed.
- The safety screen says Anchor cannot monitor trips or provide emergency response.
- Report/block is reachable during confirmed and in-progress states.

## Done when

- The 90-second cancellation-rescue sequence works from local fixtures.
- All confirmation/rescue states tell the user what action is next.
- Pickup reveal has a visible expiry label and is hidden in every other state.
- You cover the privacy/cancellation cases assigned to this role in `TEST_PLAN.md`.
