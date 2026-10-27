# Axioma Flux v2 · Guía de despliegue

Stack: **Supabase** (base de datos, login, seguridad por fila y Edge Function) · **Vercel** (frontend Next.js).
El backend FastAPI de Render **ya no se usa**: el navegador habla directo con Supabase y la seguridad la aplica la base de datos.

---

## Qué hay en cada carpeta

| Carpeta | Qué es |
|---|---|
| `frontend/` | App Next.js: portada (`/`), login (`/login`) y panel (`/app`) |
| `frontend/public/panel/panel.js` | El JavaScript del panel (el de Apps Script + capa SaaS) |
| `frontend/src/app/app/` | Página del panel: HTML, CSS y el "puente" que reemplaza `google.script.run` por Supabase |
| `supabase/functions/admin-flux/` | Edge Function: alta de empresas y usuarios, contraseñas, datos de ejemplo |
| `database/migrations/20261027_flux_v2_saas.sql` | Esquema aplicado (tablas, RLS y funciones). **Ya está aplicado.** |
| `build/` | Script que regenera el panel desde `App.html` si cambias la versión de Apps Script |
| `_respaldo_v1/` | La versión anterior completa (frontend, backend FastAPI, analytics) |

En Supabase las tablas antiguas siguen intactas en el esquema `legacy`.

---

## 1 · Supabase (ya está hecho)

- Esquema nuevo, RLS y funciones: aplicados.
- Edge Function `admin-flux`: desplegada.
- Superadmin: `reinaldoossandonr@gmail.com`.

Para añadir otro superadmin (SQL Editor):
```sql
insert into public.superadmins select id from auth.users where email = 'correo@ejemplo.com';
```

Recomendado en **Authentication → Providers → Email**: desactivar *Allow new users to sign up*
(las altas las haces tú desde Ajustes › Superadmin) y activar *Leaked password protection*.

## 2 · Frontend en Vercel

1. Sube la carpeta del proyecto a GitHub (o actualiza el repositorio existente).
2. En Vercel: **Root Directory** = `frontend`, Framework = Next.js.
3. Variables de entorno:
   ```
   NEXT_PUBLIC_SUPABASE_URL      = https://legtxgdwqjfzvlvheaao.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = <anon key de Settings → API>
   ```
   (Borra `NEXT_PUBLIC_API_URL`, ya no se usa.)
4. Deploy. En Supabase → **Authentication → URL Configuration**, pon la URL de Vercel como *Site URL*.
5. El servicio de Render (`axioma-flux-api`) se puede apagar.

## 3 · Probar en local

```bash
cd frontend
npm install
copy .env.local.example .env.local   # y pega la anon key
npm run dev                            # http://localhost:3000
```

---

## Cómo funciona el SaaS

- **Aislamiento**: cada tabla tiene `empresa_id` y políticas RLS: un usuario solo ve y escribe filas de su empresa,
  aunque llame a la API a mano. Una empresa suspendida no ve nada.
- **Planes y módulos**: `free` = Inventario · `pro` = + Posiciones y Comercial · `enterprise` = + Finanzas.
  El superadmin puede dar módulos a medida por empresa. La RLS también bloquea los módulos no contratados.
- **Roles**: `admin` (todo + ajustes y usuarios) · `operador` (registrar datos) · `viewer` (solo lectura).
- **Ajustes por empresa**: moneda, decimales, zona horaria, IVA, umbrales, tamaño de bodega y listas desplegables
  (Ajustes › Empresa). Arrancan con los valores del `Codigo.gs`.
- **Equivalencias con Apps Script**: `obtenerDatosIniciales` → `obtener_datos_iniciales()`,
  `guardarRegistro` → `guardar_registro(d)`, `cambiarEstado` → `cambiar_estado(d)`, `guardarCobertura` → `guardar_cobertura(lista)`.

## Regenerar el panel si cambias el App.html

```bash
python3 build/transformar.py build/origen/App.html build/extra.js frontend
```
Si algún texto del App.html cambió, el script se detiene y dice cuál reemplazo no encontró.
