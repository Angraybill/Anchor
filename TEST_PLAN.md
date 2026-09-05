# Anchor Test Plan

## Release commands

When implementation begins, the project must expose equivalent commands for:

```text
test          unit and integration tests
check         type and static checks
build         production build
audit         production dependency vulnerability scan
```

No implementation is considered ready until those commands pass and the two-browser demo is rehearsed.

## Functional cases

| ID | Scenario | Expected result |
| --- | --- | --- |
| F-01 | Verified student joins pilot community | Only an active verified account can create or view ride data |
| F-02 | Unverified student attempts to create a request/offer | Request is denied with a clear verification state; no partial record is created |
| F-03 | Rider creates deadline-bound Anchor trip | System stores zones, arrive-by time, flexibility, and preferences; no exact home address is required |
| F-04 | Driver creates route offer | Offer has a valid departure window, positive seat count, maximum detour, and expiry |
| F-05 | Matching filters candidates | Incompatible time, seat, route, block/report, or preference candidates never appear |
| F-06 | Matching explanation | Eligible candidate presents at least one factual reason such as arrival slack or detour |
| F-07 | Driver offers a seat | Only offer owner can transition an eligible candidate to `driver_offered` |
| F-08 | Rider accepts | Only request owner can accept; confirmed state reserves one seat and unlocks pickup reveal |
| F-09 | Driver/rider decline | Match closes without decrementing a seat or exposing exact pickup data |
| F-10 | Check-in / complete | Only confirmed participants can check in or complete; event timeline is written |
| F-11 | Driver cancellation | Confirmed cancellation creates Rescue mode only if arrival deadline remains viable |
| F-12 | Rescue candidate | Rescue suggestions obey the same eligibility and privacy checks as initial matches |
| F-13 | No rescue possible | Product displays honest no-match state and approved fallback guidance; it does not claim a ride is coming |
| F-14 | Block/report | Pair is immediately excluded from future matching; report visibility is restricted |
| F-15 | Expiry | Expired offer/request/candidate is not actionable and exact pickup data is unavailable |

## Concurrency and state integrity

| ID | Attempt | Expected result |
| --- | --- | --- |
| C-01 | Two riders accept a driver’s last seat simultaneously | One transaction succeeds; one receives a conflict; `seats_open` never goes negative |
| C-02 | Driver cancels while rider accepts | Exactly one valid state transition occurs; event ledger captures the winner; no pickup reveal leaks |
| C-03 | Client repeats an accept/complete request | Command is idempotent or safely conflicts; no duplicate event or seat decrement |
| C-04 | Expired candidate accepts | Server rejects it even if a stale UI still shows it |
| C-05 | Declined candidate tries to check in | Server rejects it; no active-trip data appears |

## Authorization and privacy cases

| ID | Attempt | Expected result |
| --- | --- | --- |
| S-01 | Guess another request, match, or pickup-reveal UUID | Server returns no data unless caller is authorized participant/community member at the allowed detail level |
| S-02 | Submit another student’s ID as request/driver/rider | Server ignores client actor IDs and derives actor from authenticated session |
| S-03 | Candidate tries to retrieve exact pickup detail before both accept | No exact location value is returned |
| S-04 | Former participant retrieves a TTL-expired reveal | Decryption/read is denied and record is unavailable |
| S-05 | User from another community searches offers | No candidate records are returned |
| S-06 | Origin outside configured app domain calls API | CORS denies browser access; server authentication still protects data independently |
| S-07 | Payload uses oversized text, impossible deadline, negative seats, or excessive detour | Server returns validation error; no partial row persists |
| S-08 | Error path occurs in route provider or notification service | UI receives safe generic error; server logs omit tokens and precise location values |

## Accessibility and UX cases

| ID | Check | Expected result |
| --- | --- | --- |
| U-01 | 375px-wide screen | Deadline, acceptance, cancellation, and report actions remain visible/reachable |
| U-02 | Keyboard-only flow | Forms, cards, dialogs, and status updates have reachable focus order and labels |
| U-03 | Screen reader | Status transitions use an announced live region; buttons state who must act next |
| U-04 | Color contrast | Confirmed, warning, rescue, and error states remain distinguishable without color alone |
| U-05 | Empty state | No offers/matches state offers clear next action and does not imply a guaranteed ride |
| U-06 | Slow connection | Pending acceptance is visibly disabled; duplicate taps cannot make two requests |

## Manual safety rehearsal

- [ ] Explain that pilot verification is not a background check.
- [ ] Demonstrate zones before acceptance and public pickup only after acceptance.
- [ ] Demonstrate that both parties can decline without penalty UI.
- [ ] Demonstrate cancellation and Rescue mode without revealing the prior driver to new candidates.
- [ ] Demonstrate block/report and explain that its reviewer view is simulated unless a real partner exists.
- [ ] Confirm no real addresses, student data, or credentials are present in the demo seed.
