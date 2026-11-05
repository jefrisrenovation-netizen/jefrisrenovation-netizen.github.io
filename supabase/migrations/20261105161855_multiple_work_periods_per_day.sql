-- Keep each period separate and retain protection against repeated submissions.
set local lock_timeout = '5s';
alter table public.work_days drop constraint employee_work_date_unique;
alter table public.work_days add constraint employee_work_period_unique unique (employee_id, work_date, entry_time, exit_time);
