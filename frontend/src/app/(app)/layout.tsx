'use client'

import { useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import AxiomaIcon from '@/components/ui/AxiomaIcon'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Columna principal */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden lg:ml-64">

        {/* Top bar — solo en mobile */}
        <header className="lg:hidden shrink-0 sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Abrir menú"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <AxiomaIcon className="w-3.5 h-3.5" />
            </div>
            <span className="text-slate-800 font-semibold text-sm">Axioma Flux</span>
          </div>
        </header>

        {/* Contenido de la página — única región con scroll */}
        <main className="flex-1 min-h-0 overflow-y-auto bg-slate-100">
          {children}
        </main>
      </div>
    </div>
  )
}
