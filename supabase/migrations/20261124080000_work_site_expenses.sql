create table public.work_site_expenses (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.work_sites(id) on delete cascade,
  expense_date date not null,
  category text not null check (category in ('fuel', 'materials', 'parking', 'other')),
  amount numeric(12,2) not null check (amount > 0),
  currency_code text not null check (currency_code in ('EUR', 'BRL', 'USD')),
  description text not null default '' check (length(description) <= 500)
);
create index work_site_expenses_site_date_idx on public.work_site_expenses(site_id, expense_date);
alter table public.work_site_expenses enable row level security;
grant select, insert on public.work_site_expenses to authenticated;
create policy work_site_expenses_owner on public.work_site_expenses for all to authenticated
  using (exists (select 1 from public.work_sites s where s.id = site_id and s.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.work_sites s where s.id = site_id and s.owner_id = (select auth.uid())));
