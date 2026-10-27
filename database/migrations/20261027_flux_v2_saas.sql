-- ============================================================
-- AXIOMA FLUX v2 · Migraciones aplicadas el 27/10/2026 en Supabase (proyecto legtxgdwqjfzvlvheaao)
-- Esquema SaaS multiempresa con seguridad a nivel de fila (RLS), equivalente a las pestañas del Codigo.gs.
-- Las tablas de la versión anterior quedaron respaldadas en el esquema "legacy" (no se borró nada).
-- Este archivo es la referencia; YA está aplicado. No volver a ejecutarlo sobre la misma base.
-- ============================================================

-- ============================================================
-- flux_v2_01_respaldo_legacy (20261027172313)
-- ============================================================
create schema if not exists legacy;
revoke all on schema legacy from anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
alter function public.handle_new_user() set schema legacy;

-- vistas viejas
alter view public.v_stock_actual set schema legacy;
alter view public.v_stock_por_posicion set schema legacy;
alter view public.v_dashboard_stock_categoria set schema legacy;
alter view public.v_salidas_mensuales set schema legacy;
alter view public.v_dashboard_merma_categoria set schema legacy;
alter view public.v_tabla_principal set schema legacy;
alter view public.v_dashboard_merma_diaria set schema legacy;

-- tablas viejas (con sus datos, políticas y triggers)
alter table public.auditoria set schema legacy;
alter table public.detalle_movimientos set schema legacy;
alter table public.ordenes_movimiento set schema legacy;
alter table public.lotes set schema legacy;
alter table public.productos set schema legacy;
alter table public.posiciones set schema legacy;
alter table public.ubicaciones set schema legacy;
alter table public.proveedores set schema legacy;
alter table public.categorias set schema legacy;

-- funciones viejas de inventario
alter function public.anular_orden_movimiento(uuid, text) set schema legacy;
alter function public.confirmar_orden_movimiento(uuid) set schema legacy;
alter function public.f_cantidad_reponer(numeric, numeric, text) set schema legacy;
alter function public.f_dias_objetivo(text) set schema legacy;
alter function public.f_estado_inventario(numeric, numeric, text) set schema legacy;
alter function public.f_merma_categoria_asof(uuid, timestamptz, timestamptz) set schema legacy;
alter function public.f_merma_diaria_asof(uuid, timestamptz, timestamptz, uuid) set schema legacy;
alter function public.f_rotacion_abc_asof(uuid, timestamptz, timestamptz) set schema legacy;
alter function public.f_salidas_mensuales_asof(uuid, timestamptz, timestamptz, uuid) set schema legacy;
alter function public.f_stock_actual_asof(uuid, timestamptz, timestamptz) set schema legacy;
alter function public.f_stock_por_posicion_asof(uuid, timestamptz) set schema legacy;
alter function public.fn_auditoria() set schema legacy;
alter function public.get_stock_actual(uuid, uuid) set schema legacy;
alter function public.get_stock_por_posicion(uuid, uuid, uuid) set schema legacy;
;

-- ============================================================
-- flux_v2_02_esquema_app (20261027172458)
-- ============================================================
-- ===================== PLANES, MÓDULOS, AJUSTES, SUPERADMIN =====================
create table public.planes (
  plan    text primary key,
  nombre  text not null,
  modulos text[] not null
);
insert into public.planes values
  ('free', 'Básico', array['inventario']),
  ('pro', 'Profesional', array['inventario','posiciones','comercial']),
  ('enterprise', 'Empresa', array['inventario','posiciones','comercial','finanzas']);

alter table public.empresas
  add column if not exists modulos text[],                       -- null = los del plan
  add column if not exists ajustes jsonb not null default '{}'::jsonb;
alter table public.empresas add constraint empresas_plan_fk foreign key (plan) references public.planes(plan);

create table public.superadmins (user_id uuid primary key references auth.users(id) on delete cascade);
insert into public.superadmins select id from auth.users where email = 'reinaldoossandonr@gmail.com';

alter table public.planes enable row level security;
alter table public.superadmins enable row level security;
create policy planes_ver on public.planes for select to authenticated using (true);
-- superadmins: sin políticas => nadie la lee directo; solo funciones SECURITY DEFINER

-- Empresa activa del usuario (si la empresa está suspendida, no ve nada)
create or replace function public.get_empresa_id() returns uuid
language sql stable security definer set search_path = public as $$
  select p.empresa_id from perfiles_usuarios p join empresas e on e.id = p.empresa_id
  where p.user_id = auth.uid() and p.activo and e.activo limit 1;
$$;

create or replace function public.es_superadmin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from superadmins where user_id = auth.uid());
$$;

create or replace function public.modulos_empresa(p_empresa uuid default null) returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(e.modulos, pl.modulos) from empresas e join planes pl on pl.plan = e.plan
  where e.id = coalesce(p_empresa, get_empresa_id());
$$;

create or replace function public.modulo_activo(p_modulo text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(p_modulo = any(modulos_empresa()), false);
$$;

-- Valores por defecto = CONFIG y LISTAS del Codigo.gs
create or replace function public.ajustes_por_defecto() returns jsonb
language sql immutable set search_path = public as $$
  select jsonb_build_object(
    'moneda', '€', 'decimales', 2, 'zona_horaria', 'Europe/Madrid',
    'peso90', 70, 'pesoAA', 30, 'critico', 15, 'precaucion', 30, 'cobertura', 30,
    'rotAlta', 45, 'rotMedia', 120, 'iva', 21, 'contado', jsonb_build_array('Tienda','Online'),
    'mesesPasados', 6, 'mesesFuturos', 3, 'saldo', 30000, 'diasLead', 7,
    'bodega', jsonb_build_object('pasillos', jsonb_build_array('A','B','C','D'), 'racks', 6, 'niveles', 4, 'ancho', 1.45, 'alto', 1.5, 'separacion', 3.6),
    'listas', jsonb_build_object(
      'CATEGORIA', jsonb_build_array('Herramientas eléctricas','Herramientas manuales','Fijaciones y tornillería','Pinturas y adhesivos','Electricidad e iluminación','Jardín y exterior'),
      'LINEA', jsonb_build_array('Profesional','Hogar','Industrial'),
      'CANAL', jsonb_build_array('Tienda','Online','Distribuidores','Venta directa'),
      'TIPO_MOV', jsonb_build_array('Ingreso Existencia','Salida Venta','Merma / Daño','Transferencia'),
      'TIPO_CUENTA', jsonb_build_array('Cobro Cliente','Pago Proveedor'),
      'ESTADO_CUENTA', jsonb_build_array('Pendiente','Parcial','Pagado'),
      'METODO_PAGO', jsonb_build_array('Transferencia','Domiciliación','Tarjeta','Confirming','Efectivo'),
      'ETAPA', jsonb_build_array('1. Prospecto','2. Contactado','3. Propuesta enviada','4. Negociación','5. Ganado','6. Perdido'),
      'INTERES', jsonb_build_array('Suministro recurrente','Pedido puntual / proyecto','Distribución mayorista','Almacenaje y bodegaje','Venta online B2B'),
      'CANAL_LEAD', jsonb_build_array('Referido','Web / formulario','Llamada en frío','Feria o evento','LinkedIn','Visita comercial'),
      'TIPO_CONTACTO', jsonb_build_array('Llamada','Email','Reunión','WhatsApp','Visita'),
      'GASTO', jsonb_build_array('Arriendo de bodega','Personal de bodega','Transporte y fletes','Seguros','Energía y suministros','Mantenimiento de equipos','Embalaje y consumibles','Otros')
    ));
$$;

-- Ajustes efectivos de la empresa: defecto + lo que guardó el admin (las listas fijas no se pueden cambiar)
create or replace function public.ajustes_empresa(p_empresa uuid default null) returns jsonb
language sql stable security definer set search_path = public as $$
  with a as (select ajustes_por_defecto() d, coalesce((select ajustes from empresas where id = coalesce(p_empresa, get_empresa_id())), '{}'::jsonb) e)
  select (d || (e - 'listas' - 'bodega'))
    || jsonb_build_object('bodega', (d->'bodega') || coalesce(e->'bodega', '{}'::jsonb))
    || jsonb_build_object('listas', ((d->'listas') || coalesce(e->'listas', '{}'::jsonb))
         || jsonb_build_object('TIPO_MOV', d->'listas'->'TIPO_MOV', 'TIPO_CUENTA', d->'listas'->'TIPO_CUENTA',
                               'ESTADO_CUENTA', d->'listas'->'ESTADO_CUENTA', 'ETAPA', d->'listas'->'ETAPA'))
  from a;
$$;

create or replace function public.hoy_empresa() returns date
language sql stable set search_path = public as $$
  select (now() at time zone coalesce(ajustes_empresa()->>'zona_horaria', 'Europe/Madrid'))::date;
$$;

-- ===================== TABLAS DE LA APP (equivalen a las pestañas) =====================
create table public.contadores (
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  clave text not null, valor int not null default 0,
  primary key (empresa_id, clave)
);

create table public.productos (                         -- [COM] Catálogo & Líneas de Producto
  empresa_id uuid not null default public.get_empresa_id() references public.empresas(id) on delete cascade,
  id text not null, sku text not null, nombre text not null,
  categoria text not null default '', linea text not null default '',
  precio numeric(14,2) not null default 0, costo numeric(14,2) not null default 0,
  demo boolean not null default false, creado_por uuid default auth.uid(), creado timestamptz not null default now(),
  primary key (empresa_id, id), unique (empresa_id, sku)
);

create table public.ventas (                            -- [COM] Historial de Ventas & Pedidos
  empresa_id uuid not null default public.get_empresa_id() references public.empresas(id) on delete cascade,
  id text not null, fecha date not null, producto_id text not null,
  cantidad int not null check (cantidad > 0), canal text not null default '',
  demo boolean not null default false, creado_por uuid default auth.uid(), creado timestamptz not null default now(),
  primary key (empresa_id, id),
  foreign key (empresa_id, producto_id) references public.productos(empresa_id, id) on update cascade
);

create table public.ubicaciones (                       -- [LOG] Maestro de Bodega & Ubicaciones
  empresa_id uuid not null default public.get_empresa_id() references public.empresas(id) on delete cascade,
  id text not null, pasillo text not null, rack int not null, nivel int not null, posicion text not null,
  x numeric(10,2) not null default 0, y numeric(10,2) not null default 0, z numeric(10,2) not null default 0,
  sku text,
  creado timestamptz not null default now(),
  primary key (empresa_id, id),
  foreign key (empresa_id, sku) references public.productos(empresa_id, sku) on update cascade
);

create table public.movimientos (                       -- [LOG] Movimientos de Inventario
  empresa_id uuid not null default public.get_empresa_id() references public.empresas(id) on delete cascade,
  id text not null, fecha_hora timestamp not null, tipo text not null
    check (tipo in ('Ingreso Existencia','Salida Venta','Merma / Daño','Transferencia')),
  sku text not null, cantidad int not null check (cantidad > 0),
  origen text not null default '', destino text not null default '', responsable text not null default '',
  demo boolean not null default false, creado_por uuid default auth.uid(), creado timestamptz not null default now(),
  primary key (empresa_id, id),
  foreign key (empresa_id, sku) references public.productos(empresa_id, sku) on update cascade
);

create table public.cobertura (                         -- [LOG] Cobertura por Categoría
  empresa_id uuid not null default public.get_empresa_id() references public.empresas(id) on delete cascade,
  categoria text not null, dias int not null check (dias between 0 and 720),
  primary key (empresa_id, categoria)
);

create table public.cuentas (                           -- [FIN] Cuentas por Cobrar & Pagar
  empresa_id uuid not null default public.get_empresa_id() references public.empresas(id) on delete cascade,
  id text not null, tipo text not null check (tipo in ('Cobro Cliente','Pago Proveedor')),
  emision date not null, vence date not null, neto numeric(14,2) not null check (neto > 0),
  contraparte text not null default '', numero text not null default '', iva numeric(5,2) not null default 0,
  demo boolean not null default false, creado_por uuid default auth.uid(), creado timestamptz not null default now(),
  primary key (empresa_id, id)
);

create table public.pagos (                             -- [FIN] Registro de Cobros & Pagos
  empresa_id uuid not null default public.get_empresa_id() references public.empresas(id) on delete cascade,
  id text not null, cuenta_id text not null, fecha date not null,
  monto numeric(14,2) not null check (monto > 0), metodo text not null default '',
  demo boolean not null default false, creado_por uuid default auth.uid(), creado timestamptz not null default now(),
  primary key (empresa_id, id),
  foreign key (empresa_id, cuenta_id) references public.cuentas(empresa_id, id) on delete cascade
);

create table public.gastos (                            -- [FIN] Gastos Operativos & Costos de Bodegaje
  empresa_id uuid not null default public.get_empresa_id() references public.empresas(id) on delete cascade,
  id text not null, categoria text not null default '', proveedor text not null default '',
  monto numeric(14,2) not null check (monto > 0), fecha date not null,
  demo boolean not null default false, creado_por uuid default auth.uid(), creado timestamptz not null default now(),
  primary key (empresa_id, id)
);

create table public.leads (                             -- [COM] Prospectos & Embudo de Ventas
  empresa_id uuid not null default public.get_empresa_id() references public.empresas(id) on delete cascade,
  id text not null, fecha date not null, cliente text not null, contacto text not null default '',
  telefono text not null default '', interes text not null default '', etapa text not null default '1. Prospecto',
  ejecutivo text not null default '', monto numeric(14,2) not null default 0, canal text not null default '',
  cierre date, notas text not null default '',
  demo boolean not null default false, creado_por uuid default auth.uid(), creado timestamptz not null default now(),
  primary key (empresa_id, id)
);

create table public.bitacora (                          -- [COM] Bitácora de Contactos
  empresa_id uuid not null default public.get_empresa_id() references public.empresas(id) on delete cascade,
  id text not null, lead_id text not null, fecha date not null, tipo text not null default '',
  resumen text not null, ejecutivo text not null default '',
  demo boolean not null default false, creado_por uuid default auth.uid(), creado timestamptz not null default now(),
  primary key (empresa_id, id),
  foreign key (empresa_id, lead_id) references public.leads(empresa_id, id) on delete cascade
);

create table public.metas (                             -- [COM] Metas por Ejecutivo
  empresa_id uuid not null default public.get_empresa_id() references public.empresas(id) on delete cascade,
  id text not null, mes date not null, ejecutivo text not null, meta numeric(14,2) not null check (meta > 0),
  demo boolean not null default false, creado_por uuid default auth.uid(), creado timestamptz not null default now(),
  primary key (empresa_id, id), unique (empresa_id, mes, ejecutivo)
);

create index on public.ventas (empresa_id, fecha);
create index on public.ventas (empresa_id, producto_id);
create index on public.movimientos (empresa_id, sku);
create index on public.movimientos (empresa_id, fecha_hora);
create index on public.pagos (empresa_id, cuenta_id);
create index on public.bitacora (empresa_id, lead_id);
create index on public.ubicaciones (empresa_id, sku);

-- ===================== SEGURIDAD A NIVEL DE FILA =====================
-- Lectura: misma empresa + módulo activo. Escritura: además rol operador o admin. Borrado: admin.
do $$
declare t record;
begin
  for t in select * from (values
    ('productos', null), ('ventas', null), ('movimientos', null), ('cobertura', null),
    ('ubicaciones', 'posiciones'),
    ('leads', 'comercial'), ('bitacora', 'comercial'), ('metas', 'comercial'),
    ('cuentas', 'finanzas'), ('pagos', 'finanzas'), ('gastos', 'finanzas')) as v(tabla, modulo)
  loop
    execute format('alter table public.%I enable row level security', t.tabla);
    execute format('alter table public.%I force row level security', t.tabla);
    execute format($p$create policy %I on public.%I for select to authenticated
      using (empresa_id = (select public.get_empresa_id()) %s)$p$,
      t.tabla || '_ver', t.tabla, case when t.modulo is null then '' else format('and (select public.modulo_activo(%L))', t.modulo) end);
    execute format($p$create policy %I on public.%I for insert to authenticated
      with check (empresa_id = (select public.get_empresa_id()) and (select public.tiene_rol('operador')) %s)$p$,
      t.tabla || '_crear', t.tabla, case when t.modulo is null then '' else format('and (select public.modulo_activo(%L))', t.modulo) end);
    execute format($p$create policy %I on public.%I for update to authenticated
      using (empresa_id = (select public.get_empresa_id()) and (select public.tiene_rol('operador')) %s)
      with check (empresa_id = (select public.get_empresa_id()))$p$,
      t.tabla || '_editar', t.tabla, case when t.modulo is null then '' else format('and (select public.modulo_activo(%L))', t.modulo) end);
    execute format($p$create policy %I on public.%I for delete to authenticated
      using (empresa_id = (select public.get_empresa_id()) and (select public.tiene_rol('admin')))$p$,
      t.tabla || '_borrar', t.tabla);
    execute format('revoke all on public.%I from anon', t.tabla);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t.tabla);
  end loop;
end $$;

alter table public.contadores enable row level security;
alter table public.contadores force row level security;
revoke all on public.contadores from anon, authenticated;   -- solo vía funciones
revoke all on public.superadmins from anon, authenticated;

-- El admin de la empresa no puede cambiarse el plan ni los módulos: eso es del superadmin
drop policy if exists "empresas_editar_propia" on public.empresas;
revoke update on public.empresas from authenticated;
revoke insert, delete on public.empresas from authenticated;
revoke all on public.empresas from anon;
revoke all on public.perfiles_usuarios from anon;
;

-- ============================================================
-- flux_v2_03_perfiles_seguros_y_utilidades (20261027172552)
-- ============================================================
-- Perfiles: nadie los modifica directo (evita que un operador se suba a admin)
drop policy if exists "perfiles_crear" on public.perfiles_usuarios;
drop policy if exists "perfiles_editar" on public.perfiles_usuarios;
drop policy if exists "perfiles_eliminar" on public.perfiles_usuarios;
revoke insert, update, delete on public.perfiles_usuarios from authenticated;

-- Siguiente ID correlativo del año: VEN-2026-0001 (por empresa, sin choques entre usuarios simultáneos)
create or replace function public.siguiente_id(p_prefijo text, p_empresa uuid default null) returns text
language plpgsql volatile security definer set search_path = public as $$
declare v_emp uuid := coalesce(p_empresa, get_empresa_id()); v_anio text; v_n int;
begin
  if v_emp is null then raise exception 'Sin empresa'; end if;
  if p_empresa is not null and p_empresa is distinct from get_empresa_id() and auth.role() <> 'service_role' then
    raise exception 'Sin permisos';
  end if;
  v_anio := to_char((now() at time zone coalesce(ajustes_empresa(v_emp)->>'zona_horaria','Europe/Madrid')), 'YYYY');
  insert into contadores (empresa_id, clave, valor) values (v_emp, p_prefijo || '-' || v_anio, 1)
  on conflict (empresa_id, clave) do update set valor = contadores.valor + 1
  returning valor into v_n;
  return p_prefijo || '-' || v_anio || '-' || lpad(v_n::text, 4, '0');
end $$;
revoke execute on function public.siguiente_id(text, uuid) from anon, public;
grant execute on function public.siguiente_id(text, uuid) to authenticated, service_role;

-- Crea ubicaciones de bodega según el tamaño configurado (agrega las que falten y quita las libres que sobren)
create or replace function public.sincronizar_bodega(p_empresa uuid) returns int
language plpgsql volatile security definer set search_path = public as $$
declare b jsonb := ajustes_empresa(p_empresa)->'bodega'; v_p text; i int := 0; r int; n int; v_total int := 0;
begin
  if p_empresa is distinct from get_empresa_id() and auth.role() <> 'service_role' and not es_superadmin() then
    raise exception 'Sin permisos';
  end if;
  create temp table if not exists _ubi (id text primary key, pasillo text, rack int, nivel int, posicion text, x numeric, y numeric, z numeric) on commit drop;
  truncate _ubi;
  for v_p in select jsonb_array_elements_text(b->'pasillos') loop
    for r in 1 .. (b->>'racks')::int loop
      for n in 1 .. (b->>'niveles')::int loop
        insert into _ubi values ('UB-' || v_p || lpad(r::text,2,'0') || '-' || n, v_p, r, n,
          v_p || '-' || lpad(r::text,2,'0') || '-N' || n,
          round((r-1) * (b->>'ancho')::numeric, 2), round(i * (b->>'separacion')::numeric, 2), round((n-1) * (b->>'alto')::numeric, 2));
      end loop;
    end loop;
    i := i + 1;
  end loop;
  insert into ubicaciones (empresa_id, id, pasillo, rack, nivel, posicion, x, y, z)
    select p_empresa, u.id, u.pasillo, u.rack, u.nivel, u.posicion, u.x, u.y, u.z from _ubi u
  on conflict (empresa_id, id) do update set x = excluded.x, y = excluded.y, z = excluded.z, posicion = excluded.posicion;
  delete from ubicaciones where empresa_id = p_empresa and sku is null and id not in (select id from _ubi);
  select count(*) into v_total from ubicaciones where empresa_id = p_empresa;
  return v_total;
end $$;
revoke execute on function public.sincronizar_bodega(uuid) from anon, public;
grant execute on function public.sincronizar_bodega(uuid) to authenticated, service_role;

-- Equivalente a crearTodo(): bodega y coberturas iniciales si la empresa está vacía
create or replace function public.inicializar_empresa(p_empresa uuid) returns void
language plpgsql volatile security definer set search_path = public as $$
declare v_dias int[] := array[30,45,60,30,40,25]; v_cat text; k int := 0;
begin
  if p_empresa is distinct from get_empresa_id() and auth.role() <> 'service_role' and not es_superadmin() then
    raise exception 'Sin permisos';
  end if;
  if not exists (select 1 from ubicaciones where empresa_id = p_empresa) then perform sincronizar_bodega(p_empresa); end if;
  if not exists (select 1 from cobertura where empresa_id = p_empresa) then
    for v_cat in select jsonb_array_elements_text(ajustes_empresa(p_empresa)->'listas'->'CATEGORIA') loop
      k := k + 1;
      insert into cobertura values (p_empresa, v_cat, coalesce(v_dias[k], (ajustes_empresa(p_empresa)->>'cobertura')::int)) on conflict do nothing;
    end loop;
  end if;
end $$;
revoke execute on function public.inicializar_empresa(uuid) from anon, public;
grant execute on function public.inicializar_empresa(uuid) to authenticated, service_role;

create or replace function public.error_(p_mensaje text) returns jsonb
language sql immutable as $$ select jsonb_build_object('ok', false, 'mensaje', p_mensaje) $$;
;

-- ============================================================
-- flux_v2_04_funciones_app (20261027172655)
-- ============================================================
-- ============ obtenerDatosIniciales() ============
create or replace function public.obtener_datos_iniciales() returns jsonb
language plpgsql volatile security invoker set search_path = public as $$
declare v_emp uuid := get_empresa_id(); a jsonb; r jsonb;
begin
  if v_emp is null then
    return jsonb_build_object('ok', false, 'sinEmpresa', true, 'superadmin', es_superadmin(),
      'mensaje', 'Tu usuario no está asociado a una empresa activa.');
  end if;
  perform inicializar_empresa(v_emp);
  a := ajustes_empresa(v_emp);
  select jsonb_build_object(
    'hoy', to_char(hoy_empresa(), 'YYYY-MM-DD'), 'existe', true, 'hojas', '[]'::jsonb, 'urls', '[]'::jsonb,
    'listas', a->'listas',
    'config', (a - 'listas') ,
    'modulos', to_jsonb(modulos_empresa(v_emp)),
    'superadmin', es_superadmin(),
    'empresa', (select jsonb_build_object('id', e.id, 'nombre', e.nombre, 'plan', e.plan, 'planNombre', pl.nombre)
                from empresas e join planes pl on pl.plan = e.plan where e.id = v_emp),
    'usuario', (select jsonb_build_object('nombre', p.nombre, 'email', p.email, 'rol', p.rol)
                from perfiles_usuarios p where p.user_id = auth.uid()),
    'productos', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'sku', sku, 'nombre', nombre, 'categoria', categoria,
                  'linea', linea, 'precio', precio, 'costo', costo) order by id) from productos), '[]'),
    'ventas', coalesce((select jsonb_agg(jsonb_build_array(id, to_char(fecha,'YYYY-MM-DD'), producto_id, cantidad, canal) order by fecha, id) from ventas), '[]'),
    'movimientos', coalesce((select jsonb_agg(jsonb_build_array(id, to_char(fecha_hora,'YYYY-MM-DD HH24:MI'), tipo, sku, cantidad, origen, destino, responsable) order by fecha_hora, id) from movimientos), '[]'),
    'ubicaciones', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'pasillo', pasillo, 'rack', rack, 'nivel', nivel, 'pos', posicion,
                  'x', x, 'y', y, 'z', z, 'sku', coalesce(sku,'')) order by id) from ubicaciones), '[]'),
    'cobertura', coalesce((select jsonb_agg(jsonb_build_object('categoria', categoria, 'dias', dias) order by categoria) from cobertura), '[]'),
    'cuentas', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'tipo', tipo, 'emision', to_char(emision,'YYYY-MM-DD'), 'vence', to_char(vence,'YYYY-MM-DD'),
                  'neto', neto, 'contraparte', contraparte, 'numero', numero, 'iva', iva) order by emision, id) from cuentas), '[]'),
    'pagos', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'cuenta', cuenta_id, 'fecha', to_char(fecha,'YYYY-MM-DD'), 'monto', monto, 'metodo', metodo) order by fecha, id) from pagos), '[]'),
    'leads', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'fecha', to_char(fecha,'YYYY-MM-DD'), 'empresa', cliente, 'contacto', contacto, 'telefono', telefono,
                  'interes', interes, 'etapa', etapa, 'ejecutivo', ejecutivo, 'monto', monto, 'canal', canal,
                  'cierre', coalesce(to_char(cierre,'YYYY-MM-DD'),''), 'notas', notas) order by fecha, id) from leads), '[]'),
    'bitacora', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'lead', lead_id, 'fecha', to_char(fecha,'YYYY-MM-DD'), 'tipo', tipo, 'resumen', resumen, 'ejecutivo', ejecutivo) order by fecha, id) from bitacora), '[]'),
    'metas', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'mes', to_char(mes,'YYYY-MM'), 'ejecutivo', ejecutivo, 'meta', meta) order by mes, id) from metas), '[]'),
    'gastos', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'categoria', categoria, 'proveedor', proveedor, 'monto', monto, 'fecha', to_char(fecha,'YYYY-MM-DD')) order by fecha, id) from gastos), '[]')
  ) into r;
  return r;
end $$;

-- ============ guardarRegistro(d) ============
create or replace function public.guardar_registro(d jsonb) returns jsonb
language plpgsql volatile security invoker set search_path = public as $$
declare
  v_emp uuid := get_empresa_id(); a jsonb; l jsonb; v_hoy date; v_ahora timestamp;
  v_tipo text := d->>'tipo'; v_id text := ''; v_txt text; v_num numeric; v_cant int; v_fecha date;
  v_prod productos%rowtype; v_cta cuentas%rowtype; v_total numeric; v_ya numeric; v_saldo numeric; v_monto numeric;
  v_etapa text; v_mes date; v_sku text; v_tmov text; v_ori text; v_des text; v_iva numeric;
begin
  if v_emp is null then return error_('Tu usuario no está asociado a una empresa activa.'); end if;
  if not tiene_rol('operador') then return error_('Tu usuario es de solo lectura: pide a un administrador que te dé permiso para registrar.'); end if;
  if v_tipo in ('lead','contacto','meta') and not modulo_activo('comercial') then return error_('El módulo Comercial no está incluido en tu plan.'); end if;
  if v_tipo in ('factura','pago','gasto') and not modulo_activo('finanzas') then return error_('El módulo Finanzas no está incluido en tu plan.'); end if;

  a := ajustes_empresa(v_emp); l := a->'listas'; v_hoy := hoy_empresa();
  v_ahora := (now() at time zone coalesce(a->>'zona_horaria','Europe/Madrid'));
  v_fecha := case when coalesce(d->>'fecha','') ~ '^\d{4}-\d{2}-\d{2}$' then (d->>'fecha')::date else v_hoy end;

  if v_tipo = 'producto' then
    v_sku := upper(btrim(coalesce(d->>'sku','')));
    if v_sku = '' or btrim(coalesce(d->>'nombre','')) = '' then return error_('Indica el SKU y el nombre del producto.'); end if;
    if exists (select 1 from productos where upper(sku) = v_sku) then return error_('Ya existe un producto con el SKU ' || v_sku || '.'); end if;
    if coalesce(nullif(replace(d->>'precio', ',', '.'), '')::numeric, 0) <= 0 then return error_('Indica el precio de venta.'); end if;
    v_id := siguiente_id('PRO');
    insert into productos (empresa_id, id, sku, nombre, categoria, linea, precio, costo)
    values (v_emp, v_id, v_sku, btrim(d->>'nombre'), btrim(coalesce(d->>'categoria','')), btrim(coalesce(d->>'linea','')),
            replace(d->>'precio', ',', '.')::numeric, coalesce(nullif(replace(d->>'costo', ',', '.'), '')::numeric, 0));

  elsif v_tipo = 'venta' then
    select * into v_prod from productos where id = btrim(coalesce(d->>'producto',''));
    v_cant := round(coalesce(nullif(replace(d->>'cantidad', ',', '.'), '')::numeric, 0));
    if v_prod.id is null then return error_('Elige un producto del catálogo.'); end if;
    if v_cant <= 0 then return error_('La cantidad debe ser mayor que cero.'); end if;
    v_id := siguiente_id('VEN');
    insert into ventas (empresa_id, id, fecha, producto_id, cantidad, canal) values (v_emp, v_id, v_fecha, v_prod.id, v_cant, btrim(coalesce(d->>'canal','')));
    -- La venta descuenta el inventario con su movimiento de salida
    insert into movimientos (empresa_id, id, fecha_hora, tipo, sku, cantidad, origen, destino, responsable)
    values (v_emp, siguiente_id('MOV'), v_fecha + v_ahora::time, 'Salida Venta', v_prod.sku, v_cant,
            coalesce((select id from ubicaciones where sku = v_prod.sku order by id limit 1), ''), '',
            coalesce(nullif(btrim(d->>'responsable'), ''), 'Venta ' || v_id));

  elsif v_tipo = 'movimiento' then
    v_cant := round(coalesce(nullif(replace(d->>'cantidad', ',', '.'), '')::numeric, 0));
    v_sku := btrim(coalesce(d->>'sku','')); v_tmov := btrim(coalesce(d->>'tipoMov',''));
    v_ori := btrim(coalesce(d->>'origen','')); v_des := btrim(coalesce(d->>'destino',''));
    if not (l->'TIPO_MOV') ? v_tmov then return error_('Elige el tipo de movimiento.'); end if;
    if v_sku = '' then return error_('Elige el producto.'); end if;
    if not exists (select 1 from productos where sku = v_sku) then return error_('Ese producto no está en el catálogo.'); end if;
    if v_cant <= 0 then return error_('La cantidad debe ser mayor que cero.'); end if;
    if v_tmov = 'Transferencia' and (v_ori = '' or v_des = '' or v_ori = v_des) then
      return error_('Una transferencia necesita una ubicación de origen y otra de destino distintas.'); end if;
    v_id := siguiente_id('MOV');
    insert into movimientos (empresa_id, id, fecha_hora, tipo, sku, cantidad, origen, destino, responsable)
    values (v_emp, v_id, v_ahora, v_tmov, v_sku, v_cant,
            case when v_tmov = 'Ingreso Existencia' then '' else v_ori end,
            case when v_tmov in ('Ingreso Existencia','Transferencia') then v_des else '' end,
            btrim(coalesce(d->>'responsable','')));
    -- El maestro de bodega sigue al movimiento: el destino queda con el producto
    if v_tmov in ('Ingreso Existencia','Transferencia') and v_des <> '' then update ubicaciones set sku = v_sku where id = v_des; end if;
    if v_tmov = 'Transferencia' and coalesce((d->>'liberarOrigen')::boolean, false) then update ubicaciones set sku = null where id = v_ori; end if;

  elsif v_tipo = 'factura' then
    if not (l->'TIPO_CUENTA') ? btrim(coalesce(d->>'tipoCuenta','')) then
      return error_('Elige si es una factura emitida a un cliente o recibida de un proveedor.'); end if;
    if coalesce(d->>'vence','') !~ '^\d{4}-\d{2}-\d{2}$' then return error_('Indica la fecha de vencimiento.'); end if;
    v_num := coalesce(nullif(replace(d->>'monto', ',', '.'), '')::numeric, 0);
    if v_num <= 0 then return error_('Indica el monto neto.'); end if;
    v_iva := coalesce(nullif(replace(d->>'iva', ',', '.'), '')::numeric, (a->>'iva')::numeric);
    v_id := siguiente_id('TRX');
    insert into cuentas (empresa_id, id, tipo, emision, vence, neto, contraparte, numero, iva)
    values (v_emp, v_id, btrim(d->>'tipoCuenta'),
            case when coalesce(d->>'emision','') ~ '^\d{4}-\d{2}-\d{2}$' then (d->>'emision')::date else v_hoy end,
            (d->>'vence')::date, v_num, btrim(coalesce(d->>'contraparte','')), btrim(coalesce(d->>'numero','')), v_iva);

  elsif v_tipo = 'pago' then
    select * into v_cta from cuentas where id = btrim(coalesce(d->>'cuenta','')) for update;
    if v_cta.id is null then return error_('Elige la factura.'); end if;
    v_total := round(v_cta.neto * (100 + v_cta.iva)) / 100;
    select coalesce(sum(monto), 0) into v_ya from pagos where cuenta_id = v_cta.id;
    v_saldo := round((v_total - v_ya) * 100) / 100;
    v_monto := case when coalesce(d->>'monto','') = '' then v_saldo else round(replace(d->>'monto', ',', '.')::numeric * 100) / 100 end;
    if v_saldo <= 0 then return error_('Esa factura ya está pagada.'); end if;
    if v_monto <= 0 then return error_('Indica el monto.'); end if;
    if v_monto > v_saldo + 0.005 then return error_('El monto supera el saldo pendiente de la factura.'); end if;
    v_id := siguiente_id('PAG');
    insert into pagos (empresa_id, id, cuenta_id, fecha, monto, metodo) values (v_emp, v_id, v_cta.id, v_fecha, v_monto, btrim(coalesce(d->>'metodo','')));

  elsif v_tipo = 'lead' then
    if btrim(coalesce(d->>'empresa','')) = '' then return error_('Indica la empresa.'); end if;
    v_etapa := case when (l->'ETAPA') ? btrim(coalesce(d->>'etapa','')) then btrim(d->>'etapa') else l->'ETAPA'->>0 end;
    v_id := siguiente_id('LEA');
    insert into leads (empresa_id, id, fecha, cliente, contacto, telefono, interes, etapa, ejecutivo, monto, canal, cierre, notas)
    values (v_emp, v_id, v_fecha, btrim(d->>'empresa'), btrim(coalesce(d->>'contacto','')), btrim(coalesce(d->>'telefono','')),
            btrim(coalesce(d->>'interes','')), v_etapa, btrim(coalesce(d->>'ejecutivo','')),
            coalesce(nullif(replace(d->>'montoEstimado', ',', '.'), '')::numeric, 0), btrim(coalesce(d->>'canalLead','')),
            case when left(v_etapa, 1) >= '5' then v_hoy end, btrim(coalesce(d->>'notas','')));

  elsif v_tipo = 'contacto' then
    if btrim(coalesce(d->>'lead','')) = '' then return error_('Elige el prospecto.'); end if;
    if btrim(coalesce(d->>'resumen','')) = '' then return error_('Escribe un resumen del contacto.'); end if;
    if not exists (select 1 from leads where id = btrim(d->>'lead')) then return error_('No se encuentra el prospecto.'); end if;
    v_id := siguiente_id('CON');
    insert into bitacora (empresa_id, id, lead_id, fecha, tipo, resumen, ejecutivo)
    values (v_emp, v_id, btrim(d->>'lead'), v_fecha, btrim(coalesce(d->>'tipoContacto','')), btrim(d->>'resumen'), btrim(coalesce(d->>'ejecutivo','')));

  elsif v_tipo = 'meta' then
    if coalesce(d->>'mes','') !~ '^\d{4}-\d{2}$' then return error_('Indica el mes.'); end if;
    if btrim(coalesce(d->>'ejecutivo','')) = '' then return error_('Indica el ejecutivo.'); end if;
    v_num := coalesce(nullif(replace(d->>'meta', ',', '.'), '')::numeric, 0);
    if v_num <= 0 then return error_('Indica la meta de ventas.'); end if;
    v_mes := ((d->>'mes') || '-01')::date;
    -- Si ya existe la meta de ese ejecutivo y mes, se actualiza
    update metas set meta = v_num where mes = v_mes and ejecutivo = btrim(d->>'ejecutivo') returning id into v_id;
    if v_id is null then
      v_id := siguiente_id('MET');
      insert into metas (empresa_id, id, mes, ejecutivo, meta) values (v_emp, v_id, v_mes, btrim(d->>'ejecutivo'), v_num);
    end if;

  elsif v_tipo = 'gasto' then
    v_num := coalesce(nullif(replace(d->>'monto', ',', '.'), '')::numeric, 0);
    if v_num <= 0 then return error_('Indica el monto.'); end if;
    v_id := siguiente_id('GAS');
    insert into gastos (empresa_id, id, categoria, proveedor, monto, fecha)
    values (v_emp, v_id, btrim(coalesce(d->>'categoriaGasto','')), btrim(coalesce(d->>'proveedor','')), v_num, v_fecha);

  else
    return error_('Tipo de registro desconocido.');
  end if;
  return jsonb_build_object('ok', true, 'mensaje', 'Guardado.', 'id', v_id);
exception
  when invalid_text_representation or numeric_value_out_of_range or datetime_field_overflow or invalid_datetime_format then
    return error_('Revisa los números y fechas del formulario.');
  when foreign_key_violation then return error_('Uno de los datos elegidos ya no existe. Recarga el panel.');
  when unique_violation then return error_('Ese registro ya existe.');
  when insufficient_privilege then return error_('No tienes permiso para esta acción.');
end $$;

-- ============ cambiarEstado(d) ============
create or replace function public.cambiar_estado(d jsonb) returns jsonb
language plpgsql volatile security invoker set search_path = public as $$
declare v_n int; v_val text := coalesce(d->>'valor', '');
begin
  if get_empresa_id() is null then return error_('Tu usuario no está asociado a una empresa activa.'); end if;
  if not tiene_rol('operador') then return error_('Tu usuario es de solo lectura.'); end if;
  if d->>'tipo' = 'ubicacion' then
    update ubicaciones set sku = nullif(v_val, '') where id = d->>'id';
    get diagnostics v_n = row_count;
    return case when v_n > 0 then jsonb_build_object('ok', true, 'mensaje', 'Guardado.') else error_('No se encuentra la ubicación.') end;
  elsif d->>'tipo' = 'lead' then
    if not (ajustes_empresa()->'listas'->'ETAPA') ? v_val then return error_('Etapa no válida.'); end if;
    update leads set etapa = v_val, cierre = case when left(v_val, 1) >= '5' then hoy_empresa() end where id = d->>'id';
    get diagnostics v_n = row_count;
    return case when v_n > 0 then jsonb_build_object('ok', true, 'mensaje', 'Guardado.') else error_('No se encuentra el prospecto.') end;
  end if;
  return error_('Cambio desconocido.');
exception when foreign_key_violation then return error_('Ese producto no está en el catálogo.');
end $$;

-- ============ guardarCobertura(lista) ============
create or replace function public.guardar_cobertura(lista jsonb) returns jsonb
language plpgsql volatile security invoker set search_path = public as $$
declare x jsonb; v_emp uuid := get_empresa_id();
begin
  if v_emp is null then return error_('Tu usuario no está asociado a una empresa activa.'); end if;
  if not tiene_rol('operador') then return error_('Tu usuario es de solo lectura.'); end if;
  for x in select * from jsonb_array_elements(coalesce(lista, '[]')) loop
    if btrim(coalesce(x->>'categoria','')) = '' then continue; end if;
    if not (round((x->>'dias')::numeric) between 0 and 720) then return error_('Los días de cobertura deben estar entre 0 y 720.'); end if;
  end loop;
  insert into cobertura (empresa_id, categoria, dias)
    select v_emp, btrim(x->>'categoria'), round((x->>'dias')::numeric)
    from jsonb_array_elements(coalesce(lista, '[]')) x where btrim(coalesce(x->>'categoria','')) <> ''
  on conflict (empresa_id, categoria) do update set dias = excluded.dias;
  return jsonb_build_object('ok', true, 'mensaje', 'Cobertura guardada.');
exception when others then return error_('Los días de cobertura deben estar entre 0 y 720.');
end $$;

revoke execute on function public.obtener_datos_iniciales() from anon, public;
revoke execute on function public.guardar_registro(jsonb) from anon, public;
revoke execute on function public.cambiar_estado(jsonb) from anon, public;
revoke execute on function public.guardar_cobertura(jsonb) from anon, public;
grant execute on function public.obtener_datos_iniciales() to authenticated;
grant execute on function public.guardar_registro(jsonb) to authenticated;
grant execute on function public.cambiar_estado(jsonb) to authenticated;
grant execute on function public.guardar_cobertura(jsonb) to authenticated;
;

-- ============================================================
-- flux_v2_05_ajustes_usuarios_superadmin (20261027172741)
-- ============================================================
-- ============ Ajustes de la empresa (solo admin) ============
create or replace function public.guardar_ajustes(d jsonb) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare v_emp uuid := get_empresa_id(); v_act jsonb; v_nuevo jsonb := '{}'; k text; v_bodega_antes jsonb; n int;
  v_num text[] := array['decimales','peso90','pesoAA','critico','precaucion','cobertura','rotAlta','rotMedia','iva','mesesPasados','mesesFuturos','saldo','diasLead'];
  v_listas text[] := array['CATEGORIA','LINEA','CANAL','METODO_PAGO','INTERES','CANAL_LEAD','TIPO_CONTACTO','GASTO'];
begin
  if v_emp is null then return error_('Tu usuario no está asociado a una empresa activa.'); end if;
  if not tiene_rol('admin') then return error_('Solo un administrador de la empresa puede cambiar los ajustes.'); end if;
  select ajustes into v_act from empresas where id = v_emp for update;
  v_bodega_antes := ajustes_empresa(v_emp)->'bodega';

  foreach k in array v_num loop
    if d ? k then
      if jsonb_typeof(d->k) <> 'number' or (d->>k)::numeric < 0 then return error_('El valor de ' || k || ' no es válido.'); end if;
      v_nuevo := v_nuevo || jsonb_build_object(k, d->k);
    end if;
  end loop;
  if d ? 'moneda' then v_nuevo := v_nuevo || jsonb_build_object('moneda', left(btrim(d->>'moneda'), 5)); end if;
  if d ? 'zona_horaria' then
    if not exists (select 1 from pg_timezone_names where name = d->>'zona_horaria') then return error_('Zona horaria no válida.'); end if;
    v_nuevo := v_nuevo || jsonb_build_object('zona_horaria', d->>'zona_horaria');
  end if;
  if d ? 'contado' and jsonb_typeof(d->'contado') = 'array' then v_nuevo := v_nuevo || jsonb_build_object('contado', d->'contado'); end if;
  if d ? 'listas' then
    v_nuevo := v_nuevo || jsonb_build_object('listas', coalesce(v_act->'listas', '{}'));
    foreach k in array v_listas loop
      if d->'listas' ? k then
        if jsonb_typeof(d->'listas'->k) <> 'array' or jsonb_array_length(d->'listas'->k) = 0 then return error_('La lista ' || k || ' no puede quedar vacía.'); end if;
        v_nuevo := jsonb_set(v_nuevo, array['listas', k], d->'listas'->k);
      end if;
    end loop;
  end if;
  if d ? 'bodega' then
    if jsonb_array_length(coalesce(d->'bodega'->'pasillos','[]')) not between 1 and 26
       or coalesce((d->'bodega'->>'racks')::int, 0) not between 1 and 40
       or coalesce((d->'bodega'->>'niveles')::int, 0) not between 1 and 12 then
      return error_('La bodega debe tener entre 1 y 26 pasillos, 1 y 40 racks y 1 y 12 niveles.');
    end if;
    v_nuevo := v_nuevo || jsonb_build_object('bodega', (select jsonb_object_agg(key, value) from jsonb_each(d->'bodega')
                 where key in ('pasillos','racks','niveles','ancho','alto','separacion')));
  end if;
  if coalesce((coalesce(v_nuevo, '{}') ->> 'peso90')::numeric, (ajustes_empresa(v_emp)->>'peso90')::numeric)
     + coalesce((v_nuevo->>'pesoAA')::numeric, (ajustes_empresa(v_emp)->>'pesoAA')::numeric) <> 100 then
    return error_('Los pesos de los últimos 90 días y del año anterior deben sumar 100.');
  end if;

  update empresas set ajustes = coalesce(ajustes, '{}') || v_nuevo,
    nombre = coalesce(nullif(btrim(d->>'nombreEmpresa'), ''), nombre) where id = v_emp;
  if ajustes_empresa(v_emp)->'bodega' is distinct from v_bodega_antes then
    n := sincronizar_bodega(v_emp);
    return jsonb_build_object('ok', true, 'mensaje', 'Ajustes guardados. La bodega quedó con ' || n || ' posiciones.');
  end if;
  return jsonb_build_object('ok', true, 'mensaje', 'Ajustes guardados.');
end $$;

-- ============ Usuarios de la empresa (admin) ============
create or replace function public.listar_usuarios() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', p.user_id, 'nombre', p.nombre, 'email', p.email, 'rol', p.rol, 'activo', p.activo,
           'ultimoAcceso', u.last_sign_in_at, 'yo', p.user_id = auth.uid()) order by p.nombre), '[]')
  from perfiles_usuarios p join auth.users u on u.id = p.user_id
  where p.empresa_id = get_empresa_id() and tiene_rol('admin');
$$;

create or replace function public.cambiar_usuario(p_user uuid, p_rol text, p_activo boolean, p_nombre text default null) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare v_emp uuid := get_empresa_id(); v_n int;
begin
  if v_emp is null or not tiene_rol('admin') then return error_('Solo un administrador puede gestionar usuarios.'); end if;
  if p_rol not in ('admin','operador','viewer') then return error_('Rol no válido.'); end if;
  if p_user = auth.uid() and (p_rol <> 'admin' or not p_activo) then return error_('No puedes quitarte a ti mismo el rol de administrador ni desactivarte.'); end if;
  update perfiles_usuarios set rol = p_rol, activo = p_activo, nombre = coalesce(nullif(btrim(p_nombre), ''), nombre)
  where user_id = p_user and empresa_id = v_emp;
  get diagnostics v_n = row_count;
  return case when v_n > 0 then jsonb_build_object('ok', true, 'mensaje', 'Usuario actualizado.') else error_('No se encuentra el usuario.') end;
end $$;

-- ============ Superadmin ============
create or replace function public.sa_listar_empresas() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not es_superadmin() then raise exception 'Sin permisos'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object(
      'id', e.id, 'nombre', e.nombre, 'ruc', e.ruc_nit, 'plan', e.plan, 'modulos', e.modulos,
      'modulosEfectivos', modulos_empresa(e.id), 'activo', e.activo, 'creada', e.created_at,
      'usuarios', (select coalesce(jsonb_agg(jsonb_build_object('id', p.user_id, 'nombre', p.nombre, 'email', p.email, 'rol', p.rol, 'activo', p.activo) order by p.nombre), '[]')
                   from perfiles_usuarios p where p.empresa_id = e.id),
      'productos', (select count(*) from productos x where x.empresa_id = e.id),
      'ventas', (select count(*) from ventas x where x.empresa_id = e.id),
      'tieneDemo', exists (select 1 from productos x where x.empresa_id = e.id and x.demo)
    ) order by e.created_at), '[]') from empresas e);
end $$;

create or replace function public.sa_actualizar_empresa(p_id uuid, d jsonb) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
begin
  if not es_superadmin() then return error_('Sin permisos'); end if;
  if d ? 'plan' and not exists (select 1 from planes where plan = d->>'plan') then return error_('Plan no válido.'); end if;
  update empresas set
    nombre  = coalesce(nullif(btrim(d->>'nombre'), ''), nombre),
    ruc_nit = case when d ? 'ruc' then nullif(btrim(d->>'ruc'), '') else ruc_nit end,
    plan    = coalesce(d->>'plan', plan),
    activo  = coalesce((d->>'activo')::boolean, activo),
    modulos = case when d ? 'modulos' then
                (case when jsonb_typeof(d->'modulos') = 'array'
                  then array(select jsonb_array_elements_text(d->'modulos') intersect select unnest(array['inventario','posiciones','comercial','finanzas'])) end)
              else modulos end
  where id = p_id;
  return jsonb_build_object('ok', true, 'mensaje', 'Empresa actualizada.');
end $$;

-- Borra los datos de ejemplo de una empresa (los demás datos no se tocan)
create or replace function public.sa_borrar_demo(p_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
begin
  if not es_superadmin() and auth.role() <> 'service_role' then return error_('Sin permisos'); end if;
  update ubicaciones set sku = null where empresa_id = p_id and sku in (select sku from productos where empresa_id = p_id and demo);
  delete from movimientos where empresa_id = p_id and demo;
  delete from ventas where empresa_id = p_id and demo;
  delete from pagos where empresa_id = p_id and demo;
  delete from cuentas where empresa_id = p_id and demo;
  delete from gastos where empresa_id = p_id and demo;
  delete from bitacora where empresa_id = p_id and demo;
  delete from leads where empresa_id = p_id and demo;
  delete from metas where empresa_id = p_id and demo;
  delete from productos where empresa_id = p_id and demo;
  return jsonb_build_object('ok', true, 'mensaje', 'Datos de ejemplo eliminados.');
end $$;

do $$ declare f text; begin
  foreach f in array array['guardar_ajustes(jsonb)','listar_usuarios()','cambiar_usuario(uuid,text,boolean,text)',
    'sa_listar_empresas()','sa_actualizar_empresa(uuid,jsonb)','sa_borrar_demo(uuid)','ajustes_empresa(uuid)','modulos_empresa(uuid)',
    'modulo_activo(text)','es_superadmin()','get_empresa_id()','tiene_rol(text)','hoy_empresa()','ajustes_por_defecto()','error_(text)'] loop
    execute 'revoke execute on function public.' || f || ' from anon, public';
    execute 'grant execute on function public.' || f || ' to authenticated, service_role';
  end loop;
end $$;
;

-- ============================================================
-- flux_v2_06_cerrar_fugas (20261027172829)
-- ============================================================
create or replace function public.empresa_permitida(p_empresa uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select case
    when p_empresa is null then get_empresa_id()
    when p_empresa = get_empresa_id() or es_superadmin() or coalesce(auth.role(), '') = 'service_role'
         or current_user in ('postgres', 'service_role') then p_empresa
  end;
$$;

create or replace function public.modulos_empresa(p_empresa uuid default null) returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(e.modulos, pl.modulos) from empresas e join planes pl on pl.plan = e.plan
  where e.id = empresa_permitida(p_empresa);
$$;

create or replace function public.ajustes_empresa(p_empresa uuid default null) returns jsonb
language sql stable security definer set search_path = public as $$
  with a as (select ajustes_por_defecto() d, coalesce((select ajustes from empresas where id = empresa_permitida(p_empresa)), '{}'::jsonb) e)
  select (d || (e - 'listas' - 'bodega'))
    || jsonb_build_object('bodega', (d->'bodega') || coalesce(e->'bodega', '{}'::jsonb))
    || jsonb_build_object('listas', ((d->'listas') || coalesce(e->'listas', '{}'::jsonb))
         || jsonb_build_object('TIPO_MOV', d->'listas'->'TIPO_MOV', 'TIPO_CUENTA', d->'listas'->'TIPO_CUENTA',
                               'ESTADO_CUENTA', d->'listas'->'ESTADO_CUENTA', 'ETAPA', d->'listas'->'ETAPA'))
  from a;
$$;

alter function public.error_(text) set search_path = public;
alter function public.set_updated_at() set search_path = public;
revoke execute on function public.empresa_permitida(uuid) from anon, public;
grant execute on function public.empresa_permitida(uuid) to authenticated, service_role;
;

-- ============================================================
-- flux_v2_07_empresa_permitida_fix (20261027172838)
-- ============================================================
create or replace function public.empresa_permitida(p_empresa uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select case
    when p_empresa is null then get_empresa_id()
    when p_empresa = get_empresa_id() or es_superadmin() or coalesce(auth.role(), '') = 'service_role' then p_empresa
  end;
$$;;

-- ============================================================
-- flux_v2_08_permisos_estrictos (20261027174233)
-- ============================================================
create or replace function public.es_servicio() returns boolean
language sql stable set search_path = public as $$ select coalesce(auth.role(), '') = 'service_role' $$;

create or replace function public.siguiente_id(p_prefijo text, p_empresa uuid default null) returns text
language plpgsql volatile security definer set search_path = public as $$
declare v_emp uuid := coalesce(p_empresa, get_empresa_id()); v_anio text; v_n int;
begin
  if v_emp is null then raise exception 'Sin empresa'; end if;
  if p_empresa is not null and p_empresa is distinct from get_empresa_id() and not es_servicio() then raise exception 'Sin permisos'; end if;
  v_anio := to_char((now() at time zone coalesce(ajustes_empresa(v_emp)->>'zona_horaria','Europe/Madrid')), 'YYYY');
  insert into contadores (empresa_id, clave, valor) values (v_emp, p_prefijo || '-' || v_anio, 1)
  on conflict (empresa_id, clave) do update set valor = contadores.valor + 1
  returning valor into v_n;
  return p_prefijo || '-' || v_anio || '-' || lpad(v_n::text, 4, '0');
end $$;

do $$
declare f text; def text;
begin
  foreach f in array array['public.sincronizar_bodega(uuid)', 'public.inicializar_empresa(uuid)'] loop
    def := pg_get_functiondef(f::regprocedure);
    def := replace(def, $x$p_empresa is distinct from get_empresa_id() and auth.role() <> 'service_role' and not es_superadmin()$x$,
                        $x$p_empresa is distinct from get_empresa_id() and not es_servicio() and not es_superadmin()$x$);
    if position('es_servicio()' in def) = 0 then raise exception 'No se pudo ajustar %', f; end if;
    execute def;
  end loop;
  def := pg_get_functiondef('public.sa_borrar_demo(uuid)'::regprocedure);
  def := replace(def, $x$not es_superadmin() and auth.role() <> 'service_role'$x$, $x$not es_superadmin() and not es_servicio()$x$);
  if position('es_servicio()' in def) = 0 then raise exception 'No se pudo ajustar sa_borrar_demo'; end if;
  execute def;
end $$;
revoke execute on function public.es_servicio() from anon, public;
grant execute on function public.es_servicio() to authenticated, service_role;;
