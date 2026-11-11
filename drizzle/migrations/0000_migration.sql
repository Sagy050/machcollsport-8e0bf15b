-- Enums
create type public.app_role as enum ('admin', 'recorder', 'viewer');
create type public.house_name as enum ('ravens', 'hawks', 'eagles', 'falcons');
create type public.event_level as enum ('junior', 'intermediate', 'senior', 'mixed');
create type public.event_gender as enum ('boys', 'girls', 'open');
create type public.measure_type as enum ('time', 'distance', 'height', 'score', 'placing');
create type public.event_status as enum ('scheduled', 'in_progress', 'completed', 'finalised');

-- Shared updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  created_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- Roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.can_record(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('admin','recorder'))
$$;

create policy "Users read own profile, admins read all" on public.profiles
  for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Users update own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "Users read own roles, admins read all" on public.user_roles
  for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- New user: profile + role (first user becomes admin, others viewers)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _role public.app_role;
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;

  if exists (select 1 from public.user_roles where role = 'admin') then
    _role := 'viewer';
  else
    _role := 'admin';
  end if;

  insert into public.user_roles (user_id, role) values (new.id, _role)
  on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Admin: set a user's single role
create or replace function public.set_user_role(_user_id uuid, _role public.app_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Only admins can change roles';
  end if;
  if _user_id = auth.uid() and _role <> 'admin' then
    raise exception 'You cannot remove your own admin access';
  end if;
  delete from public.user_roles where user_id = _user_id;
  insert into public.user_roles (user_id, role) values (_user_id, _role);
end;
$$;
grant execute on function public.set_user_role(uuid, public.app_role) to authenticated;

-- Points scale
create table public.points_scale (
  position integer primary key check (position > 0),
  points integer not null check (points >= 0)
);
grant select on public.points_scale to anon, authenticated;
grant insert, update, delete on public.points_scale to authenticated;
grant all on public.points_scale to service_role;
alter table public.points_scale enable row level security;
create policy "Anyone can read points scale" on public.points_scale for select to anon, authenticated using (true);
create policy "Admins insert points" on public.points_scale for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins update points" on public.points_scale for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete points" on public.points_scale for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

insert into public.points_scale (position, points) values
  (1, 10), (2, 8), (3, 6), (4, 5), (5, 4), (6, 3), (7, 2), (8, 1);

-- Events
create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  level public.event_level not null default 'mixed',
  gender public.event_gender not null default 'open',
  measure public.measure_type not null default 'time',
  is_team boolean not null default false,
  points_multiplier numeric(4,2) not null default 1 check (points_multiplier > 0 and points_multiplier <= 5),
  status public.event_status not null default 'scheduled',
  scheduled_time text,
  venue text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.events to anon, authenticated;
grant insert, update, delete on public.events to authenticated;
grant all on public.events to service_role;
alter table public.events enable row level security;
create policy "Anyone can read events" on public.events for select to anon, authenticated using (true);
create policy "Admins create events" on public.events for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Recorders update open events, admins any" on public.events for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or (public.can_record(auth.uid()) and status <> 'finalised'))
  with check (public.has_role(auth.uid(), 'admin') or (public.can_record(auth.uid()) and status <> 'finalised'));
create policy "Admins delete events" on public.events for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create trigger events_updated_at before update on public.events
  for each row execute function public.set_updated_at();

-- Recorders may only change status (not to finalised) on events
create or replace function public.guard_event_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.has_role(auth.uid(), 'admin') or auth.uid() is null then
    return new;
  end if;
  if new.name is distinct from old.name or new.level is distinct from old.level
     or new.gender is distinct from old.gender or new.measure is distinct from old.measure
     or new.is_team is distinct from old.is_team or new.points_multiplier is distinct from old.points_multiplier then
    raise exception 'Only admins can change event details';
  end if;
  return new;
end;
$$;
create trigger events_guard before update on public.events
  for each row execute function public.guard_event_update();

-- Results
create table public.results (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  participant_name text not null check (char_length(participant_name) between 1 and 120),
  house public.house_name not null,
  performance text check (performance is null or char_length(performance) <= 40),
  position integer check (position is null or (position > 0 and position <= 50)),
  recorded_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index results_event_id_idx on public.results(event_id);
grant select on public.results to anon, authenticated;
grant insert, update, delete on public.results to authenticated;
grant all on public.results to service_role;
alter table public.results enable row level security;

create or replace function public.event_is_open(_event_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.events where id = _event_id and status <> 'finalised')
$$;

create policy "Anyone can read results" on public.results for select to anon, authenticated using (true);
create policy "Recorders add results to open events" on public.results for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin') or (public.can_record(auth.uid()) and public.event_is_open(event_id)));
create policy "Recorders edit results of open events" on public.results for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or (public.can_record(auth.uid()) and public.event_is_open(event_id)))
  with check (public.has_role(auth.uid(), 'admin') or (public.can_record(auth.uid()) and public.event_is_open(event_id)));
create policy "Recorders delete results of open events" on public.results for delete to authenticated
  using (public.has_role(auth.uid(), 'admin') or (public.can_record(auth.uid()) and public.event_is_open(event_id)));

create trigger results_updated_at before update on public.results
  for each row execute function public.set_updated_at();

-- Admin reset tools
create or replace function public.reset_all_results()
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Only admins can reset results';
  end if;
  delete from public.results where true;
  update public.events set status = 'scheduled' where true;
end;
$$;
grant execute on function public.reset_all_results() to authenticated;

-- Realtime
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.results;
alter publication supabase_realtime add table public.points_scale;

-- Starter programme (admins can edit or delete)
insert into public.events (name, level, gender, measure, is_team, points_multiplier, scheduled_time, venue) values
  ('100m Sprint', 'junior', 'boys', 'time', false, 1, '08:30', 'Track'),
  ('100m Sprint', 'junior', 'girls', 'time', false, 1, '08:40', 'Track'),
  ('100m Sprint', 'intermediate', 'boys', 'time', false, 1, '08:50', 'Track'),
  ('100m Sprint', 'intermediate', 'girls', 'time', false, 1, '09:00', 'Track'),
  ('100m Sprint', 'senior', 'boys', 'time', false, 1, '09:10', 'Track'),
  ('100m Sprint', 'senior', 'girls', 'time', false, 1, '09:20', 'Track'),
  ('Long Jump', 'junior', 'open', 'distance', false, 1, '09:00', 'Jumps pit'),
  ('High Jump', 'intermediate', 'open', 'height', false, 1, '09:30', 'High jump area'),
  ('Shot Put', 'senior', 'open', 'distance', false, 1, '10:00', 'Throws circle'),
  ('400m', 'senior', 'open', 'time', false, 1, '10:30', 'Track'),
  ('800m', 'intermediate', 'open', 'time', false, 1, '11:00', 'Track'),
  ('4x100m Relay', 'mixed', 'open', 'time', true, 2, '12:00', 'Track');
