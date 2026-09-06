-- Joining an open ride is immediate. There is no driver approval step.

do $$
begin
  if to_regclass('public.ride_join_requests') is not null
     and to_regclass('public.ride_passengers') is null then
    alter table public.ride_join_requests rename to ride_passengers;
  end if;
end;
$$;

alter index if exists public.ride_join_requests_ride_idx
  rename to ride_passengers_ride_idx;

create table if not exists public.ride_passengers (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides(id) on delete cascade,
  pickup_location text not null check (char_length(trim(pickup_location)) between 1 and 120),
  joined_at timestamptz not null default now()
);

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ride_passengers'
      and column_name = 'created_at'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ride_passengers'
      and column_name = 'joined_at'
  ) then
    alter table public.ride_passengers rename column created_at to joined_at;
  end if;
end;
$$;

alter table public.ride_passengers drop column if exists status;
alter table public.ride_passengers enable row level security;

drop function if exists public.join_ride(uuid, text);

create function public.join_ride(target_ride_id uuid, pickup_location text)
returns public.rides
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.rides;
begin
  if char_length(trim(pickup_location)) not between 1 and 120 then
    raise exception 'INVALID_PICKUP_LOCATION';
  end if;

  select * into target from public.rides
  where id = target_ride_id and status = 'active' and seats_open > 0
  for update;

  if target.id is null then
    raise exception 'RIDE_NOT_AVAILABLE';
  end if;

  insert into public.ride_passengers (ride_id, pickup_location)
  values (target.id, trim(pickup_location));

  update public.rides
  set seats_open = seats_open - 1,
      status = case when seats_open - 1 = 0 then 'full' else status end
  where id = target.id
  returning * into target;

  return target;
end;
$$;

grant execute on function public.join_ride(uuid, text) to anon, authenticated;
