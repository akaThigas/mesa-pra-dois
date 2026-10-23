-- =====================================================================
-- 002 — Uma nota por pessoa + endereço/coordenadas para o mapa
--
-- Boa prática: migrações são "append-only". Nunca editamos a 001 depois
-- de rodada; criamos uma nova que transforma o schema a partir dela.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Restaurantes: sai a nota única, entra a localização
-- ---------------------------------------------------------------------
-- Projeto ainda sem dados reais, então a coluna antiga pode sair.
-- (Com dados, primeiro copiaríamos rating → ratings, depois o drop.)
alter table public.restaurants drop constraint rating_only_when_visited;
alter table public.restaurants drop column rating;

alter table public.restaurants
  add column address   text,
  add column latitude  double precision check (latitude between -90 and 90),
  add column longitude double precision check (longitude between -180 and 180),
  -- Ou tem as duas coordenadas, ou nenhuma: um pin pela metade não existe.
  add constraint coordinates_together check ((latitude is null) = (longitude is null)),
  -- Necessário para a FK composta da tabela ratings (abaixo).
  add constraint restaurants_id_couple_unique unique (id, couple_id);

-- ---------------------------------------------------------------------
-- 2. Notas: uma linha por (restaurante, pessoa)
-- ---------------------------------------------------------------------
create table public.ratings (
  restaurant_id uuid not null,
  couple_id     uuid not null,
  profile_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  rating        smallint not null check (rating between 1 and 5),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Chave primária composta: impossível a mesma pessoa avaliar duas vezes.
  primary key (restaurant_id, profile_id),

  -- FK composta: garante que o couple_id da nota é o MESMO do restaurante.
  -- (couple_id fica "duplicado" de propósito: deixa o RLS e o filtro do
  -- realtime simples, e a FK impede que os dois valores divirjam.)
  foreign key (restaurant_id, couple_id)
    references public.restaurants (id, couple_id) on delete cascade
);

create index ratings_couple_id_idx on public.ratings (couple_id);

create trigger ratings_set_updated_at
  before update on public.ratings
  for each row execute function public.set_updated_at();

-- Regra que envolve DUAS tabelas não cabe num CHECK: vira trigger.
create or replace function public.ensure_restaurant_visited()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.restaurants
    where id = new.restaurant_id and status = 'visited'
  ) then
    raise exception 'Só é possível avaliar restaurantes marcados como "Já Fomos"';
  end if;
  return new;
end;
$$;

create trigger ratings_require_visited
  before insert or update on public.ratings
  for each row execute function public.ensure_restaurant_visited();

-- ---------------------------------------------------------------------
-- 3. RLS das notas
-- ---------------------------------------------------------------------
alter table public.ratings enable row level security;

create policy "casal vê as notas dos dois"
  on public.ratings for select
  using (couple_id = public.my_couple_id());

create policy "cada um cria só a própria nota"
  on public.ratings for insert
  with check (profile_id = auth.uid() and couple_id = public.my_couple_id());

create policy "cada um altera só a própria nota"
  on public.ratings for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid() and couple_id = public.my_couple_id());

create policy "cada um apaga só a própria nota"
  on public.ratings for delete
  using (profile_id = auth.uid());

-- ---------------------------------------------------------------------
-- 4. RPC: registrar uma visita numa TRANSAÇÃO só
-- ---------------------------------------------------------------------
-- Marca como visitado + salva gasto/data/observações + a nota de quem
-- chamou. Ou tudo dá certo, ou nada é gravado (atomicidade).
-- "security invoker": roda com as permissões do usuário, então o RLS vale.
-- p_rating nulo = não mexe na nota existente.
create or replace function public.record_visit(
  p_restaurant_id uuid,
  p_visited_at    date     default current_date,
  p_amount_spent  numeric  default null,
  p_notes         text     default null,
  p_rating        smallint default null
)
returns void
language plpgsql
security invoker set search_path = public
as $$
declare
  v_couple_id uuid;
begin
  update public.restaurants
     set status       = 'visited',
         visited_at   = coalesce(p_visited_at, visited_at, current_date),
         amount_spent = p_amount_spent,
         notes        = p_notes
   where id = p_restaurant_id
   returning couple_id into v_couple_id;

  if not found then
    raise exception 'Restaurante não encontrado';
  end if;

  if p_rating is not null then
    insert into public.ratings (restaurant_id, couple_id, profile_id, rating)
    values (p_restaurant_id, v_couple_id, auth.uid(), p_rating)
    on conflict (restaurant_id, profile_id)
      do update set rating = excluded.rating;
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Realtime
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.ratings;
