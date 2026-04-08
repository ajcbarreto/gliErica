-- Contexto clínico extra: glicemia manual, episódios hipo/hiper, atividade,
-- insulina de correção (tipo à parte da rápida de refeição), parâmetros opcionais ISF/alvo.
-- Alinhado com 003: sem RLS (app pessoal com anon key).

-- Insulina de correção (separada de bolus de refeição para análises e totais)
alter table public.insulin_entries
  drop constraint if exists insulin_entries_kind_check;

alter table public.insulin_entries
  add constraint insulin_entries_kind_check
  check (kind in ('rapid', 'basal', 'correction'));

comment on constraint insulin_entries_kind_check on public.insulin_entries is
  'rapid = bolus refeição; basal; correction = correção por glicemia alta (não entra na razão HC/UI do dia).';

-- Glicemia manual (tira, laboratório) quando não há ponto Libre
create table if not exists public.glucose_manual_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  logged_on date not null,
  measured_at timestamptz not null,
  value numeric not null check (value > 0),
  unit text not null check (unit in ('mg_dl', 'mmol_l')),
  source text not null default 'fingerstick'
    check (source in ('fingerstick', 'lab', 'other')),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists glucose_manual_entries_user_measured_idx
  on public.glucose_manual_entries (user_id, measured_at desc);

create index if not exists glucose_manual_entries_user_day_idx
  on public.glucose_manual_entries (user_id, logged_on desc);

comment on table public.glucose_manual_entries is
  'Leituras fora do Libre; value + unit. logged_on = dia civil (YYYY-MM-DD) como nos outros registos.';

-- Episódios hipo / hiper (resumo para relatório e contexto em gráficos)
create table if not exists public.glycemic_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  logged_on date not null,
  occurred_at timestamptz not null default now(),
  kind text not null check (kind in ('hypo', 'hyper')),
  glucose_value numeric check (glucose_value is null or glucose_value > 0),
  glucose_unit text check (glucose_unit is null or glucose_unit in ('mg_dl', 'mmol_l')),
  carbs_treatment_g numeric check (carbs_treatment_g is null or carbs_treatment_g >= 0),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists glycemic_events_user_day_idx
  on public.glycemic_events (user_id, logged_on desc);

create index if not exists glycemic_events_user_occurred_idx
  on public.glycemic_events (user_id, occurred_at desc);

comment on table public.glycemic_events is
  'Hipoglicemia/hiperglicemia: carbs_treatment_g = HC de recuperação (hipo), opcional.';

-- Atividade física (contexto para variabilidade e consultas)
create table if not exists public.activity_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  logged_on date not null,
  started_at timestamptz not null,
  duration_minutes int not null
    check (duration_minutes > 0 and duration_minutes <= 1440),
  activity_type text not null
    check (activity_type in ('walk', 'run', 'cycle', 'sport', 'workout', 'other')),
  intensity text check (
    intensity is null
    or intensity in ('light', 'moderate', 'vigorous')
  ),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists activity_entries_user_day_idx
  on public.activity_entries (user_id, logged_on desc);

create index if not exists activity_entries_user_started_idx
  on public.activity_entries (user_id, started_at desc);

comment on table public.activity_entries is
  'Exercício: started_at + duration; logged_on para agregados diários.';

-- Referência opcional para correções (definido com equipa; não prescreve doses na app)
alter table public.profiles
  add column if not exists isf_drop_mg_dl_per_unit numeric
  check (isf_drop_mg_dl_per_unit is null or isf_drop_mg_dl_per_unit > 0);

alter table public.profiles
  add column if not exists correction_target_mg_dl numeric
  check (correction_target_mg_dl is null or correction_target_mg_dl > 0);

comment on column public.profiles.isf_drop_mg_dl_per_unit is
  'Fator de sensibilidade: quantos mg/dL desce 1 UI de rápida (armazenado sempre em mg/dL).';

comment on column public.profiles.correction_target_mg_dl is
  'Alvo de glicemia para correções em mg/dL (ex.: 100), opcional.';
