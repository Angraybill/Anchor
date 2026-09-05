# Anchor Project Guidelines

## Product overview

Anchor is a weekend-hackathon prototype for a closed, Cal Poly student-to-student ride network. It coordinates voluntary carpool handoffs for fixed-time commitments when a student does not have a car or a ride falls through.

The product is not a public rideshare marketplace, transportation provider, or payment platform. The primary track remains **10 Minutes Back**: Anchor removes the time students lose restarting a failed ride search through group chats.

## Product rules

- Drivers and riders must be verified Cal Poly students in the same active pilot community.
- Drivers offer pre-existing voluntary routes; the system never treats a student as a gig driver.
- A match requires mutual acceptance. No user is auto-assigned a ride.
- Requests and offers use coarse zones until mutual acceptance; exact pickup detail has a short, enforced TTL.
- Never expose a home address, raw contact information, or live location to candidate users.
- Cancellations launch a bounded fallback search only when the rider still has time to arrive.
- No payments, fares, tips, ratings, open chat, continuous location tracking, background-check claims, or emergency-service claims in the MVP.
- Mock route estimates, student verification, notifications, and moderation must be visually labeled as demo-only.

## Engineering rules

- Inspect existing project setup before adding dependencies or source files.
- Use server-derived identity; never trust a client-submitted rider ID, driver ID, role, or seat count.
- Use stable UUIDs for students, offers, requests, matches, events, reports, and pickup reveals.
- Implement every match transition as an authenticated, server-side command.
- Confirm the last-seat reservation atomically; concurrent acceptance may never overbook a vehicle.
- Make match events append-only and keep precise pickup values out of ordinary logs/analytics.
- Put all route provider, notification, verification, and secret credentials on the server only.
- Enforce access with database policy as well as API checks; hiding a UI element is not authorization.
- Handle no-match, stale candidate, declined handoff, expired offer, cancellation, route-provider failure, and report/block states deliberately.

## Verification before merge

- Run the available test, typecheck, build, and dependency-audit commands.
- Test the primary rider/driver mutual-acceptance flow in two sessions.
- Test two simultaneous accept attempts for the final seat.
- Verify exact pickup detail does not appear before confirmation or after TTL expiry.
- Verify cancellation cannot disclose the previous driver to rescue candidates.
- Check mobile and desktop layouts, keyboard navigation, and clear error states.
- State unrun checks and demo-only limitations honestly in the handoff.

## Demo flow

1. A verified rider creates a deadline-bound Anchor trip.
2. A verified driver offers an existing route with a spare seat.
3. Both accept; a public pickup landmark becomes visible.
4. The driver cancels; Anchor enters Rescue mode.
5. A compatible new driver offers a seat before the arrival deadline.
6. Rider and driver confirm pickup and complete the trip.

Product name is **Anchor** unless the team explicitly adopts a different name.
