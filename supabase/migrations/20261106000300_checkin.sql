-- PostgREST traduce upsert a "do update" de todas las columnas enviadas, y user_id y
-- emergencia_id no se pueden actualizar a proposito. Esta funcion solo toca estado y ts.
create function public.marcar_checkin(p_emergencia_id uuid, p_estado text default 'bien') returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (select 1 from public.emergencias e where e.id = p_emergencia_id and e.activa) then
    raise exception 'Esta emergencia ya terminó.' using errcode = 'P0001';
  end if;
  insert into public.checkins (user_id, emergencia_id, estado)
  values (auth.uid(), p_emergencia_id, p_estado)
  on conflict (user_id, emergencia_id) do update set estado = excluded.estado, ts = now();
end;
$$;

grant execute on function public.marcar_checkin(uuid, text) to authenticated;
