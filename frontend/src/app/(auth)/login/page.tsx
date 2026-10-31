'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import AxiomaIcon from '@/components/ui/AxiomaIcon'
import './login.css'

const IMAGE_URL = '/hero-login.jpg'

// Recorrido de picking que se dibuja sobre la foto (pasillos de una bodega vista desde arriba)
const CAMINO = 'M540 110 L540 175 L130 175 L130 295 L470 295 L470 415 L200 415 L200 475 L540 475 L540 110'
const RACKS = [145, 205, 265, 325, 385, 445, 505]
const PARADAS: [number, number][] = [[380, 175], [200, 295], [430, 415], [330, 475]]
const VENTAJAS = [
  { valor: 'Bodega 3D', texto: 'Cada posición a la vista' },
  { valor: 'Picking', texto: 'Lotes y rutas optimizadas' },
  { valor: 'Multiempresa', texto: 'Datos aislados por empresa' },
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
          style={{ background: 'linear-gradient(160deg, rgba(10,22,40,0.60) 0%, rgba(10,22,40,0.40) 40%, rgba(10,22,40,0.82) 75%, rgba(10,22,40,0.97) 100%)' }} />

        <svg className="lg-plano" viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          {RACKS.map((y) => (
            <g key={y}>
              <rect className="rk" x="90" y={y - 9} width="190" height="18" rx="3" />
              <rect className="rk" x="320" y={y - 9} width="190" height="18" rx="3" />
            </g>
          ))}
          <path className="ruta" d={CAMINO} />
          {PARADAS.map(([x, y]) => <circle key={x + '-' + y} className="parada" cx={x} cy={y} r="5" />)}
          <rect x="522" y="90" width="36" height="22" rx="5" fill="#16A34A" opacity=".9" />
          <circle className="punto" r="5">
            <animateMotion dur="7s" begin="2s" repeatCount="indefinite" path={CAMINO} />
          </circle>
        </svg>

        <div className="absolute right-0 top-0 bottom-0 w-px"
          style={{ background: 'linear-gradient(to bottom, transparent, #1AABF0 40%, #1AABF0 60%, transparent)' }} />

        {/* Logo */}
        <div className="relative z-10 p-10 lg-entra lg-d1">
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

        {/* Mensaje + ventajas */}
        <div className="relative z-10 p-10 pb-12">
          <div className="lg-entra lg-d2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-5"
            style={{ background: 'rgba(26,171,240,0.15)', border: '1px solid rgba(26,171,240,0.3)', color: '#38BDF8' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Inventario · Bodega 3D · Picking
          </div>

          <h2 className="lg-entra lg-d3 text-white text-3xl font-bold leading-tight mb-3">
            Cada producto en su lugar,<br />
            <span style={{ color: '#1AABF0' }}>cada pedido en su ruta</span>
          </h2>
          <p className="lg-entra lg-d4 text-slate-300 text-sm leading-relaxed max-w-sm">
            Controla tu inventario, visualiza tu bodega en 3D y prepara los pedidos recorriendo menos metros.
          </p>

          <div className="flex items-stretch gap-3 mt-7">
            {VENTAJAS.map((v, i) => (
              <div key={v.valor} className={`lg-entra lg-d${5 + Math.min(i, 2)} lg-chip rounded-xl px-3.5 py-2.5`}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(6px)' }}>
                <p className="text-white text-sm font-bold leading-none">{v.valor}</p>
                <p className="text-slate-400 text-xs mt-1">{v.texto}</p>
              </div>
            ))}
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

          <div className="mb-8">
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
