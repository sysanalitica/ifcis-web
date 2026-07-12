-- IFCIS secure schema for Supabase
-- Run through Supabase CLI migrations or SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('viewer','admin')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id, role) values (new.id, 'viewer')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 150),
  duration text not null default '',
  level text not null default '',
  icon text not null default '⌖' check (char_length(icon) <= 8),
  image_url text not null default '',
  storage_path text not null default '',
  description text not null default '' check (char_length(description) <= 2000),
  objectives text not null default '' check (char_length(objectives) <= 3000),
  requirements text not null default '' check (char_length(requirements) <= 3000),
  modality text not null default '',
  certification text not null default '',
  position integer not null default 0 check (position >= 0),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 150),
  image_url text not null,
  storage_path text not null default '',
  featured boolean not null default false,
  position integer not null default 0 check (position >= 0),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 150),
  role text not null default '' check (char_length(role) <= 150),
  image_url text not null,
  storage_path text not null default '',
  position integer not null default 0 check (position >= 0),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_dates (
  id uuid primary key default gen_random_uuid(),
  day text not null check (char_length(day) <= 2),
  month text not null check (char_length(month) <= 10),
  year integer not null check (year between 2020 and 2100),
  title text not null check (char_length(title) between 2 and 150),
  detail text not null default '' check (char_length(detail) <= 1000),
  position integer not null default 0 check (position >= 0),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('registration','contact')),
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null check (char_length(email) <= 200),
  phone text not null default '' check (char_length(phone) <= 40),
  course text not null default '' check (char_length(course) <= 150),
  message text not null default '' check (char_length(message) <= 2000),
  source text not null default '' check (char_length(source) <= 300),
  status text not null default 'new' check (status in ('new','contacted','closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.lead_rate_limits (
  ip_hash text primary key,
  window_start timestamptz not null default now(),
  request_count integer not null default 1 check (request_count >= 0)
);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  table_name text not null,
  record_id uuid,
  action text not null check (action in ('INSERT','UPDATE','DELETE')),
  changed_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['courses','gallery_items','team_members','course_dates']
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log(actor_id, table_name, record_id, action)
  values (auth.uid(), tg_table_name, coalesce(new.id, old.id), tg_op);
  return coalesce(new, old);
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['courses','gallery_items','team_members','course_dates','leads']
  loop
    execute format('drop trigger if exists audit_changes on public.%I', t);
    execute format('create trigger audit_changes after insert or update or delete on public.%I for each row execute function public.write_audit_log()', t);
  end loop;
end $$;

-- Atomic rate limit: maximum 5 requests per IP hash each hour.
create or replace function public.consume_lead_rate_limit(p_ip_hash text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare allowed boolean;
begin
  insert into public.lead_rate_limits(ip_hash, window_start, request_count)
  values (p_ip_hash, now(), 1)
  on conflict (ip_hash) do update
  set
    window_start = case
      when public.lead_rate_limits.window_start < now() - interval '1 hour' then now()
      else public.lead_rate_limits.window_start
    end,
    request_count = case
      when public.lead_rate_limits.window_start < now() - interval '1 hour' then 1
      else public.lead_rate_limits.request_count + 1
    end;

  select request_count <= 5 into allowed
  from public.lead_rate_limits where ip_hash = p_ip_hash;

  return coalesce(allowed, false);
end;
$$;

revoke all on function public.consume_lead_rate_limit(text) from public, anon, authenticated;

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.gallery_items enable row level security;
alter table public.team_members enable row level security;
alter table public.course_dates enable row level security;
alter table public.leads enable row level security;
alter table public.lead_rate_limits enable row level security;
alter table public.audit_log enable row level security;

-- Profiles
create policy "users read own profile" on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin());

-- Published public content; admins can manage all content.
create policy "public reads published courses" on public.courses for select to anon, authenticated using (is_published or public.is_admin());
create policy "admins manage courses" on public.courses for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public reads published gallery" on public.gallery_items for select to anon, authenticated using (is_published or public.is_admin());
create policy "admins manage gallery" on public.gallery_items for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public reads published team" on public.team_members for select to anon, authenticated using (is_published or public.is_admin());
create policy "admins manage team" on public.team_members for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public reads published dates" on public.course_dates for select to anon, authenticated using (is_published or public.is_admin());
create policy "admins manage dates" on public.course_dates for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Leads can only be accessed by admins. Public insertion happens through Edge Function.
create policy "admins read leads" on public.leads for select to authenticated using (public.is_admin());
create policy "admins update leads" on public.leads for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete leads" on public.leads for delete to authenticated using (public.is_admin());

create policy "admins read audit" on public.audit_log for select to authenticated using (public.is_admin());

-- Grants required by Data API. RLS remains the authorization boundary.
grant usage on schema public to anon, authenticated;
grant select on public.courses, public.gallery_items, public.team_members, public.course_dates to anon, authenticated;
grant select, insert, update, delete on public.courses, public.gallery_items, public.team_members, public.course_dates to authenticated;
grant select, update, delete on public.leads to authenticated;
grant select on public.profiles, public.audit_log to authenticated;

-- Storage bucket and policies.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('ifcis-media','ifcis-media',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
set public=true, file_size_limit=5242880, allowed_mime_types=array['image/jpeg','image/png','image/webp'];

create policy "public reads IFCIS media"
on storage.objects for select to public
using (bucket_id = 'ifcis-media');

create policy "admins upload IFCIS media"
on storage.objects for insert to authenticated
with check (bucket_id = 'ifcis-media' and public.is_admin());

create policy "admins update IFCIS media"
on storage.objects for update to authenticated
using (bucket_id = 'ifcis-media' and public.is_admin())
with check (bucket_id = 'ifcis-media' and public.is_admin());

create policy "admins delete IFCIS media"
on storage.objects for delete to authenticated
using (bucket_id = 'ifcis-media' and public.is_admin());

-- Seed content only when tables are empty.
insert into public.courses(title,duration,level,icon,image_url,description,objectives,requirements,modality,certification,position)
select * from (values
('LEGÍTIMO USUARIO','8 HORAS','NIVEL INICIAL','⌖','assets/legitimo.jpg','Curso introductorio sobre seguridad, normativa y manipulación responsable de armas.','Comprender las normas básicas de seguridad y adquirir hábitos responsables.','Documento de identidad. No se requiere experiencia previa.','TEORÍA + PRÁCTICA','CERTIFICADO DE ASISTENCIA',0),
('INSTRUCTOR DE TIRO','120 HORAS','NIVEL PROFESIONAL','◉','assets/instructor.jpg','Formación integral orientada a la enseñanza y conducción segura de prácticas.','Desarrollar criterios pedagógicos, técnicos y de seguridad.','Experiencia comprobable y documentación habilitante.','PRESENCIAL','CERTIFICACIÓN PROFESIONAL',1),
('ARMA CORTA','1 JORNADA','NIVEL INTERMEDIO','⊕','assets/arma-corta.jpg','Entrenamiento técnico de postura, empuñe, control y precisión.','Mejorar fundamentos, consistencia y seguridad.','Conocimientos básicos y documentación correspondiente.','PRÁCTICA INTENSIVA','CERTIFICADO DE PARTICIPACIÓN',2),
('ARMA LARGA','1 JORNADA','NIVEL INTERMEDIO','◒','assets/arma-larga.jpg','Capacitación progresiva en fundamentos técnicos y uso seguro.','Incorporar postura, control y procedimientos de seguridad.','Conocimientos básicos y documentación correspondiente.','PRÁCTICA GUIADA','CERTIFICADO DE PARTICIPACIÓN',3)
) as seed(title,duration,level,icon,image_url,description,objectives,requirements,modality,certification,position)
where not exists (select 1 from public.courses);

insert into public.gallery_items(title,image_url,position)
select * from (values
('CAMPO DE TIRO','assets/gallery_1.png',0),
('BRIEFING TÁCTICO','assets/gallery_2.png',1),
('EQUIPAMIENTO Y SEGURIDAD','assets/gallery_3.png',2),
('DEFENSA PERSONAL','assets/gallery_4.png',3)
) as seed(title,image_url,position)
where not exists (select 1 from public.gallery_items);

insert into public.team_members(name,role,image_url,position)
select * from (values
('Director Académico','DIRECCIÓN Y COORDINACIÓN','assets/team_1.png',0),
('Instructor Principal','TIRO Y TÁCTICAS','assets/team_2.png',1),
('Especialista en Custodia','PROTECCIÓN EJECUTIVA','assets/team_3.png',2),
('Instructora de Defensa','DEFENSA PERSONAL','assets/team_4.png',3)
) as seed(name,role,image_url,position)
where not exists (select 1 from public.team_members);

insert into public.course_dates(day,month,year,title,detail,position)
select * from (values
('18','JUL',2026,'Legítimo Usuario','Sábado · 09:00 a 17:00 · Buenos Aires',0),
('25','JUL',2026,'Arma Corta — Nivel Inicial','Sábado · Jornada completa · Vacantes limitadas',1)
) as seed(day,month,year,title,detail,position)
where not exists (select 1 from public.course_dates);

-- AFTER creating the administrator in Authentication > Users, promote it:
-- update public.profiles set role='admin'
-- where id=(select id from auth.users where email='TU_EMAIL_ADMIN');
