-- Dishonored RPG: ataques e ações de combate, com custo de Vazio atômico.
-- Executado previamente no projeto Supabase em 27/11/2026.
-- Dano de armas é fixo, sem rolagem de dados de dano separada.
alter table public.dh_room_rolls
 add column if not exists action_name text,
 add column if not exists action_kind text,
 add column if not exists damage integer,
 add column if not exists void_spent integer not null default 0;

CREATE OR REPLACE FUNCTION public.dh_room_roll_action(p_room uuid, p_action_key text, p_dice integer DEFAULT 2, p_visibility text DEFAULT 'public'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 cid uuid; actor_sheet jsonb; action_doc jsonb; result_id uuid;
 kind text; catalog_ref uuid; record_name text; base_damage integer:=0; bonus integer:=0; cost integer:=0;
 skill_name text; style_name text; focus_name text; successes integer; target_difficulty integer;
 source_name text; catalog_rules jsonb;
begin
 if auth.uid() is null or not private.dh_room_member(p_room) then raise exception 'Entre na sala para executar ações.'; end if;
 if p_dice not between 2 and 5 or p_visibility not in ('public','private','gm_only') then raise exception 'Rolagem inválida.'; end if;
 select m.character_id into cid from public.dh_room_members m where m.room_id=p_room and m.user_id=auth.uid();
 if cid is null then raise exception 'Selecione um personagem.'; end if;
 select c.sheet into actor_sheet from public.dh_characters c where c.id=cid and c.owner_id=auth.uid() for update;
 if actor_sheet is null then raise exception 'Ficha não encontrada.'; end if;
 select x into action_doc from jsonb_array_elements(coalesce(actor_sheet->'combatActions','[]'::jsonb)) x
 where x->>'id'=p_action_key limit 1;
 if action_doc is null and p_action_key ~ '^(item|power):[0-9a-f-]{36}$' then
  select c.rules,c.name,c.id into catalog_rules,record_name,catalog_ref
   from public.dh_catalog c where c.id=split_part(p_action_key,':',2)::uuid
     and c.category=split_part(p_action_key,':',1) and c.published=true;
  if catalog_ref is not null then
   action_doc=jsonb_build_object('id',p_action_key,'name',record_name,
    'source',split_part(p_action_key,':',1),'sourceName',record_name,'sourceId',catalog_ref::text,
    'skill',case when split_part(p_action_key,':',1)='power' then 'Falar' else 'Lutar' end,
    'style',case when split_part(p_action_key,':',1)='power' then 'Forçosamente'
                when lower(record_name) ~ '(pistola|rifle|besta|arco|granada|revólver|revolver|bomba)' then 'Cuidadosamente'
                else 'Ousadamente' end,
    'bonus',0,'focus',null,'damage',coalesce((catalog_rules->>'dano')::integer,0),
    'voidCost',coalesce((catalog_rules->>'custo_vazio')::integer,0));
  end if;
 end if;
 if action_doc is null then raise exception 'Ação não encontrada na ficha. Salve a ficha antes de rolar.'; end if;
 kind=coalesce(action_doc->>'source','custom');
 source_name=nullif(btrim(coalesce(action_doc->>'sourceName','')),'');
 skill_name=nullif(btrim(action_doc->>'skill'),'');
 style_name=nullif(btrim(action_doc->>'style'),'');
 focus_name=nullif(btrim(coalesce(action_doc->>'focus','')),'');
 if skill_name is null or style_name is null then raise exception 'Defina perícia e estilo da ação na ficha.'; end if;
 bonus=coalesce((action_doc->>'bonus')::integer,0);
 if bonus not between -20 and 20 then raise exception 'Bônus de dano fora do limite.'; end if;
 if kind='item' then
  select c.rules,c.name into catalog_rules,record_name from public.dh_catalog c
  where c.category='item' and c.published=true
    and (c.id::text=action_doc->>'sourceId' or lower(c.name)=lower(source_name))
  order by (c.id::text=action_doc->>'sourceId') desc limit 1;
  if record_name is null or jsonb_typeof(catalog_rules->'dano')<>'number' then raise exception 'Arma não encontrada no catálogo.'; end if;
  if not exists(select 1 from jsonb_array_elements(coalesce(actor_sheet->'gmInventory','[]'::jsonb)) i
    where coalesce((i->>'quantity')::integer,0)>0
    and (lower(i->>'name')=lower(record_name) or lower(i->>'name') like lower(record_name)||' %'))
   and not exists(select 1 from public.dh_character_items ci where ci.character_id=cid
    and ci.quantity>0 and (lower(ci.name)=lower(record_name) or lower(ci.name) like lower(record_name)||' %'))
   and not exists(select 1 from public.dh_room_purchases pp join public.dh_catalog ca on ca.id=pp.catalog_id
     where pp.character_id=cid and ca.category='item' and lower(ca.name)=lower(record_name))
  then raise exception 'Esta arma não pertence ao personagem.'; end if;
  base_damage=(catalog_rules->>'dano')::integer;cost=0;
 elsif kind='power' then
  select c.rules,c.name into catalog_rules,record_name from public.dh_catalog c
   where c.category='power' and c.published=true
     and (c.id::text=action_doc->>'sourceId' or lower(c.name)=lower(source_name))
   order by (c.id::text=action_doc->>'sourceId') desc limit 1;
  if record_name is null then raise exception 'Poder não encontrado no catálogo.'; end if;
  if lower(coalesce(catalog_rules->>'tipo','')) like '%passivo%' then raise exception 'Poder passivo não pode ser executado como ataque.';end if;
  if not exists(select 1 from jsonb_array_elements(coalesce(actor_sheet->'catalogSelections'->'power','[]'::jsonb)) x
    where lower(x->>'name')=lower(record_name) or lower(x->>'name') like lower(record_name)||' -%')
   and not exists(select 1 from public.dh_room_purchases pp join public.dh_catalog ca on ca.id=pp.catalog_id
    where pp.character_id=cid and ca.category='power' and lower(ca.name)=lower(record_name))
  then raise exception 'Este poder não está registrado na ficha.';end if;
  cost=coalesce((catalog_rules->>'custo_vazio')::integer,0);
  base_damage=coalesce((catalog_rules->>'dano')::integer,0);
 elsif kind='custom' then
  base_damage=coalesce((action_doc->>'damage')::integer,0);
  cost=coalesce((action_doc->>'voidCost')::integer,0);
 else raise exception 'Tipo de ação inválido.';end if;
 if cost not between 0 and 20 or base_damage not between 0 and 100 then raise exception 'Custo ou dano inválidos.';end if;
 if cost>0 then
  update public.dh_characters set void_points=void_points-cost
   where id=cid and owner_id=auth.uid() and void_points>=cost;
  if not found then raise exception 'Pontos do Vazio insuficientes para usar esta ação.';end if;
 end if;
 select public.dh_roll_room(p_room,skill_name,style_name,focus_name,p_dice,1,p_visibility) into result_id;
 select r.successes,r.difficulty into successes,target_difficulty from public.dh_room_rolls r where r.id=result_id;
 update public.dh_room_rolls
  set action_name=left(coalesce(nullif(btrim(action_doc->>'name'),''),record_name,'Ação'),150),
      action_kind=kind,damage=case when successes>=target_difficulty then greatest(0,base_damage+bonus) else 0 end,
      void_spent=cost
  where id=result_id and user_id=auth.uid();
 return result_id;
end;
$function$
;

revoke all on function public.dh_room_roll_action(uuid,text,integer,text) from public,anon;
grant execute on function public.dh_room_roll_action(uuid,text,integer,text) to authenticated;
