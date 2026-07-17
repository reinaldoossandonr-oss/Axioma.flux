'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ubicacionesApi, posicionesApi, categoriasApi, ApiError } from '@/lib/api'
import Visor3D, { ProductoEnPosicion, ModoColor3D, ClaseRotacion, COLOR_VACIO, COLOR_CON_STOCK, COLOR_ROTACION } from '@/components/ubicaciones/Visor3D'
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
  const [clasificacionPorPosicion, setClasificacionPorPosicion] = useState<Record<string, string>>({})
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
  const [filtroRotacion, setFiltroRotacion] = useState<ClaseRotacion[]>([])
  const [modoColor, setModoColor] = useState<ModoColor3D>('ocupacion')
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

  const conteoPosiciones = useMemo(() => {
    const ocupadas = posiciones.filter(p => (stockPorPosicion[p.id] ?? 0) > 0).length
    const libres = posiciones.length - ocupadas
    const unidadesTotales = Object.values(stockPorPosicion).reduce((acc, v) => acc + (v ?? 0), 0)
    return { ocupadas, libres, unidadesTotales }
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
      setClasificacionPorPosicion(
        Object.fromEntries(detalleData.map(d => [d.posicion_id, d.clasificacion_dominante]))
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
    setFiltroRotacion([])
    cargarPosiciones(u.id)
  }

  function toggleFiltroRotacion(clase: ClaseRotacion) {
    setFiltroRotacion(prev =>
      prev.includes(clase) ? prev.filter(c => c !== clase) : [...prev, clase]
    )
  }

  // Al pasar el mouse sobre el visor 3D, OrbitControls captura la rueda del
  // mouse para hacer zoom de la cámara (comportamiento esperado en un visor
  // 3D), lo que le "roba" el scroll a la página. Como el panel 3D ocupa casi
  // toda la pantalla, puede ser difícil encontrar un lugar libre para hacer
  // scroll normal. Este botón baja la página manualmente sin depender de la
  // rueda del mouse.
  function bajarPagina() {
    const contenedor = document.querySelector('main')
    contenedor?.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' })
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
    <div className="p-4 md:p-6 min-h-full flex flex-col gap-4 md:gap-5">
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
          <h2 className="font-bold text-slate-700 mb-4">Nueva ubicación</h2>
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
        {/* Barra horizontal de ubicaciones: chips en vez de sidebar vertical, para no dejar espacio en blanco cuando hay pocas ubicaciones */}
        <div className="card flex-shrink-0">
          <h2 className="font-bold text-slate-700 mb-3">Ubicaciones</h2>
          {loadingUbic ? (
            <div className="flex gap-2 animate-pulse">
              {[1, 2, 3].map(i => <div key={i} className="h-9 w-32 bg-slate-100 rounded-lg flex-shrink-0" />)}
            </div>
          ) : ubicaciones.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">Sin ubicaciones</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {ubicaciones.map(u => (
                <button
                  key={u.id}
                  onClick={() => seleccionar(u)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    seleccionada?.id === u.id
                      ? 'bg-primary text-white'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                  }`}
                >
                  {u.nombre}
                  {u.tipo && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
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

        {/* Posiciones de la ubicación seleccionada — ahora a todo el ancho disponible */}
        <div className="card flex-1 min-h-0 min-w-0 flex flex-col">
          {!seleccionada ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
              Selecciona una ubicación para ver sus posiciones
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between mb-4 flex-wrap gap-3 flex-shrink-0">
                <div className="flex items-center gap-4 flex-wrap">
                  <div>
                    <h2 className="font-bold text-slate-700">
                      Posiciones — {seleccionada.nombre}
                    </h2>
                    <p className="text-xs text-slate-500">Zona-Rack-Nivel</p>
                  </div>

                  {/* Indicadores: misma barra continua (ícono + valor + etiqueta,
                      separados por líneas finas) que usamos en el Dashboard */}
                  {posiciones.length > 0 && (
                    <div className="flex flex-wrap divide-x divide-slate-100 rounded-xl border border-slate-200 bg-white">
                      <IndicadorBarra icon={<IconGrid />} color="text-primary" value={posiciones.length.toLocaleString('es-CL')} label="Posiciones" />
                      <IndicadorBarra icon={<IconGauge />} color="text-amber-500" value={`${tasaOcupacion.toLocaleString('es-CL')}%`} label="Ocupación" />
                      <IndicadorBarra icon={<IconCheck />} color="text-emerald-500" value={conteoPosiciones.ocupadas.toLocaleString('es-CL')} label="Ocupadas" />
                      <IndicadorBarra icon={<IconFrame />} color="text-red-500" value={conteoPosiciones.libres.toLocaleString('es-CL')} label="Libres" />
                      <IndicadorBarra icon={<IconStack />} color="text-cyan-600" value={conteoPosiciones.unidadesTotales.toLocaleString('es-CL')} label="Unidades" />
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
                  <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
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

                    <span className="w-px h-6 bg-slate-200 mx-1 hidden sm:block" />

                    <span className="text-xs font-medium text-slate-500">Rotación:</span>
                    {(['Alta', 'Media', 'Baja'] as ClaseRotacion[]).map(clase => (
                      <button
                        key={clase}
                        type="button"
                        onClick={() => toggleFiltroRotacion(clase)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                          filtroRotacion.includes(clase)
                            ? clase === 'Alta'
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : clase === 'Media'
                                ? 'bg-amber-500 border-amber-500 text-white'
                                : 'bg-red-500 border-red-500 text-white'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {clase}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-medium text-slate-500">Color según:</span>
                    <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-sm">
                      <button
                        onClick={() => setModoColor('ocupacion')}
                        className={`px-3 py-1 rounded-md text-xs transition-colors ${
                          modoColor === 'ocupacion' ? 'bg-white shadow-sm text-slate-800 font-medium' : 'text-slate-500'
                        }`}
                      >
                        Ocupación
                      </button>
                      <button
                        onClick={() => setModoColor('rotacion')}
                        className={`px-3 py-1 rounded-md text-xs transition-colors ${
                          modoColor === 'rotacion' ? 'bg-white shadow-sm text-slate-800 font-medium' : 'text-slate-500'
                        }`}
                      >
                        Rotación
                      </button>
                    </div>

                    {/* Leyenda de colores: varía según el modo de color activo */}
                    <div className="flex items-center gap-3 flex-wrap ml-2">
                      {modoColor === 'ocupacion' ? (
                        <>
                          <LeyendaItem color={COLOR_CON_STOCK} label="Con stock" />
                          <LeyendaItem color={COLOR_VACIO} label="Vacía" />
                        </>
                      ) : (
                        <>
                          <LeyendaItem color={COLOR_ROTACION.Alta} label="Alta" />
                          <LeyendaItem color={COLOR_ROTACION.Media} label="Media" />
                          <LeyendaItem color={COLOR_ROTACION.Baja} label="Baja" />
                          <LeyendaItem color={COLOR_ROTACION['Sin datos']} label="Sin datos" />
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-h-0">
                    <Visor3D
                      disenoUrl={seleccionada.diseno_3d_url}
                      posiciones={posiciones}
                      stockPorPosicion={stockPorPosicion}
                      detallePorPosicion={detallePorPosicion}
                      clasificacionPorPosicion={clasificacionPorPosicion}
                      modoColor={modoColor}
                      filtroSku={filtroSku}
                      filtroNombre={filtroNombre}
                      filtroCategoriaId={filtroCategoriaId}
                      filtroRotacion={filtroRotacion}
                    />
                  </div>
                  <p className="text-xs text-slate-500 flex-shrink-0">
                    Pasa el mouse sobre una posición para ver su contenido. Las posiciones que no coinciden con un
                    filtro activo se ocultan por completo. Los nombres de los objetos del
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

      {/* Botón flotante para bajar la página: el visor 3D captura la rueda
          del mouse para hacer zoom, así que el scroll normal no siempre
          funciona sobre él. */}
      {vista === '3d' && seleccionada?.diseno_3d_url && (
        <button
          type="button"
          onClick={bajarPagina}
          title="Bajar para ver el resto del diseño 3D"
          aria-label="Bajar para ver el resto del diseño 3D"
          className="fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full bg-slate-900/90 hover:bg-slate-900 text-white shadow-lg flex items-center justify-center transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      )}
    </div>
  )
}

function LeyendaItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}

function IndicadorBarra({
  icon,
  color,
  value,
  label,
}: {
  icon: React.ReactNode
  color: string
  value: string
  label: string
}) {
  return (
    <div className="flex items-center gap-2.5 px-3.5 py-2 min-w-0">
      <div className={`flex-shrink-0 ${color}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-base font-bold text-slate-800 leading-none truncate">{value}</p>
        <p className="text-xs text-slate-500 mt-1 leading-none truncate">{label}</p>
      </div>
    </div>
  )
}

function IconGrid() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <rect x="3" y="3" width="7" height="7" rx="1.2" strokeWidth={2} />
      <rect x="14" y="3" width="7" height="7" rx="1.2" strokeWidth={2} />
      <rect x="3" y="14" width="7" height="7" rx="1.2" strokeWidth={2} />
      <rect x="14" y="14" width="7" height="7" rx="1.2" strokeWidth={2} />
    </svg>
  )
}
function IconGauge() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 21V10l9-6 9 6v11h-6v-7H9v7H3z" />
    </svg>
  )
}
function IconCheck() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
function IconFrame() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 8V6a2 2 0 012-2h2M4 16v2a2 2 0 002 2h2m8-16h2a2 2 0 012 2v2m-4 12h2a2 2 0 002-2v-2" />
    </svg>
  )
}
function IconStack() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}
