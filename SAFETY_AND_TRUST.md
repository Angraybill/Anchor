# Anchor Safety and Trust Model

## The product stance

Anchor is a **student-to-student coordination tool**, not a transportation provider. It can reduce coordination friction; it cannot make driving risk-free or promise that every student will receive a ride.

The design must be honest about that boundary in onboarding, the demo, and every active-trip screen.

## Closed-network rule

- Every rider and driver is a currently verified Cal Poly student before they can create, view, or accept a ride.
- The first release is limited to one opt-in community or pilot group, not a campus-wide public feed.
- A school email alone is a membership signal, not a criminal-background check, driving-record check, or insurance guarantee.
- Drivers explicitly attest that they hold a valid license, have permission to use the vehicle, and meet applicable insurance requirements. This attestation is not represented as third-party verification.

## Trust by design

| Risk | Product control |
| --- | --- |
| Unverified stranger access | Closed community + verified student state; disabled accounts are removed from matching immediately |
| Address exposure | Requests/offers use zones; exact pickup is visible only after mutual acceptance and expires after the trip |
| Pressure to accept | No auto-booking, no public acceptance leaderboard, and clear decline/cancel controls |
| Harassment or unwanted contact | No open chat in MVP; participants can block/report; reports immediately remove future matching eligibility pending review |
| Social “rating” harm | No public ratings, comments, or popularity score; reliability is a private bounded matching input |
| Cancellation harm | Explicit cancellation reason, event history, and Fallback Mesh rematching—not punitive public shaming |
| False safety claims | UI labels demo-only verification/route functionality and provides a direct emergency-services boundary |

## Location-minimization policy

1. **Before a match:** only campus, neighborhood, or predefined landmark zones are visible.
2. **During candidate review:** the driver and rider see time constraints and zones, not exact pickup notes.
3. **After mutual acceptance:** both see one agreed public pickup location. A residential pickup requires an affirmative, separate rider choice.
4. **After completion/cancellation:** the exact pickup payload is unavailable to the app UI and scheduled for deletion at its TTL.
5. **For analytics:** store coarse zones and aggregate timing only; never use raw pickup detail for product analytics.

## Active-trip safety controls

The MVP active-trip card includes:

- verified-student badge and first name only;
- agreed pickup landmark and narrow time window;
- “I’m here” check-in for both participants;
- cancel action that immediately activates the rescue workflow where appropriate;
- block/report action; and
- visible text: “If you feel unsafe or face an emergency, contact local emergency services. Anchor cannot monitor your trip.”

Do not imply that an in-app check-in is live location tracking, an emergency response system, or a safety guarantee.

## Moderation workflow

```text
student submits report
        ↓
API records immutable report event and excludes the pair from future matching
        ↓
reported account is placed in restricted state for the pilot
        ↓
authorized reviewer examines the report under a documented campus policy
        ↓
account is restored, limited, or removed; decision is auditable
```

For the hackathon prototype, the reviewer queue is a clearly labeled simulated admin view. Do not imply that a real campus safety office is monitoring it unless a real partnership exists.

## Data retention

| Data | Retention goal |
| --- | --- |
| Session token | Short-lived; revocable; store only a secure hash server-side |
| Exact pickup reveal | Expire/decryptability removed immediately after the trip window; hard-delete on short TTL |
| Coarse trip event | Retain only as long as needed for pilot reliability and safety review |
| Safety report | Retain under a documented, restricted review policy |
| Analytics | Aggregate/de-identify before product reporting |

## Not in the MVP

- payments, tipping, fare calculation, or driver compensation;
- continuous location tracking or turn-by-turn navigation;
- a promise of background checks, insurance coverage, or emergency monitoring;
- public rider/driver profiles, comments, or star ratings;
- open campus-wide discovery;
- matching based on protected characteristics or inferred sensitive data.

## Safety demo checklist

- [ ] Every demo user visibly has a verified-student state.
- [ ] Candidate cards contain zones only—no home address.
- [ ] Exact pickup appears only after both participants accept.
- [ ] Cancellation enters rescue mode without exposing the canceled driver’s information to new candidates.
- [ ] Block/report removes a pair from next-match eligibility.
- [ ] Screens describe simulated behaviors honestly.
