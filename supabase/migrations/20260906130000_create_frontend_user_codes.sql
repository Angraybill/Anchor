-- Create table to store short-lived verification codes for frontend users
create table if not exists public.frontend_user_codes (
  email text not null primary key check (email = lower(trim(email))),
  code_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists frontend_user_codes_expires_idx on public.frontend_user_codes (expires_at);
