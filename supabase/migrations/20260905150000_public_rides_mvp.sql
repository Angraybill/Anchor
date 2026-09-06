-- Anonymous ride MVP. Authentication and student profiles are intentionally
-- not required by the current frontend; they can be added in a later branch.

create table if not exists public.rides (
  id uuid primary key default gen_random_uuid(),
  driver_name text not null default 'Cal Poly driver',
  origin_location text not null check (char_length(trim(origin_location)) between 1 and 120),
  destination_location text not null check (char_length(trim(destination_location)) between 1 and 120),
  departure_start timestamptz not null,
  departure_end timestamptz not null,
  seats_open integer not null default 1 check (seats_open between 0 and 8),
  max_detour_minutes integer not null default 10 check (max_detour_minutes between 0 and 120),
  status text not null default 'active' check (status in ('active', 'full', 'cancelled', 'expired')),
  created_at timestamptz not null default now(),
  check (departure_end >= departure_start)
);

create table if not exists public.ride_join_requests (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides(id) on delete cascade,
  pickup_location text not null check (char_length(trim(pickup_location)) between 1 and 120),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists rides_open_departure_idx on public.rides (status, departure_start);
create index if not exists ride_join_requests_ride_idx on public.ride_join_requests (ride_id, created_at);

alter table public.rides enable row level security;
alter table public.ride_join_requests enable row level security;

drop policy if exists "public can view open rides" on public.rides;
create policy "public can view open rides" on public.rides
  for select to anon, authenticated
  using (status = 'active' and seats_open > 0);

drop policy if exists "public can post rides" on public.rides;
create policy "public can post rides" on public.rides
  for insert to anon, authenticated
  with check (status = 'active');

create or replace function public.join_ride(target_ride_id uuid, requested_pickup_location text)
returns public.rides
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.rides;
begin
  if char_length(trim(requested_pickup_location)) not between 1 and 120 then
    raise exception 'INVALID_PICKUP_LOCATION';
  end if;

  select * into target from public.rides
  where id = target_ride_id and status = 'active' and seats_open > 0
  for update;

  if target.id is null then raise exception 'RIDE_NOT_AVAILABLE'; end if;

  insert into public.ride_join_requests (ride_id, pickup_location)
  values (target.id, trim(requested_pickup_location));

  update public.rides
  set seats_open = seats_open - 1,
      status = case when seats_open - 1 = 0 then 'full' else status end
  where id = target.id
  returning * into target;

  return target;
end;
$$;

grant select, insert on public.rides to anon, authenticated;
grant execute on function public.join_ride(uuid, text) to anon, authenticated;
