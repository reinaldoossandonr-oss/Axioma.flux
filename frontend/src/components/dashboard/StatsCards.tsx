interface Stat {
  label: string
  value: string | number
  subtitle?: string
  color: string
  icon: React.ReactNode
}

interface Props {
  resumen: {
    total_productos: number
    productos_a_reponer: number
    valor_inventario_total: number
    tasa_ocupacion_almacen: number
    merma_valor_total: number
  }
}

export default function StatsCards({ resumen }: Props) {
  const stats: Stat[] = [
    {
      label: 'Productos activos',
      value: resumen.total_productos,
      color: 'bg-primary',
      icon: <BoxIcon />,
    },
    {
      label: 'Requieren reposición',
      value: resumen.productos_a_reponer,
      subtitle: 'Menos de 45 días de stock',
      color: 'bg-red-500',
      icon: <AlertIcon />,
    },
    {
      label: 'Valor inventario',
      value: `$${resumen.valor_inventario_total.toLocaleString('es-CL', { maximumFractionDigits: 0 })}`,
      subtitle: 'A costo promedio (CPP)',
      color: 'bg-emerald-500',
      icon: <ChartIcon />,
    },
    {
      label: 'Ocupación del almacén',
      value: `${resumen.tasa_ocupacion_almacen}%`,
      subtitle: 'Posiciones con stock',
      color: 'bg-amber-500',
      icon: <WarehouseIcon />,
    },
    {
      label: 'Merma en valor',
      value: `$${resumen.merma_valor_total.toLocaleString('es-CL', { maximumFractionDigits: 0 })}`,
      subtitle: 'Acumulado histórico, a CPP',
      color: 'bg-rose-600',
      icon: <TrashIcon />,
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="card flex items-center gap-4">
          <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center text-white flex-shrink-0`}>
            {stat.icon}
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold text-slate-800 truncate">{stat.value}</p>
            <p className="text-sm text-slate-500 leading-tight">{stat.label}</p>
            {stat.subtitle && (
              <p className="text-xs text-slate-400 mt-0.5">{stat.subtitle}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function BoxIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  )
}
function AlertIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  )
}
function ChartIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}
function WarehouseIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 21V10l9-6 9 6v11h-6v-7H9v7H3z" />
    </svg>
  )
}
function TrashIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
    </svg>
  )
}
