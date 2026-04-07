-- Referência nacional: Tabela da Composição de Alimentos (TCA), INSA / PortFIR.
-- Dados carregados localmente (ficheiro Excel); não existe API oficial pública da TCA.

create table public.tca_foods (
  cod text primary key,
  name text not null,
  carbs_per_100g numeric not null
    check (carbs_per_100g >= 0),
  foodex_level1 text,
  foodex_level2 text,
  foodex_level3 text,
  tca_version text not null
);

create index tca_foods_name_lower_idx
  on public.tca_foods (lower(name));

comment on table public.tca_foods is
  'TCA INSA (PortFIR). Fonte: https://portfir.insa.min-saude.pt/ — usar conforme termos do INSA.';

-- Alinhado com 003 (app pessoal): leitura/escrita via anon para scripts e UI.
alter table public.tca_foods disable row level security;

grant select, insert, update, delete on public.tca_foods to anon, authenticated;

