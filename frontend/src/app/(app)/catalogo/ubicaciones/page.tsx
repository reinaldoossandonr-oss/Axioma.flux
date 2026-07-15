'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ubicacionesApi, posicionesApi, categoriasApi, ApiError } from '@/lib/api'
import Visor3D, { ProductoEnPosicion } from '@/components/ubicaciones/Visor3D'
import { useEmpresaNombre } from '@/lib/useEmpresa'

interface Categoria {
  id: string
  nombre: string
}

interface Ubicacion {
  id: string
  nombre: string
  tipo?: string
  descripcion?: string
  diseno_3d_url?: string
  activo: boolean
}

interface Posicion {
  id: string
  codigo: string
  zona: string
  rack: string
  nivel: string
  capacidad_maxima?: number
  activo: boolean
}

export default function UbicacionesPage() {
  const empresaNombre = useEmpresaNombre()
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([])
  const [seleccionada, setSeleccionada] = useState<Ubicacion | null>(null)
  const [posiciones, setPosiciones] = useState<Posicion[]>([])
  const [stockPorPosicion, setStockPorPosicion] = useState<Record<string, number>>({})
  const [detallePorPosicion, setDetallePorPosicion] = useState<Record<string, ProductoEnPosicion[]>>({})
  const [loadingUbic, setLoadingUbic] = useState(true)
  const [loadingPos, setLoadingPos] = useState(false)
  const [formUbic, setFormUbic] = useState({ nombre: '', tipo: 'almacen', descripcion: '' })
  const [guardandoUbic, setGuardandoUbic] = useState(false)
  const [errorUbic, setErrorUbic] = useState<string | null>(null)
  const [mostrarFormUbic, setMostrarFormUbic] = useState(false)

  // Visor 3D
  const [vista, setVista] = useState<'tabla' | '3d'>('tabla')
  const [subiendoDiseno, setSubiendoDiseno] = useState(false)
  const [errorDiseno, setErrorDiseno] = useState<string | null>(null)
  const [filtroSku, setFiltroSku] = useState('')
  const [filtroNombre, setFiltroNombre] = useState('')
  const [filtroCategoriaId, setFiltroCategoriaId] = useState('')
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const disenoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    categoriasApi.listar().then(setCategorias).catch(() => setCategorias([]))
  }, [])

  const tasaOcupacion = useMemo(() => {
    if (posiciones.length === 0) return 0
    const ocupadas = posiciones.filter(p => (stockPorPosicion[p.id] ?? 0) > 0).length
    return Math.round((ocupadas / posiciones.length) * 1000) / 10
  }, [posiciones, stockPorPosicion])

  async function cargarUbicaciones() {
    try {
      const data = await ubicacionesApi.listar()
      setUbicaciones(data)
      return data as Ubicacion[]
    } finally {
      setLoadingUbic(false)
    }
  }

  async function cargarPosiciones(ubicId: string) {
    setLoadingPos(true)
    try {
      const [posicionesData, stockData, detalleData] = await Promise.all([
        ubicacionesApi.posiciones(ubicId),
        ubicacionesApi.stockPosiciones(ubicId).catch(() => []),
        ubicacionesApi.stockPosicionesDetalle(ubicId).catch(() => []),
      ])
      setPosiciones(posicionesData)
      setStockPorPosicion(
        Object.fromEntries(stockData.map(s => [s.posicion_id, s.stock_total]))
      )
      setDetallePorPosicion(
        Object.fromEntries(detalleData.map(d => [d.posicion_id, d.productos]))
      )
    } finally {
      setLoadingPos(false)
    }
  }

  useEffect(() => { cargarUbicaciones() }, [])

  function seleccionar(u: Ubicacion) {
    setSeleccionada(u)
    setVista('tabla')
    setFiltroSku('')
    setFiltroNombre('')
    setFiltroCategoriaId('')
    cargarPosiciones(u.id)
  }

  function handleClickSubirDiseno() {
    setErrorDiseno(null)
    disenoInputRef.current?.click()
  }

  async function handleDisenoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !seleccionada) return

    setSubiendoDiseno(true)
    setErrorDiseno(null)
    try {
      const disenoUrl = await ubicacionesApi.subirDiseno3D(seleccionada.id, file)
      setSeleccionada(prev => (prev ? { ...prev, diseno_3d_url: disenoUrl } : prev))
      setUbicaciones(prev => prev.map(u => (u.id === seleccionada.id ? { ...u, diseno_3d_url: disenoUrl } : u)))
      setVista('3d')
    } catch (err) {
      setErrorDiseno(err instanceof ApiError ? err.message : 'No se pudo subir el diseño 3D')
    } finally {
      setSubiendoDiseno(false)
    }
  }

  async function handleCrearUbicacion(e: React.FormEvent) {
    e.preventDefault()
    if (!formUbic.nombre.trim()) return
    setGuardandoUbic(true)
    setErrorUbic(null)
    try {
      await ubicacionesApi.crear({
        nombre: formUbic.nombre.trim(),
        tipo: formUbic.tipo,
        descripcion: formUbic.descripcion.trim() || null,
      })
      setFormUbic({ nombre: '', tipo: 'almacen', descripcion: '' })
      setMostrarFormUbic(false)
      cargarUbicaciones()
    } catch (e: any) {
      setErrorUbic(e.message)
    } finally {
      setGuardandoUbic(false)
    }
  }

  const TIPOS = ['almacen', 'bodega', 'planta', 'tienda', 'externo']

  return (
    <div className="p-4 md:p-6 h-full flex flex-col gap-4 md:gap-5 overflow-hidden">
      <div className="flex items-center justify-between gap-3 flex-shrink-0">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-slate-800">
            Ubicaciones{empresaNombre && <span className="text-slate-400 font-medium"> — {empresaNombre}</span>}
          </h1>
          <p className="text-slate-400 text-sm hidden sm:block">Bodegas, almacenes y sus posiciones (Zona-Rack-Nivel)</p>
        </div>
        <button
          onClick={() => setMostrarFormUbic(v => !v)}
          className="btn-primary flex items-center gap-2 text-sm whitespace-nowrap"
        >
          <span className="text-lg font-light leading-none">+</span>
          <span className="hidden sm:inline">Nueva ubicación</span>
          <span className="sm:hidden">Nueva</span>
        </button>
      </div>

      {/* Form nueva ubicación */}
      {mostrarFormUbic && (
        <div className="card flex-shrink-0">
          <h2 className="font-semibold text-slate-700 mb-4">Nueva ubicación</h2>
          <form onSubmit={handleCrearUbicacion} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Nombre *</label>
                <input
                  className="input w-full"
                  placeholder="Ej: Bodega Central"
                  value={formUbic.nombre}
                  onChange={e => setFormUbic(f => ({ ...f, nombre: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Tipo</label>
                <select
                  className="input w-full"
                  value={formUbic.tipo}
                  onChange={e => setFormUbic(f => ({ ...f, tipo: e.target.value }))}
                >
                  {TIPOS.map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Descripción</label>
                <input
                  className="input w-full"
                  placeholder="Opcional"
                  value={formUbic.descripcion}
                  onChange={e => setFormUbic(f => ({ ...f, descripcion: e.target.value }))}
                />
              </div>
            </div>
            {errorUbic && <p className="text-red-500 text-sm">{errorUbic}</p>}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setMostrarFormUbic(false)}
                className="px-4 py-2 rounded-lg text-sm text-slate-500 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button type="submit" disabled={guardandoUbic} className="btn-primary px-5">
                {guardandoUbic ? 'Guardando...' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex-1 min-h-0 flex flex-col gap-4 md:gap-5">
        {/* Lista horizontal de ubicaciones */}
        <div className="card flex-shrink-0">
          <h2 className="font-semibold text-slate-700 mb-3">Ubicaciones</h2>
          {loadingUbic ? (
            <div className="flex gap-2 animate-pulse">
              {[1, 2, 3].map(i => <div key={i} className="h-10 w-40 bg-slate-100 rounded-lg flex-shrink-0" />)}
            </div>
          ) : ubicaciones.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">Sin ubicaciones</p>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {ubicaciones.map(u => (
                <button
                  key={u.id}
                  onClick={() => seleccionar(u)}
                  className={`flex-shrink-0 text-left px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                    seleccionada?.id === u.id
                      ? 'bg-primary text-white'
                      : 'hover:bg-slate-50 text-slate-700 border border-slate-200'
                  }`}
                >
                  <span className="font-medium">{u.nombre}</span>
                  {u.tipo && (
                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                      seleccionada?.id === u.id
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {u.tipo}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Posiciones de la ubicación seleccionada — usa todo el ancho para que el visor 3D tenga más espacio */}
        <div className="card flex-1 min-h-0 flex flex-col">
          {!seleccionada ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
              Selecciona una ubicación para ver sus posiciones
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between mb-4 flex-wrap gap-3 flex-shrink-0">
                <div className="flex items-center gap-4 flex-wrap">
                  <div>
                    <h2 className="font-semibold text-slate-700">
                      Posiciones — {seleccionada.nombre}
                    </h2>
                    <p className="text-xs text-slate-400">Zona-Rack-Nivel</p>
                  </div>

                  {/* Indicadores grandes: Posiciones y Ocupación */}
                  {posiciones.length > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-2 min-w-[110px]">
                        <p className="text-2xl md:text-3xl font-bold text-slate-800 leading-none">
                          {posiciones.length.toLocaleString('es-CL')}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">Posiciones</p>
                      </div>
                      <div className="rounded-xl bg-sky-50 border border-sky-200 px-4 py-2 min-w-[110px]">
                        <p className="text-2xl md:text-3xl font-bold text-sky-700 leading-none">
                          {tasaOcupacion.toLocaleString('es-CL')}%
                        </p>
                        <p className="text-xs text-sky-600 mt-1">Ocupación</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {seleccionada.diseno_3d_url && (
                    <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-sm">
                      <button
                        onClick={() => setVista('tabla')}
                        className={`px-3 py-1.5 rounded-md transition-colors ${
                          vista === 'tabla' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'
                        }`}
                      >
                        Tabla
                      </button>
                      <button
                        onClick={() => setVista('3d')}
                        className={`px-3 py-1.5 rounded-md transition-colors ${
                          vista === '3d' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'
                        }`}
                      >
                        Vista 3D
                      </button>
                    </div>
                  )}

                  <input
                    ref={disenoInputRef}
                    type="file"
                    accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
                    className="hidden"
                    onChange={handleDisenoFileChange}
                  />
                  <button
                    onClick={handleClickSubirDiseno}
                    disabled={subiendoDiseno}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    {subiendoDiseno
                      ? 'Subiendo…'
                      : seleccionada.diseno_3d_url
                        ? 'Reemplazar diseño 3D'
                        : 'Subir diseño 3D'}
                  </button>
                </div>
              </div>

              {errorDiseno && (
                <p className="text-red-500 text-sm mb-3 flex-shrink-0">{errorDiseno}</p>
              )}

              {loadingPos ? (
                <div className="space-y-2 animate-pulse flex-shrink-0">
                  {[1, 2, 3, 4].map(i => <div key={i} className="h-8 bg-slate-100 rounded" />)}
                </div>
              ) : posiciones.length === 0 ? (
                <div className="text-center py-12 text-slate-400 flex-shrink-0">
                  <p className="text-3xl mb-2">📦</p>
                  <p className="text-sm">Esta ubicación no tiene posiciones registradas</p>
                </div>
              ) : vista === '3d' && seleccionada.diseno_3d_url ? (
                <div className="flex-1 min-h-0 flex flex-col gap-3">
                  <div className="flex flex-wrap gap-2 flex-shrink-0">
                    <input
                      type="text"
                      value={filtroSku}
                      onChange={e => setFiltroSku(e.target.value)}
                      placeholder="Filtrar / resaltar por SKU…"
                      className="input w-full sm:w-56 text-sm"
                    />
                    <input
                      type="text"
                      value={filtroNombre}
                      onChange={e => setFiltroNombre(e.target.value)}
                      placeholder="Filtrar por nombre de producto…"
                      className="input w-full sm:w-64 text-sm"
                    />
                    <select
                      value={filtroCategoriaId}
                      onChange={e => setFiltroCategoriaId(e.target.value)}
                      className="input w-full sm:w-56 text-sm"
                    >
                      <option value="">Todas las categorías</option>
                      {categorias.map(c => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 min-h-0">
                    <Visor3D
                      disenoUrl={seleccionada.diseno_3d_url}
                      posiciones={posiciones}
                      stockPorPosicion={stockPorPosicion}
                      detallePorPosicion={detallePorPosicion}
                      filtroSku={filtroSku}
                      filtroNombre={filtroNombre}
                      filtroCategoriaId={filtroCategoriaId}
                    />
                  </div>
                  <p className="text-xs text-slate-400 flex-shrink-0">
                    Pasa el mouse sobre una posición para ver su contenido. Los nombres de los objetos del
                    modelo 3D deben coincidir con el código de posición (ej: A-1-1) para el emparejamiento automático.
                  </p>
                </div>
              ) : (
                <div className="flex-1 min-h-0 overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-y border-slate-100">
                        <th className="table-th">Código</th>
                        <th className="table-th">Zona</th>
                        <th className="table-th">Rack</th>
                        <th className="table-th">Nivel</th>
                        <th className="table-th text-right">Unidades</th>
                        <th className="table-th text-right">Capacidad</th>
                        <th className="table-th">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {posiciones.map(pos => (
                        <tr key={pos.id} className="hover:bg-slate-50 transition-colors">
                          <td className="table-td font-mono text-xs font-semibold text-slate-700">
                            {pos.codigo}
                          </td>
                          <td className="table-td text-slate-500">{pos.zona}</td>
                          <td className="table-td text-slate-500">{pos.rack}</td>
                          <td className="table-td text-slate-500">{pos.nivel}</td>
                          <td className="table-td text-right font-semibold text-slate-700">
                            {(stockPorPosicion[pos.id] ?? 0).toLocaleString('es-CL')}
                          </td>
                          <td className="table-td text-right text-slate-500">
                            {pos.capacidad_maxima != null ? pos.capacidad_maxima.toLocaleString('es-CL') : '∞'}
                          </td>
                          <td className="table-td">
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                              pos.activo
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}>
                              {pos.activo ? 'Activa' : 'Inactiva'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
