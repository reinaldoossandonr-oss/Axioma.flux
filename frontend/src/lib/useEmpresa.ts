'use client'

import { useEffect, useState } from 'react'
import { supabase } from './supabase'

// Cache a nivel de módulo, ligada al user_id actual — así no queda "pegado"
// el nombre de una empresa anterior si en la misma pestaña se cambia de
// cuenta (login/logout) sin recargar la página.
let cache: { userId: string; nombre: string | null } | null = null
let pendingKey: string | null = null
let pendingPromise: Promise<string | null> | null = null

// Invalida la caché apenas cambia la sesión (login, logout, cambio de usuario).
supabase.auth.onAuthStateChange((_event, session) => {
  const uid = session?.user?.id ?? null
  if (!uid || (cache && cache.userId !== uid)) {
    cache = null
    pendingKey = null
    pendingPromise = null
  }
})

async function fetchEmpresaNombre(): Promise<string | null> {
  const { data, error } = await supabase.from('empresas').select('nombre').single()
  if (error || !data) return null
  return (data as any).nombre ?? null
}

/**
 * Devuelve el nombre de la empresa del usuario autenticado (vía RLS:
 * "empresas_ver_propia"). Retorna null mientras carga, si falla, o si
 * no hay sesión activa.
 */
export function useEmpresaNombre(): string | null {
  const [nombre, setNombre] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function run() {
      const { data: { user } } = await supabase.auth.getUser()
      const uid = user?.id ?? null
      if (!uid) {
        if (!cancelled) setNombre(null)
        return
      }

      if (cache && cache.userId === uid) {
        if (!cancelled) setNombre(cache.nombre)
        return
      }

      if (!pendingPromise || pendingKey !== uid) {
        pendingKey = uid
        pendingPromise = fetchEmpresaNombre()
      }

      const n = await pendingPromise
      if (cancelled) return
      cache = { userId: uid, nombre: n }
      setNombre(n)
    }

    run()
    return () => { cancelled = true }
  }, [])

  return nombre
}
