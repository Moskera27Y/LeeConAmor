-- LeeConAmor: esquema Supabase (pegar en SQL Editor del dashboard).
-- Tablas con Row Level Security: cada padre solo ve lo suyo (auth.uid()).

create table if not exists padres (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  nombre text,
  created_at timestamptz default now()
);

create table if not exists hijos (
  id uuid primary key default gen_random_uuid(),
  padre_id uuid not null references padres(id) on delete cascade,
  nombre text not null,
  avatar text default '🦁',
  rango text not null default '3-5',
  graduado boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists progreso (
  hijo_id uuid primary key references hijos(id) on delete cascade,
  etapa text default 'vocales',
  n integer default 0,
  pesos jsonb default '{}'::jsonb,
  aciertos jsonb default '{}'::jsonb,
  score integer default 0,
  leccion_id text,
  actividad_idx integer,
  updated_at timestamptz default now()
);

-- Lección activa y actividad (para retomar el recorrido guiado en otro dispositivo).
-- Es idempotente: se puede volver a pegar este schema sin romper nada.
alter table progreso add column if not exists leccion_id text;
alter table progreso add column if not exists actividad_idx integer;

create table if not exists sesiones (
  id uuid primary key default gen_random_uuid(),
  hijo_id uuid not null references hijos(id) on delete cascade,
  inicio timestamptz default now(),
  fin timestamptz,
  puntos integer default 0
);

alter table padres enable row level security;
alter table hijos enable row level security;
alter table progreso enable row level security;
alter table sesiones enable row level security;

drop policy if exists "padre propio" on padres;
create policy "padre propio" on padres for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "hijos del padre" on hijos;
create policy "hijos del padre" on hijos for all using (padre_id = auth.uid()) with check (padre_id = auth.uid());

drop policy if exists "progreso del padre" on progreso;
create policy "progreso del padre" on progreso for all
  using (exists (select 1 from hijos h where h.id = progreso.hijo_id and h.padre_id = auth.uid()))
  with check (exists (select 1 from hijos h where h.id = progreso.hijo_id and h.padre_id = auth.uid()));

drop policy if exists "sesiones del padre" on sesiones;
create policy "sesiones del padre" on sesiones for all
  using (exists (select 1 from hijos h where h.id = sesiones.hijo_id and h.padre_id = auth.uid()))
  with check (exists (select 1 from hijos h where h.id = sesiones.hijo_id and h.padre_id = auth.uid()));
