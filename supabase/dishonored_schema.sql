-- Dishonored RPG: aplicar em um projeto Supabase exclusivo.
-- Uma conta por jogador; o mestre é promovido manualmente pelo administrador do projeto.
create schema if not exists private;
create table if not exists public.dh_profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '',
 role text not null default 'player' check (role in ('player','master')),
 created_at timestamptz not null default now()
);
create table if not exists public.dh_characters (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null default 'Sem nome',
 archetype text,
 sheet jsonb not null default '{}'::jsonb,
 xp integer not null default 0 check (xp >= 0),
 momentum integer not null default 0 check (momentum between 0 and 6),
 void_points integer not null default 0 check (void_points between 0 and 20),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.dh_master_state (
 id integer primary key default 1 check (id=1),
 chaos integer not null default 0 check (chaos>=0),
 updated_at timestamptz not null default now()
);
insert into public.dh_master_state(id,chaos) values(1,0) on conflict(id) do nothing;
create table if not exists public.dh_catalog (
 id uuid primary key default gen_random_uuid(),
 category text not null check (category in ('archetype','talent','power','bonecharm','item','skill','style','focus')),
 name text not null,
 archetype text,
 description text not null default '',
 xp_cost integer check (xp_cost >= 0),
 coins_cost integer check (coins_cost >= 0),
 rules jsonb not null default '{}'::jsonb,
 published boolean not null default false,
 unique(category,name,archetype)
);
create table if not exists public.dh_requests (
 id uuid primary key default gen_random_uuid(),
 character_id uuid not null references public.dh_characters(id) on delete cascade,
 catalog_id uuid references public.dh_catalog(id) on delete set null,
 request_type text not null check (request_type in ('advance','power','bonecharm','item')),
 details jsonb not null default '{}'::jsonb,
 status text not null default 'pending' check (status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(),
 reviewed_at timestamptz,
 reviewed_by uuid references auth.users(id)
);
-- Internal role lookup avoids recursive RLS policies. Only project admins can promote accounts.
create or replace function private.dh_is_master() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.dh_profiles p where p.id = (select auth.uid()) and p.role='master'); $$;
revoke all on function private.dh_is_master() from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.dh_is_master() to authenticated;
create or replace function private.dh_owns_character(p_id uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.dh_characters c where c.id=p_id and c.owner_id=(select auth.uid())); $$;
revoke all on function private.dh_owns_character(uuid) from public,anon;
grant execute on function private.dh_owns_character(uuid) to authenticated;
-- Sign-up trigger inserts profiles with player role regardless of user-provided metadata.
create or replace function private.dh_on_signup() returns trigger
language plpgsql security definer set search_path = ''
as $$ begin insert into public.dh_profiles(id,display_name,role)
values(new.id, coalesce(new.raw_user_meta_data->>'display_name',''), 'player')
on conflict (id) do nothing; return new; end; $$;
drop trigger if exists dh_signup on auth.users;
create trigger dh_signup after insert on auth.users for each row execute function private.dh_on_signup();
insert into public.dh_profiles(id,display_name,role)
select id,coalesce(raw_user_meta_data->>'display_name',''),'player' from auth.users
on conflict(id) do nothing;
alter table public.dh_profiles enable row level security;
alter table public.dh_characters enable row level security;
alter table public.dh_catalog enable row level security;
alter table public.dh_master_state enable row level security;
alter table public.dh_requests enable row level security;
revoke all on public.dh_profiles,public.dh_characters,public.dh_catalog,public.dh_requests,public.dh_master_state from anon,authenticated;
grant select on public.dh_profiles to authenticated;
grant select,insert,update,delete on public.dh_characters to authenticated;
grant select on public.dh_catalog to authenticated;
grant select,update(chaos,updated_at) on public.dh_master_state to authenticated;
grant insert,select on public.dh_requests to authenticated;
create policy "dh master state read master" on public.dh_master_state for select to authenticated
using ((select private.dh_is_master()));
create policy "dh master state update master" on public.dh_master_state for update to authenticated
using ((select private.dh_is_master())) with check ((select private.dh_is_master()));
-- Profile edits and permissions are server-admin only (no public update grant).
create policy "dh profiles self or master read" on public.dh_profiles for select to authenticated
using (id=(select auth.uid()) or (select private.dh_is_master()));
create policy "dh characters read" on public.dh_characters for select to authenticated
using (owner_id=(select auth.uid()) or (select private.dh_is_master()));
-- Restrict sensitive character columns: grant players write only sheet/name/archetype
revoke insert,update on public.dh_characters from authenticated;
grant insert(owner_id,name,archetype,sheet) on public.dh_characters to authenticated;
grant update(name,archetype,sheet,momentum,void_points) on public.dh_characters to authenticated;
create policy "dh characters insert own" on public.dh_characters for insert to authenticated
with check (owner_id=(select auth.uid()));
create policy "dh characters update own" on public.dh_characters for update to authenticated
using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));
create policy "dh characters delete own" on public.dh_characters for delete to authenticated
using (owner_id=(select auth.uid()));
create policy "dh catalog published" on public.dh_catalog for select to authenticated
using (published or (select private.dh_is_master()));
create policy "dh requests read" on public.dh_requests for select to authenticated
using ((select private.dh_owns_character(character_id)) or (select private.dh_is_master()));
create policy "dh requests create own" on public.dh_requests for insert to authenticated
with check ((select private.dh_owns_character(character_id)) and status='pending' and reviewed_by is null and reviewed_at is null);
-- Mestre pode avaliar solicitações via painel SQL/admin seguro; não há update público.
create index if not exists dh_characters_owner on public.dh_characters(owner_id);
create index if not exists dh_requests_character on public.dh_requests(character_id);
create index if not exists dh_catalog_category on public.dh_catalog(category,published);
-- Master assignment by project administrator, using SQL editor:
-- update public.dh_profiles set role='master' where id='<UUID do usuário mestre>';
-- Warning: do not grant player update to xp, momentum, approvals, or roles.
