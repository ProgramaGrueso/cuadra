-- Lugares reales del mapa de emergencia que no son organizaciones de apoyo.
-- Cada fila lleva su fuente. Una tienda aqui es donde se suele comprar: no asegura stock.
create table public.lugares_emergencia (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text not null check (tipo in ('punto_reunion', 'abastecimiento')),
  direccion text,
  detalle text,
  lat double precision not null,
  lng double precision not null,
  fuente text not null,
  zona_id smallint references public.zonas (id)
);

alter table public.lugares_emergencia enable row level security;
create policy "catalogo lugares" on public.lugares_emergencia for select to authenticated using (true);

-- Supabase concede todo por defecto a las tablas nuevas.
revoke all on public.lugares_emergencia from anon, authenticated;
grant select on public.lugares_emergencia to authenticated;
