-- ============================================================
-- AXIOMA FLUX v2 · flux_v2_14_ordenes_compra (09/11/2026)
-- Proveedores y órdenes de compra desde Inventario › Stock y quiebres.
-- · Cada producto puede tener un proveedor habitual (productos.proveedor_id).
-- · crear_ordenes_compra agrupa las líneas por proveedor: una única orden por proveedor.
-- · El envío por correo lo hace la Edge Function «enviar-oc» con el SMTP del dominio.
-- Solo añade tablas, una columna opcional y funciones: no cambia nada de lo existente.
-- ============================================================

-- ===================== TABLAS =====================
create table if not exists public.proveedores (
  empresa_id uuid not null default public.get_empresa_id() references public.empresas(id) on delete cascade,
  id text not null, nombre text not null, contacto text not null default '', email text not null default '',
  telefono text not null default '', plazo_dias int not null default 7 check (plazo_dias between 0 and 365),
  notas text not null default '', activo boolean not null default true,
  creado_por uuid default auth.uid(), creado timestamptz not null default now(),
  primary key (empresa_id, id)
);

alter table public.productos add column if not exists proveedor_id text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'productos_proveedor_fk') then
    alter table public.productos add constraint productos_proveedor_fk
      foreign key (empresa_id, proveedor_id) references public.proveedores(empresa_id, id) on delete set null (proveedor_id);
  end if;
end $$;

create table if not exists public.ordenes_compra (
  empresa_id uuid not null default public.get_empresa_id() references public.empresas(id) on delete cascade,
  id text not null, proveedor_id text not null, fecha date not null default public.hoy_empresa(),
  estado text not null default 'Borrador' check (estado in ('Borrador','Enviada','Recibida','Anulada')),
  email_para text not null default '', asunto text not null default '', mensaje text not null default '',
  entrega date, total numeric(14,2) not null default 0,
  enviada timestamptz, error_envio text not null default '',
  creado_por uuid default auth.uid(), creado timestamptz not null default now(),
  primary key (empresa_id, id),
  foreign key (empresa_id, proveedor_id) references public.proveedores(empresa_id, id)
);

-- Las líneas guardan SKU, nombre y costo del momento: la orden no cambia si luego se edita el producto
create table if not exists public.orden_compra_lineas (
  empresa_id uuid not null default public.get_empresa_id() references public.empresas(id) on delete cascade,
  orden_id text not null, linea int not null, producto_id text not null, sku text not null, nombre text not null,
  cantidad int not null check (cantidad > 0), costo numeric(14,4) not null default 0,
  primary key (empresa_id, orden_id, linea),
  foreign key (empresa_id, orden_id) references public.ordenes_compra(empresa_id, id) on delete cascade
);

create index if not exists productos_proveedor_idx on public.productos (empresa_id, proveedor_id);
create index if not exists ordenes_compra_estado_idx on public.ordenes_compra (empresa_id, estado);
create index if not exists ordenes_compra_proveedor_idx on public.ordenes_compra (empresa_id, proveedor_id);

-- ===================== SEGURIDAD A NIVEL DE FILA (mismo patrón que pedidos) =====================
do $$
declare t text;
begin
  foreach t in array array['proveedores', 'ordenes_compra', 'orden_compra_lineas'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_ver', t);
    execute format('drop policy if exists %I on public.%I', t || '_crear', t);
    execute format('drop policy if exists %I on public.%I', t || '_editar', t);
    execute format('drop policy if exists %I on public.%I', t || '_borrar', t);
    execute format($p$create policy %I on public.%I for select to authenticated
      using (empresa_id = (select public.get_empresa_id()))$p$, t || '_ver', t);
    execute format($p$create policy %I on public.%I for insert to authenticated
      with check (empresa_id = (select public.get_empresa_id()) and (select public.tiene_rol('operador')))$p$, t || '_crear', t);
    execute format($p$create policy %I on public.%I for update to authenticated
      using (empresa_id = (select public.get_empresa_id()) and (select public.tiene_rol('operador')))
      with check (empresa_id = (select public.get_empresa_id()))$p$, t || '_editar', t);
    execute format($p$create policy %I on public.%I for delete to authenticated
      using (empresa_id = (select public.get_empresa_id()) and (select public.tiene_rol('admin')))$p$, t || '_borrar', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- ===================== FUNCIONES =====================
-- Todo lo que necesita la pantalla de compras: proveedores, proveedor de cada producto y órdenes recientes
create or replace function public.compras_datos() returns jsonb
language plpgsql stable security invoker set search_path = public as $$
declare v_emp uuid := get_empresa_id(); v_tz text;
begin
  if v_emp is null then return error_('Tu usuario no está asociado a una empresa activa.'); end if;
  v_tz := coalesce(ajustes_empresa(v_emp)->>'zona_horaria', 'Europe/Madrid');
  return jsonb_build_object('ok', true,
    'proveedores', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'nombre', nombre, 'contacto', contacto, 'email', email,
        'telefono', telefono, 'plazo', plazo_dias, 'notas', notas, 'activo', activo) order by nombre) from proveedores), '[]'),
    'asignacion', coalesce((select jsonb_object_agg(id, proveedor_id) from productos where proveedor_id is not null), '{}'),
    'ordenes', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'proveedor', o.proveedor_id, 'fecha', to_char(o.fecha, 'YYYY-MM-DD'),
        'estado', o.estado, 'para', o.email_para, 'asunto', o.asunto, 'mensaje', o.mensaje,
        'entrega', coalesce(to_char(o.entrega, 'YYYY-MM-DD'), ''), 'total', o.total, 'error', o.error_envio,
        'enviada', coalesce(to_char(o.enviada at time zone v_tz, 'YYYY-MM-DD HH24:MI'), ''),
        'lineas', coalesce((select jsonb_agg(jsonb_build_object('producto', l.producto_id, 'sku', l.sku, 'nombre', l.nombre,
            'cantidad', l.cantidad, 'costo', l.costo) order by l.linea) from orden_compra_lineas l where l.orden_id = o.id), '[]'))
        order by o.creado desc)
      from ordenes_compra o where o.estado in ('Borrador', 'Enviada') or o.fecha >= hoy_empresa() - 120), '[]'));
end $$;

-- Crea o edita un proveedor (d.id vacío = nuevo)
create or replace function public.guardar_proveedor(d jsonb) returns jsonb
language plpgsql volatile security invoker set search_path = public as $$
declare v_emp uuid := get_empresa_id(); v_id text := nullif(btrim(coalesce(d->>'id', '')), ''); v_nombre text := btrim(coalesce(d->>'nombre', ''));
  v_email text := lower(btrim(coalesce(d->>'email', ''))); v_plazo int;
begin
  if v_emp is null then return error_('Tu usuario no está asociado a una empresa activa.'); end if;
  if not tiene_rol('operador') then return error_('Tu usuario es de solo lectura.'); end if;
  if v_nombre = '' then return error_('Escribe el nombre del proveedor.'); end if;
  if v_email <> '' and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return error_('El email del proveedor no es válido.'); end if;
  v_plazo := least(365, greatest(0, coalesce(nullif(d->>'plazo', '')::numeric, 7)::int));
  if v_id is null then
    v_id := siguiente_id('PRV');
    insert into proveedores (empresa_id, id, nombre, contacto, email, telefono, plazo_dias, notas)
    values (v_emp, v_id, left(v_nombre, 120), left(btrim(coalesce(d->>'contacto', '')), 120), v_email,
            left(btrim(coalesce(d->>'telefono', '')), 40), v_plazo, left(coalesce(d->>'notas', ''), 500));
  else
    update proveedores set nombre = left(v_nombre, 120), contacto = left(btrim(coalesce(d->>'contacto', '')), 120), email = v_email,
      telefono = left(btrim(coalesce(d->>'telefono', '')), 40), plazo_dias = v_plazo, notas = left(coalesce(d->>'notas', ''), 500),
      activo = coalesce((d->>'activo')::boolean, true)
    where id = v_id;
    if not found then return error_('No se encontró el proveedor.'); end if;
  end if;
  return jsonb_build_object('ok', true, 'id', v_id, 'mensaje', 'Proveedor ' || v_nombre || ' guardado.');
end $$;

-- Proveedor habitual de uno o varios productos (p_proveedor vacío = quitarlo)
create or replace function public.asignar_proveedor(p_productos text[], p_proveedor text) returns jsonb
language plpgsql volatile security invoker set search_path = public as $$
declare v_emp uuid := get_empresa_id(); n int;
begin
  if v_emp is null then return error_('Tu usuario no está asociado a una empresa activa.'); end if;
  if not tiene_rol('operador') then return error_('Tu usuario es de solo lectura.'); end if;
  if nullif(p_proveedor, '') is not null and not exists (select 1 from proveedores where id = p_proveedor) then
    return error_('No se encontró el proveedor.');
  end if;
  update productos set proveedor_id = nullif(p_proveedor, '') where id = any(p_productos);
  get diagnostics n = row_count;
  return jsonb_build_object('ok', true, 'n', n);
end $$;

-- Crea las órdenes: las líneas se agrupan por proveedor, así que sale una única orden por proveedor.
-- d = { ordenes: [ { proveedor, para, asunto, mensaje, entrega, lineas: [ { producto, cantidad, costo } ] } ] }
create or replace function public.crear_ordenes_compra(d jsonb) returns jsonb
language plpgsql volatile security invoker set search_path = public as $$
declare v_emp uuid := get_empresa_id(); o jsonb; l jsonb; v_prov text; v_id text; v_ids text[] := '{}'; v_por jsonb := '{}';
  v_pr productos%rowtype; v_n int; v_cant int; v_costo numeric; v_total numeric;
begin
  if v_emp is null then return error_('Tu usuario no está asociado a una empresa activa.'); end if;
  if not tiene_rol('operador') then return error_('Tu usuario es de solo lectura.'); end if;
  if jsonb_typeof(d->'ordenes') <> 'array' or jsonb_array_length(d->'ordenes') = 0 then return error_('No hay líneas para la orden de compra.'); end if;
  if jsonb_array_length(d->'ordenes') > 50 then return error_('Demasiadas órdenes de una vez (máximo 50 proveedores).'); end if;
  for o in select * from jsonb_array_elements(d->'ordenes') loop
    v_prov := btrim(coalesce(o->>'proveedor', ''));
    if not exists (select 1 from proveedores where id = v_prov) then return error_('Hay productos sin proveedor válido. Asígnales uno antes de crear la orden.'); end if;
    if jsonb_typeof(o->'lineas') <> 'array' or jsonb_array_length(o->'lineas') = 0 then continue; end if;
    -- Un proveedor que aparece dos veces se suma a su misma orden
    v_id := v_por->>v_prov;
    if v_id is null then
      v_id := siguiente_id('OC');
      insert into ordenes_compra (empresa_id, id, proveedor_id, email_para, asunto, mensaje, entrega)
      values (v_emp, v_id, v_prov, lower(btrim(coalesce(o->>'para', ''))), left(coalesce(o->>'asunto', ''), 200),
              left(coalesce(o->>'mensaje', ''), 4000), nullif(o->>'entrega', '')::date);
      v_por := v_por || jsonb_build_object(v_prov, v_id); v_ids := v_ids || v_id;
    end if;
    for l in select * from jsonb_array_elements(o->'lineas') loop
      v_cant := coalesce(nullif(l->>'cantidad', '')::numeric, 0)::int;
      if v_cant <= 0 then continue; end if;
      select * into v_pr from productos where id = l->>'producto';
      if v_pr.id is null then return error_('No se encontró el producto ' || coalesce(l->>'producto', '') || '.'); end if;
      v_costo := coalesce(nullif(l->>'costo', '')::numeric, v_pr.costo, 0);
      if v_costo < 0 then return error_('El costo no puede ser negativo.'); end if;
      -- Si el producto ya está en la orden, se suman las unidades
      update orden_compra_lineas set cantidad = cantidad + v_cant where orden_id = v_id and producto_id = v_pr.id;
      if not found then
        select coalesce(max(linea), 0) + 1 into v_n from orden_compra_lineas where orden_id = v_id;
        insert into orden_compra_lineas (empresa_id, orden_id, linea, producto_id, sku, nombre, cantidad, costo)
        values (v_emp, v_id, v_n, v_pr.id, v_pr.sku, v_pr.nombre, v_cant, v_costo);
      end if;
    end loop;
  end loop;
  -- Totales y órdenes vacías
  foreach v_id in array v_ids loop
    select coalesce(sum(cantidad * costo), 0) into v_total from orden_compra_lineas where orden_id = v_id;
    if not exists (select 1 from orden_compra_lineas where orden_id = v_id) then
      delete from ordenes_compra where id = v_id; v_ids := array_remove(v_ids, v_id);
    else
      update ordenes_compra set total = round(v_total, 2) where id = v_id;
    end if;
  end loop;
  if coalesce(array_length(v_ids, 1), 0) = 0 then return error_('Las cantidades deben ser mayores que cero.'); end if;
  return jsonb_build_object('ok', true, 'ids', to_jsonb(v_ids),
    'mensaje', case when array_length(v_ids, 1) = 1 then 'Orden de compra ' || v_ids[1] || ' creada.'
                    else array_length(v_ids, 1) || ' órdenes de compra creadas, una por proveedor.' end);
end $$;

-- Cambia el estado de una orden: Recibida o Anulada (Enviada la marca la Edge Function al enviar el correo)
create or replace function public.estado_orden_compra(p_id text, p_estado text) returns jsonb
language plpgsql volatile security invoker set search_path = public as $$
declare v_emp uuid := get_empresa_id(); v_act text;
begin
  if v_emp is null then return error_('Tu usuario no está asociado a una empresa activa.'); end if;
  if not tiene_rol('operador') then return error_('Tu usuario es de solo lectura.'); end if;
  if p_estado not in ('Recibida', 'Anulada') then return error_('Estado no válido.'); end if;
  select estado into v_act from ordenes_compra where id = p_id for update;
  if v_act is null then return error_('No se encontró la orden.'); end if;
  if v_act in ('Recibida', 'Anulada') then return error_('La orden ya está ' || lower(v_act) || '.'); end if;
  update ordenes_compra set estado = p_estado where id = p_id;
  return jsonb_build_object('ok', true, 'mensaje', 'Orden ' || p_id || ' ' || lower(p_estado) || '.');
end $$;

revoke execute on function public.compras_datos(), public.guardar_proveedor(jsonb), public.asignar_proveedor(text[], text),
  public.crear_ordenes_compra(jsonb), public.estado_orden_compra(text, text) from anon, public;
grant execute on function public.compras_datos(), public.guardar_proveedor(jsonb), public.asignar_proveedor(text[], text),
  public.crear_ordenes_compra(jsonb), public.estado_orden_compra(text, text) to authenticated;
