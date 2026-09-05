# Anchor Team Workflow

## The four lanes

| Teammate | Branch | Owns the judge-visible moment |
| --- | --- | --- |
| 1 | `anchor/experience` | “This feels like a calm, credible product—not a student project.” |
| 2 | `anchor/flow` | “I can create a deadline-bound request and understand why this ride fits.” |
| 3 | `anchor/rescue` | “A cancellation becomes a trustworthy rescue flow rather than a dead end.” |
| 4 | `anchor/platform` | “The system is real: secure, concurrent, live, and reproducible.” |

## First five minutes on each teammate’s machine

```text
git clone <repository-url>
git fetch origin
git switch anchor/<your-lane>
git pull --ff-only
```

Then prompt Codex with:

> Read `AGENTS.md`, `TEAM_WORKFLOW.md`, `IMPLEMENTATION_CONTRACT.md`, and the role brief for my current branch. Summarize my owned scope, forbidden files, first task, and acceptance checks before editing anything.

Codex must use the current branch as the source of truth for ownership. A teammate should not work on `main` directly.

## Daily integration rhythm

1. **Platform first:** Team 4 creates scaffold, contracts, schema, auth boundary, RLS, demo seed, and deployment preview.
2. **Static progress in parallel:** Teams 1–3 build against the fixtures in `IMPLEMENTATION_CONTRACT.md`; no one waits for a live backend to make visual progress.
3. **Contract checkpoint:** Team 4 posts the generated types and command interfaces. Teams 2–3 replace fixture calls without altering API semantics.
4. **Vertical-slice merge:** Merge a working rider/driver request → candidate → offer → accept flow before adding Rescue mode.
5. **Two-session rehearsal:** Run Jordan and Maya in separate browsers; then trigger cancellation and Sam’s rescue path.
6. **Freeze:** Stop new features once the 90-second script works three times in a row.

## Branch rules

- Work in small, cohesive commits using conventional prefixes: `feat:`, `fix:`, `test:`, `docs:`, or `chore:`.
- Rebase or merge `origin/main` only after checking with the team; never overwrite another branch with force-push.
- Never solve a cross-lane issue by editing someone else’s owned file. Add a short `CONTRACT_REQUEST` note to your PR/commit instead.
- Use mock data only through the named demo fixtures. A mock must be visible to users as simulated behavior.
- Do not add secrets, real student information, real addresses, or unrestricted location data to the repository.

## Integration definition of done

Before any branch merges into `main`:

- Its owned acceptance cases in [TEST_PLAN.md](TEST_PLAN.md) pass.
- It uses the interfaces in [IMPLEMENTATION_CONTRACT.md](IMPLEMENTATION_CONTRACT.md), not a private copy.
- It has a loading, empty, error, and success state.
- Mobile view at 375px and desktop view are checked where UI changes.
- Demo-only verification, route estimate, notification, and moderation behavior is labeled honestly.

## The demo order

| Time | Speaker / owner | Screen and claim |
| --- | --- | --- |
| 0–15s | Team 1 | Product thesis and rider dashboard |
| 15–35s | Team 2 | Jordan creates an arrive-by request and gets transparent candidates |
| 35–50s | Team 3 | Maya offers seat; both accept; public pickup landmark appears |
| 50–70s | Team 3 | Maya cancels; Rescue mode protects the deadline and finds Sam |
| 70–82s | Team 4 | Separate browser updates in realtime; explain atomic seat and privacy boundary |
| 82–90s | Team 1 | End with “Anchor makes the rides already happening dependable enough for students who need them.” |
