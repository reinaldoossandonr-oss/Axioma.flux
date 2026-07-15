"""
Endpoints del dashboard.
Todas las vistas usan empresa_id del JWT → RLS garantiza aislamiento.

Filtro de fecha global: todos los endpoints aceptan fecha_desde/fecha_hasta
(query params, formato YYYY-MM-DD). Si no se envían, se usa por defecto
el rango [hoy - 90 días, hoy]. El filtro se aplica de dos formas:
  - Métricas de "estado actual" (stock, valor, reposición, ocupación):
    se recalculan "a la fecha" (corte en fecha_hasta), usando fecha_desde
    solo para la ventana de cálculo de consumo promedio diario.
  - Métricas de flujo (salidas, merma): se acotan estrictamente al rango
    [fecha_desde, fecha_hasta].
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from auth.dependencies import CurrentUser, get_current_user
from database.client import get_user_client

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _resolver_rango(fecha_desde: Optional[str], fecha_hasta: Optional[str]) -> tuple[str, str]:
    """Convierte los query params (YYYY-MM-DD) en un rango [desde, hasta] ISO,
    incluyendo el día completo de fecha_hasta. Por defecto: últimos 90 días."""
    if fecha_hasta:
        hasta = datetime.fromisoformat(fecha_hasta)
        if len(fecha_hasta) == 10:  # solo fecha, sin hora → incluir el día completo
            hasta = hasta.replace(hour=23, minute=59, second=59, microsecond=999999)
    else:
        hasta = datetime.now(timezone.utc)
    if hasta.tzinfo is None:
        hasta = hasta.replace(tzinfo=timezone.utc)

    if fecha_desde:
        desde = datetime.fromisoformat(fecha_desde)
        if desde.tzinfo is None:
            desde = desde.replace(tzinfo=timezone.utc)
    else:
        desde = hasta - timedelta(days=90)

    return desde.isoformat(), hasta.isoformat()


@router.get("/resumen", summary="Resumen principal del dashboard")
async def resumen(
    fecha_desde: Optional[str] = Query(None),
    fecha_hasta: Optional[str] = Query(None),
    categoria_id: Optional[str] = Query(None),
    user: CurrentUser = Depends(get_current_user),
):
    """
    Métricas clave para las tarjetas del dashboard, calculadas "a la fecha"
    (fecha_hasta) y acotadas por el rango [fecha_desde, fecha_hasta] cuando
    corresponde (merma, consumo promedio). Si se envía categoria_id, todas
    las métricas quedan acotadas a esa categoría, excepto la tasa de
    ocupación del almacén (es una métrica física del centro de distribución,
    no tiene sentido acotarla a una sola categoría de producto).
    """
    db = get_user_client(user.token)
    desde, hasta = _resolver_rango(fecha_desde, fecha_hasta)

    stock_res = db.rpc(
        "f_stock_actual_asof",
        {"p_empresa_id": user.empresa_id, "p_hasta": hasta, "p_desde": desde},
    ).execute().data or []
    if categoria_id:
        stock_res = [r for r in stock_res if r.get("categoria_id") == categoria_id]

    total_productos = len(stock_res)
    a_reponer = sum(1 for r in stock_res if r.get("estado") == "Reponer")
    valor_total = sum((r.get("valor_inventario") or 0) for r in stock_res)

    merma_res = db.rpc(
        "f_merma_categoria_asof",
        {"p_empresa_id": user.empresa_id, "p_desde": desde, "p_hasta": hasta},
    ).execute().data or []
    if categoria_id:
        merma_res = [r for r in merma_res if r.get("categoria_id") == categoria_id]
    merma_valor_total = sum((r.get("valor_total") or 0) for r in merma_res)

    # Tasa de ocupación del almacén "a la fecha"
    total_posiciones = (
        db.table("posiciones")
        .select("id", count="exact")
        .eq("empresa_id", user.empresa_id)
        .eq("activo", True)
        .execute()
    ).count or 0

    ocupadas_res = db.rpc(
        "f_stock_por_posicion_asof",
        {"p_empresa_id": user.empresa_id, "p_hasta": hasta},
    ).execute().data or []
    posiciones_ocupadas = len({r["posicion_id"] for r in ocupadas_res if (r.get("stock_posicion") or 0) > 0})

    tasa_ocupacion_almacen = (
        round((posiciones_ocupadas / total_posiciones) * 100, 1) if total_posiciones > 0 else 0
    )

    return {
        "total_productos": total_productos,
        "productos_a_reponer": a_reponer,
        "valor_inventario_total": round(valor_total, 2),
        "tasa_ocupacion_almacen": tasa_ocupacion_almacen,
        "merma_valor_total": round(merma_valor_total, 2),
    }


@router.get("/stock-categorias", summary="Stock por categoría (gráfico 1)")
async def stock_por_categoria(
    fecha_desde: Optional[str] = Query(None),
    fecha_hasta: Optional[str] = Query(None),
    categoria_id: Optional[str] = Query(None),
    user: CurrentUser = Depends(get_current_user),
):
    """Agrupa f_stock_actual_asof por categoría, "a la fecha" (fecha_hasta)."""
    db = get_user_client(user.token)
    desde, hasta = _resolver_rango(fecha_desde, fecha_hasta)

    rows = db.rpc(
        "f_stock_actual_asof",
        {"p_empresa_id": user.empresa_id, "p_hasta": hasta, "p_desde": desde},
    ).execute().data or []
    if categoria_id:
        rows = [r for r in rows if r.get("categoria_id") == categoria_id]

    agrupado: dict[str, dict] = {}
    for r in rows:
        cat = r.get("categoria") or "Sin categoría"
        g = agrupado.setdefault(cat, {"categoria": cat, "total_productos": 0, "stock_total": 0.0, "valor_total": 0.0})
        g["total_productos"] += 1
        g["stock_total"] += r.get("stock_actual") or 0
        g["valor_total"] += r.get("valor_inventario") or 0

    return sorted(agrupado.values(), key=lambda g: g["stock_total"], reverse=True)


@router.get("/salidas-mensuales", summary="Salidas mensuales (gráfico 2)")
async def salidas_mensuales(
    fecha_desde: Optional[str] = Query(None),
    fecha_hasta: Optional[str] = Query(None),
    categoria_id: Optional[str] = Query(None),
    user: CurrentUser = Depends(get_current_user),
):
    """Salidas confirmadas acotadas a [fecha_desde, fecha_hasta] y, si se envía, a una categoría, agrupadas por mes."""
    db = get_user_client(user.token)
    desde, hasta = _resolver_rango(fecha_desde, fecha_hasta)
    return db.rpc(
        "f_salidas_mensuales_asof",
        {"p_empresa_id": user.empresa_id, "p_desde": desde, "p_hasta": hasta, "p_categoria_id": categoria_id},
    ).execute().data or []


@router.get("/tabla-principal", summary="Tabla principal con reglas de negocio")
async def tabla_principal(
    fecha_desde: Optional[str] = Query(None),
    fecha_hasta: Optional[str] = Query(None),
    categoria_id: Optional[str] = Query(None),
    user: CurrentUser = Depends(get_current_user),
):
    """
    Devuelve el stock "a la fecha" (fecha_hasta) de cada producto:
    SKU, nombre, stock_actual, consumo_promedio_diario (calculado sobre
    [fecha_desde, fecha_hasta]), dias_inventario, estado, cantidad_reponer,
    rotacion y clasificacion ABC.

    Rotación = unidades vendidas en [fecha_desde, fecha_hasta] / inventario
    promedio diario del mismo periodo (promedio del saldo de existencias de
    cada día del rango, "a la fecha" de cada día — no solo el neto del rango).
    Clasificación ABC sobre esa rotación: A (>=6), B ([2, 6)), C (<2).
    """
    db = get_user_client(user.token)
    desde, hasta = _resolver_rango(fecha_desde, fecha_hasta)

    rows = db.rpc(
        "f_stock_actual_asof",
        {"p_empresa_id": user.empresa_id, "p_hasta": hasta, "p_desde": desde},
    ).execute().data or []
    if categoria_id:
        rows = [r for r in rows if r.get("categoria_id") == categoria_id]

    rotacion_res = db.rpc(
        "f_rotacion_abc_asof",
        {"p_empresa_id": user.empresa_id, "p_desde": desde, "p_hasta": hasta},
    ).execute().data or []
    rotacion_por_producto = {r["producto_id"]: r for r in rotacion_res}

    for r in rows:
        rot = rotacion_por_producto.get(r.get("producto_id"))
        r["unidades_vendidas_periodo"] = rot.get("unidades_vendidas") if rot else 0
        r["inventario_promedio_diario"] = rot.get("inventario_promedio_diario") if rot else 0
        r["rotacion"] = rot.get("rotacion") if rot else None
        r["clasificacion"] = rot.get("clasificacion") if rot else "Sin datos"

    return sorted(rows, key=lambda r: (r.get("nombre") or ""))


@router.get("/alertas", summary="Productos que requieren reposición")
async def alertas_reposicion(
    fecha_desde: Optional[str] = Query(None),
    fecha_hasta: Optional[str] = Query(None),
    categoria_id: Optional[str] = Query(None),
    user: CurrentUser = Depends(get_current_user),
):
    """Lista rápida de productos con estado 'Reponer' (a la fecha) para notificaciones."""
    db = get_user_client(user.token)
    desde, hasta = _resolver_rango(fecha_desde, fecha_hasta)
    rows = db.rpc(
        "f_stock_actual_asof",
        {"p_empresa_id": user.empresa_id, "p_hasta": hasta, "p_desde": desde},
    ).execute().data or []
    if categoria_id:
        rows = [r for r in rows if r.get("categoria_id") == categoria_id]
    reponer = [r for r in rows if r.get("estado") == "Reponer"]
    reponer.sort(key=lambda r: (r.get("dias_inventario") if r.get("dias_inventario") is not None else 0))
    return reponer


@router.get("/merma-categorias", summary="Merma en valor por categoría (gráfico)")
async def merma_por_categoria(
    fecha_desde: Optional[str] = Query(None),
    fecha_hasta: Optional[str] = Query(None),
    categoria_id: Optional[str] = Query(None),
    user: CurrentUser = Depends(get_current_user),
):
    """Merma confirmada (tipo='ajuste', motivo='merma') acotada a [fecha_desde, fecha_hasta] y, si se envía, a una categoría."""
    db = get_user_client(user.token)
    desde, hasta = _resolver_rango(fecha_desde, fecha_hasta)
    rows = db.rpc(
        "f_merma_categoria_asof",
        {"p_empresa_id": user.empresa_id, "p_desde": desde, "p_hasta": hasta},
    ).execute().data or []
    if categoria_id:
        rows = [r for r in rows if r.get("categoria_id") == categoria_id]
    return rows


@router.get("/merma-diaria", summary="Evolución diaria de la merma")
async def merma_diaria(
    fecha_desde: Optional[str] = Query(None),
    fecha_hasta: Optional[str] = Query(None),
    categoria_id: Optional[str] = Query(None),
    user: CurrentUser = Depends(get_current_user),
):
    """Evolución diaria de la merma acotada a [fecha_desde, fecha_hasta] y, si se envía, a una categoría."""
    db = get_user_client(user.token)
    desde, hasta = _resolver_rango(fecha_desde, fecha_hasta)
    return db.rpc(
        "f_merma_diaria_asof",
        {"p_empresa_id": user.empresa_id, "p_desde": desde, "p_hasta": hasta, "p_categoria_id": categoria_id},
    ).execute().data or []


@router.get("/stock-posiciones", summary="Stock por posición física (Zona-Rack-Nivel)")
async def stock_posiciones(
    fecha_hasta: Optional[str] = Query(None),
    user: CurrentUser = Depends(get_current_user),
):
    """
    Stock por posición (posicion_id, stock_posicion) calculado a la fecha indicada.
    """
    db = get_user_client(user.token)
    _, hasta = _resolver_rango(None, fecha_hasta)
    return db.rpc(
        "f_stock_por_posicion_asof",
        {"p_empresa_id": user.empresa_id, "p_hasta": hasta},
    ).execute().data or []
