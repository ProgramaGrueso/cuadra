-- Recursos criticos: lista del tablero y cruce automatico entre "tengo" y "necesito".

create function public.recursos_cercanos(p_emergencia_id uuid, p_lat double precision, p_lng double precision)
returns table (
  id uuid, tipo text, accion text, cantidad integer, detalle text,
  distancia_m integer, nombre text, es_mio boolean
)
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  select
    r.id, r.tipo, r.accion, r.cantidad, r.detalle,
    round(st_distance(r.geom, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography))::integer,
    pp.nombre, r.user_id = auth.uid()
  from public.recursos_criticos r
  join public.perfiles_publicos pp on pp.id = r.user_id
  where r.emergencia_id = p_emergencia_id and auth.uid() is not null
  order by r.ts desc
  limit 100
$$;

-- Solo cruza lo publicado por quien consulta: el telefono ajeno se entrega porque
-- esa persona publico que tiene o necesita ese recurso, y solo a su contraparte.
create function public.cruces_de_recursos(p_emergencia_id uuid)
returns table (
  mi_recurso_id uuid, tipo text, mi_accion text,
  otro_id uuid, otro_nombre text, otro_cantidad integer, otro_detalle text,
  distancia_m integer, otro_telefono text
)
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  select
    mio.id, mio.tipo, mio.accion,
    otro.id, u.nombre, otro.cantidad, otro.detalle,
    round(st_distance(mio.geom, otro.geom))::integer, u.telefono
  from public.recursos_criticos mio
  join public.recursos_criticos otro
    on otro.emergencia_id = mio.emergencia_id
   and otro.tipo = mio.tipo
   and otro.accion <> mio.accion
   and otro.user_id <> mio.user_id
   and st_dwithin(otro.geom, mio.geom, 2000)
  join public.users u on u.id = otro.user_id
  where mio.emergencia_id = p_emergencia_id and mio.user_id = auth.uid()
  order by mio.id, st_distance(mio.geom, otro.geom)
  limit 50
$$;

grant execute on function
  public.recursos_cercanos(uuid, double precision, double precision),
  public.cruces_de_recursos(uuid)
  to authenticated;
