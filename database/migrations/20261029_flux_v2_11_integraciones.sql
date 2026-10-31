-- ============================================================
-- flux_v2_11_integraciones + flux_v2_12_integraciones_ajustes (29/10/2026) · YA APLICADO en Supabase
-- Plataforma de integraciones · fase 1
--   · integraciones          fuentes de datos externas por empresa (SAP, WMS, archivo…) y sus columnas guardadas
--   · integracion_mapeos     equivalencias de códigos: código externo → SKU o posición de Flux
--   · sincronizaciones       registro de cada importación (qué entró, qué falló y cuándo)
--   · sincronizacion_stock   zona de paso para fotos de stock que llegan en varios lotes
--   · movimientos/ventas.ref_externa  evita duplicados al reimportar
--   · tipos de movimiento 'Ajuste Entrada' / 'Ajuste Salida' para cuadrar stock con el sistema externo
-- El núcleo (integracion_procesar / integracion_cerrar) recibe la empresa como parámetro y solo lo ejecuta
-- service_role: es lo que usarán después la API pública y los conectores nativos (SAP B1, WMS).
-- Los usuarios entran por las funciones int_* que toman la empresa de la sesión y exigen rol admin.
-- ============================================================

-- ---------- Tablas ----------
create table public.integraciones (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nombre text not null check (length(btrim(nombre)) between 1 and 80),
  sistema text not null default 'archivo' check (sistema in ('archivo','sap_b1','sap_s4','wms','odoo','otro')),
  estado text not null default 'activa' check (estado in ('activa','pausada')),
  config jsonb not null default '{}'::jsonb,
  ultima_sync timestamptz,
  creado timestamptz not null default now(),
  creado_por uuid default auth.uid()
);
create index on public.integraciones (empresa_id);

create table public.integracion_mapeos (
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  integracion_id uuid not null references public.integraciones(id) on delete cascade,
  entidad text not null check (entidad in ('producto','ubicacion')),
  externo text not null check (length(btrim(externo)) > 0),
  interno text not null check (length(btrim(interno)) > 0),
  creado timestamptz not null default now(),
  primary key (integracion_id, entidad, externo)
);
create index on public.integracion_mapeos (empresa_id);

create table public.sincronizaciones (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  integracion_id uuid references public.integraciones(id) on delete set null,
  entidad text not null check (entidad in ('productos','stock','movimientos','ventas')),
  canal text not null default 'archivo' check (canal in ('archivo','api','webhook','programada')),
  origen text not null default '',
  estado text not null default 'en_curso' check (estado in ('en_curso','ok','con_errores','error')),
  total int not null default 0,
  procesadas int not null default 0,
  creados int not null default 0,
  actualizados int not null default 0,
  sin_cambios int not null default 0,
  errores int not null default 0,
  detalle_errores jsonb not null default '[]'::jsonb,
  usuario text not null default '',
  iniciado timestamptz not null default now(),
  terminado timestamptz
);
create index on public.sincronizaciones (empresa_id, iniciado desc);
create index on public.sincronizaciones (integracion_id);

create table public.sincronizacion_stock (
  sync_id uuid not null references public.sincronizaciones(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  sku text not null,
  cantidad numeric not null,
  ubicacion text
);
create index on public.sincronizacion_stock (sync_id);
create index on public.sincronizacion_stock (empresa_id);

-- Solo se accede por funciones: sin permisos directos
do $$ declare t text; begin
  foreach t in array array['integraciones','integracion_mapeos','sincronizaciones','sincronizacion_stock'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- ---------- Referencia externa (idempotencia) y tipos de ajuste ----------
alter table public.movimientos add column if not exists ref_externa text;
alter table public.ventas add column if not exists ref_externa text;
create unique index if not exists movimientos_ref_externa_uq on public.movimientos (empresa_id, ref_externa) where ref_externa is not null;
create unique index if not exists ventas_ref_externa_uq on public.ventas (empresa_id, ref_externa) where ref_externa is not null;

alter table public.movimientos drop constraint movimientos_tipo_check;
alter table public.movimientos add constraint movimientos_tipo_check
  check (tipo = any (array['Ingreso Existencia','Salida Venta','Merma / Daño','Transferencia','Ajuste Entrada','Ajuste Salida']));

-- ---------- Utilidades ----------
-- Traduce el tipo de movimiento de otro sistema (SAP, WMS, Excel) al de Flux
create or replace function public._int_tipo_mov(p text) returns text
language sql immutable set search_path = public as $$
  select case
    when x in ('ingreso existencia','ingreso','entrada','recepcion','recepción','compra','receipt','goods receipt','gr','in','101','alta') then 'Ingreso Existencia'
    when x in ('salida venta','salida','venta','despacho','expedicion','expedición','pedido','issue','goods issue','gi','out','601','baja') then 'Salida Venta'
    when x in ('merma / daño','merma','daño','dano','rotura','scrap','perdida','pérdida','551') then 'Merma / Daño'
    when x in ('transferencia','traslado','traspaso','movimiento interno','reubicacion','reubicación','transfer','311') then 'Transferencia'
    when x in ('ajuste entrada','ajuste +','ajuste positivo','regularizacion +','regularización +','701') then 'Ajuste Entrada'
    when x in ('ajuste salida','ajuste -','ajuste negativo','regularizacion -','regularización -','702') then 'Ajuste Salida'
  end
  from (select lower(btrim(coalesce(p, ''))) x) s;
$$;

-- Código externo → SKU de Flux (primero la tabla de equivalencias, luego el SKU tal cual)
create or replace function public._int_sku(p_emp uuid, p_int uuid, p_cod text) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select p.sku from integracion_mapeos m join productos p on p.empresa_id = m.empresa_id and upper(p.sku) = upper(m.interno)
      where m.integracion_id = p_int and m.entidad = 'producto' and m.externo = btrim(p_cod) limit 1),
    (select p.sku from productos p where p.empresa_id = p_emp and upper(p.sku) = upper(btrim(p_cod)) limit 1));
$$;

-- Código de ubicación externo → id de posición (equivalencia, id 'UB-A01-1' o nombre 'A-01-N1')
create or replace function public._int_ubicacion(p_emp uuid, p_int uuid, p_cod text) returns text
language sql stable security definer set search_path = public as $$
  with c as (select coalesce(
      (select m.interno from integracion_mapeos m where m.integracion_id = p_int and m.entidad = 'ubicacion' and m.externo = btrim(p_cod) limit 1),
      btrim(p_cod)) cod)
  select u.id from ubicaciones u, c
  where u.empresa_id = p_emp and (upper(u.id) = upper(c.cod) or upper(u.posicion) = upper(c.cod))
  order by (upper(u.id) = upper(c.cod)) desc limit 1;
$$;

create or replace function public._int_fecha(p text) returns timestamp
language plpgsql immutable set search_path = public as $$
begin
  if p ~ '^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?$' then return replace(p, 'T', ' ')::timestamp; end if;
  return null;
exception when others then return null;
end $$;

-- ---------- Núcleo: procesa un lote de filas ya normalizadas (lo usa también la futura API) ----------
-- Filas: [{ "_fila": 2, "sku": "...", ... }]. Campos por entidad:
--   productos   sku*, nombre*, categoria, linea, precio, costo
--   stock       sku*, cantidad*, ubicacion
--   movimientos ref, fecha*, tipo*, sku*, cantidad*, origen, destino, responsable
--   ventas      ref, fecha*, sku*, cantidad*, canal
create or replace function public.integracion_procesar(p_emp uuid, p_sync uuid, p_filas jsonb) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  s sincronizaciones%rowtype; f jsonb; v_fila int; v_err text;
  n_cre int := 0; n_act int := 0; n_igual int := 0; n_err int := 0; v_errs jsonb := '[]'::jsonb;
  v_sku text; v_ubi text; v_ori text; v_des text; v_tipo text; v_cant numeric; v_fecha timestamp; v_ref text;
  v_prod productos%rowtype; v_precio numeric; v_costo numeric; v_resp text; v_nombre_int text;
begin
  select * into s from sincronizaciones where id = p_sync and empresa_id = p_emp for update;
  if s.id is null then raise exception 'Sincronización no encontrada'; end if;
  if s.estado <> 'en_curso' then raise exception 'Esta sincronización ya terminó'; end if;
  if jsonb_typeof(p_filas) <> 'array' then raise exception 'Se esperaba una lista de filas'; end if;
  if jsonb_array_length(p_filas) > 1000 then raise exception 'Máximo 1000 filas por lote'; end if;
  v_nombre_int := coalesce((select nombre from integraciones where id = s.integracion_id), 'Integración');
  v_resp := left('Integración · ' || v_nombre_int, 120);

  for f in select * from jsonb_array_elements(p_filas) loop
    v_fila := coalesce((f->>'_fila')::int, s.procesadas + n_cre + n_act + n_igual + n_err + 1);
    v_err := null;
    begin
      if s.entidad = 'productos' then
        v_sku := upper(btrim(coalesce(f->>'sku', '')));
        if v_sku = '' then v_err := 'Falta el SKU.';
        else
          v_precio := nullif(f->>'precio', '')::numeric; v_costo := nullif(f->>'costo', '')::numeric;
          if coalesce(v_precio, 0) < 0 or coalesce(v_costo, 0) < 0 then v_err := 'Precio o costo negativo.'; end if;
        end if;
        if v_err is null then
          select * into v_prod from productos where empresa_id = p_emp and upper(sku) = v_sku;
          if v_prod.id is null then
            if btrim(coalesce(f->>'nombre', '')) = '' then v_err := 'Producto nuevo sin nombre.';
            else
              insert into productos (empresa_id, id, sku, nombre, categoria, linea, precio, costo)
              values (p_emp, siguiente_id('PRO', p_emp), v_sku, left(btrim(f->>'nombre'), 200), btrim(coalesce(f->>'categoria', '')),
                      btrim(coalesce(f->>'linea', '')), coalesce(v_precio, 0), coalesce(v_costo, 0));
              n_cre := n_cre + 1;
            end if;
          else
            update productos set
              nombre    = coalesce(nullif(left(btrim(f->>'nombre'), 200), ''), nombre),
              categoria = coalesce(nullif(btrim(f->>'categoria'), ''), categoria),
              linea     = coalesce(nullif(btrim(f->>'linea'), ''), linea),
              precio    = coalesce(v_precio, precio),
              costo     = coalesce(v_costo, costo)
            where empresa_id = p_emp and id = v_prod.id
              and (nombre, categoria, linea, precio, costo) is distinct from
                  (coalesce(nullif(left(btrim(f->>'nombre'), 200), ''), nombre), coalesce(nullif(btrim(f->>'categoria'), ''), categoria),
                   coalesce(nullif(btrim(f->>'linea'), ''), linea), coalesce(v_precio, precio), coalesce(v_costo, costo));
            if found then n_act := n_act + 1; else n_igual := n_igual + 1; end if;
          end if;
        end if;

      elsif s.entidad = 'stock' then
        v_sku := _int_sku(p_emp, s.integracion_id, f->>'sku');
        v_cant := nullif(f->>'cantidad', '')::numeric;
        v_ubi := null;
        if v_sku is null then v_err := 'El producto ' || coalesce(f->>'sku', '(vacío)') || ' no está en el catálogo ni en las equivalencias.';
        elsif v_cant is null or v_cant < 0 then v_err := 'Cantidad no válida.';
        elsif btrim(coalesce(f->>'ubicacion', '')) <> '' then
          v_ubi := _int_ubicacion(p_emp, s.integracion_id, f->>'ubicacion');
          if v_ubi is null then v_err := 'La ubicación ' || (f->>'ubicacion') || ' no existe en la bodega ni en las equivalencias.'; end if;
        end if;
        if v_err is null then
          insert into sincronizacion_stock (sync_id, empresa_id, sku, cantidad, ubicacion) values (p_sync, p_emp, v_sku, round(v_cant), v_ubi);
          n_igual := n_igual + 1;   -- se reparte en creados/sin cambios al cerrar
        end if;

      elsif s.entidad in ('movimientos', 'ventas') then
        v_ref := nullif(left(btrim(coalesce(f->>'ref', '')), 120), '');
        v_sku := _int_sku(p_emp, s.integracion_id, f->>'sku');
        v_cant := round(coalesce(nullif(f->>'cantidad', '')::numeric, 0));
        v_fecha := _int_fecha(btrim(coalesce(f->>'fecha', '')));
        if v_ref is not null and s.entidad = 'movimientos' and exists (select 1 from movimientos where empresa_id = p_emp and ref_externa = v_ref) then
          n_igual := n_igual + 1;
        elsif v_ref is not null and s.entidad = 'ventas' and exists (select 1 from ventas where empresa_id = p_emp and ref_externa = v_ref) then
          n_igual := n_igual + 1;
        elsif v_sku is null then v_err := 'El producto ' || coalesce(f->>'sku', '(vacío)') || ' no está en el catálogo ni en las equivalencias.';
        elsif v_cant <= 0 then v_err := 'La cantidad debe ser mayor que cero.';
        elsif v_fecha is null then v_err := 'Fecha no válida (' || coalesce(f->>'fecha', 'vacía') || ').';
        elsif s.entidad = 'ventas' then
          insert into ventas (empresa_id, id, fecha, producto_id, cantidad, canal, ref_externa)
          values (p_emp, siguiente_id('VEN', p_emp), v_fecha::date, (select id from productos where empresa_id = p_emp and sku = v_sku),
                  v_cant, left(btrim(coalesce(f->>'canal', '')), 80), v_ref);
          n_cre := n_cre + 1;
        else
          v_tipo := _int_tipo_mov(f->>'tipo');
          v_ori := case when btrim(coalesce(f->>'origen', '')) = '' then '' else coalesce(_int_ubicacion(p_emp, s.integracion_id, f->>'origen'), '') end;
          v_des := case when btrim(coalesce(f->>'destino', '')) = '' then '' else coalesce(_int_ubicacion(p_emp, s.integracion_id, f->>'destino'), '') end;
          if v_tipo is null then v_err := 'Tipo de movimiento desconocido (' || coalesce(f->>'tipo', 'vacío') || ').';
          else
            insert into movimientos (empresa_id, id, fecha_hora, tipo, sku, cantidad, origen, destino, responsable, ref_externa)
            values (p_emp, siguiente_id('MOV', p_emp), v_fecha, v_tipo, v_sku, v_cant, v_ori, v_des,
                    coalesce(nullif(left(btrim(f->>'responsable'), 120), ''), v_resp), v_ref);
            if v_tipo in ('Ingreso Existencia', 'Transferencia', 'Ajuste Entrada') and v_des <> '' then
              update ubicaciones set sku = v_sku where empresa_id = p_emp and id = v_des;
            end if;
            n_cre := n_cre + 1;
          end if;
        end if;
      end if;
    exception when others then
      v_err := 'Error al guardar: ' || sqlerrm;
    end;
    if v_err is not null then
      n_err := n_err + 1;
      if jsonb_array_length(v_errs) + jsonb_array_length(s.detalle_errores) < 500 then
        v_errs := v_errs || jsonb_build_array(jsonb_build_object('fila', v_fila, 'mensaje', v_err));
      end if;
    end if;
  end loop;

  update sincronizaciones set
    procesadas = procesadas + jsonb_array_length(p_filas),
    creados = creados + n_cre, actualizados = actualizados + n_act,
    sin_cambios = sin_cambios + case when entidad = 'stock' then 0 else n_igual end,
    errores = errores + n_err, detalle_errores = detalle_errores || v_errs
  where id = p_sync;
  return jsonb_build_object('ok', true, 'creados', n_cre, 'actualizados', n_act, 'sinCambios', n_igual, 'errores', n_err, 'detalle', v_errs);
end $$;

-- ---------- Núcleo: cierra la sincronización (aplica la foto de stock) ----------
create or replace function public.integracion_cerrar(p_emp uuid, p_sync uuid) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare s sincronizaciones%rowtype; r record; v_ahora timestamp; v_resp text; n_aj int := 0; n_igual int := 0; n_pos int := 0; a jsonb; v_cats jsonb; v_lins jsonb;
begin
  select * into s from sincronizaciones where id = p_sync and empresa_id = p_emp for update;
  if s.id is null then raise exception 'Sincronización no encontrada'; end if;
  if s.estado <> 'en_curso' then return jsonb_build_object('ok', true, 'sincronizacion', to_jsonb(s) - 'detalle_errores'); end if;
  v_ahora := now() at time zone coalesce(ajustes_empresa(p_emp)->>'zona_horaria', 'Europe/Madrid');
  v_resp := left('Integración · ' || coalesce((select nombre from integraciones where id = s.integracion_id), 'Integración'), 120);

  if s.entidad = 'stock' then
    -- Stock objetivo por SKU (suma de todas sus ubicaciones) frente al stock actual de Flux → movimiento de ajuste
    for r in
      with obj as (select sku, sum(cantidad) objetivo from sincronizacion_stock where sync_id = p_sync group by sku),
      act as (select m.sku, sum(case when m.tipo in ('Ingreso Existencia','Ajuste Entrada') then m.cantidad
                                     when m.tipo in ('Salida Venta','Merma / Daño','Ajuste Salida') then -m.cantidad else 0 end) actual
              from movimientos m where m.empresa_id = p_emp and m.sku in (select sku from obj) group by m.sku)
      select o.sku, o.objetivo - coalesce(ac.actual, 0) dif from obj o left join act ac on ac.sku = o.sku
    loop
      if r.dif = 0 then n_igual := n_igual + 1; continue; end if;
      insert into movimientos (empresa_id, id, fecha_hora, tipo, sku, cantidad, origen, destino, responsable)
      values (p_emp, siguiente_id('MOV', p_emp), v_ahora, case when r.dif > 0 then 'Ajuste Entrada' else 'Ajuste Salida' end,
              r.sku, abs(r.dif)::int, '', '', v_resp);
      n_aj := n_aj + 1;
    end loop;
    -- Posiciones: cada ubicación informada queda con su producto
    update ubicaciones u set sku = x.sku from (
      select distinct on (ubicacion) ubicacion, sku from sincronizacion_stock
      where sync_id = p_sync and ubicacion is not null and cantidad > 0 order by ubicacion, cantidad desc) x
    where u.empresa_id = p_emp and u.id = x.ubicacion and u.sku is distinct from x.sku;
    get diagnostics n_pos = row_count;
    delete from sincronizacion_stock where sync_id = p_sync;
    update sincronizaciones set creados = n_aj, sin_cambios = n_igual, actualizados = n_pos where id = p_sync;
  end if;

  if s.entidad = 'productos' then
    -- Las categorías y líneas nuevas pasan a las listas desplegables de la empresa
    a := ajustes_empresa(p_emp);
    v_cats := (a->'listas'->'CATEGORIA') || coalesce((select jsonb_agg(distinct categoria) from productos
      where empresa_id = p_emp and categoria <> '' and not ((a->'listas'->'CATEGORIA') ? categoria)), '[]');
    v_lins := (a->'listas'->'LINEA') || coalesce((select jsonb_agg(distinct linea) from productos
      where empresa_id = p_emp and linea <> '' and not ((a->'listas'->'LINEA') ? linea)), '[]');
    if jsonb_array_length(v_cats) > jsonb_array_length(a->'listas'->'CATEGORIA') or jsonb_array_length(v_lins) > jsonb_array_length(a->'listas'->'LINEA') then
      update empresas set ajustes = jsonb_set(jsonb_set(
          case when ajustes ? 'listas' then ajustes else ajustes || '{"listas":{}}'::jsonb end,
          '{listas,CATEGORIA}', v_cats), '{listas,LINEA}', v_lins)
      where id = p_emp;
      insert into cobertura (empresa_id, categoria, dias)
        select p_emp, c, coalesce((a->>'cobertura')::int, 30) from jsonb_array_elements_text(v_cats) c on conflict do nothing;
    end if;
  end if;

  update sincronizaciones set terminado = now(),
    estado = case when errores = 0 then 'ok' when errores >= greatest(total, procesadas) then 'error' else 'con_errores' end
  where id = p_sync returning * into s;
  update integraciones set ultima_sync = now() where id = s.integracion_id;
  return jsonb_build_object('ok', true, 'sincronizacion', to_jsonb(s) - 'detalle_errores');
end $$;

-- ---------- Funciones para el panel (empresa de la sesión, solo administradores) ----------
create or replace function public._int_admin() returns uuid
language plpgsql stable security definer set search_path = public as $$
declare v_emp uuid := get_empresa_id();
begin
  if v_emp is null or not tiene_rol('admin') then raise exception 'Solo un administrador de la empresa puede gestionar integraciones.'; end if;
  return v_emp;
end $$;

create or replace function public.int_listar() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_emp uuid := _int_admin();
begin
  return jsonb_build_object(
    'integraciones', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'nombre', i.nombre, 'sistema', i.sistema, 'estado', i.estado,
        'config', i.config, 'ultimaSync', i.ultima_sync, 'creado', i.creado,
        'mapeos', (select count(*) from integracion_mapeos m where m.integracion_id = i.id),
        'importaciones', (select count(*) from sincronizaciones x where x.integracion_id = i.id)) order by i.creado)
      from integraciones i where i.empresa_id = v_emp), '[]'),
    'historial', coalesce((select jsonb_agg(to_jsonb(x) - 'detalle_errores' - 'empresa_id' || jsonb_build_object('integracion',
        (select nombre from integraciones where id = x.integracion_id)) order by x.iniciado desc)
      from (select * from sincronizaciones where empresa_id = v_emp order by iniciado desc limit 40) x), '[]'));
end $$;

create or replace function public.int_guardar(d jsonb) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare v_emp uuid := _int_admin(); v_id uuid := nullif(d->>'id', '')::uuid;
begin
  if btrim(coalesce(d->>'nombre', '')) = '' then return error_('Ponle un nombre a la integración.'); end if;
  if coalesce(d->>'sistema', 'archivo') not in ('archivo','sap_b1','sap_s4','wms','odoo','otro') then return error_('Sistema no válido.'); end if;
  if v_id is null then
    if (select count(*) from integraciones where empresa_id = v_emp) >= 20 then return error_('Máximo 20 integraciones por empresa.'); end if;
    insert into integraciones (empresa_id, nombre, sistema, config)
    values (v_emp, left(btrim(d->>'nombre'), 80), coalesce(d->>'sistema', 'archivo'), coalesce(d->'config', '{}'::jsonb) - 'columnas')
    returning id into v_id;
  else
    update integraciones set nombre = left(btrim(d->>'nombre'), 80), sistema = coalesce(d->>'sistema', sistema),
      estado = case when d->>'estado' in ('activa','pausada') then d->>'estado' else estado end,
      config = case when d ? 'config' then (config || (d->'config' - 'columnas')) else config end
    where id = v_id and empresa_id = v_emp;
    if not found then return error_('No se encuentra la integración.'); end if;
  end if;
  return jsonb_build_object('ok', true, 'id', v_id, 'mensaje', 'Integración guardada.');
end $$;

create or replace function public.int_borrar(p_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare v_emp uuid := _int_admin();
begin
  delete from integraciones where id = p_id and empresa_id = v_emp;
  if not found then return error_('No se encuentra la integración.'); end if;
  return jsonb_build_object('ok', true, 'mensaje', 'Integración eliminada. Los datos que ya importó se conservan.');
end $$;

create or replace function public.int_mapeos(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_emp uuid := _int_admin();
begin
  return coalesce((select jsonb_agg(jsonb_build_object('entidad', entidad, 'externo', externo, 'interno', interno) order by entidad, externo)
    from integracion_mapeos where integracion_id = p_id and empresa_id = v_emp), '[]');
end $$;

-- d: { integracion, entidad, externo, interno }  · interno vacío = borrar la equivalencia
-- o d: { integracion, entidad, lista: [{externo, interno}, ...] } para cargar varias de una vez
create or replace function public.int_guardar_mapeo(d jsonb) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare v_emp uuid := _int_admin(); v_int uuid := nullif(d->>'integracion', '')::uuid; v_ent text := d->>'entidad';
  v_x jsonb; n int := 0; v_malos text[] := '{}'; v_interno text;
begin
  if not exists (select 1 from integraciones where id = v_int and empresa_id = v_emp) then return error_('No se encuentra la integración.'); end if;
  if v_ent not in ('producto','ubicacion') then return error_('Tipo de equivalencia no válido.'); end if;
  for v_x in select * from jsonb_array_elements(case when jsonb_typeof(d->'lista') = 'array' then d->'lista' else jsonb_build_array(d) end) loop
    continue when btrim(coalesce(v_x->>'externo', '')) = '';
    if btrim(coalesce(v_x->>'interno', '')) = '' then
      delete from integracion_mapeos where integracion_id = v_int and entidad = v_ent and externo = btrim(v_x->>'externo');
      n := n + 1; continue;
    end if;
    v_interno := case when v_ent = 'producto'
      then (select sku from productos where empresa_id = v_emp and upper(sku) = upper(btrim(v_x->>'interno')))
      else (select id from ubicaciones where empresa_id = v_emp and (upper(id) = upper(btrim(v_x->>'interno')) or upper(posicion) = upper(btrim(v_x->>'interno'))) limit 1) end;
    if v_interno is null then v_malos := v_malos || btrim(v_x->>'interno'); continue; end if;
    insert into integracion_mapeos (empresa_id, integracion_id, entidad, externo, interno)
    values (v_emp, v_int, v_ent, left(btrim(v_x->>'externo'), 120), v_interno)
    on conflict (integracion_id, entidad, externo) do update set interno = excluded.interno;
    n := n + 1;
  end loop;
  if n = 0 and array_length(v_malos, 1) > 0 then
    return error_((case when v_ent = 'producto' then 'No existe el SKU ' else 'No existe la posición ' end) || array_to_string(v_malos[1:5], ', ') || ' en Flux.');
  end if;
  return jsonb_build_object('ok', true, 'guardadas', n, 'rechazadas', to_jsonb(v_malos),
    'mensaje', n || ' equivalencias guardadas' || case when array_length(v_malos, 1) > 0 then ' · ' || array_length(v_malos, 1) || ' no existen en Flux' else '' end || '.');
end $$;

-- Empieza una importación. p_columnas = cómo se llamaban las columnas del archivo (se recuerdan para la próxima vez)
create or replace function public.int_iniciar(d jsonb) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare v_emp uuid := _int_admin(); v_int uuid := nullif(d->>'integracion', '')::uuid; v_id uuid; v_nombre text;
begin
  if not exists (select 1 from integraciones where id = v_int and empresa_id = v_emp) then return error_('Elige la integración (fuente de datos).'); end if;
  if (select estado from integraciones where id = v_int) = 'pausada' then return error_('Esta integración está pausada.'); end if;
  if d->>'entidad' not in ('productos','stock','movimientos','ventas') then return error_('Elige qué vas a importar.'); end if;
  if coalesce((d->>'total')::int, 0) <= 0 then return error_('El archivo no tiene filas.'); end if;
  if (d->>'total')::int > 200000 then return error_('Máximo 200.000 filas por importación.'); end if;
  -- Cierra importaciones que quedaron a medias (navegador cerrado) hace más de 2 horas
  update sincronizaciones set estado = 'error', terminado = now(),
    detalle_errores = detalle_errores || '[{"fila":0,"mensaje":"La importación se interrumpió."}]'
  where empresa_id = v_emp and estado = 'en_curso' and iniciado < now() - interval '2 hours';
  delete from sincronizacion_stock where empresa_id = v_emp and sync_id in (select id from sincronizaciones where empresa_id = v_emp and estado = 'error');
  select nombre into v_nombre from perfiles_usuarios where user_id = auth.uid();
  insert into sincronizaciones (empresa_id, integracion_id, entidad, canal, origen, total, usuario)
  values (v_emp, v_int, d->>'entidad', 'archivo', left(coalesce(d->>'origen', ''), 160), (d->>'total')::int, coalesce(v_nombre, ''))
  returning id into v_id;
  if jsonb_typeof(d->'columnas') = 'object' then
    update integraciones set config = jsonb_set(case when config ? 'columnas' then config else config || '{"columnas":{}}'::jsonb end,
      array['columnas', d->>'entidad'], d->'columnas') where id = v_int;
  end if;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

create or replace function public.int_lote(p_sync uuid, p_filas jsonb) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
begin
  return integracion_procesar(_int_admin(), p_sync, p_filas);
end $$;

create or replace function public.int_finalizar(p_sync uuid) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
begin
  return integracion_cerrar(_int_admin(), p_sync);
end $$;

create or replace function public.int_errores(p_sync uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_emp uuid := _int_admin();
begin
  return coalesce((select detalle_errores from sincronizaciones where id = p_sync and empresa_id = v_emp), '[]');
end $$;

-- ---------- Permisos de ejecución ----------
do $$ declare f text; begin
  foreach f in array array['_int_tipo_mov(text)','_int_sku(uuid,uuid,text)','_int_ubicacion(uuid,uuid,text)','_int_fecha(text)',
    'integracion_procesar(uuid,uuid,jsonb)','integracion_cerrar(uuid,uuid)'] loop
    execute 'revoke execute on function public.' || f || ' from anon, authenticated, public';
    execute 'grant execute on function public.' || f || ' to service_role';
  end loop;
  foreach f in array array['_int_admin()','int_listar()','int_guardar(jsonb)','int_borrar(uuid)','int_mapeos(uuid)','int_guardar_mapeo(jsonb)',
    'int_iniciar(jsonb)','int_lote(uuid,jsonb)','int_finalizar(uuid)','int_errores(uuid)'] loop
    execute 'revoke execute on function public.' || f || ' from anon, public';
    execute 'grant execute on function public.' || f || ' to authenticated, service_role';
  end loop;
end $$;
