# Roommate Coordination MVP — Name TBD

This repository contains a weekend hackathon MVP for helping roommates coordinate shared chores and communal purchases. The product does not have a finalized name yet; `LAST-Roomate-Helper` is only the repository name.

The project is intended to be a responsive web app for the **10 Minutes Back** track. It reduces time lost to duplicate grocery purchases, forgotten responsibilities, and repeated roommate coordination messages.

## MVP

The MVP supports one household and a small number of roommates. It should allow users to:

- Create or join a household
- Add roommates
- Create tasks with an owner, due date, recurrence, and point value
- Complete tasks and earn points
- Offer tasks to another roommate for acceptance or rejection
- Track communal items as available, running low, needed, or recently purchased
- Record or mock-scan purchases and warn about likely duplicate items
- View reminders for tasks due soon or before bedtime

Manual grocery entry or a limited/mock receipt flow is acceptable for the weekend MVP.

## Run locally

Install dependencies and start the React client and Node API together:

```bash
npm install
npm run dev
```

The Vite client runs on `http://localhost:5173` and proxies API requests to the Node server on `http://localhost:3001`. The API persists households, users, memberships, tasks, inventory items, and activity in MongoDB. Set `MONGODB_URI` in a local `.env` file before starting the server. Never commit `.env`.

Useful checks:

```bash
npm run check
npm run build
```

## Landing page

The landing page lets a roommate create a household or join one with an invite code. After joining, the browser stores only the household and user IDs needed to load that household’s dashboard.

## Demo flow

1. A roommate adds toilet paper or paper towels to the shopping list.
2. Another roommate records or scans a recent purchase.
3. The project identifies the likely duplicate and updates the shared inventory.
4. A roommate offers a chore to someone else, who accepts it for points.
5. The dashboard, ownership, points, and bedtime reminder update visibly.

## Scope boundaries

The first weekend does not require a native mobile app, payment processing, grocery delivery integration, perfect receipt OCR, complex authentication, multiple-household support, advanced fairness scoring, or calendar integrations.

The product name remains undecided. Do not treat the repository name or any candidate name as final branding.
