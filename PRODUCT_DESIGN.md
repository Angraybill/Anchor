# Roomie Relay — Hackathon Product Design

## One-sentence pitch

**Roomie Relay makes shared living feel fair without making roommates keep score.** It turns “can someone handle this?” into a one-tap handoff and gives the whole house a calm, visual picture of what needs doing today.

## Why this is more memorable than a chore app

Most roommate apps are spreadsheets with nicer colors: someone assigns chores and someone else eventually checks a box. Roomie Relay is specifically for the social awkwardness of shared apartments:

- Asking for help without sounding demanding.
- Avoiding duplicate store runs and forgotten essentials.
- Making invisible work visible without turning the home into a leaderboard.

The product vocabulary should reinforce that difference:

| Generic language | Roomie Relay language |
| --- | --- |
| Task | Relay |
| Assign | Pass it to the house |
| Assignee | Teammate who picked it up |
| Completed | Handled |
| Chore dashboard | Today at home |

## The winning MVP

Build a polished, narrow experience around one daily ritual: opening the app before leaving home or after returning from class.

### 1. Today at home (the hero screen)

The dashboard opens with a warm greeting, for example: **“Good afternoon, Cedar House. Two small relays will make tonight easier.”**

It contains:

1. **Needs a hand** — open relays grouped as `Today`, `This week`, and `Whenever`. Each shows a clear icon, title, creator, time context, and one primary **I’ll take it** button.
2. **In motion** — claimed relays with an avatar and a low-pressure state such as “Maya has this.”
3. **House pulse** — a small 7-day view showing workload balance, framed positively: “Everyone pitched in this week” or “Alex has had a busy week—offer them the next relay?”
4. **Recent wins** — a compact activity feed: “Jordan restocked paper towels · 14m ago.”

The floating action button reads **Start a relay**, not “Add task.”

### 2. Start a relay (the signature interaction)

A bottom sheet first asks the user to choose **Home chore** or **Store run**. It then captures only what matters:

| Field | Chore | Store run |
| --- | --- | --- |
| What needs doing? | “Take recycling out” | “Oat milk” |
| When? | Today / This week / Flexible | Before tonight / Next run / Flexible |
| Helpful detail | Optional note | Quantity and optional note |
| Ask style | Ask the house / Pick someone | Ask the house / Add to my run |

After submission, show a tiny, affirming confirmation: **“Relay sent to Cedar House.”** Avoid a noisy notification system in the first build; update the dashboard instantly instead.

### 3. Claim and close the loop

Tapping **I’ll take it** claims a relay immediately and changes the card to a distinct “in motion” state. The owner can tap **Handled** when done. On completion, show a short celebratory interaction—a checkmark ripple and one of a small set of messages such as “Nice one. The kitchen is happier already.”

This is the demo moment: two browser windows signed in as different housemates show a request being created, claimed, and completed in real time.

### 4. Fair Share, without shame

This is a gentle *signal*, not a points economy. For the last seven days, each completed relay counts as one contribution; a relay marked `today` counts as 1.25. The dashboard stores no rank or permanent score.

```text
member_share = member_weighted_completed_relays / household_weighted_completed_relays
target_share = 1 / active_household_member_count
balance_delta = member_share - target_share
```

Display only three friendly states:

- **Even flow**: each active member is within 15 percentage points of target.
- **A little lopsided**: one member is more than 15 points below target; suggest an open relay that they may want to claim.
- **Fresh week**: too little activity to infer anything.

Never display “last place,” red warning colors, or a permanent contribution total.

## Visual direction

The desired feeling is a well-loved shared kitchen: warm, capable, and unpretentious—not corporate productivity software.

| Element | Direction |
| --- | --- |
| Palette | Oat `#FAF7F0` background, ink `#20302B`, moss `#5B7C63` primary, apricot `#F4A261` urgency accent, sky `#8ECAE6` in-motion state |
| Type | Rounded, highly legible sans serif; one strong display weight for the greeting and calm regular body copy |
| Shape | 18–24px card radii, generous padding, soft 1px warm borders; avoid dense tables |
| Icons | Simple filled household objects: sponge, bag, milk carton, light bulb, recycling bin |
| Motion | 150–220ms ease-out transitions; checkmark ripple on completion; respect reduced-motion settings |
| Avatars | Initials in varied muted colors, with a small online/status dot only if real-time presence is implemented |

### Card anatomy

```text
┌─────────────────────────────────────┐
│  ◉  TAKE RECYCLING OUT       TODAY  │
│     Kitchen bin is full             │
│                                     │
│  Requested by Sam          [I'll do]│
└─────────────────────────────────────┘
```

Use a maximum of one primary action on every card. Claimed cards replace it with an avatar/status line; completed cards move into the recent-wins feed rather than remaining in the work queue.

## Information architecture

```text
Today at home
 ├─ Needs a hand
 ├─ In motion
 ├─ House pulse
 └─ Recent wins

Relays
 ├─ Chores
 └─ Store run

House
 ├─ Members
 └─ Invite roommates
```

On mobile, use a bottom navigation with `Today`, `Relays`, and `House`. On desktop, use a slim left rail. The route names in `ARCHITECTURE.md` can remain `/dashboard`, `/chores`, and `/shopping` internally while labels use the product language above.

## Four-person build plan

| Teammate | Owns | Must ship | Demo responsibility |
| --- | --- | --- | --- |
| 1 — Experience | App shell, auth/onboarding, design tokens, responsive navigation | Household name/invite onboarding; reusable card, button, and empty-state components | Opens the demo and explains the roommate pain point |
| 2 — Chore relay | Chore creation, state transitions, filtering, completion interaction | “Start a home chore,” claim, status state, handled animation | Creates and completes a kitchen relay in the second browser |
| 3 — Store relay | Shopping creation, recurring essentials, claimed/purchased state | “Start a store run,” item details, claim, purchase flow | Shows a missing staple and prevents the duplicate buy |
| 4 — Live house | Schema, auth rules, real-time subscriptions, dashboard/pulse/activity | Shared data client, seeded demo household, Today dashboard, Fair Share calculation | Switches user views to prove instant shared updates and fair balance |

### Integration boundaries

- Teammate 1 supplies only reusable presentation components and current-household context; feature owners do not duplicate layout or auth logic.
- Teammates 2 and 3 own the UI and mutations for their resource types, but use the shared status names and data fields from `ARCHITECTURE.md`.
- Teammate 4 is the only person changing migrations and row-level security policies; teammates 2 and 3 request additions through a small schema checklist.
- All four use one seeded household—**Cedar House**—with Sam, Maya, Jordan, and Alex so the demo is reliable.

## 90-second demo script

1. **0–15s:** “Shared living breaks down in tiny, awkward moments. Roomie Relay makes those moments easy to hand off.” Show `Today at home` with one open chore and one store need.
2. **15–35s:** As Sam, start “Take recycling out” and select `Today`. The relay appears on the shared dashboard.
3. **35–55s:** Switch to Maya’s session. She taps **I’ll take it**. Sam’s view updates to “Maya has this” without refreshing.
4. **55–70s:** Maya marks it **Handled**. Show the checkmark and the recent-wins feed.
5. **70–85s:** Create “Oat milk — 2 cartons,” then show Jordan adding it to their store run.
6. **85–90s:** Reveal the House Pulse: “Fairness without scorekeeping.” End on the phrase “A calmer home, one relay at a time.”

## Scope guardrails

Build these first: shared household, real-time relay status, one polished create/claim/complete loop, seeded demo data, and mobile-responsive UI.

Do not spend hackathon time on chat, payments, complicated recurring schedules, push notifications, ranking systems, or arbitrary AI features. If time remains, add photo proof for a completed chore or a “suggest the next relay” helper based on the least-recent contributor.

## Demo acceptance checklist

- The app loads with realistic Cedar House data and no blank screen.
- A guest can understand the next action in under five seconds.
- A newly created relay appears in another session without a manual refresh.
- Claiming prevents a second user from taking the same relay.
- Completion moves the relay to Recent wins and updates the house pulse.
- The interface looks intentional at mobile and desktop sizes.
