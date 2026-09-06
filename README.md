# PolyPassenger

PolyPassenger is a simple ride-coordination app for verified Cal Poly students.

It helps students find voluntary rides to important, time-sensitive commitments when they do not have a car or their original ride falls through. Examples include internships, clinical shifts, labs, airport departures, and late-night travel.

## How it works

1. A student who is already driving a route posts an open seat and broad locations.
2. Riders browse the available rides and join one that fits their trip.
3. The app records the rider and driver match and reveals a public pickup landmark.
4. If the driver cancels, the rider can look for another compatible offer.

The app lets drivers and riders type recognizable location names, while using broad pickup and destination zones for matching and privacy. It is designed around planned voluntary carpools, not instant rides, payments, or gig driving.

## Local development

```bash
npm install
cp .env.example .env.local
npm start
```

Scan the Expo QR code with Expo Go, or use `npm run ios`, `npm run android`, or `npm run web`. The current MVP uses a deterministic local demo client so the ride flow can be demonstrated before Supabase authentication and deployment are connected.

The implementation uses Expo, React Native, TypeScript, and Supabase. More detailed agent instructions are in [AGENTS.md](AGENTS.md).
