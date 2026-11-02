-- New service-only identity and invitation records. No existing records are deleted.
create table public.team_accounts (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 employee_id uuid not null unique references public.employees(id) on delete cascade,
 user_id uuid unique references auth.users(id) on delete set null,
 username text not null unique check(username ~ '^[a-z0-9][a-z0-9._-]{2,39}$'),
 email text not null check(email=lower(email)), phone text not null default '',
 enabled boolean not null default true, activated_at timestamptz,
 created_at timestamptz not null default now()
);
create index team_accounts_owner_idx on public.team_accounts(owner_id);
alter table public.team_accounts enable row level security;
revoke all on public.team_accounts from anon,authenticated;
grant all on public.team_accounts to service_role;
create table public.team_invites (
 token_hash text primary key, account_id uuid not null references public.team_accounts(id) on delete cascade,
 expires_at timestamptz not null default now()+interval '7 days', used_at timestamptz,
 created_at timestamptz not null default now()
);
create index team_invites_account_idx on public.team_invites(account_id);
alter table public.team_invites enable row level security;
revoke all on public.team_invites from anon,authenticated;
grant all on public.team_invites to service_role;
create table public.team_rate_limits (
 key text not null, bucket timestamptz not null, attempts int not null default 1,
 primary key(key,bucket)
);
alter table public.team_rate_limits enable row level security;
revoke all on public.team_rate_limits from anon,authenticated;
grant all on public.team_rate_limits to service_role;
create function public.consume_team_rate_limit(p_key text,p_limit integer)
returns boolean language sql volatile security invoker set search_path=public,pg_temp as $$
 with hit as (
 insert into public.team_rate_limits(key,bucket) values(p_key,date_bin(interval '15 minutes',now(),'2000-01-01'::timestamptz))
 on conflict(key,bucket) do update set attempts=team_rate_limits.attempts+1 returning attempts
 ) select attempts<=p_limit from hit
$$;
revoke all on function public.consume_team_rate_limit(text,integer) from public,anon,authenticated;
grant execute on function public.consume_team_rate_limit(text,integer) to service_role;
create table public.work_sites (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 160),address text not null default '',active boolean not null default true,
 created_at timestamptz not null default now()
);
create index work_sites_owner_idx on public.work_sites(owner_id);
alter table public.work_sites enable row level security;
grant select,insert,update,delete on public.work_sites to authenticated;
create policy work_sites_owner on public.work_sites for all to authenticated
 using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
alter table public.work_days add column approval_status text not null default 'approved' check(approval_status in ('pending','approved','rejected'));
alter table public.work_days add column submitted_by uuid references auth.users(id) on delete set null;
create index work_days_submitted_by_idx on public.work_days(submitted_by);
create index work_days_owner_approval_idx on public.work_days(owner_id,approval_status,work_date);
