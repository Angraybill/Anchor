-- Public ride-request board. Requests show only broad public pickup areas,
-- destinations, and timing; names, contact details, and home addresses are not
-- part of this feature.
drop policy if exists "students manage their private ride requests" on public.ride_requests;

create policy "students can view public ride requests" on public.ride_requests
  for select to authenticated
  using (status = 'open' or rider_id = auth.uid());

create policy "students create their own ride requests" on public.ride_requests
  for insert to authenticated
  with check (rider_id = auth.uid());

create policy "students update their own ride requests" on public.ride_requests
  for update to authenticated
  using (rider_id = auth.uid())
  with check (rider_id = auth.uid());

create policy "students delete their own ride requests" on public.ride_requests
  for delete to authenticated
  using (rider_id = auth.uid());
