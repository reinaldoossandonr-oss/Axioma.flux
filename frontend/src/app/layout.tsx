import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Axioma Flux · Bodega & Distribución',
  description: 'Inventario, posiciones de bodega, embudo comercial y facturación en una sola pantalla. Multi-empresa.',
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1 }

// Sin estilos globales aquí: el panel (/app) usa solo su CSS original y el login usa Tailwind (ver (auth)/layout.tsx)
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}
