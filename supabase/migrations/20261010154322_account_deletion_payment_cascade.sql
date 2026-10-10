begin;
alter table public.monthly_payments drop constraint monthly_payments_owner_id_fkey, add constraint monthly_payments_owner_id_fkey foreign key (owner_id) references auth.users(id) on delete cascade;
alter table public.monthly_payments drop constraint monthly_payments_employee_id_fkey, add constraint monthly_payments_employee_id_fkey foreign key (employee_id) references public.employees(id) on delete cascade;
commit;