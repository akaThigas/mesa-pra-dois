-- =====================================================================
-- 004 — Identificador do lugar no Google (place_id)
--
-- Com ele, "Como chegar" abre o estabelecimento exato no Google Maps
-- (com horário, fotos, avaliações), e não só um ponto na rua.
-- Os termos do Google permitem guardar o place_id sem prazo.
-- =====================================================================

alter table public.restaurants add column google_place_id text;
