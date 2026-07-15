'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { dashboardApi, categoriasApi, RangoFechas } from '@/lib/api'
import { useEmpresaNombre } from '@/lib/useEmpresa'
import StatsCards from '@/components/dashboard/StatsCards'
import { StockCategoriaChart, SalidasMensualesChart, ValorCategoriaChart, MermaCategoriaChart, MermaDiariaChart, SkuPorClasificacionChart } from '@/components/dashboard/Charts'
import { EstadoBadge, ClasificacionBadge } from '@/components/ui/Badge'

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function rangoPorDefecto(): { desde: string; hasta: string } {
  const hasta = new Date()
  const desde = new Date()
  desde.setDate(desde.getDate() - 90)
  return { desde: toISODate(desde), hasta: toISODate(hasta) }
}

export default function DashboardPage() {
  const empresaNombre = useEmpresaNombre()
  const defaultRango = rangoPorDefecto()
  const [fechaDesde, setFechaDesde] = useState(defaultRango.desde)
  const [fechaHasta, setFechaHasta] = useState(defaultRango.hasta)
  const [categoriaId, setCategoriaId] = useState('')
  const [categorias, setCategorias] = useState<any[]>([])
  const [resumen, setResumen] = useState<any>(null)
  const [stockCat, setStockCat] = useState<any[]>([])
  const [salidas, setSalidas] = useState<any[]>([])
  const [tabla, setTabla] = useState<any[]>([])
  const [alertas, setAlertas] = useState<any[]>([])
  const [mermaCat, setMermaCat] = useState<any[]>([])
  const [mermaDia, setMermaDia] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refrescando, setRefrescando] = useState(false)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)

  function aplicarPreset(dias: number | null) {
    const hasta = new Date()
    if (dias === null) {
      // "Todo": desde el inicio de operación de la empresa
      setFechaDesde('2000-01-01')
    } else {
      const desde = new Date()
      desde.setDate(desde.getDate() - dias)
      setFechaDesde(toISODate(desde))
    }
    setFechaHasta(toISODate(hasta))
  }

  useEffect(() => {
    categoriasApi.listar().then(setCategorias).catch(() => setCategorias([]))
  }, [])

  useEffect(() => {
    async function load() {
      const rango: RangoFechas = {
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
        categoria_id: categoriaId || undefined,
      }
      // Promise.allSettled en vez de Promise.all: si UNA llamada falla
      // (ej. un endpoint nuevo, una vista que cambió), las demás igual
      // se muestran en vez de dejar todo el dashboard en blanco.
      const [r, sc, sl, t, al, mc, md] = await Promise.allSettled([
        dashboardApi.resumen(rango),
        dashboardApi.stockCategorias(rango),
        dashboardApi.salidasMensuales(rango),
        dashboardApi.tablaPrincipal(rango),
        dashboardApi.alertas(rango),
        dashboardApi.mermaCategorias(rango),
        dashboardApi.mermaDiaria(rango),
      ])

      const fallidas: string[] = []
      if (r.status === 'fulfilled') setResumen(r.value); else fallidas.push('resumen')
      if (sc.status === 'fulfilled') setStockCat(sc.value); else fallidas.push('stock por categoría')
      if (sl.status === 'fulfilled') setSalidas(sl.value); else fallidas.push('salidas mensuales')
      if (t.status === 'fulfilled') setTabla(t.value); else fallidas.push('inventario general')
      if (al.status === 'fulfilled') setAlertas(al.value); else fallidas.push('alertas de reposición')
      if (mc.status === 'fulfilled') setMermaCat(mc.value); else fallidas.push('merma por categoría')
      if (md.status === 'fulfilled') setMermaDia(md.value); else fallidas.push('evolución de merma')

      if (fallidas.length > 0) {
        console.error('Fallaron estas secciones del dashboard:', fallidas,
          { r, sc, sl, t, al, mc, md })
        setErrorCarga(`No se pudo cargar: ${fallidas.join(', ')}. Revisa la consola para más detalle.`)
      } else {
        setErrorCarga(null)
      }

      setLoading(false)
      setRefrescando(false)
    }
    setRefrescando(true)
    load()
  }, [fechaDesde, fechaHasta, categoriaId])

  if (loading) return <PageShell empresaNombre={empresaNombre}><LoadingSkeleton /></PageShell>

  return (
    <PageShell empresaNombre={empresaNombre}>
      {/* Filtro de periodo + categoría — afecta todos los indicadores, gráficos y tablas de esta página */}
      <div className="card p-2.5 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Periodo:</span>
        <input
          type="date"
          value={fechaDesde}
          max={fechaHasta}
          onChange={e => setFechaDesde(e.target.value)}
          className="input text-xs py-1 px-2 w-auto"
        />
        <span className="text-slate-400 text-xs">a</span>
        <input
          type="date"
          value={fechaHasta}
          min={fechaDesde}
          max={toISODate(new Date())}
          onChange={e => setFechaHasta(e.target.value)}
          className="input text-xs py-1 px-2 w-auto"
        />

        <span className="w-px h-4 bg-slate-200 mx-1" />

        <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Categoría:</span>
        <select
          value={categoriaId}
          onChange={e => setCategoriaId(e.target.value)}
          className="input text-xs py-1 px-2 w-auto"
        >
          <option value="">Todas</option>
          {categorias.map((c: any) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>

        <div className="flex items-center gap-1 ml-auto flex-wrap">
          <button onClick={() => aplicarPreset(30)} className="px-2 py-1 rounded-lg text-[11px] font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors">
            30 días
          </button>
          <button onClick={() => aplicarPreset(90)} className="px-2 py-1 rounded-lg text-[11px] font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors">
            90 días
          </button>
          <button onClick={() => aplicarPreset(365)} className="px-2 py-1 rounded-lg text-[11px] font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors">
            Último año
          </button>
          <button onClick={() => aplicarPreset(null)} className="px-2 py-1 rounded-lg text-[11px] font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors">
            Todo
          </button>
          {refrescando && <span className="text-[11px] text-slate-400 ml-1">Actualizando…</span>}
        </div>
      </div>

      {errorCarga && (
        <div className="bg-amber-50 text-amber-700 text-sm rounded-xl px-5 py-3 border border-amber-200">
          {errorCarga}
        </div>
      )}

      {/* Stats */}
      {resumen && <StatsCards resumen={resumen} />}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Stock por categoría</h3>
          <div className="h-40">
            <StockCategoriaChart data={stockCat} />
          </div>
        </div>
        <div className="card p-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Salidas de inventario</h3>
          <div className="h-40">
            <SalidasMensualesChart data={salidas} />
          </div>
        </div>
      </div>

      {/* SKUs por rotación + merma: anillo por categoría + evolución diaria */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">SKUs por calificación</h3>
          <div className="h-48">
            <SkuPorClasificacionChart data={tabla} />
          </div>
        </div>
        <div className="card p-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Merma en valor por categoría</h3>
          <div className="h-48">
            <MermaCategoriaChart data={mermaCat} />
          </div>
        </div>
        <div className="card p-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Evolución de la merma</h3>
          <div className="h-48">
            <MermaDiariaChart data={mermaDia} />
          </div>
        </div>
      </div>

      {/* Alertas de reposición */}
      {alertas.length > 0 && (
        <div className="card border-l-4 border-l-red-400">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
              Productos a Reponer ({alertas.length})
            </h3>
            <Link href="/productos?estado=Reponer" className="text-xs text-primary hover:underline">
              Ver todos →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="table-th text-center">SKU</th>
                  <th className="table-th text-center">Producto</th>
                  <th className="table-th text-center">Stock</th>
                  <th className="table-th text-center">Días inv.</th>
                  <th className="table-th text-center">Reponer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {alertas.slice(0, 8).map((p: any) => (
                  <tr key={p.producto_id} className="hover:bg-slate-50">
                    <td className="table-td text-center font-mono text-xs">{p.sku}</td>
                    <td className="table-td text-center">{p.nombre}</td>
                    <td className="table-td text-center">
                      {p.stock_actual?.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                    </td>
                    <td className="table-td text-center text-red-500 font-medium">
                      {p.dias_inventario != null ? `${p.dias_inventario.toLocaleString('es-CL', { maximumFractionDigits: 0 })}d` : '—'}
                    </td>
                    <td className="table-td text-center font-semibold text-red-600">
                      {p.cantidad_reponer?.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tabla principal */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-700">Inventario General</h3>
          <Link href="/productos" className="btn-primary text-sm py-1.5 px-3">
            Gestionar productos
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-100">
                <th className="table-th text-center w-12">Img</th>
                <th className="table-th text-center">SKU</th>
                <th className="table-th text-center">Producto</th>
                <th className="table-th text-center">Categoría</th>
                <th className="table-th text-center">Stock</th>
                <th className="table-th text-center">CPD</th>
                <th className="table-th text-center">Rotación</th>
                <th className="table-th text-center">Clasificación</th>
                <th className="table-th text-center">Días inv.</th>
                <th className="table-th text-center">Estado</th>
                <th className="table-th text-center">Reponer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {tabla.slice(0, 20).map((p: any) => (
                <tr key={p.producto_id} className="hover:bg-slate-50 transition-colors">
                  <td className="table-td text-center">
                    {p.imagen_url ? (
                      <img
                        src={p.imagen_url}
                        alt={p.nombre}
                        className="w-8 h-8 rounded-lg object-cover border border-slate-200 inline-block"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300 mx-auto">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M4 8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </td>
                  <td className="table-td text-center font-mono text-xs text-slate-500">{p.sku}</td>
                  <td className="table-td text-center font-medium">{p.nombre}</td>
                  <td className="table-td text-center text-slate-500">{p.categoria ?? '—'}</td>
                  <td className="table-td text-center">
                    {p.stock_actual?.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </td>
                  <td className="table-td text-center text-slate-400 text-xs">
                    {p.consumo_promedio_diario?.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="table-td text-center font-medium">
                    {p.rotacion != null ? p.rotacion.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                  </td>
                  <td className="table-td text-center">
                    <ClasificacionBadge clasificacion={p.clasificacion} />
                  </td>
                  <td className="table-td text-center">
                    {p.dias_inventario != null ? p.dias_inventario.toLocaleString('es-CL', { maximumFractionDigits: 0 }) : '—'}
                  </td>
                  <td className="table-td text-center">
                    <EstadoBadge estado={p.estado} />
                  </td>
                  <td className="table-td text-center font-medium">
                    {p.cantidad_reponer > 0 ? p.cantidad_reponer.toLocaleString('es-CL', { maximumFractionDigits: 0 }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tabla.length > 20 && (
            <p className="text-center text-sm text-slate-400 py-3">
              Mostrando 20 de {tabla.length} productos.{' '}
              <Link href="/productos" className="text-primary hover:underline">Ver todos</Link>
            </p>
          )}
        </div>
      </div>
    </PageShell>
  )
}

function PageShell({ children, empresaNombre }: { children: React.ReactNode; empresaNombre?: string | null }) {
  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-slate-800">
            Dashboard{empresaNombre && <span className="text-slate-400 font-medium"> — {empresaNombre}</span>}
          </h1>
          <p className="text-slate-400 text-sm hidden sm:block">Resumen de inventario en tiempo real</p>
        </div>
        <Link href="/ordenes/nueva" className="btn-primary flex items-center gap-2 text-sm whitespace-nowrap">
          <span className="text-lg font-light leading-none">+</span>
          <span className="hidden sm:inline">Nueva orden</span>
          <span className="sm:hidden">Orden</span>
        </Link>
      </div>
      {children}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 md:space-y-5 animate-pulse">
      <div className="grid grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7 gap-3 md:gap-4">
        {[1,2,3,4,5,6,7].map(i => <div key={i} className="h-24 bg-white rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
        {[1,2].map(i => <div key={i} className="h-40 bg-white rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
        {[1,2,3].map(i => <div key={i} className="h-48 bg-white rounded-xl" />)}
      </div>
      <div className="h-72 bg-white rounded-xl" />
    </div>
  )
}
