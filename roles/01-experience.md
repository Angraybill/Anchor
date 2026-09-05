# Role 1 — Experience and Visual System

## Your mission

Make Anchor feel trustworthy, precise, and polished before a judge reads any technical explanation. Your success metric: a first-time viewer knows the next action and the current trip state in five seconds.

## You own

- `src/app/`, global navigation, page layout, loading/empty/error shells
- `src/components/` presentation primitives: buttons, cards, status chips, dialogs, timeline, zone badge, countdown/slack display
- `src/styles/`, design tokens, responsive behavior, accessible focus/contrast/motion rules
- dashboard composition and demo visual polish

## You do not own

- `supabase/`, schemas, RLS, env files, realtime subscriptions, auth configuration
- canonical contracts in `src/lib/contracts.ts`
- match transition logic, exact pickup visibility condition, or rescue eligibility

## First build order

1. Build a mobile-first app shell with a simple Anchor wordmark and `Today`, `Offer a route`, and `Safety` navigation.
2. Create `DeadlineCard`, `RouteOfferCard`, `MatchTimeline`, `RescueBanner`, `PickupRevealCard`, and state-specific empty/error panels.
3. Use only the fixture data in `IMPLEMENTATION_CONTRACT.md`; do not wait for backend work.
4. Make all visual states explicit: open, candidate, waiting on driver, waiting on rider, confirmed, canceled, rescue, no match, completed.
5. Test at 375px and desktop width with keyboard navigation and reduced motion.

## Non-negotiable UX rules

- A time/deadline is always more visually prominent than a decorative map.
- Do not render a home address. Pre-confirmation cards show zones only.
- “Verified student” is a membership label, not a safety guarantee.
- Rescue mode must feel calm and actionable, not like an error toast.
- One primary action per card. If a user must wait, state who acts next.

## Done when

- Jordan’s journey can be fully shown with local fixtures.
- Each route in the shared contract has a visually intentional state.
- Your component API has no direct database calls.
- You provide screenshots or a short recording for desktop and mobile.
