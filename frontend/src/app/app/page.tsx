'use client'

/**
 * Panel de Axioma Flux: la misma interfaz de la app de Apps Script.
 * El HTML, el CSS y el JavaScript originales se usan tal cual; lo único que cambia
 * es el "puente": cada google.script.run.<funcion>() ahora llama a Supabase.
 * La seguridad no depende de este archivo: la aplican la RLS y las funciones SQL.
 */
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { MARKUP } from './markup'
import './panel.css'

type Fn = (arg: any) => Promise<any>

async function rpc(nombre: string, args?: Record<string, unknown>) {
  const { data, error } = await supabase.rpc(nombre, args)
  if (error) throw error
  return data
}

// Edge Function con la llave de servicio (altas de empresas/usuarios, contraseñas, demo)
async function edge(accion: string, d: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke('admin-flux', { body: { ...d, accion } })
  if (error) {
    try {
      const cuerpo = await (error as any).context?.json()
      if (cuerpo?.mensaje) return cuerpo
    } catch { /* sin cuerpo legible */ }
    throw error
  }
  return data
}

// Equivalencias con las funciones del Codigo.gs (y las nuevas del SaaS)
const FUNCIONES: Record<string, Fn> = {
  obtenerDatosIniciales: () => rpc('obtener_datos_iniciales'),
  guardarRegistro: (d) => rpc('guardar_registro', { d }),
  cambiarEstado: (d) => rpc('cambiar_estado', { d }),
  guardarCobertura: (lista) => rpc('guardar_cobertura', { lista }),
  guardarAjustes: (d) => rpc('guardar_ajustes', { d }),
  listarUsuarios: () => rpc('listar_usuarios'),
  cambiarUsuario: (d) => rpc('cambiar_usuario', { p_user: d.id, p_rol: d.rol, p_activo: d.activo, p_nombre: d.nombre ?? null }),
  saListarEmpresas: () => rpc('sa_listar_empresas'),
  saActualizarEmpresa: (d) => rpc('sa_actualizar_empresa', { p_id: d.id, d: d.cambios }),
  saBorrarDemo: (d) => rpc('sa_borrar_demo', { p_id: d.id }),
  saAplicarNave: (d) => rpc('sa_aplicar_nave', { p_id: d.id, p_estilo: d.estilo }),
  crearEmpresa: (d) => edge('crear_empresa', d),
  crearUsuario: (d) => edge('crear_usuario', d),
  cambiarPassword: (d) => edge('cambiar_password', d),
  cargarDemo: (d) => edge('cargar_demo', d),
  miPassword: async (d) => {
    const { error } = await supabase.auth.updateUser({ password: d.password })
    if (error) throw error
    return { ok: true }
  },
  salir: async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
    return { ok: true }
  },
}

function sesionCaducada(e: any) {
  const t = String(e?.message || e?.code || '')
  return e?.code === 'PGRST301' || e?.status === 401 || /jwt|token.*expired|not authenticated/i.test(t)
}

/** Reproduce la API encadenable de Apps Script: run.withSuccessHandler(f).withFailureHandler(g).funcion(arg) */
function crearRun(ok?: (r: any) => void, mal?: (e: any) => void): any {
  return new Proxy({}, {
    get(_, prop: string) {
      if (prop === 'withSuccessHandler') return (f: any) => crearRun(f, mal)
      if (prop === 'withFailureHandler') return (f: any) => crearRun(ok, f)
      return (arg: any) => {
        const f = FUNCIONES[prop]
        if (!f) { mal?.(new Error('Función desconocida: ' + prop)); return }
        f(arg).then((r) => ok?.(r)).catch((e) => {
          if (sesionCaducada(e)) { window.location.href = '/login'; return }
          mal?.(e)
        })
      }
    },
  })
}

function cargarScript(src: string) {
  return new Promise<void>((resolver, rechazar) => {
    const s = document.createElement('script')
    s.src = src
    s.onload = () => resolver()
    s.onerror = () => rechazar(new Error('No se pudo cargar ' + src))
    document.body.appendChild(s)
  })
}

export default function Panel() {
  useEffect(() => {
    const w = window as any
    if (w.__panelIniciado) return            // evita doble arranque (modo estricto de React)
    w.__panelIniciado = true
    document.body.classList.add('claro')
    w.google = { script: { get run() { return crearRun() } } }
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) { window.location.href = '/login'; return }
      try { await cargarScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/0.149.0/three.min.js') }
      catch { await cargarScript('https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js').catch(() => {}) }
      await cargarScript('/panel/panel.js?v=2')
    })()
  }, [])

  return <div style={{ height: '100%' }} dangerouslySetInnerHTML={{ __html: MARKUP }} />
}
