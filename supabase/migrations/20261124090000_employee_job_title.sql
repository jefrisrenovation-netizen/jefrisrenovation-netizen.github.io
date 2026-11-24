alter table public.employees
  add column if not exists job_title text
  check (job_title is null or char_length(job_title) between 1 and 100);
