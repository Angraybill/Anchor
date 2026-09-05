# Project Guidelines — Product Name TBD

## Project overview

This project is a weekend hackathon MVP for roommates. Its working title is provisional; the final product name has not been decided. It helps a household coordinate shared chores and communal purchases in one place.

The primary hackathon track is **10 Minutes Back**. The product should save time by reducing duplicate grocery purchases, forgotten responsibilities, and repeated roommate coordination messages.

## MVP scope

The MVP should support this complete workflow:

1. Create or join a household.
2. Add roommates.
3. Create household tasks with an owner, due date, and point value.
4. Complete tasks and award points.
5. Offer a task to another roommate and accept or reject the trade.
6. Track communal grocery items and their current status.
7. Record a purchase and warn about possible duplicate items.
8. Show reminders for tasks that are due soon or before bedtime.

Manual grocery entry or a limited/mock receipt flow is acceptable. A reliable demo is more important than broad automation.

## Product principles

- Keep the experience simple enough to understand immediately during a demo.
- Optimize for one household and a small number of roommates.
- Prefer clear workflows over a large number of features.
- Make task ownership and changes visible to everyone affected.
- Preserve user control: roommates can accept, reject, trade, or defer tasks.
- Treat points as a coordination mechanism, not a measure of personal worth.

## Core experience

The dashboard should show open tasks, tasks due soon, needed shopping items, duplicate-purchase warnings, roommate points, and recent activity.

Every task should clearly show its name, owner, due date or recurrence, point value, and status. Completing a task should award points exactly once.

Task trades must require acceptance from the receiving roommate. The interface should show the task, original owner, proposed owner, and any point adjustment.

Communal inventory should distinguish at least between available, running low, needed, and recently purchased. A possible duplicate should produce a warning rather than silently deleting a request.

Reminders should be useful and limited, prioritizing tasks due that day or the next morning.

## Engineering and collaboration guidelines

- Inspect the existing project setup before changing files or adding dependencies.
- Preserve teammate changes and avoid broad rewrites.
- Use stable IDs for users, tasks, inventory items, and trades.
- Normalize grocery names before duplicate comparison, including capitalization, spacing, and simple singular/plural differences.
- Handle empty states, rejected trades, overdue tasks, duplicate purchases, and invalid household codes.
- Never hard-code secrets or API keys.
- Mark mock data, simulated receipt scans, and demo-only behavior clearly.
- If intended behavior is unclear, ask before making a product-level assumption.

## Weekend boundaries

Do not add native mobile apps, payment processing, grocery delivery integrations, perfect OCR, complex authentication, multiple-household support, advanced fairness scoring, or calendar integrations unless the team explicitly changes scope.

## Verification

Before considering a change complete:

- Run the project's available lint, typecheck, test, or build commands.
- Verify the primary demo flow from household creation through task completion and duplicate detection.
- Check narrow mobile and desktop layouts.
- Verify that trades require acceptance and points update only once.
- Report unrun checks and known limitations honestly.

## Demo flow

1. A roommate adds toilet paper or paper towels to the shopping list.
2. Another roommate records or scans a recent purchase.
3. The app identifies the likely duplicate and updates inventory.
4. A roommate offers a chore to someone else, who accepts it for points.
5. The dashboard, ownership, points, and bedtime reminder update visibly.

The product name is provisional. Candidate names include SharedState, HouseSync, Roommate Runtime, ChoreScore, and other names agreed upon by the team.
