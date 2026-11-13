create table public.student_grades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  school_year smallint not null check (school_year between 1900 and 2200),
  subject text not null check (char_length(trim(subject)) between 1 and 100),
  title text not null check (char_length(trim(title)) between 1 and 160),
  term smallint not null check (term between 1 and 3),
  points numeric(7,2) not null check (points >= 0 and points <= 99999.99),
  created_at timestamptz not null default now()
);
create index student_grades_by_user_year on public.student_grades(user_id, school_year, created_at, id);
alter table public.student_grades enable row level security;
revoke all on public.student_grades from public, anon, authenticated;
grant select, insert, update, delete on public.student_grades to authenticated;
create policy own_grades on public.student_grades for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
