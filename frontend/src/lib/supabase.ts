import { createBrowserClient } from '@supabase/ssr'

/**
 * Cliente Supabase del navegador. La sesión va en cookies para que el middleware la vea.
 * Solo usa la llave pública: todo el aislamiento entre empresas lo hace la RLS en la base de datos.
 */
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)
