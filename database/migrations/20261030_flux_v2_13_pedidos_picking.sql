-- ============================================================
-- AXIOMA FLUX v2 · flux_v2_13_pedidos_picking (30/10/2026)
-- Módulo "Pedidos y despachos": pedidos con varias líneas, lotes de picking con ruta optimizada
-- y despacho que genera las ventas y las salidas de stock. Ajustes de picking por empresa.
-- Planes: Profesional = Inventario + Posiciones (3D y picking) · Empresa = + CRM comercial y Finanzas.
-- YA está aplicado. No volver a ejecutarlo sobre la misma base.
-- ============================================================

-- ===================== TABLAS =====================
create table public.pedidos (                           -- [LOG] Pedidos de clientes
  empresa_id uuid not null default public.get_empresa_id() references public.empresas(id) on delete cascade,
  id text not null, fecha date not null, cliente text not null, canal text not null default '',
  prioridad text not null default 'Normal' check (prioridad in ('Normal','Urgente')),
  estado text not null default 'Pendiente' check (estado in ('Pendiente','En preparación','Despachado','Anulado')),
  lote_id text, despachado timestamptz, notas text not null default '',
  demo boolean not null default false, creado_por uuid default auth.uid(), creado timestamptz not null default now(),
  primary key (empresa_id, id)
);

create table public.pedido_lineas (                     -- [LOG] Líneas de cada pedido
  empresa_id uuid not null default public.get_empresa_id() references public.empresas(id) on delete cascade,
  pedido_id text not null, linea int not null, producto_id text not null,
  cantidad int not null check (cantidad > 0), ubicacion_id text not null default '',
  primary key (empresa_id, pedido_id, linea),
  foreign key (empresa_id, pedido_id) references public.pedidos(empresa_id, id) on delete cascade,
  foreign key (empresa_id, producto_id) references public.productos(empresa_id, id) on update cascade
);

create table public.lotes_picking (                     -- [LOG] Lotes de picking (varios pedidos, una ruta)
  empresa_id uuid not null default public.get_empresa_id() references public.empresas(id) on delete cascade,
  id text not null, estado text not null default 'Abierto' check (estado in ('Abierto','Completado','Cancelado')),
  responsable text not null default '', pedidos text[] not null default '{}',
  ruta jsonb not null default '[]', metros numeric(10,1) not null default 0, metros_base numeric(10,1) not null default 0,
  segundos int not null default 0, unidades int not null default 0,
  demo boolean not null default false, creado_por uuid default auth.uid(), creado timestamptz not null default now(), cerrado timestamptz,
  primary key (empresa_id, id)
);

create index on public.pedidos (empresa_id, estado);
create index on public.pedidos (empresa_id, lote_id);
create index on public.pedido_lineas (empresa_id, producto_id);

-- ===================== SEGURIDAD A NIVEL DE FILA (mismo patrón que el resto) =====================
do $$
declare t record;
begin
  for t in select * from (values ('pedidos', null), ('pedido_lineas', null), ('lotes_picking', 'posiciones')) as v(tabla, modulo)
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

-- ===================== PLANES: foco en inventario + picking =====================
update public.planes set modulos = array['inventario','posiciones'] where plan = 'pro';
update public.planes set modulos = array['inventario','posiciones','comercial','finanzas'] where plan = 'enterprise';

-- ===================== AJUSTES: picking =====================
create or replace function public.ajustes_por_defecto() returns jsonb
language sql immutable set search_path = public as $$
  select jsonb_build_object(
    'moneda', '€', 'decimales', 2, 'zona_horaria', 'Europe/Madrid',
    'peso90', 70, 'pesoAA', 30, 'critico', 15, 'precaucion', 30, 'cobertura', 30,
    'rotAlta', 45, 'rotMedia', 120, 'iva', 21, 'contado', jsonb_build_array('Tienda','Online'),
    'mesesPasados', 6, 'mesesFuturos', 3, 'saldo', 30000, 'diasLead', 7,
    'picking', jsonb_build_object('despacho', 'porton', 'carro', 6, 'velocidad', 1.0, 'segParada', 20),
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

create or replace function public.guardar_ajustes(d jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_emp uuid := get_empresa_id(); v_act jsonb; v_nuevo jsonb := '{}'; k text; v_bodega_antes jsonb; n int; bd jsonb; v_pos int; pk jsonb;
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
  if d ? 'picking' then
    pk := d->'picking';
    if coalesce(pk->>'despacho', '') not in ('porton', 'opuesto')
       or coalesce((pk->>'carro')::numeric, 0) not between 1 and 20
       or coalesce((pk->>'velocidad')::numeric, 0) not between 0.3 and 3
       or coalesce((pk->>'segParada')::numeric, -1) not between 0 and 300 then
      return error_('Revisa los ajustes de picking: hasta 20 pedidos por carro, velocidad entre 0,3 y 3 m/s y hasta 300 s por parada.');
    end if;
    v_nuevo := v_nuevo || jsonb_build_object('picking', jsonb_build_object('despacho', pk->>'despacho', 'carro', (pk->>'carro')::int,
      'velocidad', (pk->>'velocidad')::numeric, 'segParada', (pk->>'segParada')::int));
  end if;
  if d ? 'bodega' then
    bd := d->'bodega';
    if jsonb_array_length(coalesce(bd->'pasillos','[]')) not between 1 and 26
       or coalesce((bd->>'racks')::int, 0) not between 1 and 60
       or coalesce((bd->>'niveles')::int, 0) not between 1 and 12
       or coalesce((bd->>'bloques')::int, 1) not between 1 and 4 then
      return error_('La bodega debe tener entre 1 y 26 pasillos, 1 y 60 racks por fila, 1 y 12 niveles y hasta 4 bloques.');
    end if;
    if bd ? 'estilo' and not plantillas_nave() ? (bd->>'estilo') then return error_('Diseño de nave no válido.'); end if;
    v_pos := jsonb_array_length(bd->'pasillos') * (bd->>'racks')::int * greatest((bd->>'niveles')::int,
             coalesce((select max(x::int) from jsonb_array_elements_text(coalesce(bd->'nivelesBloque','[]')) x), 0));
    if v_pos > 5000 then return error_('La bodega no puede superar las 5.000 posiciones (ahora serían ' || v_pos || ').'); end if;
    v_nuevo := v_nuevo || jsonb_build_object('bodega', (select jsonb_object_agg(key, value) from jsonb_each(bd)
                 where key in ('pasillos','racks','niveles','ancho','alto','separacion','estilo','dobles','bloques','corte','nivelesBloque')));
  end if;
  if coalesce((v_nuevo ->> 'peso90')::numeric, (ajustes_empresa(v_emp)->>'peso90')::numeric)
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

-- ===================== PEDIDOS =====================
-- d = { cliente, canal, prioridad, fecha, notas, lineas: [{ producto, cantidad }] }
create or replace function public.guardar_pedido(d jsonb) returns jsonb
language plpgsql volatile security invoker set search_path = public as $$
declare v_emp uuid := get_empresa_id(); v_id text; v_fecha date; v_pri text; l jsonb; v_cant int; n int := 0;
  v_lineas jsonb := '{}';
begin
  if v_emp is null then return error_('Tu usuario no está asociado a una empresa activa.'); end if;
  if not tiene_rol('operador') then return error_('Tu usuario es de solo lectura.'); end if;
  if btrim(coalesce(d->>'cliente', '')) = '' then return error_('Indica el cliente del pedido.'); end if;
  if jsonb_typeof(d->'lineas') <> 'array' or jsonb_array_length(d->'lineas') = 0 then return error_('Añade al menos un producto al pedido.'); end if;
  if jsonb_array_length(d->'lineas') > 60 then return error_('Un pedido admite hasta 60 líneas.'); end if;
  v_pri := case when d->>'prioridad' = 'Urgente' then 'Urgente' else 'Normal' end;
  v_fecha := case when coalesce(d->>'fecha','') ~ '^\d{4}-\d{2}-\d{2}$' then (d->>'fecha')::date else hoy_empresa() end;
  -- Agrupa líneas repetidas del mismo producto
  for l in select * from jsonb_array_elements(d->'lineas') loop
    v_cant := round(coalesce(nullif(replace(l->>'cantidad', ',', '.'), '')::numeric, 0));
    if v_cant <= 0 then return error_('Las cantidades deben ser mayores que cero.'); end if;
    if not exists (select 1 from productos where id = btrim(coalesce(l->>'producto', ''))) then return error_('Hay un producto que no está en el catálogo.'); end if;
    v_lineas := jsonb_set(v_lineas, array[btrim(l->>'producto')], to_jsonb(coalesce((v_lineas->>btrim(l->>'producto'))::int, 0) + v_cant));
  end loop;
  v_id := siguiente_id('PED');
  insert into pedidos (empresa_id, id, fecha, cliente, canal, prioridad, notas)
  values (v_emp, v_id, v_fecha, btrim(d->>'cliente'), btrim(coalesce(d->>'canal', '')), v_pri, btrim(coalesce(d->>'notas', '')));
  for l in select jsonb_build_object('p', key, 'c', value) from jsonb_each(v_lineas) loop
    n := n + 1;
    insert into pedido_lineas (empresa_id, pedido_id, linea, producto_id, cantidad) values (v_emp, v_id, n, l->>'p', (l->>'c')::int);
  end loop;
  return jsonb_build_object('ok', true, 'id', v_id, 'mensaje', 'Pedido ' || v_id || ' creado.');
end $$;

create or replace function public.anular_pedido(p_id text) returns jsonb
language plpgsql volatile security invoker set search_path = public as $$
declare v_estado text;
begin
  if get_empresa_id() is null then return error_('Tu usuario no está asociado a una empresa activa.'); end if;
  if not tiene_rol('operador') then return error_('Tu usuario es de solo lectura.'); end if;
  select estado into v_estado from pedidos where id = p_id for update;
  if v_estado is null then return error_('No se encontró el pedido.'); end if;
  if v_estado <> 'Pendiente' then return error_('Solo se pueden anular pedidos pendientes (este está ' || lower(v_estado) || ').'); end if;
  update pedidos set estado = 'Anulado' where id = p_id;
  return jsonb_build_object('ok', true, 'mensaje', 'Pedido ' || p_id || ' anulado.');
end $$;

-- ===================== LOTES DE PICKING =====================
-- d = { pedidos: [ids], responsable, metros, metrosBase, segundos, unidades,
--       ruta: [{ u: ubicación, sku, pos, x, y, c: corredor, items: [{ p: pedido, l: línea, c: cantidad }] }] }
create or replace function public.crear_lote(d jsonb) returns jsonb
language plpgsql volatile security invoker set search_path = public as $$
declare v_emp uuid := get_empresa_id(); v_ids text[]; v_ok int; v_id text; s jsonb; i jsonb;
begin
  if v_emp is null then return error_('Tu usuario no está asociado a una empresa activa.'); end if;
  if not tiene_rol('operador') then return error_('Tu usuario es de solo lectura.'); end if;
  if not modulo_activo('posiciones') then return error_('El picking con rutas está incluido en el plan Profesional.'); end if;
  if jsonb_typeof(d->'pedidos') <> 'array' or jsonb_typeof(d->'ruta') <> 'array' then return error_('Lote no válido.'); end if;
  select array_agg(x) into v_ids from (select distinct jsonb_array_elements_text(d->'pedidos') x) q;
  if coalesce(array_length(v_ids, 1), 0) not between 1 and 20 then return error_('Un lote lleva entre 1 y 20 pedidos.'); end if;
  if jsonb_array_length(d->'ruta') > 600 then return error_('La ruta es demasiado larga.'); end if;
  select count(*) into v_ok from (select 1 from pedidos where id = any(v_ids) and estado = 'Pendiente' for update) q;
  if v_ok <> array_length(v_ids, 1) then return error_('Algún pedido ya no está pendiente. Actualiza la pantalla y vuelve a generar los lotes.'); end if;
  v_id := siguiente_id('LOT');
  insert into lotes_picking (empresa_id, id, responsable, pedidos, ruta, metros, metros_base, segundos, unidades)
  values (v_emp, v_id, left(btrim(coalesce(d->>'responsable', '')), 80), v_ids, d->'ruta',
          coalesce((d->>'metros')::numeric, 0), coalesce((d->>'metrosBase')::numeric, 0),
          coalesce((d->>'segundos')::numeric, 0)::int, coalesce((d->>'unidades')::numeric, 0)::int);
  update pedidos set estado = 'En preparación', lote_id = v_id where id = any(v_ids);
  -- Cada línea queda asignada a la posición de la que se recoge
  for s in select * from jsonb_array_elements(d->'ruta') loop
    for i in select * from jsonb_array_elements(coalesce(s->'items', '[]')) loop
      update pedido_lineas set ubicacion_id = coalesce(s->>'u', '')
      where pedido_id = i->>'p' and linea = (i->>'l')::int and pedido_id = any(v_ids);
    end loop;
  end loop;
  return jsonb_build_object('ok', true, 'id', v_id, 'mensaje', 'Lote ' || v_id || ' creado con ' || array_length(v_ids, 1) || ' pedidos.');
end $$;

-- Despacha el lote: cada línea se convierte en venta y en salida de stock desde su posición
create or replace function public.completar_lote(p_id text) returns jsonb
language plpgsql volatile security invoker set search_path = public as $$
declare v_emp uuid := get_empresa_id(); v_lote lotes_picking%rowtype; r record; v_ahora timestamp; v_hoy date; v_ven text; n int := 0;
begin
  if v_emp is null then return error_('Tu usuario no está asociado a una empresa activa.'); end if;
  if not tiene_rol('operador') then return error_('Tu usuario es de solo lectura.'); end if;
  select * into v_lote from lotes_picking where id = p_id for update;
  if v_lote.id is null then return error_('No se encontró el lote.'); end if;
  if v_lote.estado <> 'Abierto' then return error_('El lote ya está ' || lower(v_lote.estado) || '.'); end if;
  v_hoy := hoy_empresa(); v_ahora := (now() at time zone coalesce(ajustes_empresa(v_emp)->>'zona_horaria', 'Europe/Madrid'));
  for r in select p.id pedido, p.canal, l.producto_id, l.cantidad, l.ubicacion_id, pr.sku
           from pedidos p join pedido_lineas l on l.pedido_id = p.id join productos pr on pr.id = l.producto_id
           where p.lote_id = p_id and p.estado = 'En preparación' order by p.id, l.linea loop
    v_ven := siguiente_id('VEN');
    insert into ventas (empresa_id, id, fecha, producto_id, cantidad, canal) values (v_emp, v_ven, v_hoy, r.producto_id, r.cantidad, r.canal);
    insert into movimientos (empresa_id, id, fecha_hora, tipo, sku, cantidad, origen, destino, responsable)
    values (v_emp, siguiente_id('MOV'), v_ahora, 'Salida Venta', r.sku, r.cantidad,
            coalesce(nullif(r.ubicacion_id, ''), (select id from ubicaciones where sku = r.sku order by id limit 1), ''), '',
            left(coalesce(nullif(v_lote.responsable, ''), 'Picking') || ' · ' || r.pedido || ' · ' || p_id, 120));
    n := n + 1;
  end loop;
  update pedidos set estado = 'Despachado', despachado = now() where lote_id = p_id and estado = 'En preparación';
  update lotes_picking set estado = 'Completado', cerrado = now() where id = p_id;
  return jsonb_build_object('ok', true, 'mensaje', 'Lote ' || p_id || ' despachado: ' || n || ' líneas descontadas del stock.');
end $$;

create or replace function public.cancelar_lote(p_id text) returns jsonb
language plpgsql volatile security invoker set search_path = public as $$
declare v_estado text;
begin
  if get_empresa_id() is null then return error_('Tu usuario no está asociado a una empresa activa.'); end if;
  if not tiene_rol('operador') then return error_('Tu usuario es de solo lectura.'); end if;
  select estado into v_estado from lotes_picking where id = p_id for update;
  if v_estado is null then return error_('No se encontró el lote.'); end if;
  if v_estado <> 'Abierto' then return error_('El lote ya está ' || lower(v_estado) || '.'); end if;
  update pedido_lineas set ubicacion_id = '' where pedido_id in (select id from pedidos where lote_id = p_id and estado = 'En preparación');
  update pedidos set estado = 'Pendiente', lote_id = null where lote_id = p_id and estado = 'En preparación';
  update lotes_picking set estado = 'Cancelado', cerrado = now() where id = p_id;
  return jsonb_build_object('ok', true, 'mensaje', 'Lote ' || p_id || ' cancelado: sus pedidos vuelven a pendientes.');
end $$;

-- ===================== PEDIDOS DE EJEMPLO (para demos) =====================
-- Interna: crea n pedidos pendientes con productos que están ubicados y tienen stock
create or replace function public._demo_pedidos(p_emp uuid, p_n int) returns int
language plpgsql volatile security definer set search_path = public as $$
declare v_cli text[] := array['Ferretería Turia','Suministros Levante','Almacenes Albufera','Distribuciones Malvarrosa','Comercial Ruzafa',
    'Bricolaje El Carmen','Mayorista Benimaclet','Hogar Patraix','Tiendas Campanar','Suministros Russafa Pro','Distribuidora Marítim','Grupo Horta Sud'];
  v_canales text[]; v_anio text; v_cnt int; v_id text; k int; j int; v_lineas int; v_prod text; v_usados text[]; n int := 0;
begin
  v_canales := array(select jsonb_array_elements_text(ajustes_empresa(p_emp)->'listas'->'CANAL'));
  v_anio := to_char((now() at time zone coalesce(ajustes_empresa(p_emp)->>'zona_horaria','Europe/Madrid')), 'YYYY');
  create temp table if not exists _dp (id text, sku text) on commit drop;
  delete from _dp;
  insert into _dp
    select p.id, p.sku from productos p
    where p.empresa_id = p_emp and exists (select 1 from ubicaciones u where u.empresa_id = p_emp and u.sku = p.sku)
      and coalesce((select sum(case when m.tipo in ('Ingreso Existencia','Ajuste Entrada') then m.cantidad
                                    when m.tipo in ('Salida Venta','Merma / Daño','Ajuste Salida') then -m.cantidad else 0 end)
                    from movimientos m where m.empresa_id = p_emp and m.sku = p.sku), 0) >= 12;
  if not exists (select 1 from _dp) then return 0; end if;
  for k in 1..greatest(1, least(p_n, 60)) loop
    insert into contadores (empresa_id, clave, valor) values (p_emp, 'PED-' || v_anio, 1)
    on conflict (empresa_id, clave) do update set valor = contadores.valor + 1 returning valor into v_cnt;
    v_id := 'PED-' || v_anio || '-' || lpad(v_cnt::text, 4, '0');
    insert into pedidos (empresa_id, id, fecha, cliente, canal, prioridad, demo, creado_por)
    values (p_emp, v_id, hoy_empresa() - (random() * 2)::int, v_cli[1 + floor(random() * array_length(v_cli, 1))::int],
            coalesce(v_canales[1 + floor(random() * greatest(1, coalesce(array_length(v_canales, 1), 1)))::int], ''),
            case when random() < 0.2 then 'Urgente' else 'Normal' end, true, null);
    v_lineas := 2 + floor(random() * 4)::int; v_usados := '{}';
    for j in 1..v_lineas loop
      select id into v_prod from _dp where id <> all(v_usados) order by random() limit 1;
      exit when v_prod is null;
      v_usados := v_usados || v_prod;
      insert into pedido_lineas (empresa_id, pedido_id, linea, producto_id, cantidad) values (p_emp, v_id, j, v_prod, 1 + floor(random() * 4)::int);
    end loop;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public._demo_pedidos(uuid, int) from public, anon, authenticated;

-- Pública: el administrador genera pedidos de ejemplo en su propia empresa
create or replace function public.demo_pedidos(p_n int default 24) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare v_emp uuid := get_empresa_id(); n int;
begin
  if v_emp is null then return error_('Tu usuario no está asociado a una empresa activa.'); end if;
  if not tiene_rol('admin') then return error_('Solo un administrador puede generar pedidos de ejemplo.'); end if;
  n := _demo_pedidos(v_emp, p_n);
  if n = 0 then return error_('No hay productos ubicados con stock suficiente para generar pedidos de ejemplo.'); end if;
  return jsonb_build_object('ok', true, 'mensaje', n || ' pedidos de ejemplo creados.');
end $$;

-- Borrar datos de ejemplo también limpia pedidos y lotes de ejemplo
create or replace function public.sa_borrar_demo(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not es_superadmin() and not es_servicio() then return error_('Sin permisos'); end if;
  delete from lotes_picking where empresa_id = p_id and (demo or pedidos && array(select id from pedidos where empresa_id = p_id and demo));
  delete from pedido_lineas where empresa_id = p_id and producto_id in (select id from productos where empresa_id = p_id and demo);
  delete from pedidos where empresa_id = p_id and demo;
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

-- ===================== DATOS INICIALES: + pedidos y lotes =====================
create or replace function public.obtener_datos_iniciales() returns jsonb
language plpgsql set search_path = public as $$
declare v_emp uuid := get_empresa_id(); a jsonb; r jsonb; v_tz text;
begin
  if v_emp is null then
    return jsonb_build_object('ok', false, 'sinEmpresa', true, 'superadmin', es_superadmin(),
      'mensaje', 'Tu usuario no está asociado a una empresa activa.');
  end if;
  perform inicializar_empresa(v_emp);
  a := ajustes_empresa(v_emp); v_tz := coalesce(a->>'zona_horaria', 'Europe/Madrid');
  select jsonb_build_object(
    'hoy', to_char(hoy_empresa(), 'YYYY-MM-DD'), 'existe', true, 'hojas', '[]'::jsonb, 'urls', '[]'::jsonb,
    'listas', a->'listas',
    'config', (a - 'listas') ,
    'modulos', to_jsonb(modulos_empresa(v_emp)), 'plantillas', plantillas_nave(),
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
    'gastos', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'categoria', categoria, 'proveedor', proveedor, 'monto', monto, 'fecha', to_char(fecha,'YYYY-MM-DD')) order by fecha, id) from gastos), '[]'),
    'pedidos', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'fecha', to_char(p.fecha,'YYYY-MM-DD'), 'cliente', p.cliente, 'canal', p.canal,
                  'prioridad', p.prioridad, 'estado', p.estado, 'lote', coalesce(p.lote_id, ''), 'notas', p.notas,
                  'despachado', coalesce(to_char(p.despachado at time zone v_tz, 'YYYY-MM-DD HH24:MI'), ''),
                  'lineas', coalesce((select jsonb_agg(jsonb_build_array(l.linea, l.producto_id, l.cantidad, l.ubicacion_id) order by l.linea)
                                      from pedido_lineas l where l.pedido_id = p.id), '[]')) order by p.fecha, p.id)
                  from pedidos p where p.estado in ('Pendiente','En preparación') or p.fecha >= hoy_empresa() - 60), '[]'),
    'lotes', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'estado', estado, 'responsable', responsable, 'pedidos', to_jsonb(pedidos),
                  'ruta', ruta, 'metros', metros, 'metrosBase', metros_base, 'segundos', segundos, 'unidades', unidades,
                  'creado', to_char(creado at time zone v_tz, 'YYYY-MM-DD HH24:MI'), 'cerrado', coalesce(to_char(cerrado at time zone v_tz, 'YYYY-MM-DD HH24:MI'), ''))
                  order by creado desc) from lotes_picking where estado = 'Abierto' or creado >= now() - interval '60 days'), '[]')
  ) into r;
  return r;
end $$;

-- ===================== PERMISOS DE EJECUCIÓN =====================
revoke execute on function public.guardar_pedido(jsonb), public.anular_pedido(text), public.crear_lote(jsonb),
  public.completar_lote(text), public.cancelar_lote(text), public.demo_pedidos(int) from public, anon;
grant execute on function public.guardar_pedido(jsonb), public.anular_pedido(text), public.crear_lote(jsonb),
  public.completar_lote(text), public.cancelar_lote(text), public.demo_pedidos(int) to authenticated;
