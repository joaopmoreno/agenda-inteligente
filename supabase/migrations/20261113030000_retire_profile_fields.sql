create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Cria perfil inicial com nome vindo do cadastro (se houver) e fuso horário padrão
  insert into public.profiles (id, name, timezone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'America/Sao_Paulo'
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

alter table public.profiles
  drop column if exists voice_enabled,
  drop column if exists gemini_api_key;
