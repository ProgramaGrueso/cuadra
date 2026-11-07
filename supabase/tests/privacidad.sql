-- Comprueba las garantias de privacidad y confianza contra la base real.
-- Correr tras `supabase db reset`:
--   docker exec -i supabase_db_cuadra psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/privacidad.sql
-- Todo corre en una transaccion que se revierte. Falla con excepcion al primer problema.
begin;

create function pg_temp.como(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

create function pg_temp.debe_fallar(p_sql text, p_que text) returns void language plpgsql as $$
begin
  execute p_sql;
  raise exception 'FALLO (se permitio): %', p_que;
exception
  when others then
    if sqlerrm like 'FALLO%' then raise; end if;
    raise notice 'ok  rechazado: % [%]', p_que, sqlerrm;
end $$;

create function pg_temp.comprobar(p_ok boolean, p_que text) returns void language plpgsql as $$
begin
  if p_ok is not true then raise exception 'FALLO: %', p_que; end if;
  raise notice 'ok  %', p_que;
end $$;

-- Vecino A en Lince, vecino B muy lejos, voluntario V verificado (como superusuario).
insert into public.users (id, nombre, telefono, lat, lng, zona_id) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Prueba A', '51900000001', -12.0845, -77.034, 1),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'Prueba B', null, -12.2, -76.9, null);
insert into public.users (id, nombre, lat, lng, zona_id, verificado) values
  ('cccccccc-0000-4000-8000-000000000003', 'Prueba V', -12.0845, -77.034, 1, true);

select pg_temp.como('aaaaaaaa-0000-4000-8000-000000000001');

-- Datos de otros vecinos
select pg_temp.comprobar((select count(*) from public.users) = 1, 'solo leo mi propia fila de users');
select pg_temp.comprobar(
  (select count(*) from public.perfiles_publicos) > 50, 'perfiles_publicos lista a los vecinos');
select pg_temp.debe_fallar('select telefono from public.perfiles_publicos', 'la vista no expone telefono');
select pg_temp.debe_fallar('select lat from public.perfiles_publicos', 'la vista no expone ubicacion');

-- Escalar privilegios
select pg_temp.debe_fallar(
  $q$update public.users set verificado = true where id = auth.uid()$q$, 'hacerme verificado');
select pg_temp.debe_fallar(
  $q$update public.users set es_admin = true where id = auth.uid()$q$, 'hacerme admin');
select pg_temp.debe_fallar(
  $q$insert into public.users (id, nombre, verificado) values (gen_random_uuid(), 'x', true)$q$, 'crear perfil verificado');

-- Emergencia
select pg_temp.debe_fallar('select public.activar_emergencia(1::smallint)', 'activar emergencia sin verificar');

-- Direccion de vulnerables
select pg_temp.comprobar(
  (select count(*) from public.reportes_vulnerables) = 6, 'veo los reportes publicos');
select pg_temp.comprobar(
  (select count(*) from public.reportes_direcciones) = 0, 'no veo ninguna direccion ajena');
select pg_temp.debe_fallar(
  $q$select public.atender_reporte('00000000-0000-4000-8006-000000000001')$q$, 'aceptar reporte sin verificar');

-- Ubicacion aproximada forzada por la base
insert into public.favores (id, tipo, categoria_id, texto, lat, lng, autor_id)
  values ('dddddddd-0000-4000-8000-000000000004', 'pido', 'herramientas', 'prueba', -12.08456789, -77.03456789, auth.uid());
select pg_temp.comprobar(
  (select lat = -12.085 and lng = -77.035 from public.favores where id = 'dddddddd-0000-4000-8000-000000000004'),
  'el favor se guarda redondeado a ~110 m');

-- Favores: no se puede saltar la maquina de estados
select pg_temp.debe_fallar(
  $q$insert into public.favores (tipo, categoria_id, texto, lat, lng, autor_id, estado) values ('pido', 'herramientas', 'x y z', 0, 0, auth.uid(), 'cumplido')$q$,
  'crear un favor ya cumplido');
select pg_temp.debe_fallar(
  $q$update public.favores set estado = 'cumplido' where autor_id = auth.uid()$q$, 'cambiar estado sin RPC');
select pg_temp.debe_fallar(
  $q$select public.tomar_favor('dddddddd-0000-4000-8000-000000000004')$q$, 'tomar mi propio favor');

-- Visto Bueno
select pg_temp.debe_fallar(
  $q$insert into public.vistos_buenos (prestador_id, vecino_id) values ('00000000-0000-4000-8002-000000000001', 'bbbbbbbb-0000-4000-8000-000000000002')$q$,
  'dar Visto Bueno a nombre de otro');
insert into public.vistos_buenos (prestador_id) values ('00000000-0000-4000-8002-000000000001');
select pg_temp.comprobar(true, 'un vecino dentro del radio da Visto Bueno');
select pg_temp.debe_fallar(
  $q$insert into public.vistos_buenos (prestador_id) values ('00000000-0000-4000-8002-000000000001')$q$, 'Visto Bueno duplicado');

-- RPC de cercania
select pg_temp.comprobar(
  (select count(*) from public.prestadores_cercanos(-12.0845, -77.034, 2000)) = 30, 'los 30 prestadores estan en el radio');
select pg_temp.comprobar(
  (select count(*) from public.prestadores_cercanos(-12.3, -76.8, 2000)) = 0, 'lejos no aparece nadie');
select pg_temp.comprobar(
  (select bool_and(sello = (vistos_buenos >= 3)) from public.prestadores_cercanos(-12.0845, -77.034, 2000)),
  'el sello aparece con 3 o mas Vistos Buenos');

-- Visto Bueno fuera del radio
select pg_temp.como('bbbbbbbb-0000-4000-8000-000000000002');
select pg_temp.debe_fallar(
  $q$insert into public.vistos_buenos (prestador_id) values ('00000000-0000-4000-8002-000000000002')$q$, 'Visto Bueno fuera del radio');

-- Voluntario verificado
select pg_temp.como('cccccccc-0000-4000-8000-000000000003');
select pg_temp.comprobar(
  (select activa from public.activar_emergencia(1::smallint)), 'un verificado activa la emergencia');
select pg_temp.comprobar(
  (select public.atender_reporte('00000000-0000-4000-8006-000000000001')) like 'Direcci%', 'el voluntario recibe la direccion al aceptar');
select pg_temp.comprobar(
  (select count(*) from public.reportes_direcciones) = 1, 'el voluntario solo ve la direccion que acepto');
select pg_temp.debe_fallar(
  $q$select public.atender_reporte('00000000-0000-4000-8006-000000000001')$q$, 'dos voluntarios aceptan el mismo reporte');

-- Cuando un favor se toma, solo quien lo recibe lo confirma
select pg_temp.comprobar(
  (select estado = 'en_curso' from public.tomar_favor('dddddddd-0000-4000-8000-000000000004')), 'tomar un favor ajeno');
select pg_temp.debe_fallar(
  $q$select public.cumplir_favor('dddddddd-0000-4000-8000-000000000004')$q$, 'el ayudante se confirma a si mismo');
select pg_temp.como('aaaaaaaa-0000-4000-8000-000000000001');
select pg_temp.comprobar(
  (select estado = 'cumplido' from public.cumplir_favor('dddddddd-0000-4000-8000-000000000004')), 'quien pidio confirma el favor');
select pg_temp.comprobar(
  (select favores_hechos = 1 from public.perfiles_publicos where id = 'cccccccc-0000-4000-8000-000000000003'), 'el contador suma al ayudante');

-- Sin sesion
reset role;
set local role anon;
select pg_temp.debe_fallar('select * from public.favores', 'anon lee favores');
select pg_temp.debe_fallar('select * from public.prestadores_cercanos(-12.08, -77.03, 2000)', 'anon usa la RPC');
select pg_temp.debe_fallar($q$select public.contacto_prestador('00000000-0000-4000-8002-000000000001')$q$, 'anon pide un telefono');
select pg_temp.debe_fallar('select public.activar_emergencia(1::smallint)', 'anon activa emergencia');
select pg_temp.debe_fallar('select public.conteo_checkins(gen_random_uuid())', 'anon cuenta checkins');
reset role;

rollback;
