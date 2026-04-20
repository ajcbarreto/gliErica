-- Marca e loja/cadeia opcionais por alimento (ex.: exclusivo de Continente vs Mercadona).

alter table public.foods
  add column if not exists brand text,
  add column if not exists retailer text;

comment on column public.foods.brand is 'Marca comercial do produto (opcional).';
comment on column public.foods.retailer is 'Loja ou cadeia onde compras (ex.: Continente, Mercadona).';
