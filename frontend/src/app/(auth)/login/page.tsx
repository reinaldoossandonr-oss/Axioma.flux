'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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
    <div className="min-h-screen flex">

      {/* ── Panel izquierdo: ilustración ── */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden flex-col justify-between p-10"
        style={{ background: 'linear-gradient(135deg, #0F172A 0%, #0C2340 50%, #0F2D4A 100%)' }}>

        {/* Patrón de puntos de fondo */}
        <div className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle, #1AABF0 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* Glow superior */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #1AABF0, transparent)' }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #1AABF0, #0891B2)' }}>
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">Axioma Flux</p>
            <p className="text-xs leading-none mt-0.5" style={{ color: '#1AABF0' }}>Inventory OS</p>
          </div>
        </div>

        {/* Ilustración SVG central */}
        <div className="relative z-10 flex-1 flex items-center justify-center py-8">
          <svg viewBox="0 0 520 480" className="w-full max-w-lg" xmlns="http://www.w3.org/2000/svg">

            {/* Suelo / plataforma */}
            <ellipse cx="260" cy="430" rx="200" ry="18" fill="#1AABF0" opacity="0.08"/>

            {/* Estantería izquierda */}
            <g opacity="0.6">
              <rect x="20" y="160" width="8" height="260" rx="3" fill="#1E3A5F"/>
              <rect x="100" y="160" width="8" height="260" rx="3" fill="#1E3A5F"/>
              <rect x="18" y="200" width="92" height="6" rx="2" fill="#1E3A5F"/>
              <rect x="18" y="270" width="92" height="6" rx="2" fill="#1E3A5F"/>
              <rect x="18" y="340" width="92" height="6" rx="2" fill="#1E3A5F"/>
              {/* Cajas estantería izquierda */}
              <rect x="26" y="210" width="26" height="22" rx="3" fill="#1AABF0" opacity="0.5"/>
              <rect x="58" y="214" width="30" height="18" rx="3" fill="#0891B2" opacity="0.5"/>
              <rect x="26" y="280" width="38" height="24" rx="3" fill="#0369A1" opacity="0.5"/>
              <rect x="68" y="284" width="20" height="20" rx="3" fill="#1AABF0" opacity="0.4"/>
              <rect x="26" y="350" width="24" height="28" rx="3" fill="#0891B2" opacity="0.5"/>
              <rect x="55" y="352" width="34" height="24" rx="3" fill="#1AABF0" opacity="0.3"/>
            </g>

            {/* Estantería derecha */}
            <g opacity="0.6">
              <rect x="412" y="160" width="8" height="260" rx="3" fill="#1E3A5F"/>
              <rect x="492" y="160" width="8" height="260" rx="3" fill="#1E3A5F"/>
              <rect x="410" y="200" width="92" height="6" rx="2" fill="#1E3A5F"/>
              <rect x="410" y="270" width="92" height="6" rx="2" fill="#1E3A5F"/>
              <rect x="410" y="340" width="92" height="6" rx="2" fill="#1E3A5F"/>
              <rect x="418" y="210" width="30" height="22" rx="3" fill="#0891B2" opacity="0.5"/>
              <rect x="452" y="214" width="26" height="18" rx="3" fill="#1AABF0" opacity="0.4"/>
              <rect x="418" y="280" width="22" height="24" rx="3" fill="#1AABF0" opacity="0.5"/>
              <rect x="445" y="282" width="36" height="22" rx="3" fill="#0369A1" opacity="0.5"/>
              <rect x="418" y="350" width="34" height="26" rx="3" fill="#1AABF0" opacity="0.3"/>
              <rect x="456" y="354" width="24" height="22" rx="3" fill="#0891B2" opacity="0.5"/>
            </g>

            {/* Piso líneas perspectiva */}
            <g opacity="0.12" stroke="#1AABF0" strokeWidth="1">
              <line x1="130" y1="430" x2="260" y2="380"/>
              <line x1="180" y1="430" x2="260" y2="380"/>
              <line x1="230" y1="430" x2="260" y2="380"/>
              <line x1="290" y1="430" x2="260" y2="380"/>
              <line x1="340" y1="430" x2="260" y2="380"/>
              <line x1="390" y1="430" x2="260" y2="380"/>
            </g>

            {/* Mujer — cuerpo */}
            {/* Piernas */}
            <rect x="230" y="360" width="22" height="65" rx="10" fill="#1E3A5F"/>
            <rect x="258" y="358" width="22" height="65" rx="10" fill="#162D45"/>
            {/* Zapatos */}
            <ellipse cx="241" cy="427" rx="14" ry="7" fill="#0F172A"/>
            <ellipse cx="269" cy="427" rx="14" ry="7" fill="#0F172A"/>

            {/* Torso / chaqueta */}
            <path d="M215 240 Q220 230 260 228 Q300 230 305 240 L310 360 L210 360 Z"
              fill="#1E4D8C" rx="8"/>
            {/* Detalle chaqueta */}
            <path d="M240 240 L255 310 L260 310 L265 240" fill="#163870" opacity="0.6"/>
            {/* Cuello / camisa */}
            <rect x="247" y="225" width="26" height="20" rx="4" fill="#E0F2FE"/>

            {/* Brazo izquierdo (sosteniendo iPad) */}
            <path d="M215 255 Q185 265 170 300 Q165 315 175 320 Q185 325 195 310 Q205 295 220 280"
              fill="#1E4D8C" strokeWidth="2"/>
            {/* Mano izquierda */}
            <ellipse cx="178" cy="316" rx="12" ry="10" fill="#FBBF24" opacity="0.85"/>

            {/* iPad */}
            <rect x="130" y="270" width="90" height="120" rx="8" fill="#1E293B" stroke="#1AABF0" strokeWidth="1.5"/>
            <rect x="135" y="276" width="80" height="108" rx="5" fill="#0F172A"/>
            {/* Pantalla iPad - mini dashboard */}
            <rect x="138" y="280" width="74" height="16" rx="2" fill="#1AABF0" opacity="0.15"/>
            <text x="175" y="292" textAnchor="middle" fill="#1AABF0" fontSize="5" fontWeight="bold">AXIOMA FLUX</text>
            {/* Barras mini */}
            <rect x="140" y="302" width="10" height="18" rx="1" fill="#1AABF0" opacity="0.7"/>
            <rect x="153" y="308" width="10" height="12" rx="1" fill="#0891B2" opacity="0.7"/>
            <rect x="166" y="304" width="10" height="16" rx="1" fill="#38BDF8" opacity="0.7"/>
            <rect x="179" y="300" width="10" height="20" rx="1" fill="#1AABF0" opacity="0.7"/>
            <rect x="192" y="306" width="10" height="14" rx="1" fill="#0891B2" opacity="0.7"/>
            {/* Línea curva */}
            <path d="M140 340 Q155 332 170 336 Q185 340 200 330" stroke="#1AABF0" strokeWidth="1.5" fill="none" opacity="0.8"/>
            {/* Métricas pequeñas */}
            <rect x="140" y="346" width="32" height="14" rx="2" fill="#1AABF0" opacity="0.12"/>
            <text x="156" y="355" textAnchor="middle" fill="#38BDF8" fontSize="5">Stock OK</text>
            <rect x="176" y="346" width="28" height="14" rx="2" fill="#10B981" opacity="0.15"/>
            <text x="190" y="355" textAnchor="middle" fill="#10B981" fontSize="5">+12%</text>
            {/* Botón home iPad */}
            <circle cx="175" cy="375" r="4" fill="#1E3A5F" stroke="#334155" strokeWidth="0.5"/>

            {/* Brazo derecho */}
            <path d="M305 255 Q330 265 340 285 Q345 295 335 305 Q320 310 310 295 Q300 280 295 265"
              fill="#1E4D8C"/>
            {/* Mano derecha */}
            <ellipse cx="338" cy="302" rx="11" ry="9" fill="#FBBF24" opacity="0.85"/>

            {/* Cuello */}
            <rect x="250" y="205" width="20" height="26" rx="8" fill="#FBBF24" opacity="0.85"/>

            {/* Cabeza */}
            <ellipse cx="260" cy="188" rx="34" ry="38" fill="#FBBF24" opacity="0.9"/>
            {/* Cabello */}
            <path d="M228 175 Q226 140 260 135 Q294 140 292 175 Q290 155 260 152 Q230 155 228 175"
              fill="#92400E"/>
            <path d="M228 175 Q224 195 226 210 Q232 200 235 195" fill="#92400E"/>
            <path d="M292 175 Q296 195 294 210 Q288 200 285 195" fill="#92400E"/>
            {/* Cabello largo */}
            <path d="M226 185 Q218 215 222 240 Q228 235 232 225 Q228 210 230 190" fill="#92400E"/>
            <path d="M294 185 Q302 215 298 240 Q292 235 288 225 Q292 210 290 190" fill="#92400E"/>
            {/* Rostro */}
            <ellipse cx="248" cy="192" rx="3.5" ry="4" fill="#7C2D12" opacity="0.5"/>
            <ellipse cx="272" cy="192" rx="3.5" ry="4" fill="#7C2D12" opacity="0.5"/>
            <path d="M250 205 Q260 212 270 205" stroke="#C2410C" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            {/* Casco seguridad */}
            <path d="M226 175 Q228 150 260 147 Q292 150 294 175 Q290 168 260 166 Q230 168 226 175"
              fill="#1AABF0" opacity="0.85"/>
            <rect x="224" y="173" width="72" height="8" rx="3" fill="#0891B2" opacity="0.85"/>

            {/* Tarjetas flotantes */}
            {/* Card 1 - arriba derecha */}
            <g transform="translate(320, 120)">
              <rect width="110" height="52" rx="8" fill="#0F172A" stroke="#1AABF0" strokeWidth="0.8" opacity="0.95"/>
              <rect x="8" y="8" width="94" height="4" rx="2" fill="#1AABF0" opacity="0.3"/>
              <text x="12" y="22" fill="#94A3B8" fontSize="6.5">Órdenes hoy</text>
              <text x="12" y="36" fill="white" fontSize="14" fontWeight="bold">24</text>
              <text x="40" y="36" fill="#10B981" fontSize="7">↑ 18%</text>
              <circle cx="94" cy="30" r="10" fill="#10B981" opacity="0.15"/>
              <text x="94" y="34" textAnchor="middle" fill="#10B981" fontSize="10">✓</text>
            </g>

            {/* Card 2 - abajo derecha */}
            <g transform="translate(330, 200)">
              <rect width="105" height="52" rx="8" fill="#0F172A" stroke="#1AABF0" strokeWidth="0.8" opacity="0.95"/>
              <text x="12" y="20" fill="#94A3B8" fontSize="6.5">Stock activo</text>
              <text x="12" y="36" fill="white" fontSize="14" fontWeight="bold">1,284</text>
              <text x="70" y="36" fill="#1AABF0" fontSize="7">unds</text>
              {/* Mini barra progreso */}
              <rect x="12" y="42" width="80" height="4" rx="2" fill="#1E293B"/>
              <rect x="12" y="42" width="58" height="4" rx="2" fill="#1AABF0" opacity="0.8"/>
            </g>

            {/* Card 3 - arriba izquierda */}
            <g transform="translate(80, 130)">
              <rect width="100" height="48" rx="8" fill="#0F172A" stroke="#1AABF0" strokeWidth="0.8" opacity="0.95"/>
              <text x="12" y="18" fill="#94A3B8" fontSize="6.5">Valor inventario</text>
              <text x="12" y="33" fill="white" fontSize="11" fontWeight="bold">$10.8M</text>
              <text x="12" y="44" fill="#F59E0B" fontSize="6">CPP actualizado</text>
            </g>

            {/* Líneas conectoras tarjetas */}
            <line x1="218" y1="250" x2="185" y2="175" stroke="#1AABF0" strokeWidth="0.6" strokeDasharray="4,3" opacity="0.3"/>
            <line x1="305" y1="270" x2="325" y2="170" stroke="#1AABF0" strokeWidth="0.6" strokeDasharray="4,3" opacity="0.3"/>
            <line x1="310" y1="310" x2="332" y2="226" stroke="#1AABF0" strokeWidth="0.6" strokeDasharray="4,3" opacity="0.3"/>

            {/* Partículas flotantes */}
            <circle cx="350" cy="150" r="2" fill="#1AABF0" opacity="0.5"/>
            <circle cx="165" cy="230" r="1.5" fill="#38BDF8" opacity="0.4"/>
            <circle cx="380" cy="300" r="2.5" fill="#1AABF0" opacity="0.3"/>
            <circle cx="100" cy="310" r="2" fill="#0891B2" opacity="0.4"/>
            <circle cx="420" cy="180" r="1.5" fill="#38BDF8" opacity="0.35"/>
            <circle cx="90" cy="400" r="3" fill="#1AABF0" opacity="0.2"/>
            <circle cx="440" cy="400" r="2" fill="#1AABF0" opacity="0.25"/>
          </svg>
        </div>

        {/* Tagline inferior */}
        <div className="relative z-10">
          <blockquote className="text-white/90 text-lg font-light leading-snug mb-3">
            "Controla tu inventario en tiempo real,<br />
            <span style={{ color: '#1AABF0' }}>desde cualquier lugar.</span>"
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(26,171,240,0.15)' }}>
              <svg className="w-4 h-4" style={{ color: '#1AABF0' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <p className="text-white text-sm font-semibold">Axioma Flux</p>
              <p className="text-xs" style={{ color: '#64748B' }}>Sistema de gestión de inventario</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Panel derecho: formulario ── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white px-8 py-12 relative">

        {/* Logo móvil (solo en pantallas pequeñas) */}
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

        <div className="w-full max-w-sm">
          {/* Encabezado */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Bienvenido de vuelta</h1>
            <p className="text-slate-500 text-sm">Ingresa tus credenciales para continuar</p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                style={{ '--tw-ring-color': '#1AABF0' } as React.CSSProperties}
                onFocus={e => e.target.style.boxShadow = '0 0 0 3px rgba(26,171,240,0.15)'}
                onBlur={e => e.target.style.boxShadow = ''}
                placeholder="tu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-700">Contraseña</label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full px-4 py-2.5 pr-11 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none transition-all"
                  onFocus={e => e.target.style.boxShadow = '0 0 0 3px rgba(26,171,240,0.15)'}
                  onBlur={e => e.target.style.boxShadow = ''}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 border border-red-100">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-white font-semibold text-sm transition-all duration-200 relative overflow-hidden"
              style={{
                background: loading
                  ? '#94A3B8'
                  : 'linear-gradient(135deg, #1AABF0 0%, #0891B2 100%)',
                boxShadow: loading ? 'none' : '0 4px 24px rgba(26,171,240,0.35)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Ingresando...
                </span>
              ) : 'Iniciar sesión'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-8">
            ¿Problemas para acceder?{' '}
            <span className="font-medium" style={{ color: '#1AABF0' }}>Contacta al administrador</span>
          </p>
        </div>

        {/* Footer */}
        <p className="absolute bottom-6 text-xs text-slate-300">
          © 2026 Axioma Flux · Todos los derechos reservados
        </p>
      </div>
    </div>
  )
}
