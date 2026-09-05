# Project Architecture — Product Name TBD

The product has no finalized name. `LAST-Roomate-Helper` is only the repository name.

## Architecture direction

The current implementation is a simple responsive React + TypeScript client built with Vite and a Node.js + TypeScript + Express API. MongoDB stores households, users, memberships, tasks, inventory, and activity. Authentication is intentionally simplified for the weekend MVP: the landing page creates or joins a household and stores local household/user IDs.

The core experience is a shared household dashboard with tasks, task handoffs, points, communal inventory, duplicate warnings, and limited reminders.

## Local structure

```text
src/main.tsx       React application and API-backed UI
src/styles.css     Responsive visual styles
server/index.ts    Express routes and MongoDB persistence
index.html         Vite entry document
```

Run `npm install` followed by `npm run dev` to start both processes.

## Domain model

```text
Household 1 --- * Member
Household 1 --- * Task
Household 1 --- * InventoryItem
Task 1 --- * Trade
```

### Entities

| Entity | Required fields |
| --- | --- |
| `household` | `id`, `name`, `joinCode` |
| `member` | `id`, `householdId`, `name`, `points` |
| `task` | `id`, `householdId`, `title`, `kind`, `assignedTo`, `createdBy`, `dueDate`, `recurrence`, `points`, `status` |
| `inventoryItem` | `id`, `householdId`, `name`, `quantity`, `status`, `lastPurchasedBy`, `purchasedAt`, `expiresAt` |
| `trade` | `id`, `taskId`, `fromMember`, `toMember`, `pointAdjustment`, `status` |
| `activityEvent` | `id`, `householdId`, `actorId`, `description`, `createdAt` |

`task.kind` is either `chore` or `shopping`. Task status should include `open`, `claimed`, `done`, and `deferred`. Inventory status should include `available`, `running_low`, `needed`, and `recently_purchased`.

## Core operations

```text
createHousehold(name)
joinHousehold(joinCode)
addMember(householdId, member)

createTask(input)
completeTask(taskId)
offerTask(taskId, memberId, pointAdjustment)
acceptTrade(tradeId)
rejectTrade(tradeId)
deferTask(taskId)

addInventoryItem(input)
recordPurchase(itemNames)
findPossibleDuplicates(itemName)
setInventoryStatus(itemId, status)
```

## Rules

- Every household-scoped record must include `householdId`.
- Use stable IDs instead of display names for relationships.
- Trim required text and reject empty task or item names.
- Normalize grocery names for duplicate comparison, including capitalization, spacing, and simple singular/plural differences.
- A duplicate match produces a warning; it must not silently remove the user’s request.
- A task trade changes ownership only after the recipient accepts.
- Completing a task awards points exactly once.
- A task may not be completed twice or claimed by two members at the same time.
- Keep demo data and simulated receipt behavior clearly marked.

## UI structure

The minimum interface can be one responsive page with sections or tabs for:

- Household dashboard
- Tasks
- Shared inventory
- Activity and reminders

If the implementation uses routes, internal routes may be `/dashboard`, `/tasks`, and `/inventory`. User-facing labels should not depend on a final product name.

## Data and privacy

For a multi-user implementation, users may read and modify only records belonging to their household. The MVP uses household/user IDs from the browser rather than production authentication; do not imply production-grade account security.

Do not store secrets in the repository or expose private household data outside the household.

The server reads the complete `MONGODB_URI` from the environment. `MONGODB_USERNAME` and `MONGODB_PASSWORD` are not required when the URI already contains credentials.

## Verification

Verify the complete demo path:

1. Create or load a household.
2. Add and assign a chore.
3. Offer it to another member and accept the trade.
4. Complete it and confirm points update once.
5. Add a communal item and record a matching purchase.
6. Confirm the duplicate warning and inventory update.
7. Confirm a due-soon or bedtime reminder is visible.

Also check empty states, overdue tasks, rejected trades, invalid household codes, mobile layout, desktop layout, and any available lint, typecheck, test, or build commands.
