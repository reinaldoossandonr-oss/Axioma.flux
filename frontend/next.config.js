/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Versión del panel = momento de la publicación (evita que el navegador use un panel.js antiguo)
  env: { NEXT_PUBLIC_PANEL_VERSION: String(Date.now()) },
  async headers() {
    return [{ source: '/panel/:archivo*', headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }] }]
  },
}

module.exports = nextConfig
