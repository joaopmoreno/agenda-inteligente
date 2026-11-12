-- ========================================================
-- Schema de Banco de Dados: Agenda Inteligente
-- Compatível com Lovable Cloud / Supabase PostgreSQL
-- ========================================================

-- 1. Tabela de Perfis de Usuário
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null default '',
  timezone text not null default 'America/Sao_Paulo',
  voice_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Configurações e preferências do perfil do usuário';

-- 2. Tabela de Tarefas
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  category text not null check (category in ('Pessoal', 'Escolar', 'Trabalho')),
  title text not null,
  description text default '',
  due_at timestamptz,
  status text not null default 'pendente' check (status in ('pendente', 'concluida')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.tasks is 'Tarefas da agenda categorizadas e ordenadas';

-- 3. Tabela de Configurações por Categoria (Modo de Ordenação)
create table if not exists public.category_settings (
  user_id uuid references auth.users(id) on delete cascade not null,
  category text not null check (category in ('Pessoal', 'Escolar', 'Trabalho')),
  sort_mode text not null default 'automatico' check (sort_mode in ('automatico', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, category)
);

comment on table public.category_settings is 'Armazena a preferência de ordenação Automático / Manual para cada aba';

-- ========================================================
-- ROW LEVEL SECURITY (RLS)
-- Garante que cada usuário acesse apenas seus próprios dados
-- ========================================================

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.category_settings enable row level security;

-- Políticas para profiles
create policy "Usuários podem consultar seu próprio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Usuários podem atualizar seu próprio perfil"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Usuários podem inserir seu próprio perfil"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Políticas para tasks
create policy "Usuários podem consultar suas próprias tarefas"
  on public.tasks for select
  using (auth.uid() = user_id);

create policy "Usuários podem criar tarefas para si próprios"
  on public.tasks for insert
  with check (auth.uid() = user_id);

create policy "Usuários podem atualizar suas próprias tarefas"
  on public.tasks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Usuários podem excluir suas próprias tarefas"
  on public.tasks for delete
  using (auth.uid() = user_id);

-- Políticas para category_settings
create policy "Usuários podem consultar suas configurações de categoria"
  on public.category_settings for select
  using (auth.uid() = user_id);

create policy "Usuários podem inserir configurações de categoria"
  on public.category_settings for insert
  with check (auth.uid() = user_id);

create policy "Usuários podem atualizar configurações de categoria"
  on public.category_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ========================================================
-- ÍNDICES DE PERFORMANCE
-- ========================================================
create index if not exists idx_tasks_user_category on public.tasks(user_id, category, sort_order);
create index if not exists idx_tasks_user_due on public.tasks(user_id, due_at);
create index if not exists idx_tasks_user_status on public.tasks(user_id, status);

-- ========================================================
-- TRIGGER PARA INICIALIZAÇÃO DE PERFIL E CATEGORIAS
-- ========================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Cria perfil inicial com nome vindo do cadastro (se houver) e fuso horário padrão
  insert into public.profiles (id, name, timezone, voice_enabled)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'America/Sao_Paulo',
    false
  ) on conflict (id) do nothing;

  -- Inicializa as 3 categorias no modo automatico
  insert into public.category_settings (user_id, category, sort_mode)
  values
    (new.id, 'Pessoal', 'automatico'),
    (new.id, 'Escolar', 'automatico'),
    (new.id, 'Trabalho', 'automatico')
  on conflict (user_id, category) do nothing;

  return new;
end;
$$ language plpgsql security definer;

-- Trigger disparado no cadastro do auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
