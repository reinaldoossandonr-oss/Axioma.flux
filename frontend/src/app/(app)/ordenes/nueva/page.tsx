import Link from 'next/link'
import OrdenForm from '@/components/ordenes/OrdenForm'

export default function NuevaOrdenPage() {
  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5">
      <div className="flex items-center gap-2 flex-wrap">
        <Link href="/ordenes" className="text-slate-400 hover:text-slate-600 transition-colors text-sm">
          ← Órdenes
        </Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-lg md:text-xl font-bold text-slate-800">Nueva orden de movimiento</h1>
      </div>
      <OrdenForm />
    </div>
  )
}
