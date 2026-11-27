-- Resource bars: configurable maximums live in character sheets.
-- Momentum default remains 6; optional per-character maximum is up to 50.
-- Void maximum is capped at 20 according to existing database constraints.
alter table public.dh_characters drop constraint if exists dh_characters_momentum_check;
alter table public.dh_characters add constraint dh_characters_momentum_check
 check (momentum >= 0 and momentum <= 50);

CREATE OR REPLACE FUNCTION public.dh_room_adjust_track(p_room uuid, p_character uuid, p_track text, p_delta integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare n integer; cap integer; current_value integer; profile_sheet jsonb; allowed boolean;
begin
 if auth.uid() is null or p_delta not in (-1,1) or p_track not in ('void','momentum') then
  raise exception 'Parâmetros inválidos.';
 end if;
 select (private.dh_room_gm(p_room) or exists(
   select 1 from public.dh_room_members m
   where m.room_id=p_room and m.user_id=auth.uid() and m.character_id=p_character
 )) into allowed;
 if not allowed then raise exception 'Sem permissão para alterar este recurso.';end if;
 select c.sheet,c.void_points,c.momentum into profile_sheet,
   current_value,n from public.dh_characters c where c.id=p_character for update;
 if profile_sheet is null then raise exception 'Personagem não encontrado.';end if;
 if p_track='void' then
  cap=greatest(1,least(20,coalesce(nullif(profile_sheet->>'voidMax','')::integer,greatest(current_value,3))));
  update public.dh_characters set void_points=least(cap,greatest(0,void_points+p_delta))
    where id=p_character returning void_points into n;
 else
  cap=greatest(1,least(50,coalesce(nullif(profile_sheet->>'momentumMax','')::integer,greatest(n,6))));
  update public.dh_characters set momentum=least(cap,greatest(0,momentum+p_delta))
    where id=p_character returning momentum into n;
 end if;
 return n;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.dh_room_track_limits(p_room uuid)
 RETURNS TABLE(character_id uuid, void_max integer, momentum_max integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select c.id,
 greatest(1,least(20,coalesce(nullif(c.sheet->>'voidMax','')::integer,greatest(c.void_points,3)))) as void_max,
 greatest(1,least(50,coalesce(nullif(c.sheet->>'momentumMax','')::integer,greatest(c.momentum,6)))) as momentum_max
 from public.dh_room_members m join public.dh_characters c on c.id=m.character_id
 where m.room_id=p_room and (select private.dh_room_member(p_room));
$function$
;

CREATE OR REPLACE FUNCTION public.dh_character_adjust_track(p_character uuid, p_track text, p_delta integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare n integer; cap integer; profile_sheet jsonb; current_void integer; current_momentum integer;
begin
 if auth.uid() is null or p_delta not in (-1,1) or p_track not in ('void','momentum') then
  raise exception 'Parâmetros inválidos.';
 end if;
 select c.sheet,c.void_points,c.momentum into profile_sheet,current_void,current_momentum
  from public.dh_characters c where c.id=p_character and c.owner_id=auth.uid() for update;
 if not found then raise exception 'Ficha não encontrada ou sem permissão.';end if;
 if p_track='void' then
  cap=greatest(1,least(20,coalesce(nullif(profile_sheet->>'voidMax','')::integer,greatest(current_void,3))));
  update public.dh_characters set void_points=least(cap,greatest(0,void_points+p_delta))
  where id=p_character returning void_points into n;
 else
  cap=greatest(1,least(50,coalesce(nullif(profile_sheet->>'momentumMax','')::integer,greatest(current_momentum,6))));
  update public.dh_characters set momentum=least(cap,greatest(0,momentum+p_delta))
  where id=p_character returning momentum into n;
 end if;
 return n;
end;
$function$
;

revoke all on function public.dh_room_adjust_track(uuid,uuid,text,integer) from public,anon;
grant execute on function public.dh_room_adjust_track(uuid,uuid,text,integer) to authenticated;
revoke all on function public.dh_character_adjust_track(uuid,text,integer) from public,anon;
grant execute on function public.dh_character_adjust_track(uuid,text,integer) to authenticated;
revoke all on function public.dh_room_track_limits(uuid) from public,anon;
grant execute on function public.dh_room_track_limits(uuid) to authenticated;
