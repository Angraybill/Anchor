# Anchor — Product Design

## The idea in one sentence

**Anchor is a verified Cal Poly student ride network that rescues fixed-time commitments when a student has no car or a confirmed ride falls through.**

## The student problem

Students without a car do not need another feed of vague “anyone heading downtown?” posts. They need a dependable answer to a very constrained problem:

> “I need to arrive at this place by this time, and a missed ride has a real consequence.”

Examples include a clinical shift, an internship, a lab meeting, an airport/train departure, a volunteer commitment, or a late-night transit gap. Group chats are noisy, strangers lack context, and a last-minute cancellation often forces the rider to start from zero.

Anchor is designed around the **schedule-rescue moment**, not casual rides. This is why it is more useful—and more defensible—than an Uber-like list of pickup and destination fields.

## The target user

**Primary rider:** a Cal Poly student without regular car access who has occasional, non-negotiable off-campus commitments.

**Primary driver:** a Cal Poly student already making a trip who is willing to offer one or more open seats to another verified student. The driver stays in control: no automatic bookings, no mandatory detours, and no public contact details.

**Pilot community:** one opt-in student organization, cohort, residence community, or program. Anchor begins with a closed group so density and trust exist before growth.

## Product vocabulary

| Generic rideshare term | Anchor term | Why |
| --- | --- | --- |
| Ride request | Anchor trip | Centers the deadline that matters |
| Driver listing | Route offer | Makes it clear the driver already has a route |
| Booking | Mutual handoff | Requires human consent on both sides |
| Surge / price | Time slack | Ranks whether a route has room for a safe detour |
| Rating | Reliability signal | Measures confirmed behavior without public popularity contests |
| Cancellation | Rescue event | Triggers an explicit fallback workflow |

## The core experience

### 1. Create an Anchor trip

The rider chooses a destination from a safe landmark or zone, an **arrive-by** time, and the amount of flexibility they have. They never need to publish their home address.

```text
Where do you need to be?   Downtown clinic
When do you need to arrive? 7:45 AM
Pickup area                 North campus / nearby
Flexibility                 Can leave 15 minutes earlier
Preferences                 Quiet ride · no large bags
```

The interface makes the constraint legible: **“Your latest safe departure is 7:07 AM.”** In the MVP this is based on seeded route estimates; a production version uses a route provider.

### 2. Receive a transparent match

Anchor does not silently assign a driver. It returns one to three candidates with concise reasons:

```text
Maya is heading toward downtown at 6:55 AM
1 open seat · estimated 6-minute detour
Arrives 22 minutes before your deadline
```

The rider requests a handoff. The driver sees only the destination zone, requested pickup zone, time window, seat count, and preference tags until they accept. Exact pickup instructions are not exposed at this point.

### 3. Mutual handoff and private pickup reveal

The driver chooses **Offer seat**; the rider chooses **Accept ride**. Only after both actions are complete does Anchor reveal the agreed pickup point. The default is a public campus landmark, not an exact residential location.

The active-trip screen has only what matters:

- confirmed driver/rider first name and verified-student badge
- pickup landmark and ETA window
- one-tap “I’m here” check-in
- one-tap “Ride complete” confirmation
- “Need help?” safety/report action

### 4. The Fallback Mesh

This is the signature feature.

When a confirmed driver cancels, Anchor treats the trip as a **rescue event**:

1. It calculates whether the rider still has time to arrive.
2. It finds compatible route offers with remaining seats and adequate arrival slack.
3. It sends a limited, high-context alert only to eligible drivers: “One verified student needs downtown by 7:45; 18 minutes of schedule slack remains.”
4. It returns the best new offers to the rider; no driver is automatically committed.
5. If no match exists, it clearly says so and shows approved fallback information instead of pretending to guarantee transportation.

The system makes a real human failure recoverable. That is the hackathon demo people remember.

## What makes Anchor unique

| Feature | Why an ordinary carpool app misses it |
| --- | --- |
| Deadline-first requests | Most apps optimize departure convenience; Anchor optimizes whether a commitment can still be met |
| Route offers, not gig driving | Drivers are students already traveling, so the product is about filling spare seats—not creating an informal taxi network |
| Mutual acceptance gate | Neither party loses control of a ride or sees an exact location prematurely |
| Rescue mode | Cancellation is handled as a time-sensitive rematching problem rather than a dead-end notification |
| Reliability signal | Rewards accepted, completed handoffs and on-time cancellation—not public star ratings or social popularity |
| Location TTL | Exact pickup details are shown only to matched participants and expire after the trip |

## Match explanation, not magic

The matching engine returns a recommendation with evidence a person can inspect. For a candidate to be eligible, all of these must be true:

- both accounts are active, verified Cal Poly students;
- the driver has an available seat;
- their route window can meet the rider’s latest safe arrival time;
- the predicted detour is below the driver’s declared maximum;
- both riders’ and drivers’ opt-in preferences are compatible;
- neither has blocked or reported the other.

Candidates are ranked by arrival slack, route detour, reliability signal, and preference fit. The UI exposes at most two reasons, never a raw score.

## Visual direction

Anchor should feel like an emergency contact that happens to be beautifully designed: calm, precise, and restrained.

| Element | Direction |
| --- | --- |
| Palette | Deep navy `#10243E`, fog `#F6F8FA`, electric lime `#C7F36B` for confirmed actions, safety amber `#F4B860`, alert coral `#E76F51` |
| Type | Clean geometric sans; high-contrast time and place information; no playful transport-cartoon aesthetic |
| Core object | A route card with a timeline: offer → handoff → pickup → complete |
| Map | Use a simplified zone/route visual in the MVP; avoid pretending the app has live navigation it does not possess |
| Motion | Subtle route-line progress on confirmation; stronger but non-alarming transition when Rescue mode activates |
| Tone | Direct and mature: “You still have 18 minutes of arrival slack,” not “Your ride is on the way!” |

## The 90-second winning demo

1. **0–12 sec:** “A student misses a clinical shift because one texted ride falls through. The real issue is not finding any car—it is recovering a fixed-time commitment.”
2. **12–28 sec:** As Jordan, create an Anchor trip: `Downtown clinic, arrive by 7:45 AM`. Show the latest-safe-departure calculation.
3. **28–43 sec:** Show Maya’s route offer. Anchor explains: one open seat, six-minute detour, 22 minutes of arrival slack. Both users accept.
4. **43–55 sec:** Reveal only the public pickup landmark. Show the active handoff card.
5. **55–73 sec:** Maya cancels. The UI enters **Rescue mode**, preserves the deadline, and offers Sam’s compatible route.
6. **73–85 sec:** Jordan accepts Sam’s offer. The route timeline returns to confirmed; both check in.
7. **85–90 sec:** “Anchor did not create more rides. It made the rides already happening reliable enough for students who need them.”

## Strict MVP boundary

Build the verified matching and rescue loop. Do not spend time on payments, public profile browsing, continuous GPS, open chat, a rating feed, maps/navigation, background checks, or multi-campus expansion.

Use seeded Cal Poly student accounts and declared route estimates in the demo. Clearly label simulated route, verification, and notification behavior. Trust comes from honest product boundaries, not from pretending a weekend prototype has solved transportation safety.
