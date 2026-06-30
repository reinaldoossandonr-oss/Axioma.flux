'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const IMAGE_URL =
  'https://axiomaanalytics.com/wp-content/uploads/2026/06/%C2%BFQue-es-la-analitica-y-por-que-es-clave-en-las-empresas.png'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Credenciales incorrectas. Verifica tu email y contraseña.')
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex bg-slate-50">

      {/* ── Panel izquierdo: foto + overlay ── */}
      <div className="hidden lg:flex lg:w-[58%] relative overflow-hidden flex-col justify-between">

        {/* Foto de fondo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={IMAGE_URL}
          alt="Analytics dashboard"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />

        {/* Overlay degradado: oscuro abajo, semi-transparente arriba */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(160deg, rgba(10,22,40,0.55) 0%, rgba(10,22,40,0.35) 40%, rgba(10,22,40,0.80) 75%, rgba(10,22,40,0.97) 100%)',
          }}
        />

        {/* Borde/glow azul sutil en el borde derecho */}
        <div
          className="absolute right-0 top-0 bottom-0 w-px"
          style={{ background: 'linear-gradient(to bottom, transparent, #1AABF0 40%, #1AABF0 60%, transparent)' }}
        />

        {/* Contenido sobre la foto */}

        {/* Logo — arriba */}
        <div className="relative z-10 p-10">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, #1AABF0, #0891B2)' }}
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none tracking-wide">Axioma Flux</p>
              <p className="text-xs leading-none mt-0.5 font-medium" style={{ color: '#1AABF0' }}>
                Inventory OS
              </p>
            </div>
          </div>
        </div>

        {/* Tagline + badges — abajo */}
        <div className="relative z-10 p-10 pb-12">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-5"
            style={{ background: 'rgba(26,171,240,0.15)', border: '1px solid rgba(26,171,240,0.3)', color: '#38BDF8' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Plataforma activa · Multi-empresa
          </div>

          <h2 className="text-white text-3xl font-bold leading-tight mb-3">
            Toma decisiones con<br />
            <span style={{ color: '#1AABF0' }}>datos en tiempo real</span>
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed max-w-sm">
            Controla tu inventario, movimientos y costos desde un solo lugar. Diseñado para equipos modernos.
          </p>

          {/* Métricas rápidas */}
          <div className="flex items-center gap-5 mt-7">
            {[
              { label: 'Empresas activas', value: '12+' },
              { label: 'Uptime', value: '99.9%' },
              { label: 'Productos gestionados', value: '50K+' },
            ].map(stat => (
              <div key={stat.label}>
                <p className="text-white text-lg font-bold leading-none">{stat.value}</p>
                <p className="text-slate-400 text-xs mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Panel derecho: formulario ── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white px-8 py-12 relative">

        {/* Logo móvil */}
        <div className="lg:hidden flex items-center gap-3 mb-10">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #1AABF0, #0891B2)' }}>
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <p className="font-bold text-slate-800">Axioma Flux</p>
        </div>

        <div className="w-full max-w-[340px]">

          {/* Encabezado */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">
              Bienvenido de vuelta
            </h1>
            <p className="text-slate-400 text-sm">Ingresa tus credenciales para continuar</p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleLogin} className="space-y-4">

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:bg-white transition-all"
                onFocus={e => {
                  e.target.style.borderColor = '#1AABF0'
                  e.target.style.boxShadow = '0 0 0 3px rgba(26,171,240,0.12)'
                }}
                onBlur={e => {
                  e.target.style.borderColor = ''
                  e.target.style.boxShadow = ''
                }}
                placeholder="tu@empresa.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:bg-white transition-all"
                  onFocus={e => {
                    e.target.style.borderColor = '#1AABF0'
                    e.target.style.boxShadow = '0 0 0 3px rgba(26,171,240,0.12)'
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = ''
                    e.target.style.boxShadow = ''
                  }}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 border border-red-100">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {/* Botón */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all duration-200 mt-2"
              style={{
                background: loading
                  ? '#CBD5E1'
                  : 'linear-gradient(135deg, #1AABF0 0%, #0891B2 100%)',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(26,171,240,0.30)',
              }}
              onMouseEnter={e => {
                if (!loading) (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = ''
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Ingresando...
                </span>
              ) : (
                'Iniciar sesión'
              )}
            </button>
          </form>

          {/* Divider + contacto */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
              ¿Problemas para acceder?{' '}
              <span className="font-semibold cursor-pointer" style={{ color: '#1AABF0' }}>
                Contacta al administrador
              </span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="absolute bottom-6 text-[11px] text-slate-300 tracking-wide">
          © 2026 Axioma Flux · Todos los derechos reservados
        </p>
      </div>
    </div>
  )
}
