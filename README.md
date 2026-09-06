# PolyPassenger

PolyPassenger is a simple ride-coordination app for verified Cal Poly students.

It helps students find voluntary rides to important, time-sensitive commitments when they do not have a car or their original ride falls through. Examples include internships, clinical shifts, labs, airport departures, and late-night travel.

## How it works

1. A rider posts where they need to go and when they need to arrive.
2. A student who is already driving that direction offers an open seat.
3. Both students accept before the ride is confirmed.
4. The app reveals a public pickup landmark.
5. If the driver cancels, the rider can look for another compatible offer.

The app uses broad pickup and destination zones before a match. It is designed around planned voluntary carpools, not instant rides, payments, or gig driving.

## Local development

```bash
npm install
cp .env.example .env.local
npm start
```

Scan the Expo QR code with Expo Go, or use `npm run ios`, `npm run android`, or `npm run web`. The current MVP uses a deterministic local demo client so the ride flow can be demonstrated before Supabase authentication and deployment are connected.

The implementation uses Expo, React Native, TypeScript, and Supabase. More detailed agent instructions are in [AGENTS.md](AGENTS.md).
