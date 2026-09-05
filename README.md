# Cal Poly Ride Coordination — Product Name TBD

This repository contains a weekend-hackathon prototype for a closed, student-to-student ride network. The working name is **Anchor**, but the final product name is still TBD.

The product helps verified Cal Poly students coordinate voluntary rides to fixed-time commitments—such as clinical shifts, internships, labs, airport departures, or late transit gaps—when a student has no car or an existing ride falls through.

It is not an Uber clone, public marketplace, transportation provider, payment platform, or gig-driving service. The focus is saving students from restarting a failed ride search through group chats.

## Core demo

```text
Rider creates a deadline-bound trip
  → driver offers an existing route with a spare seat
  → both mutually accept
  → public pickup landmark is revealed
  → driver cancels
  → Rescue mode finds a compatible replacement offer
  → rider and replacement driver confirm and complete the trip
```

The MVP uses coarse zones before mutual acceptance, privacy-limited pickup details after confirmation, deterministic route fixtures, and visibly labeled demo verification/notification behavior.

## Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Apply the Supabase migration in `supabase/migrations/` before connecting a real Supabase project. Without Supabase configuration, use the safe local fixtures. Run these before handing off a change:

```bash
npm run check
npm test
npm run build
npm run audit
```

All contributor guidance, including the four person-by-person work lanes, ownership boundaries, product rules, safety rules, demo sequence, and verification expectations, is in [AGENTS.md](AGENTS.md).
