begin;
create table public.billing_config (
 id boolean primary key default true check(id),
 launch_at timestamptz,
 allow_sandbox boolean not null default false
);
insert into public.billing_config(id) values(true);
create table public.billing_accounts (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 enrolled_at timestamptz not null default now()
);
create table public.apple_subscriptions (
 original_transaction_id text primary key,
 owner_id uuid not null references auth.users(id) on delete cascade,
 transaction_id text not null,
 environment text not null check(environment in ('Production','Sandbox')),
 expires_at timestamptz not null,
 revoked_at timestamptz,
 signed_at timestamptz not null
);
create index apple_subscriptions_owner on public.apple_subscriptions(owner_id);
alter table public.billing_config enable row level security;
alter table public.billing_accounts enable row level security;
alter table public.apple_subscriptions enable row level security;
revoke all on public.billing_config, public.billing_accounts, public.apple_subscriptions from anon, authenticated;
grant select on public.billing_config, public.billing_accounts, public.apple_subscriptions to authenticated;
grant all on public.billing_config, public.billing_accounts, public.apple_subscriptions to service_role;
create policy billing_config_read on public.billing_config for select to authenticated using(true);
create policy billing_account_read on public.billing_accounts for select to authenticated using(owner_id=(select auth.uid()));
create policy apple_subscription_read on public.apple_subscriptions for select to authenticated using(owner_id=(select auth.uid()));
create function public.billing_can_write() returns boolean language sql stable security invoker set search_path='' as $$
 select case
 when not exists(select 1 from public.billing_accounts where owner_id=(select auth.uid())) then true
 when (select launch_at from public.billing_config where id) is null then true
 when now() < (select launch_at + interval '3 months' from public.billing_config where id) then true
 when now() < (select greatest(a.enrolled_at,c.launch_at+interval '3 months')+interval '20 days' from public.billing_accounts a cross join public.billing_config c where a.owner_id=(select auth.uid()) and c.id) then true
 else exists(select 1 from public.apple_subscriptions s cross join public.billing_config c where s.owner_id=(select auth.uid()) and s.revoked_at is null and s.expires_at>now() and (s.environment='Production' or c.allow_sandbox)) end
$$;
revoke all on function public.billing_can_write() from public, anon;
grant execute on function public.billing_can_write() to authenticated;
-- Restrictive policies compose with ALL existing ownership policies, including duplicates.
create policy billing_employee_insert on public.employees as restrictive for insert to authenticated with check((select public.billing_can_write()));
create policy billing_employee_update on public.employees as restrictive for update to authenticated using((select public.billing_can_write())) with check((select public.billing_can_write()));
create policy billing_employee_delete on public.employees as restrictive for delete to authenticated using((select public.billing_can_write()));
create policy billing_day_insert on public.work_days as restrictive for insert to authenticated with check((select public.billing_can_write()));
create policy billing_day_update on public.work_days as restrictive for update to authenticated using((select public.billing_can_write())) with check((select public.billing_can_write()));
create policy billing_day_delete on public.work_days as restrictive for delete to authenticated using((select public.billing_can_write()));
create policy billing_payment_insert on public.monthly_payments as restrictive for insert to authenticated with check((select public.billing_can_write()));
create policy billing_payment_update on public.monthly_payments as restrictive for update to authenticated using((select public.billing_can_write())) with check((select public.billing_can_write()));
create policy billing_payment_delete on public.monthly_payments as restrictive for delete to authenticated using((select public.billing_can_write()));
-- Service-only atomic update: neither a replay nor another owner can replace a purchase.
create function public.record_apple_subscription(record jsonb) returns void language sql security invoker set search_path='' as $$
 insert into public.apple_subscriptions(original_transaction_id,owner_id,transaction_id,environment,expires_at,revoked_at,signed_at)
 values(record->>'original_transaction_id',(record->>'owner_id')::uuid,record->>'transaction_id',record->>'environment',(record->>'expires_at')::timestamptz,(record->>'revoked_at')::timestamptz,(record->>'signed_at')::timestamptz)
 on conflict(original_transaction_id) do update set transaction_id=excluded.transaction_id,expires_at=excluded.expires_at,revoked_at=excluded.revoked_at,signed_at=excluded.signed_at
 where apple_subscriptions.owner_id=excluded.owner_id and apple_subscriptions.environment=excluded.environment and apple_subscriptions.signed_at<excluded.signed_at;
$$;
revoke all on function public.record_apple_subscription(jsonb) from public,anon,authenticated;
grant execute on function public.record_apple_subscription(jsonb) to service_role;
commit;
