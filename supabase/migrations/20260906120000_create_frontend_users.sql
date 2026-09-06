-- Create frontend users table for landing-page login
create table if not exists public.frontend_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(trim(email))),
  token text not null,
  created_at timestamptz not null default now()
);

-- Keep RLS off for now; functions will use service role to write entries.
