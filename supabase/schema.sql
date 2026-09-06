-- ============================================================
--  Esquema de la dinámica.
--  Pegá TODO este archivo en Supabase > SQL Editor y ejecutalo.
--  Se puede volver a ejecutar sin romper nada.
-- ============================================================

-- ---------- Pedidos ----------
create table if not exists pedidos (
  id          uuid primary key default gen_random_uuid(),
  nombre      text        not null,
  whatsapp    text        not null,
  cantidad    int         not null check (cantidad > 0),
  total       int         not null,
  -- pendiente: esperando el pago | pagado: números asignados
  -- rechazado: Mercado Pago lo rechazó | sin_stock: se agotaron los números
  estado      text        not null default 'pendiente'
              check (estado in ('pendiente', 'pagado', 'rechazado', 'sin_stock')),
  mp_payment_id text,
  creado_en   timestamptz not null default now(),
  pagado_en   timestamptz
);

-- ---------- El bombo: un renglón por número ----------
create table if not exists numeros (
  numero      int  primary key,
  pedido_id   uuid references pedidos(id) on delete set null,
  asignado_en timestamptz
);

-- Sembramos del 1 al 1000. Cambiá el 1000 si querés otro rango
-- (y volvé a ejecutar: los que ya existen no se tocan).
insert into numeros (numero)
select generate_series(1, 1000)
on conflict (numero) do nothing;

-- Índice parcial: las consultas siempre buscan números libres.
create index if not exists numeros_libres_idx on numeros (numero) where pedido_id is null;
create index if not exists numeros_pedido_idx on numeros (pedido_id);

-- ---------- Nadie entra sin la service role key ----------
-- Sin políticas definidas, RLS bloquea todo para las claves públicas.
-- El servidor usa la service_role, que se saltea RLS.
alter table pedidos enable row level security;
alter table numeros enable row level security;

-- ============================================================
--  asignar_numeros(): saca números del bombo de forma atómica.
--
--  Es el corazón del sistema. Dos cosas importantes:
--
--  1. FOR UPDATE SKIP LOCKED — si dos pagos se acreditan en el mismo
--     instante, la segunda transacción SALTEA los renglones que la
--     primera está tocando en vez de esperarlos o pisarlos. Es
--     imposible que dos personas reciban el mismo número.
--
--  2. Es idempotente — Mercado Pago reintenta las notificaciones, así
--     que si el pedido ya estaba pago devolvemos los números que ya
--     tiene en vez de asignarle otros.
-- ============================================================
create or replace function asignar_numeros(p_pedido_id uuid, p_payment_id text)
returns int[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido  pedidos%rowtype;
  v_libres  int;
  v_numeros int[];
begin
  -- Bloqueamos el pedido: dos webhooks del mismo pago se hacen fila acá.
  select * into v_pedido from pedidos where id = p_pedido_id for update;

  if not found then
    raise exception 'No existe el pedido %', p_pedido_id;
  end if;

  -- Ya estaba pago: devolvemos lo que ya tiene.
  if v_pedido.estado = 'pagado' then
    select array_agg(n.numero order by n.numero) into v_numeros
    from numeros n where n.pedido_id = p_pedido_id;
    return coalesce(v_numeros, '{}');
  end if;

  -- ¿Alcanzan los números? Si no, lo marcamos y salimos sin tocar el bombo,
  -- así el webhook no reintenta para siempre y vos podés devolver la plata.
  select count(*) into v_libres from numeros where pedido_id is null;

  if v_libres < v_pedido.cantidad then
    update pedidos set estado = 'sin_stock', mp_payment_id = p_payment_id
    where id = p_pedido_id;
    return '{}';
  end if;

  -- Sacamos los números del bombo.
  with elegidos as (
    select n.numero
    from numeros n
    where n.pedido_id is null
    order by random()
    limit v_pedido.cantidad
    for update skip locked
  ),
  tomados as (
    update numeros n
    set pedido_id = p_pedido_id, asignado_en = now()
    from elegidos e
    where n.numero = e.numero
    returning n.numero
  )
  select array_agg(numero order by numero) into v_numeros from tomados;

  v_numeros := coalesce(v_numeros, '{}');

  -- Carrera perdida contra otra compra simultánea: SKIP LOCKED nos dejó
  -- con menos de los que pedimos. Cancelamos todo y dejamos que Mercado
  -- Pago reintente; en el reintento ya va a haber lugar o va a caer en
  -- la rama de sin_stock de arriba.
  if coalesce(array_length(v_numeros, 1), 0) <> v_pedido.cantidad then
    raise exception 'Se pidieron % números y solo se pudieron tomar %',
      v_pedido.cantidad, coalesce(array_length(v_numeros, 1), 0);
  end if;

  update pedidos
  set estado = 'pagado', mp_payment_id = p_payment_id, pagado_en = now()
  where id = p_pedido_id;

  return v_numeros;
end;
$$;
