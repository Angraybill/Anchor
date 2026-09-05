# Roommate Helper Architecture

## Product concept: Roomie Relay

Roomie Relay is an *in-the-moment household handoff* app for student roommates. Instead of another static chore board, it turns the two recurring moments of apartment friction—"someone needs to do this" and "we are out of this"—into small, visible requests that are easy to accept, complete, and credit.

The MVP lets a member create a **relay** (a chore or shopping need), ask the house for help, and see a fair, low-pressure handoff: **Request → claimed → proof/completed → shared credit**. A concise home screen answers three questions immediately: *what needs attention today, who has it, and is the house sharing the load fairly?*

See [PRODUCT_DESIGN.md](PRODUCT_DESIGN.md) for the hackathon-specific product, visual, and demo design.

## Recommended stack

Use a simple client/server architecture:

```text
Browser (React + TypeScript)
        |
        | HTTPS / JSON
        v
API server (Node.js + Express)
        |
        +-- Authentication provider
        |
        v
Database (PostgreSQL / Supabase)
```

For a hackathon build, Supabase is a strong option because it supplies Postgres, authentication, and real-time updates. The same domain model still works with a custom API and database.

## System areas

```text
                     +------------------+
                     |  App shell/UI    |
                     | navigation, auth |
                     +--------+---------+
                              |
          +-------------------+-------------------+
          |                   |                   |
  +-------v-------+   +-------v-------+   +-------v-------+
  | Household     |   | Chores        |   | Shopping      |
  | members,      |   | assignments,  |   | lists, items, |
  | permissions   |   | schedules     |   | ownership     |
  +-------+-------+   +-------+-------+   +-------+-------+
          \                   |                   /
           \                  |                  /
            +-----------------v-----------------+
            | Shared data layer / API + database |
            +------------------------------------+
```

## Team split

| Owner | Area | Main deliverables | Depends on |
| --- | --- | --- | --- |
| 1 | App shell and authentication | Sign in/out, create/join household flow, navigation, current-user state | Data schema for `users`, `households`, and `household_members` |
| 2 | Relays: chores | Chore relay composer, urgency/due-time labels, claim/complete flow, rotation suggestions | Household member selector and chore API/table |
| 3 | Relays: shopping | Shopping relay composer, add/edit/remove, claim/purchased flow, recurring essentials | Household member selector and shopping API/table |
| 4 | Shared platform and command center | Database schema/migrations, API or Supabase client, authorization rules, **Today** dashboard and Fair Share calculation | Requirements from all feature owners |

Each owner should work in a separate feature branch. Team member 4 owns schema changes and publishes the data contract before feature work is integrated.

## Core data model

```text
User 1 --- * HouseholdMember * --- 1 Household
Household 1 --- * Chore
Household 1 --- * ShoppingItem

Chore.assigned_to_user_id ------> User (optional)
ShoppingItem.claimed_by_user_id -> User (optional)
```

### Tables / collections

| Entity | Key fields |
| --- | --- |
| `users` | `id`, `name`, `email`, `avatar_url`, `created_at` |
| `households` | `id`, `name`, `invite_code`, `created_by`, `created_at` |
| `household_members` | `household_id`, `user_id`, `role` (`owner` or `member`), `joined_at` |
| `chores` | `id`, `household_id`, `title`, `description`, `assigned_to_user_id`, `due_date`, `urgency` (`today`, `this_week`, `flexible`), `status` (`open`, `claimed`, `done`), `created_by`, `completed_at` |
| `shopping_items` | `id`, `household_id`, `name`, `quantity`, `notes`, `claimed_by_user_id`, `status` (`needed`, `claimed`, `purchased`), `is_recurring`, `created_by`, `purchased_at` |
| `activity_events` | `id`, `household_id`, `actor_user_id`, `entity_type`, `entity_id`, `action`, `created_at` |

All household-scoped records must include `household_id`. Never accept a household ID without checking that the current user belongs to that household.

## Feature contracts

The UI should treat these operations as the stable interface, whether they call REST endpoints or a Supabase client directly.

```text
Household
  createHousehold(name)
  joinHousehold(inviteCode)
  getCurrentHousehold()
  getHouseholdMembers(householdId)

Chores
  listChores(householdId)
  createChore(input)
  updateChore(id, changes)
  claimChore(id, userId)
  completeChore(id)
  deleteChore(id)

Shopping
  listShoppingItems(householdId)
  createShoppingItem(input)
  updateShoppingItem(id, changes)
  claimShoppingItem(id, userId)
  purchaseShoppingItem(id)
  deleteShoppingItem(id)
```

`input` and returned objects should use the field names in the data model above. Use ISO 8601 timestamps and `YYYY-MM-DD` dates.

## Pages and components

| Route | Components | Owner |
| --- | --- | --- |
| `/login` | sign-in form | 1 |
| `/onboarding` | create household, join-by-code form | 1 |
| `/dashboard` | overdue chores, upcoming chores, needed shopping count | 4 |
| `/chores` | `ChoreList`, `ChoreForm`, `ChoreCard` | 2 |
| `/shopping` | `ShoppingList`, `ShoppingItemForm`, `ShoppingItemRow` | 3 |
| shared | `AppLayout`, navigation, loading/error/empty states | 1 |

## Authorization and validation

- Only authenticated users can access the app.
- A user may read and change only records in households they belong to.
- Owners may manage household membership; members can manage chores and shopping items in their household for the MVP.
- Validate required titles/names, trim user input, and disallow empty values.
- Confirm destructive actions in the UI and show a useful error if a request fails.

## Suggested delivery order

1. Owner 4 creates the schema, seed household, and shared data client.
2. Owner 1 builds sign-in/onboarding and the app layout.
3. Owners 2 and 3 build chores and shopping in parallel against the agreed contract.
4. Owner 4 connects the dashboard, verifies household isolation, and handles end-to-end polish.

## Definition of done for the MVP

- A user can create or join a household.
- Household members see the same chores and shopping items.
- A relay can be created, claimed, completed, and filtered by status.
- A shopping item can be added, claimed, and marked purchased.
- The dashboard clearly displays today's relays, recent activity, and the Fair Share signal.
- Users cannot view or modify another household's data.
- Empty, loading, and error states work on every main page.
