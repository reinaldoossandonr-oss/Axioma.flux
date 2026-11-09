'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AxiomaIcon from '@/components/ui/AxiomaIcon'
import './login.css'

const IMAGE_URL = '/hero-login.jpg'

// Recorrido de picking que se dibuja sobre la foto (pasillos de una bodega vista desde arriba)
const CAMINO = 'M540 110 L540 175 L130 175 L130 295 L470 295 L470 415 L200 415 L200 475 L540 475 L540 110'
const RACKS = [145, 205, 265, 325, 385, 445, 505]
const PARADAS: [number, number][] = [[380, 175], [200, 295], [430, 415], [330, 475]]
// Vitrina del login: lo que hace Flux por dentro (algoritmo de rutas, optimizador e IA)
const CAPACIDADES = [
  { id: 'rutas', pestana: 'Rutas de picking', titulo: 'Un algoritmo traza la ruta más corta',
    texto: 'Agrupa los pedidos que comparten zonas en lotes de picking y ordena las paradas para recorrer cada pasillo una sola vez.' },
  { id: 'espacio', pestana: 'Optimizador de espacio', titulo: 'Lo que más se vende, más cerca del despacho',
    texto: 'Cruza la demanda de 90 días con la distancia real a pie de cada posición y propone qué acercar y qué llevar al fondo.' },
  { id: 'ia', pestana: 'IA aplicada', titulo: 'Pregunta a tu bodega como a tu jefe de almacén',
    texto: 'La IA entiende la pregunta y Flux resalta la respuesta en la bodega 3D. El stock, las ventas y los clientes no salen de tu navegador.' },
]
const ZONAS = [
  { z: 'A', nombre: 'Zona A · junto al despacho', alta: 82, media: 12, baja: 6 },
  { z: 'B', nombre: 'Zona B · media', alta: 34, media: 48, baja: 18 },
  { z: 'C', nombre: 'Zona C · fondo', alta: 6, media: 30, baja: 64 },
]

function sinMovimiento() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/** Onda que nace donde se pulsa el botón */
function onda(e: React.PointerEvent<HTMLButtonElement>) {
  if (sinMovimiento()) return
  const b = e.currentTarget, r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2.2
  const s = document.createElement('span')
  s.className = 'lg-onda'
  s.style.width = s.style.height = d + 'px'
  s.style.left = e.clientX - r.left + 'px'
  s.style.top = e.clientY - r.top + 'px'
  b.appendChild(s)
  setTimeout(() => s.remove(), 700)
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [ok, setOk] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tiembla, setTiembla] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [cortina, setCortina] = useState<{ x: number; y: number } | null>(null)
  const [activa, setActiva] = useState(0)
  const [pausa, setPausa] = useState(false)

  // La vitrina avanza sola cada 7 s; se detiene al pasar el ratón, con el foco o si el sistema pide menos movimiento
  useEffect(() => {
    if (pausa || sinMovimiento()) return
    const t = setTimeout(() => setActiva((n) => (n + 1) % CAPACIDADES.length), 7000)
    return () => clearTimeout(t)
  }, [activa, pausa])

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const boton = e.currentTarget.querySelector('button[type=submit]') as HTMLButtonElement | null
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Credenciales incorrectas. Verifica tu email y contraseña.')
      setTiembla((n) => n + 1)
      setLoading(false)
      return
    }
    // Éxito: el botón confirma y una cortina circular sale desde él hacia el panel
    setOk(true)
    if (sinMovimiento()) { window.location.href = '/app'; return }
    const r = boton?.getBoundingClientRect()
    setTimeout(() => setCortina({ x: r ? r.left + r.width / 2 : window.innerWidth / 2, y: r ? r.top + r.height / 2 : window.innerHeight / 2 }), 450)
    setTimeout(() => { window.location.href = '/app' }, 1150)   // recarga completa: el panel usa sus propios estilos
  }

  return (
    <div className="min-h-screen flex bg-slate-50">

      {/* ── Panel izquierdo: foto + ruta de picking animada ── */}
      <div className="hidden lg:flex lg:w-[58%] relative overflow-hidden flex-col justify-between">

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={IMAGE_URL} alt="" className="lg-foto absolute inset-0 w-full h-full object-cover object-center" />

        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(90deg, rgba(7,13,26,0.94) 0%, rgba(7,13,26,0.82) 42%, rgba(10,22,40,0.55) 75%, rgba(10,22,40,0.45) 100%)' }} />

        <svg className={`lg-plano modo-${CAPACIDADES[activa].id}`} viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          {RACKS.map((y) => (
            <g key={y}>
              <rect className="rk" x="90" y={y - 9} width="190" height="18" rx="3" />
              <rect className="rk" x="320" y={y - 9} width="190" height="18" rx="3" />
            </g>
          ))}
          {/* Zonas por distancia al despacho (se ven con el optimizador) */}
          <g className="zonas">
            <rect className="zA" x="80" y="150" width="450" height="80" rx="8" />
            <rect className="zB" x="80" y="250" width="450" height="140" rx="8" />
            <rect className="zC" x="80" y="410" width="450" height="110" rx="8" />
          </g>
          <path className="ruta" d={CAMINO} />
          {PARADAS.map(([x, y]) => <circle key={x + '-' + y} className="parada" cx={x} cy={y} r="5" />)}
          <rect x="522" y="90" width="36" height="22" rx="5" fill="#16A34A" opacity=".9" />
          <circle className="foco" cx="200" cy="295" r="16" />
          <circle className="punto" r="5">
            <animateMotion dur="7s" begin="2s" repeatCount="indefinite" path={CAMINO} />
          </circle>
        </svg>

        <div className="absolute right-0 top-0 bottom-0 w-px"
          style={{ background: 'linear-gradient(to bottom, transparent, #1AABF0 40%, #1AABF0 60%, transparent)' }} />

        {/* Logo */}
        <div className="relative z-10 px-14 py-10 lg-entra lg-d1">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, #1AABF0, #0891B2)' }}>
              <AxiomaIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none tracking-wide">Axioma Flux</p>
              <p className="text-xs leading-none mt-0.5 font-medium" style={{ color: '#1AABF0' }}>Inventory OS</p>
            </div>
          </div>
        </div>

        {/* Mensaje + vitrina de capacidades */}
        <div className="relative z-10 flex-1 flex flex-col items-start justify-center text-left px-14 pb-16 lg-izq">
          <div className="lg-entra lg-d2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-5"
            style={{ background: 'rgba(26,171,240,0.15)', border: '1px solid rgba(26,171,240,0.3)', color: '#38BDF8' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Inventario y centros de distribución, con IA
          </div>

          <span className="lg-entra lg-d3 lg-acento" aria-hidden="true" />
          <h2 className="lg-entra lg-d3 lg-titular text-white font-bold mb-7">
            Cada producto en su lugar,<br />
            <span style={{ color: '#1AABF0' }}>cada pedido en su ruta</span>
          </h2>

          <div className="lg-vitrina lg-entra lg-d4" onMouseEnter={() => setPausa(true)} onMouseLeave={() => setPausa(false)}
            onFocus={() => setPausa(true)} onBlur={() => setPausa(false)}>
            <div className="lg-pestanas" role="tablist" aria-label="Qué hace Axioma Flux">
              {CAPACIDADES.map((c, i) => (
                <button key={c.id} type="button" role="tab" id={`lg-tab-${c.id}`} aria-selected={activa === i} aria-controls="lg-vit-panel"
                  className={activa === i ? 'on' : ''} onClick={() => setActiva(i)}>
                  {c.pestana}
                  {activa === i && !pausa && <i key={activa} className="lg-progreso" aria-hidden="true" />}
                </button>
              ))}
            </div>
            <div className="lg-vit-panel" role="tabpanel" id="lg-vit-panel" aria-labelledby={`lg-tab-${CAPACIDADES[activa].id}`} key={activa}>
              <p className="lg-vit-titulo">{CAPACIDADES[activa].titulo}</p>
              <p className="lg-vit-texto">{CAPACIDADES[activa].texto}</p>

              {activa === 0 && (
                <div className="lg-demo">
                  <div className="lg-cmp">
                    <span>Pedido a pedido</span><b>929 m</b>
                    <div className="lg-cmp-barra"><i style={{ width: '100%' }} className="gris" /></div>
                  </div>
                  <div className="lg-cmp">
                    <span>Con lotes y rutas</span><b>218 m</b>
                    <div className="lg-cmp-barra"><i style={{ width: '23.4%' }} className="azul" /></div>
                  </div>
                  <p className="lg-nota"><strong>−76 %</strong> de recorrido con 25 pedidos en la bodega de demostración</p>
                </div>
              )}

              {activa === 1 && (
                <div className="lg-demo">
                  {ZONAS.map((z) => (
                    <div key={z.z} className="lg-zona">
                      <span>{z.nombre}</span>
                      <div className="lg-zona-barra" aria-label={`${z.alta} % alta rotación, ${z.baja} % baja rotación`}>
                        <i style={{ width: z.alta + '%' }} className="alta" /><i style={{ width: z.media + '%' }} className="media" /><i style={{ width: z.baja + '%' }} className="baja" />
                      </div>
                    </div>
                  ))}
                  <div className="lg-mov">
                    <span className="desde">D-01-N3</span><span className="flecha" aria-hidden="true">→</span><span className="hacia">A-06-N2</span>
                    <span className="lg-mov-txt">Clavo corriente 2½″ · −23 m al mes</span>
                  </div>
                </div>
              )}

              {activa === 2 && (
                <div className="lg-demo lg-chat">
                  <p className="yo">¿Dónde está el taladro?</p>
                  <div className="flux">
                    <span className="lg-chispa" aria-hidden="true">✦</span>
                    <div>
                      <p><b>Taladro percutor 800 W</b> · 529 uds en 2 posiciones</p>
                      <p className="pos"><span>A-03-N2</span><span>B-05-N1</span><em>Ver en la bodega 3D</em></p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Panel derecho: formulario ── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white px-8 py-12 relative overflow-hidden">
        <div className="lg-aurora" aria-hidden="true"><i /><i /></div>

        {/* Logo móvil */}
        <div className="lg:hidden flex items-center gap-3 mb-10 relative lg-entra lg-d1">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #1AABF0, #0891B2)' }}>
            <AxiomaIcon className="w-5 h-5" />
          </div>
          <p className="font-bold text-slate-800">Axioma Flux</p>
        </div>

        <div className="w-full max-w-[340px] relative lg-form">

          <div className="mb-8 text-center">
            <h1 className="lg-entra lg-d2 text-2xl font-bold text-slate-900 tracking-tight mb-1">Bienvenido de vuelta</h1>
            <p className="lg-entra lg-d3 text-slate-400 text-sm">Ingresa tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4" noValidate={false}>

            <div className="lg-entra lg-d3">
              <label htmlFor="lg-email" className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Correo electrónico
              </label>
              <input id="lg-email" type="email"
                className="lg-campo w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm placeholder:text-slate-400"
                placeholder="tu@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>

            <div className="lg-entra lg-d4">
              <label htmlFor="lg-pass" className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input id="lg-pass" type={showPassword ? 'text' : 'password'}
                  className="lg-campo w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm placeholder:text-slate-400"
                  placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-0.5">
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div key={tiembla} role="alert"
                className="lg-tiembla flex items-start gap-2.5 bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 border border-red-100">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} onPointerDown={onda}
              className={`lg-boton lg-entra lg-d5 w-full py-3 rounded-xl text-white font-semibold text-sm mt-2${ok ? ' lg-ok' : ''}`}
              style={{
                background: loading && !ok ? 'linear-gradient(135deg, #7DCDF5 0%, #5BB8D0 100%)' : 'linear-gradient(135deg, #1AABF0 0%, #0891B2 100%)',
                boxShadow: '0 4px 20px rgba(26,171,240,0.30)',
                cursor: loading ? 'progress' : 'pointer',
              }}>
              {ok ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path className="lg-check" strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  Acceso concedido
                </span>
              ) : loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Ingresando…
                </span>
              ) : (
                'Iniciar sesión'
              )}
            </button>
          </form>

          <div className="lg-entra lg-d6 mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              ¿Problemas para acceder?{' '}
              <a href="tel:+34634042251" className="font-semibold hover:underline" style={{ color: '#1AABF0' }}>
                Contacta con soporte
              </a>
            </p>
          </div>
        </div>

        <p className="absolute bottom-6 text-xs text-slate-400 tracking-wide lg-entra lg-d7">
          © 2026 Axioma Flux · Todos los derechos reservados
        </p>
      </div>

      {/* Cortina de transición al panel */}
      {cortina && (
        <div className="lg-cortina" style={{ ['--cx' as string]: cortina.x + 'px', ['--cy' as string]: cortina.y + 'px' } as React.CSSProperties}>
          <div className="lg-logo w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #1AABF0, #0891B2)' }}>
            <AxiomaIcon className="w-8 h-8" />
          </div>
          <div className="lg-barra"><i /></div>
          <p>Preparando tu bodega…</p>
        </div>
      )}
    </div>
  )
}
