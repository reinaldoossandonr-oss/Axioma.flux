'use client'

import { useEffect, useState } from 'react'
import { supabase } from './supabase'

// Cache a nivel de módulo: la empresa del usuario no cambia durante la sesión,
// así que solo se consulta una vez sin importar cuántas páginas usen el hook.
let cachedNombre: string | null = null
let pending: Promise<string | null> | null = null

async function fetchEmpresaNombre(): Promise<string | null> {
  const { data, error } = await supabase.from('empresas').select('nombre').single()
  if (error || !data) return null
  return (data as any).nombre ?? null
}

/**
 * Devuelve el nombre de la empresa del usuario autenticado (vía RLS:
 * "empresas_ver_propia"). Retorna null mientras carga o si falla.
 */
export function useEmpresaNombre(): string | null {
  const [nombre, setNombre] = useState<string | null>(cachedNombre)

  useEffect(() => {
    if (cachedNombre) {
      setNombre(cachedNombre)
      return
    }
    if (!pending) pending = fetchEmpresaNombre()
    pending.then(n => {
      cachedNombre = n
      setNombre(n)
    })
  }, [])

  return nombre
}
