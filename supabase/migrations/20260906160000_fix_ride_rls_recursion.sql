-- Break the circular RLS dependency between rides and ride_passengers.
-- Each policy now calls a security-definer lookup instead of querying the
-- other protected table directly.

create or replace function public.is_ride_driver(target_ride_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.rides ride
    where ride.id = target_ride_id
      and ride.driver_id = auth.uid()
  );
$$;

create or replace function public.is_ride_passenger(target_ride_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.ride_passengers passenger
    where passenger.ride_id = target_ride_id
      and passenger.rider_id = auth.uid()
  );
$$;

grant execute on function public.is_ride_driver(uuid) to anon, authenticated;
grant execute on function public.is_ride_passenger(uuid) to anon, authenticated;

drop policy if exists "students can view open or participating rides" on public.rides;
create policy "students can view open or participating rides" on public.rides
  for select to anon, authenticated
  using (
    (status = 'active' and seats_open > 0)
    or (
      auth.uid() is not null
      and (
        driver_id = auth.uid()
        or public.is_ride_passenger(id)
      )
    )
  );

drop policy if exists "students can view ride passengers" on public.ride_passengers;
create policy "students can view ride passengers" on public.ride_passengers
  for select to authenticated
  using (
    rider_id = auth.uid()
    or public.is_ride_driver(ride_id)
  );
