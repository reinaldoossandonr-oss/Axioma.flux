'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { dashboardApi } from '@/lib/api'
import StatsCards from '@/components/dashboard/StatsCards'
import { StockCategoriaChart, SalidasMensualesChart, ValorCategoriaChart, MermaCategoriaChart, MermaDiariaChart } from '@/components/dashboard/Charts'
import { EstadoBadge } from '@/components/ui/Badge'

export default function DashboardPage() {
  const [resumen, setResumen] = useState<any>(null)
  const [stockCat, setStockCat] = useState<any[]>([])
  const [salidas, setSalidas] = useState<any[]>([])
  const [tabla, setTabla] = useState<any[]>([])
  const [alertas, setAlertas] = useState<any[]>([])
  const [mermaCat, setMermaCat] = useState<any[]>([])
  const [mermaDia, setMermaDia] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [r, sc, sl, t, al, mc, md] = await Promise.all([
          dashboardApi.resumen(),
          dashboardApi.stockCategorias(),
          dashboardApi.salidasMensuales(),
          dashboardApi.tablaPrincipal(),
          dashboardApi.alertas(),
          dashboardApi.mermaCategorias(),
          dashboardApi.mermaDiaria(),
        ])
        setResumen(r)
        setStockCat(sc)
        setSalidas(sl)
        setTabla(t)
        setAlertas(al)
        setMermaCat(mc)
        setMermaDia(md)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <PageShell><LoadingSkeleton /></PageShell>

  return (
    <PageShell>
      {/* Stats */}
      {resumen && <StatsCards resumen={resumen} />}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold text-slate-700 mb-4">Stock por Categoría</h3>
          <div className="h-52">
            <StockCategoriaChart data={stockCat} />
          </div>
        </div>
        <div className="card">
          <h3 className="font-semibold text-slate-700 mb-4">Salidas Mensuales (12 meses)</h3>
          <div className="h-52">
            <SalidasMensualesChart data={salidas} />
          </div>
        </div>
      </div>

      {/* Merma: anillo por categoría + evolución diaria */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold text-slate-700 mb-4">Merma en Valor por Categoría</h3>
          <div className="h-64">
            <MermaCategoriaChart data={mermaCat} />
          </div>
        </div>
        <div className="card">
          <h3 className="font-semibold text-slate-700 mb-4">Evolución de la Merma (90 días)</h3>
          <div className="h-64">
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
                  <th className="table-th">SKU</th>
                  <th className="table-th">Producto</th>
                  <th className="table-th text-right">Stock</th>
                  <th className="table-th text-right">Días inv.</th>
                  <th className="table-th text-right">Reponer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {alertas.slice(0, 8).map((p: any) => (
                  <tr key={p.producto_id} className="hover:bg-slate-50">
                    <td className="table-td font-mono text-xs">{p.sku}</td>
                    <td className="table-td">{p.nombre}</td>
                    <td className="table-td text-right">{p.stock_actual?.toFixed(1)}</td>
                    <td className="table-td text-right text-red-500 font-medium">
                      {p.dias_inventario != null ? `${p.dias_inventario.toFixed(0)}d` : '—'}
                    </td>
                    <td className="table-td text-right font-semibold text-red-600">
                      {p.cantidad_reponer?.toFixed(0)}
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
                <th className="table-th">SKU</th>
                <th className="table-th">Producto</th>
                <th className="table-th">Categoría</th>
                <th className="table-th text-right">Stock</th>
                <th className="table-th text-right">CPD</th>
                <th className="table-th text-right">Días inv.</th>
                <th className="table-th">Estado</th>
                <th className="table-th text-right">Reponer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {tabla.slice(0, 20).map((p: any) => (
                <tr key={p.producto_id} className="hover:bg-slate-50 transition-colors">
                  <td className="table-td font-mono text-xs text-slate-500">{p.sku}</td>
                  <td className="table-td font-medium">{p.nombre}</td>
                  <td className="table-td text-slate-500">{p.categoria ?? '—'}</td>
                  <td className="table-td text-right">{p.stock_actual?.toFixed(1)}</td>
                  <td className="table-td text-right text-slate-400 text-xs">
                    {p.consumo_promedio_diario?.toFixed(2)}
                  </td>
                  <td className="table-td text-right">
                    {p.dias_inventario != null ? p.dias_inventario.toFixed(0) : '—'}
                  </td>
                  <td className="table-td">
                    <EstadoBadge estado={p.estado} />
                  </td>
                  <td className="table-td text-right font-medium">
                    {p.cantidad_reponer > 0 ? p.cantidad_reponer.toFixed(0) : '—'}
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

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-slate-800">Dashboard</h1>
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
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 md:gap-4">
        {[1,2,3,4,5].map(i => <div key={i} className="h-24 bg-white rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
        {[1,2].map(i => <div key={i} className="h-52 bg-white rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
        {[1,2].map(i => <div key={i} className="h-64 bg-white rounded-xl" />)}
      </div>
      <div className="h-72 bg-white rounded-xl" />
    </div>
  )
}
