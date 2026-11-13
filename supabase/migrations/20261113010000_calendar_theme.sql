alter table public.profiles
  add column theme text not null default 'system' check (theme in ('system', 'light', 'dark')),
  add column calendar_client_id text;

create table public.calendar_links (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  google_subject text not null,
  event_id text not null,
  task_id uuid references public.tasks(id) on delete set null,
  etag text not null,
  snapshot jsonb not null,
  primary key (user_id, google_subject, event_id),
  unique (user_id, google_subject, task_id)
);
create index calendar_links_task_idx on public.calendar_links(task_id);
alter table public.calendar_links enable row level security;
revoke all on public.calendar_links from public, anon, authenticated;
grant select, insert, update on public.calendar_links to authenticated;
create policy calendar_owner_read on public.calendar_links for select to authenticated
  using (user_id = (select auth.uid()));
create policy calendar_owner_insert on public.calendar_links for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.tasks where id = calendar_links.task_id and user_id = (select auth.uid())
  ));
create policy calendar_owner_update on public.calendar_links for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (task_id is null or exists (
    select 1 from public.tasks where id = calendar_links.task_id and user_id = (select auth.uid())
  )));
