-- =====================================================================
-- Mesa pra Dois — schema inicial
-- Rode no Supabase: SQL Editor → cole este arquivo → Run
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tipos
-- ---------------------------------------------------------------------
create type public.restaurant_status as enum ('wishlist', 'visited');

-- ---------------------------------------------------------------------
-- 2. Tabelas
-- ---------------------------------------------------------------------

-- O "casal" é o tenant: tudo que é compartilhado pertence a um casal.
create table public.couples (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default 'Nosso casal',
  invite_code text not null unique default upper(substr(md5(random()::text), 1, 6)),
  created_at  timestamptz not null default now()
);

-- Perfil público de cada usuário (1:1 com auth.users, que o Supabase gerencia).
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url   text,
  couple_id    uuid references public.couples (id) on delete set null,
  created_at   timestamptz not null default now()
);

create index profiles_couple_id_idx on public.profiles (couple_id);

-- Uma única tabela para as duas listas: o "status" decide em qual aparece.
-- Mover de "Para Conhecer" para "Já Fomos" vira um simples UPDATE.
create table public.restaurants (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid not null references public.couples (id) on delete cascade,
  name         text not null check (char_length(trim(name)) between 1 and 120),
  status       public.restaurant_status not null default 'wishlist',
  price_level  smallint check (price_level between 1 and 4),        -- expectativa: $ a $$$$
  amount_spent numeric(10, 2) check (amount_spent >= 0),           -- realidade: R$ gastos
  accepts_vr   boolean not null default false,
  rating       smallint check (rating between 1 and 5),
  notes        text check (char_length(notes) <= 1000),
  cuisine      text,
  neighborhood text,
  visited_at   date,
  created_by   uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- Regra de negócio no banco: só dá para avaliar o que já foi visitado.
  constraint rating_only_when_visited check (status = 'visited' or rating is null)
);

create index restaurants_couple_status_idx on public.restaurants (couple_id, status);

-- ---------------------------------------------------------------------
-- 3. Triggers
-- ---------------------------------------------------------------------

-- Mantém updated_at sempre correto, sem depender do front-end.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger restaurants_set_updated_at
  before update on public.restaurants
  for each row execute function public.set_updated_at();

-- Cria o perfil automaticamente quando alguém se cadastra.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 4. Funções auxiliares e RPCs
-- ---------------------------------------------------------------------

-- Descobre o casal do usuário logado. "security definer" evita recursão
-- infinita quando a própria policy de profiles precisa consultar profiles.
create or replace function public.my_couple_id()
returns uuid
language sql
stable
security definer set search_path = public
as $$
  select couple_id from public.profiles where id = auth.uid()
$$;

-- Cria um casal e já vincula quem criou. Retorna o código de convite.
create or replace function public.create_couple(couple_name text default 'Nosso casal')
returns public.couples
language plpgsql
security definer set search_path = public
as $$
declare
  new_couple public.couples;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;
  if public.my_couple_id() is not null then
    raise exception 'Você já faz parte de um casal';
  end if;

  insert into public.couples (name) values (couple_name) returning * into new_couple;
  update public.profiles set couple_id = new_couple.id where id = auth.uid();
  return new_couple;
end;
$$;

-- Entra num casal existente pelo código. Garante o limite de 2 pessoas.
create or replace function public.join_couple(code text)
returns public.couples
language plpgsql
security definer set search_path = public
as $$
declare
  target       public.couples;
  member_count int;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;
  if public.my_couple_id() is not null then
    raise exception 'Você já faz parte de um casal';
  end if;

  -- "for update" trava a linha: duas pessoas usando o código ao mesmo
  -- tempo não conseguem furar o limite (evita race condition).
  select * into target
  from public.couples
  where invite_code = upper(trim(code))
  for update;

  if not found then
    raise exception 'Código de convite inválido';
  end if;

  select count(*) into member_count from public.profiles where couple_id = target.id;
  if member_count >= 2 then
    raise exception 'Este casal já está completo';
  end if;

  update public.profiles set couple_id = target.id where id = auth.uid();
  return target;
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Row Level Security (multi-tenancy por casal)
-- ---------------------------------------------------------------------
alter table public.couples     enable row level security;
alter table public.profiles    enable row level security;
alter table public.restaurants enable row level security;

create policy "membros veem o próprio casal"
  on public.couples for select
  using (id = public.my_couple_id());

create policy "ver o próprio perfil e o do par"
  on public.profiles for select
  using (id = auth.uid() or couple_id = public.my_couple_id());

create policy "editar o próprio perfil"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Ninguém troca couple_id "na mão": só via create_couple / join_couple.
revoke update on public.profiles from authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;

create policy "casal lê seus restaurantes"
  on public.restaurants for select
  using (couple_id = public.my_couple_id());

create policy "casal cria restaurantes"
  on public.restaurants for insert
  with check (couple_id = public.my_couple_id());

create policy "casal edita restaurantes"
  on public.restaurants for update
  using (couple_id = public.my_couple_id())
  with check (couple_id = public.my_couple_id());

create policy "casal apaga restaurantes"
  on public.restaurants for delete
  using (couple_id = public.my_couple_id());

-- ---------------------------------------------------------------------
-- 6. Realtime
-- ---------------------------------------------------------------------
-- Publica as mudanças da tabela no canal de Realtime do Supabase.
-- As policies de SELECT acima também filtram o que cada cliente recebe.
alter publication supabase_realtime add table public.restaurants;
