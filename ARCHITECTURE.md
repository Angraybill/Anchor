# Roomie Relay Architecture

## Product boundary

Roomie Relay is a real-time coordination system for 3–6 student or early-career roommates. Its core unit is a **relay**: a small chore or household need that moves through a safe shared workflow. Its standout hackathon feature is a **receipt-review pipeline** that converts a grocery receipt into editable shared items, a proposed split, and optional replenishment relays.

This replaces a generic task-list architecture with a deliberately more impressive—but still buildable—system:

```text
Scan receipt or start a relay
          │
          ▼
Review before any shared data is written
          │
          ▼
Open relay ──► atomic claim ──► complete ──► live House Pulse
          │                         │
          └── explainable suggestion ┘
```

The user experience and demo narrative are specified in [PRODUCT_DESIGN.md](PRODUCT_DESIGN.md). This document defines how to build the upgraded system securely and in parallel.

## What makes the system technically credible

| Capability | Implementation decision | Why it matters |
| --- | --- | --- |
| Live collaboration | Database realtime subscriptions scoped to the active household | Two users see a handoff immediately without page refresh |
| Claim correctness | One database RPC performs a conditional update and activity insert in a single transaction | Two roommates cannot accidentally claim the same work |
| Receipt intelligence | A server-side function sends a private image to OCR/vision and returns a typed draft | AI is useful but cannot autonomously create debt or work |
| Fairness | An explainable, bounded weekly recommendation over opt-in availability | Shows thoughtful product and data design, not a black-box score |
| Privacy | Auth plus database row-level security (RLS) on every household resource | Tenant isolation is guaranteed by the data layer, not only UI code |

## Recommended stack

| Layer | Technology | Scope |
| --- | --- | --- |
| Web client | React + TypeScript + Vite + Tailwind CSS | Mobile-first UI, typed components, responsive dashboard |
| Authentication | Supabase Auth | Email or magic-link login and session lifecycle |
| Database | Supabase Postgres | Relays, memberships, events, receipt drafts, fairness query |
| Live updates | Supabase Realtime | Relay and activity-feed synchronization |
| Secure workflows | Supabase Edge Functions | Receipt parsing and recommendation responses |
| File storage | Private Supabase Storage bucket | Receipt images are private household content |
| OCR / vision | Vision-capable model called by `scan-receipt` | Returns structured draft JSON only |

The core relay experience must run without the vision service. If OCR is unavailable, the Scan screen opens a manual item form or returns a deterministic fixture through the same typed contract.

## System diagram

```text
┌──────────────────────── React client ───────────────────────┐
│ Today · Relays · Scan · House                                │
│ typed data hooks · optimistic UI · error/empty/loading state │
└──────────┬───────────────────┬──────────────────┬───────────┘
           │                   │                  │
           ▼                   ▼                  ▼
   ┌─────────────┐     ┌─────────────────┐  ┌───────────────┐
   │ Auth session│     │ Postgres + RLS  │  │ Private files │
   └─────────────┘     │ relays/events  │  └───────┬───────┘
                       │ claim_relay()  │          │
                       └────────┬────────┘          ▼
                                │          ┌──────────────────┐
                                └─────────►│ Edge Functions   │
                                           │ scan-receipt     │
                                           │ confirm-receipt  │
                                           │ recommend-relay  │
                                           └────────┬─────────┘
                                                    ▼
                                            Vision / OCR provider
```

## Four independent build areas

| Teammate | Owns | Must deliver | Integration contract |
| --- | --- | --- | --- |
| 1 — Experience | App shell, sign-in/onboarding, design tokens, responsive navigation | A polished `Today` shell; `RelayCard`, form sheet, error/loading/empty states | Exposes `useCurrentHousehold()` and reusable UI only |
| 2 — Relay engine | Create, list, claim, complete, live activity UI | Two-user create → claim → complete loop and conflict UI | Calls typed `createRelay`, `claimRelay`, and `completeRelay` functions |
| 3 — Receipt intelligence | Upload, scan state, review/edit sheet, split preview | Receipt photo to user-editable draft, then confirmed proposal | Calls typed Edge Function contract; no direct confirmed writes from the browser |
| 4 — Platform/trust | Migrations, RLS, RPC, Edge Functions, realtime, recommendations | Cedar House seed; membership policies; atomic claim; a recommendation reason | Sole owner of schema/policy changes; publishes shared types before feature integration |

Each teammate works from `dev` on a small feature branch. The platform contract merges first; feature branches should not edit migrations or RLS directly.

## Domain model

```text
profiles 1 ── * household_members * ── 1 households
households 1 ── * relays 1 ── * relay_events
households 1 ── * availability_preferences
households 1 ── * receipt_scans 1 ── * receipt_items
receipt_scans 1 ── 0..1 expense_proposals
```

| Entity | Essential fields | Notes |
| --- | --- | --- |
| `profiles` | `id`, `display_name`, `avatar_color` | `id` equals the authenticated user ID |
| `households` | `id`, `name`, `invite_code`, `created_by`, `created_at` | Tenant root |
| `household_members` | `household_id`, `user_id`, `role`, `is_active`, `joined_at` | Membership/roles; active membership drives all access |
| `relays` | `id`, `household_id`, `kind`, `title`, `details`, `urgency`, `estimated_minutes`, `tags`, `status`, `claimed_by`, `completed_at`, `created_by` | `kind`: `chore` or `store` |
| `relay_events` | `id`, `household_id`, `relay_id`, `actor_id`, `type`, `metadata`, `created_at` | Append-only ledger for activity and fairness |
| `availability_preferences` | `household_id`, `user_id`, `windows`, `tags`, `unavailable_until` | Broad opt-in windows—not exact calendars |
| `receipt_scans` | `id`, `household_id`, `uploaded_by`, `image_path`, `status`, `extracted_json`, `created_at` | `uploaded`, `processing`, `ready`, `failed`, `confirmed` |
| `receipt_items` | `id`, `scan_id`, `label`, `amount_cents`, `category`, `is_household` | User may edit every field before confirmation |
| `expense_proposals` | `id`, `household_id`, `scan_id`, `total_cents`, `participant_ids`, `status` | Informational proposal; no payment integration in MVP |

All household-scoped rows include `household_id`. Amounts use integer cents; the application derives acting user IDs from the authenticated session, never a client-supplied ID.

## Relay lifecycle: integrity first

```text
open ──claim──► claimed ──complete──► completed
  │                  │
  └──cancel──► cancelled └──unclaim──► open
```

- Creation inserts the relay and `relay.created` event.
- `claim_relay(relay_id)` runs as an authenticated RPC. It updates only when `status = 'open'`, sets `claimed_by = auth.uid()`, and inserts `relay.claimed` in one transaction.
- If the conditional update changes zero rows, return a conflict response and refresh the card: “Jordan just picked this up.”
- Only the claimant or a household owner may complete; completion adds `relay.completed` and `completed_at`.
- Cancellation retains history; completed records are never hard-deleted.

## Authorization rules

Every RLS policy validates an active membership equivalent to:

```sql
exists (
  select 1 from household_members member
  where member.household_id = resource.household_id
    and member.user_id = auth.uid()
    and member.is_active = true
)
```

- Members may read their household's relays, events, receipt drafts, and proposals.
- Direct updates cannot claim or complete relays; those use the RPC so transition rules cannot be bypassed.
- Private receipt paths start with `{household_id}/{scan_id}/`; storage rules validate membership against that household ID.
- Edge Functions verify the authenticated caller, scan ID, and storage path before acting.
- The vision API key and any service-role credential are environment secrets only—never bundled into the client.

## Receipt-to-relay pipeline

```text
1. Validate image type/size in the client and upload to private storage.
2. Create receipt scan in `uploaded` state.
3. `scan-receipt` verifies membership, reads only the matching private file, and calls vision/OCR.
4. Validate model output against a strict schema; normalize prices to integer cents.
5. Store a draft and show an editable review sheet.
6. User marks items household/personal, changes entries, and chooses participants.
7. `confirm-receipt` validates again and creates items/proposal in one transaction.
```

The vision function may return only this shape:

```ts
type ReceiptDraft = {
  merchant?: string;
  purchasedAt?: string;
  currency: "USD";
  items: Array<{
    label: string;
    amountCents: number;
    category: "grocery" | "cleaning" | "household" | "other";
    confidence: number;
  }>;
};
```

Malformed output changes the scan to `failed` and shows manual fallback; it never writes a debt proposal or an open relay automatically.

## Fair Share recommendation

The recommendation is advisory, explainable, and only considers the last seven days:

```text
relay_weight = 1.25 if urgency = today; otherwise 1.0
contribution(member) = sum(completed relay weights over 7 days)
target = total contribution / active member count

recommendation = 0.55 × contribution_gap
               + 0.30 × availability_match
               + 0.15 × opted-in tag match
```

Exclude inactive users, the request creator, and anyone with `unavailable_until` in the future. If fewer than three relays are complete, return `fresh_week` rather than inventing a recommendation. The user sees one factual reason—e.g., “Suggested for Alex: available this evening and one relay this week”—and is always free to choose another person or leave it unclaimed.

## Shared client contract

```ts
createRelay(input: CreateRelayInput): Promise<Relay>
claimRelay(relayId: string): Promise<Relay> // throws ClaimConflictError on race
completeRelay(relayId: string, proofNote?: string): Promise<Relay>
getRecommendation(relayId: string): Promise<Recommendation>
setAvailability(input: AvailabilityInput): Promise<void>

createReceiptScan(file: File): Promise<ReceiptScan>
getReceiptDraft(scanId: string): Promise<ReceiptDraft>
confirmReceipt(scanId: string, input: ConfirmReceiptInput): Promise<ExpenseProposal>
```

Feature components call these functions rather than raw tables. A single shared realtime handler invalidates relay, activity, and House Pulse queries on household events.

## Six-hour demo build order

1. **0:00–0:40:** Owner 4 creates schema, RLS, `claim_relay`, typed client contracts, and seeded **Cedar House** data; Owner 1 sets up the visual shell.
2. **0:40–2:30:** Owners 2 and 3 build their flows in parallel; Owner 4 connects realtime. Use deterministic receipt data initially.
3. **2:30–3:45:** Add real receipt vision behind `scan-receipt`, but retain the fixture fallback.
4. **3:45–4:45:** Add recommendation reason, conflict handling, and House Pulse.
5. **4:45–6:00:** Test in two signed-in browser windows, refine the mobile layout, and record the 90-second demo backup.

## Acceptance checks

- [ ] A user from one household cannot read, update, or upload to another household.
- [ ] Two simultaneous claim attempts result in exactly one claimant and one `relay.claimed` event.
- [ ] An OCR failure leaves no expense proposal, relay, or leaked image URL.
- [ ] Both browser sessions update on create, claim, and completion without reloading.
- [ ] The product gives a clear suggestion reason but never automatically assigns or ranks people.
- [ ] Manual relay creation works even if the vision provider is unreachable.
