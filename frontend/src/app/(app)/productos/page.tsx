'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { productosApi, categoriasApi } from '@/lib/api'
import { EstadoBadge } from '@/components/ui/Badge'
import { useEmpresaNombre } from '@/lib/useEmpresa'

export default function ProductosPage() {
  const empresaNombre = useEmpresaNombre()
  const [productos, setProductos] = useState<any[]>([])
  const [categorias, setCategorias] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('')

  // ── Subida de imagen por fila ──────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [targetId, setTargetId] = useState<string | null>(null)
  const [subiendoId, setSubiendoId] = useState<string | null>(null)
  const [errorImagen, setErrorImagen] = useState<string | null>(null)

  async function cargar(q?: string, cat?: string, est?: string) {
    setLoading(true)
    setErrorImagen(null)
    try {
      const data = await productosApi.listar({
        q: q || undefined,
        categoria_id: cat || undefined,
        estado: est || undefined,
      })
      setProductos(data)
    } catch (err: any) {
      console.error(err)
      setErrorImagen(err.message || 'No se pudo cargar la lista de productos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargar()
    categoriasApi.listar().then(setCategorias)
  }, [])

  function handleBuscar(e: React.FormEvent) {
    e.preventDefault()
    cargar(busqueda, categoriaFiltro, estadoFiltro)
  }

  function handleClickSubirImagen(productoId: string) {
    setErrorImagen(null)
    setTargetId(productoId)
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite volver a elegir el mismo archivo
    if (!file || !targetId) return

    setSubiendoId(targetId)
    setErrorImagen(null)
    try {
      const url = await productosApi.subirImagen(targetId, file)
      setProductos(prev => prev.map(p => p.producto_id === targetId ? { ...p, imagen_url: url } : p))
    } catch (err: any) {
      setErrorImagen(err.message || 'Error al subir la imagen')
    } finally {
      setSubiendoId(null)
      setTargetId(null)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-slate-800">
            Productos{empresaNombre && <span className="text-slate-400 font-medium"> — {empresaNombre}</span>}
          </h1>
          <p className="text-slate-400 text-sm">{productos.length} productos encontrados</p>
        </div>
        <Link href="/ordenes/nueva" className="btn-primary flex items-center gap-2 text-sm whitespace-nowrap">
          <span className="text-lg font-light leading-none">+</span>
          <span className="hidden sm:inline">Nueva orden</span>
          <span className="sm:hidden">Orden</span>
        </Link>
      </div>

      {/* Filtros */}
      <div className="card">
        <form onSubmit={handleBuscar} className="flex flex-col sm:flex-row flex-wrap gap-3">
          <input
            className="input flex-1 min-w-0"
            placeholder="Buscar por SKU o nombre..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
          <div className="flex gap-2 flex-wrap">
            <select
              className="input flex-1 sm:flex-none sm:w-44"
              value={categoriaFiltro}
              onChange={e => setCategoriaFiltro(e.target.value)}
            >
              <option value="">Todas las categorías</option>
              {categorias.map((c: any) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
            <select
              className="input flex-1 sm:flex-none sm:w-40"
              value={estadoFiltro}
              onChange={e => setEstadoFiltro(e.target.value)}
            >
              <option value="">Todos los estados</option>
              <option value="Óptimo">Óptimo</option>
              <option value="Reponer">Reponer</option>
              <option value="Sin consumo">Sin consumo</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary px-5 flex-1 sm:flex-none">Buscar</button>
            <button
              type="button"
              className="btn-secondary flex-1 sm:flex-none"
              onClick={() => { setBusqueda(''); setCategoriaFiltro(''); setEstadoFiltro(''); cargar() }}
            >
              Limpiar
            </button>
          </div>
        </form>
      </div>

      {/* Input de archivo oculto, compartido por todas las filas */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />

      {errorImagen && (
        <div className="bg-red-50 text-red-600 text-sm rounded-xl px-5 py-3 border border-red-100">
          {errorImagen}
        </div>
      )}

      {/* Tabla */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="table-th w-14">Img</th>
                <th className="table-th">SKU</th>
                <th className="table-th">Producto</th>
                <th className="table-th">Categoría</th>
                <th className="table-th">Unidad</th>
                <th className="table-th text-right">CPP</th>
                <th className="table-th text-right">Stock</th>
                <th className="table-th text-right">CPD</th>
                <th className="table-th text-right">Días</th>
                <th className="table-th">Estado</th>
                <th className="table-th text-right">Reponer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(11)].map((_, j) => (
                      <td key={j} className="table-td">
                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : productos.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-slate-400">
                    No se encontraron productos
                  </td>
                </tr>
              ) : (
                productos.map((p: any) => (
                  <tr key={p.producto_id} className="hover:bg-slate-50 transition-colors">
                    <td className="table-td">
                      <div className="relative group w-10 h-10">
                        {p.imagen_url ? (
                          <img
                            src={p.imagen_url}
                            alt={p.nombre}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300">
                            <ImageIcon />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => handleClickSubirImagen(p.producto_id)}
                          disabled={subiendoId === p.producto_id}
                          title={p.imagen_url ? 'Reemplazar imagen' : 'Subir imagen'}
                          className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {subiendoId === p.producto_id ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <UploadIcon />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="table-td font-mono text-xs text-slate-500">{p.sku}</td>
                    <td className="table-td font-medium text-slate-800">{p.nombre}</td>
                    <td className="table-td text-slate-500">{p.categoria ?? '—'}</td>
                    <td className="table-td text-slate-500">{p.unidad_medida}</td>
                    <td className="table-td text-right text-slate-700">
                      ${p.costo_promedio?.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="table-td text-right font-semibold">
                      {p.stock_actual?.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                    </td>
                    <td className="table-td text-right text-slate-400 text-xs">
                      {p.consumo_promedio_diario?.toLocaleString('es-CL', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                    </td>
                    <td className="table-td text-right">
                      {p.dias_inventario != null ? (
                        <span className={p.dias_inventario < 45 ? 'text-red-500 font-semibold' : 'text-slate-700'}>
                          {p.dias_inventario.toLocaleString('es-CL', { maximumFractionDigits: 0 })}d
                        </span>
                      ) : '—'}
                    </td>
                    <td className="table-td">
                      <EstadoBadge estado={p.estado} />
                    </td>
                    <td className="table-td text-right font-medium text-red-600">
                      {p.cantidad_reponer > 0 ? p.cantidad_reponer.toLocaleString('es-CL', { maximumFractionDigits: 0 }) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ImageIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M4 8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M12 12v9m0-9l-3 3m3-3l3 3" />
    </svg>
  )
}
