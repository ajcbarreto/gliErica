-- Faixa visual (fundo verde) no gráfico Libre: limites em mg/dL (canónico na BD).
alter table public.profiles
  add column if not exists libre_chart_zone_low_mg_dl numeric
    check (libre_chart_zone_low_mg_dl is null or libre_chart_zone_low_mg_dl > 0),
  add column if not exists libre_chart_zone_high_mg_dl numeric
    check (libre_chart_zone_high_mg_dl is null or libre_chart_zone_high_mg_dl > 0);

comment on column public.profiles.libre_chart_zone_low_mg_dl is
  'Limite inferior da zona "alvo" no gráfico Libre (mg/dL); ver conversão no cliente se o sensor estiver em mmol/L.';
comment on column public.profiles.libre_chart_zone_high_mg_dl is
  'Limite superior da zona alvo no gráfico Libre (mg/dL).';

alter table public.profiles drop constraint if exists libre_chart_zone_order_chk;

alter table public.profiles
  add constraint libre_chart_zone_order_chk check (
    libre_chart_zone_low_mg_dl is null
    or libre_chart_zone_high_mg_dl is null
    or libre_chart_zone_low_mg_dl < libre_chart_zone_high_mg_dl
  );
