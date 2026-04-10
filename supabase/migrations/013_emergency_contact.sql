-- Contacto de confiança para modo hipo (opcional; sem SMS automático na app)
alter table public.profiles
  add column if not exists emergency_contact_name text,
  add column if not exists emergency_contact_phone text;

comment on column public.profiles.emergency_contact_name is
  'Nome de contacto para partilha manual / chamada em emergência hipo (opcional).';
comment on column public.profiles.emergency_contact_phone is
  'Telefone para atalho tel: (opcional). A app não envia SMS.';
