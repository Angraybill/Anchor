# Hackathon Product Design — Product Name TBD

The product has no finalized name. `LAST-Roomate-Helper` is only the repository name, and no candidate name should be treated as final branding.

## One-sentence pitch

A responsive web app that helps roommates coordinate shared chores and communal purchases, avoid duplicate grocery buys, and save time otherwise lost to household logistics.

## Target track

**10 Minutes Back:** the product reduces repeated roommate messages, forgotten responsibilities, unnecessary store trips, and duplicate purchases.

## Weekend MVP

The MVP supports one household and a small number of roommates. Users can:

- Create or join a household.
- Add roommates.
- Create chores or communal shopping tasks with an owner, due date, recurrence, and point value.
- Complete tasks and receive points exactly once.
- Offer a task to another roommate for acceptance or rejection.
- Defer or redelegate a task through an explicit handoff flow.
- Track communal items as available, running low, needed, or recently purchased.
- Record a purchase or use a limited/mock receipt scan.
- See reminders for tasks due soon or before bedtime.

## Main screens

### Household dashboard

Show open tasks, tasks due soon, needed shopping items, duplicate-purchase warnings, roommate points, and recent activity.

### Tasks

Each task card shows its title, owner, due date, recurrence, point value, and status. Use one clear primary action per card: complete, trade, or accept depending on state.

### Shared inventory

Show communal items and their status. When a roommate adds an item that is already available or was recently purchased, show a warning instead of silently deleting the request.

### Reminder view

Show a calm summary of tasks due that day or the next morning. Avoid repeated or noisy notifications.

## Interaction principles

- Make ownership and changes visible to everyone affected.
- Require the receiving roommate to accept a trade.
- Use points to coordinate effort, not to shame or permanently rank roommates.
- Use positive, plain-language confirmations such as “Task handed off” or “Purchase recorded.”
- Support empty, overdue, rejected-trade, and duplicate-item states.

## Suggested demo

1. A roommate adds toilet paper or paper towels to the shopping list.
2. Another roommate records or mock-scans a recent purchase.
3. The app identifies the likely duplicate and updates the shared inventory.
4. A roommate offers a chore to someone else, who accepts it for points.
5. The dashboard, ownership, points, and bedtime reminder update visibly.

## Scope guardrails

Do not spend weekend time on native mobile apps, payment processing, grocery delivery, perfect receipt OCR, complex authentication, multiple households, advanced fairness scoring, calendar integrations, chat, or arbitrary AI features.

Manual grocery entry and seeded demo data are acceptable. A reliable, understandable web demo is more important than broad automation.
