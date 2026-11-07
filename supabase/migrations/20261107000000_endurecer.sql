-- Arreglos de la prueba adversarial del 2026-11-07.

-- 1. Mudarse de golpe para dar Visto Bueno. La ubicacion la pone el telefono, asi que un
-- vecino lejano podia moverse junto al prestador, recomendarlo y volver. Ahora un cambio de
-- mas de ~500 m bloquea los Vistos Buenos por 24 h. La ubicacion del registro no cuenta.
alter table public.users add column ubicacion_cambiada_en timestamptz;

create function public.marcar_cambio_de_ubicacion() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.lat is not null and old.lng is not null
     and (abs(new.lat - old.lat) > 0.0045 or abs(new.lng - old.lng) > 0.0045) then
    new.ubicacion_cambiada_en := now();
  end if;
  return new;
end $$;
create trigger users_cambio_de_ubicacion before update of lat, lng on public.users
  for each row execute function public.marcar_cambio_de_ubicacion();

create or replace function public.validar_visto_bueno() returns trigger
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  v_vecino public.users%rowtype;
  v_prestador public.prestadores%rowtype;
  v_radio integer;
begin
  select * into v_vecino from public.users where id = new.vecino_id;
  select * into v_prestador from public.prestadores where id = new.prestador_id;
  if v_prestador.user_id = new.vecino_id then
    raise exception 'No puedes darte Visto Bueno a ti mismo' using errcode = 'P0001';
  end if;
  if v_vecino.geom is null then
    raise exception 'Necesitamos tu ubicación para validar el Visto Bueno' using errcode = 'P0001';
  end if;
  if v_vecino.ubicacion_cambiada_en > now() - interval '24 hours' then
    raise exception 'Cambiaste tu ubicación hace poco. Podrás dar Visto Bueno mañana.' using errcode = 'P0001';
  end if;
  select coalesce((select radio_m from public.zonas where id = v_prestador.zona_id), 2000)
    into v_radio;
  if not st_dwithin(v_vecino.geom, v_prestador.geom, v_radio) then
    raise exception 'Solo los vecinos de la zona pueden dar Visto Bueno' using errcode = 'P0001';
  end if;
  return new;
end $$;

-- 2. Nombres invisibles: trim() no quita espacios de ancho cero. Se exige al menos una letra.
update public.users set nombre = 'Vecino' where nombre !~ '[A-Za-zÁÉÍÓÚáéíóúÑñÜü]';
alter table public.users add constraint users_nombre_con_letras
  check (nombre ~ '[A-Za-zÁÉÍÓÚáéíóúÑñÜü]');

-- 3. Reportes y recursos solo durante una emergencia. Se aceptan hasta 6 h despues de
-- cerrarla para que la cola sin senal pueda entregar lo que se publico durante el sismo.
create function public.emergencia_abierta(p_emergencia_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.emergencias e
    where e.id = p_emergencia_id
      and (e.activa or e.finalizada_en > now() - interval '6 hours')
  )
$$;
revoke execute on function public.emergencia_abierta(uuid) from public, anon;
grant execute on function public.emergencia_abierta(uuid) to authenticated;

drop policy "recursos: crear" on public.recursos_criticos;
create policy "recursos: crear" on public.recursos_criticos for insert to authenticated
  with check (user_id = auth.uid() and public.emergencia_abierta(emergencia_id));

create or replace function public.crear_reporte(
  p_id uuid, p_emergencia_id uuid, p_tipo text, p_descripcion text,
  p_lat double precision, p_lng double precision, p_direccion text
) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Sesión requerida' using errcode = '42501';
  end if;
  if not public.emergencia_abierta(p_emergencia_id) then
    raise exception 'Solo se puede reportar durante una emergencia.' using errcode = 'P0001';
  end if;
  insert into public.reportes_vulnerables
    (id, emergencia_id, tipo, descripcion, lat_aprox, lng_aprox, reportado_por)
    values (p_id, p_emergencia_id, p_tipo, p_descripcion, p_lat, p_lng, auth.uid())
    on conflict (id) do nothing;
  if found then
    insert into public.reportes_direcciones (reporte_id, direccion) values (p_id, p_direccion);
  end if;
  return p_id;
end $$;

-- 4. Favores, oficios y reportes hechos solo de espacios o caracteres invisibles dejaban
-- tarjetas vacias en el muro. Se exige al menos una letra o numero visible.
alter table public.favores add constraint favores_texto_visible
  check (texto ~ '[A-Za-z0-9ÁÉÍÓÚáéíóúÑñÜü]');
alter table public.prestadores add constraint prestadores_descripcion_visible
  check (descripcion ~ '[A-Za-z0-9ÁÉÍÓÚáéíóúÑñÜü]');
alter table public.reportes_vulnerables add constraint reportes_descripcion_visible
  check (descripcion ~ '[A-Za-z0-9ÁÉÍÓÚáéíóúÑñÜü]');
