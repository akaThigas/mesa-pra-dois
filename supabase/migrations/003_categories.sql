-- =====================================================================
-- 003 — Categoria do lugar (restaurante, bar, café, padaria...)
--
-- text + CHECK em vez de enum: para incluir uma categoria nova no futuro
-- basta trocar a constraint, sem a cerimônia de alterar um tipo enum.
-- Os lugares que já existem viram 'restaurante' (valor padrão).
-- =====================================================================

alter table public.restaurants
  add column category text not null default 'restaurante'
  constraint restaurants_category_check
    check (category in ('restaurante', 'bar', 'cafe', 'padaria', 'doceria', 'sorveteria', 'outro'));

create index restaurants_couple_category_idx on public.restaurants (couple_id, category);
