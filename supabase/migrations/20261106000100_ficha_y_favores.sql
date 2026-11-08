-- Lecturas que necesitan datos de varias tablas sin abrir users, cuya fila solo lee su dueno.

create function public.ficha_prestador(p_id uuid, p_lat double precision, p_lng double precision)
returns table (
  id uuid, nombre text, oficio_id smallint, oficio text, icono text,
  descripcion text, tarifa_ref text, disponible_emergencia boolean,
  lat double precision, lng double precision, distancia_m integer,
  vistos_buenos integer, sello boolean, favores_hechos integer, tiene_whatsapp boolean,
  es_mio boolean, mi_visto_bueno boolean
)
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  select
    p.id, u.nombre, o.id, o.nombre, o.icono, p.descripcion, p.tarifa_ref, p.disponible_emergencia,
    p.lat, p.lng,
    round(st_distance(p.geom, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography))::integer,
    v.total::integer, v.total >= 3, pp.favores_hechos, u.telefono is not null,
    p.user_id = auth.uid(),
    exists (select 1 from public.vistos_buenos vb where vb.prestador_id = p.id and vb.vecino_id = auth.uid())
  from public.prestadores p
  join public.users u on u.id = p.user_id
  join public.oficios o on o.id = p.oficio_id
  join public.perfiles_publicos pp on pp.id = p.user_id
  cross join lateral (
    select count(*) as total from public.vistos_buenos vb where vb.prestador_id = p.id
  ) v
  where p.id = p_id and auth.uid() is not null
$$;

create function public.comentarios_prestador(p_id uuid)
returns table (nombre text, comentario text, ts timestamptz)
language sql stable security definer set search_path = '' as $$
  select pp.nombre, vb.comentario, vb.ts
  from public.vistos_buenos vb
  join public.perfiles_publicos pp on pp.id = vb.vecino_id
  where vb.prestador_id = p_id and vb.comentario is not null and auth.uid() is not null
  order by vb.ts desc
  limit 30
$$;

-- Los favores cumplidos solo los ven sus participantes: el muro muestra lo que aun se puede hacer.
create function public.favores_cercanos(p_lat double precision, p_lng double precision, p_radio_m integer default 3000)
returns table (
  id uuid, tipo text, categoria_id text, texto text, urgente boolean, estado text,
  distancia_m integer, ts timestamptz, autor_id uuid, autor text, autor_favores integer,
  autor_tiene_whatsapp boolean, ayudante_id uuid, ayudante text
)
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  with punto as (
    select st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography as g
  )
  select
    f.id, f.tipo, f.categoria_id, f.texto, f.urgente, f.estado,
    round(st_distance(f.geom, punto.g))::integer, f.ts,
    f.autor_id, a.nombre, a.favores_hechos, u.telefono is not null,
    f.ayudante_id, h.nombre
  from public.favores f
  cross join punto
  join public.perfiles_publicos a on a.id = f.autor_id
  join public.users u on u.id = f.autor_id
  left join public.perfiles_publicos h on h.id = f.ayudante_id
  where auth.uid() is not null
    and st_dwithin(f.geom, punto.g, least(greatest(p_radio_m, 100), 10000))
    and (f.estado <> 'cumplido' or auth.uid() in (f.autor_id, f.ayudante_id))
  order by f.estado = 'cumplido', f.urgente desc, f.ts desc
  limit 100
$$;

-- El registro promete que el telefono solo se comparte al contactar: con registro
-- anonimo, cualquiera podria recolectar los numeros de todos los autores del muro.
create or replace function public.contacto_favor(p_favor_id uuid) returns text
language sql stable security definer set search_path = '' as $$
  select u.telefono from public.favores f
  join public.users u on u.id = f.autor_id
  where f.id = p_favor_id and f.ayudante_id = auth.uid()
$$;

-- Postgres da EXECUTE a PUBLIC en toda funcion nueva, y la version "in schema" del
-- esquema inicial no puede quitarlo: hace falta el default global y revocar aqui.
alter default privileges revoke execute on functions from public;
revoke execute on all functions in schema public from public, anon;

grant execute on function
  public.ficha_prestador(uuid, double precision, double precision),
  public.comentarios_prestador(uuid),
  public.favores_cercanos(double precision, double precision, integer)
  to authenticated;
