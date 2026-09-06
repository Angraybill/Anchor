-- Riders may save a private trip intent. This is never a public request feed:
-- only the requesting student can read it.
create table if not exists public.ride_requests (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references auth.users(id) on delete cascade,
  pickup_zone text not null check (char_length(trim(pickup_zone)) between 1 and 80),
  destination_zone text not null check (char_length(trim(destination_zone)) between 1 and 80),
  pickup_label text not null check (char_length(trim(pickup_label)) between 1 and 120),
  destination_label text not null check (char_length(trim(destination_label)) between 1 and 120),
  arrive_by timestamptz not null,
  status text not null default 'open' check (status in ('open', 'fulfilled', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists ride_requests_rider_created_idx
  on public.ride_requests (rider_id, created_at desc);

alter table public.ride_requests enable row level security;

create policy "students manage their private ride requests" on public.ride_requests
  for all to authenticated
  using (rider_id = auth.uid())
  with check (rider_id = auth.uid());
