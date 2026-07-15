'use client'

import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, Title, Tooltip, Legend, ArcElement, Filler,
} from 'chart.js'
import { Bar, Line, Doughnut } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, Title, Tooltip, Legend, ArcElement, Filler
)

// Tipografía y tono neutro consistentes en todos los gráficos
ChartJS.defaults.font.family = "'Inter', system-ui, -apple-system, sans-serif"
ChartJS.defaults.font.size = 11
ChartJS.defaults.color = '#64748B'

const PRIMARY = '#0E87BF'
const PRIMARY_LIGHT = 'rgba(14,135,191,0.10)'
// Paleta corporativa: un tono por familia de color, misma saturación/luminosidad
// para que cada categoría se distinga de un vistazo (evita azules/celestes similares).
const PALETTE = [
  '#2563EB', '#0D9488', '#B45309', '#7C3AED',
  '#0891B2', '#BE185D', '#4D7C0F', '#C2410C',
]
// Paleta de "Merma por categoría": mismos colores que los íconos de los
// indicadores del dashboard (Productos, Reponer, Valor, Ocupación, Merma),
// para que se lea coherente con el resto de la página y las categorías
// se distingan claramente entre sí (en vez de variaciones de un solo tono).
const PALETTE_MERMA = [
  '#1AABF0', '#EF4444', '#10B981', '#F59E0B', '#E11D48',
  '#8B5CF6', '#06B6D4', '#F97316',
]
const TOOLTIP_BASE = {
  backgroundColor: '#0F172A',
  padding: 10,
  cornerRadius: 6,
  displayColors: true,
  boxPadding: 4,
  titleFont: { size: 12, weight: 500 as const },
  bodyFont: { size: 12 },
}

// ── GRÁFICO 1: Stock por categoría (barras) ──────────────────
interface StockCategoriaProps {
  data: { categoria: string; stock_total: number; valor_total: number }[]
}

export function StockCategoriaChart({ data }: StockCategoriaProps) {
  if (!data?.length) return <EmptyChart mensaje="Sin datos de categorías" />

  const chartData = {
    labels: data.map(d => d.categoria),
    datasets: [
      {
        label: 'Stock total (unidades)',
        data: data.map(d => d.stock_total ?? 0),
        backgroundColor: PALETTE.slice(0, data.length),
        borderRadius: 3,
        borderSkipped: false,
        maxBarThickness: 36,
      },
    ],
  }

  return (
    <Bar
      data={chartData}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            ...TOOLTIP_BASE,
            callbacks: {
              label: ctx => ` ${(ctx.parsed.y ?? 0).toLocaleString('es-CL')} unidades`,
            },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10.5 } } },
          y: { grid: { color: '#F1F5F9' }, ticks: { font: { size: 10.5 } } },
        },
      }}
    />
  )
}

// ── GRÁFICO: SKUs por clasificación de rotación ──────────────
const ORDEN_CLASES_ROTACION = ['Alta', 'Media', 'Baja', 'Sin datos']
const COLOR_CLASE_ROTACION: Record<string, string> = {
  Alta: '#10B981',       // emerald-500 — coincide con el badge/indicador
  Media: '#F59E0B',      // amber-500
  Baja: '#EF4444',       // red-500
  'Sin datos': '#94A3B8', // slate-400
}

interface SkuPorClasificacionProps {
  data: { clasificacion?: string | null }[]
}

export function SkuPorClasificacionChart({ data }: SkuPorClasificacionProps) {
  if (!data?.length) return <EmptyChart mensaje="Sin datos de rotación" />

  const conteo: Record<string, number> = {}
  for (const row of data) {
    const c = row.clasificacion || 'Sin datos'
    conteo[c] = (conteo[c] ?? 0) + 1
  }
  const labels = ORDEN_CLASES_ROTACION.filter(c => conteo[c])
  if (!labels.length) return <EmptyChart mensaje="Sin datos de rotación" />

  const chartData = {
    labels,
    datasets: [
      {
        label: 'SKUs',
        data: labels.map(c => conteo[c]),
        backgroundColor: labels.map(c => COLOR_CLASE_ROTACION[c]),
        borderRadius: 3,
        borderSkipped: false,
        maxBarThickness: 46,
      },
    ],
  }

  return (
    <Bar
      data={chartData}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            ...TOOLTIP_BASE,
            callbacks: {
              label: ctx => ` ${ctx.parsed.y ?? 0} SKU${(ctx.parsed.y ?? 0) === 1 ? '' : 's'}`,
            },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10.5 } } },
          y: { grid: { color: '#F1F5F9' }, ticks: { font: { size: 10.5 }, precision: 0 } },
        },
      }}
    />
  )
}

// ── GRÁFICO 2: Salidas mensuales (línea) ─────────────────────
interface SalidasProps {
  data: { mes: string; costo_total: number; cantidad_total: number }[]
}

export function SalidasMensualesChart({ data }: SalidasProps) {
  if (!data?.length) return <EmptyChart mensaje="Sin datos de salidas en los últimos 12 meses" />

  const labels = data.map(d => {
    const date = new Date(d.mes)
    return date.toLocaleDateString('es-CL', { month: 'short', year: '2-digit' })
  })

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Costo total salidas ($)',
        data: data.map(d => d.costo_total ?? 0),
        borderColor: PRIMARY,
        backgroundColor: PRIMARY_LIGHT,
        borderWidth: 1.5,
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: PRIMARY,
        pointBorderWidth: 1.5,
        pointRadius: 2.5,
        pointHoverRadius: 4,
      },
    ],
  }

  return (
    <Line
      data={chartData}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            ...TOOLTIP_BASE,
            callbacks: {
              label: ctx =>
                ` $${(ctx.parsed.y ?? 0).toLocaleString('es-CL', { maximumFractionDigits: 0 })}`,
            },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10.5 } } },
          y: {
            grid: { color: '#F1F5F9' },
            ticks: {
              font: { size: 10.5 },
              maxTicksLimit: 5,
              callback: v => `$${Number(v).toLocaleString('es-CL', { maximumFractionDigits: 0 })}`,
            },
          },
        },
      }}
    />
  )
}

// ── GRÁFICO 3: Donut por valor de inventario ─────────────────
interface ValorCategoriaProps {
  data: { categoria: string; valor_total: number }[]
}

export function ValorCategoriaChart({ data }: ValorCategoriaProps) {
  if (!data?.length) return <EmptyChart mensaje="Sin datos" />

  const chartData = {
    labels: data.map(d => d.categoria),
    datasets: [{
      data: data.map(d => d.valor_total ?? 0),
      backgroundColor: PALETTE.slice(0, data.length),
      borderWidth: 2,
      borderColor: '#ffffff',
      hoverOffset: 6,
    }],
  }

  return (
    <Doughnut
      data={chartData}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              font: { size: 10.5 },
              color: '#475569',
              padding: 10,
              boxWidth: 8,
              boxHeight: 8,
              usePointStyle: true,
              pointStyle: 'circle',
            },
          },
          tooltip: {
            ...TOOLTIP_BASE,
            callbacks: {
              label: ctx =>
                ` $${ctx.parsed.toLocaleString('es-CL', { maximumFractionDigits: 0 })}`,
            },
          },
        },
      }}
    />
  )
}

// ── GRÁFICO 4: Merma en valor por categoría (anillo) ──────────
interface MermaCategoriaProps {
  data: { categoria: string; cantidad_total: number; valor_total: number }[]
}

// Plugin: dibuja el total en el centro del anillo
const centerTextPlugin = {
  id: 'centerText',
  afterDraw(chart: any) {
    const { ctx, chartArea } = chart
    if (!chartArea) return
    const total = (chart.data.datasets[0]?.data ?? []).reduce(
      (acc: number, v: number) => acc + (v ?? 0), 0
    )
    const cx = (chartArea.left + chartArea.right) / 2
    const cy = (chartArea.top + chartArea.bottom) / 2

    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#0F172A'
    ctx.font = "600 18px 'Inter', system-ui, -apple-system, sans-serif"
    ctx.fillText(`$${total.toLocaleString('es-CL', { maximumFractionDigits: 0, notation: 'compact' })}`, cx, cy - 8)
    ctx.fillStyle = '#94A3B8'
    ctx.font = "500 10px 'Inter', system-ui, -apple-system, sans-serif"
    ctx.fillText('Merma total', cx, cy + 12)
    ctx.restore()
  },
}

export function MermaCategoriaChart({ data }: MermaCategoriaProps) {
  if (!data?.length) return <EmptyChart mensaje="Sin merma registrada" />

  const chartData = {
    labels: data.map(d => d.categoria),
    datasets: [{
      data: data.map(d => d.valor_total ?? 0),
      backgroundColor: PALETTE_MERMA.slice(0, data.length),
      borderWidth: 2,
      borderColor: '#ffffff',
      hoverOffset: 8,
      hoverBorderWidth: 0,
    }],
  }

  return (
    <Doughnut
      data={chartData}
      plugins={[centerTextPlugin]}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        cutout: '74%',
        animation: { animateRotate: true, animateScale: true },
        plugins: {
          legend: {
            position: 'right',
            labels: {
              font: { size: 10.5 },
              color: '#475569',
              padding: 10,
              boxWidth: 8,
              boxHeight: 8,
              usePointStyle: true,
              pointStyle: 'circle',
            },
          },
          tooltip: {
            ...TOOLTIP_BASE,
            callbacks: {
              label: ctx =>
                ` $${ctx.parsed.toLocaleString('es-CL', { maximumFractionDigits: 0 })}`,
            },
          },
        },
      }}
    />
  )
}

// ── GRÁFICO 5: Evolución diaria de la merma (últimos 90 días) ─
interface MermaDiariaProps {
  data: { dia: string; cantidad_total: number; valor_total: number }[]
}

export function MermaDiariaChart({ data }: MermaDiariaProps) {
  if (!data?.length) return <EmptyChart mensaje="Sin merma registrada en los últimos 90 días" />

  const labels = data.map(d => {
    const date = new Date(d.dia)
    return date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
  })

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Merma en valor ($)',
        data: data.map(d => d.valor_total ?? 0),
        borderColor: '#9F1239',
        backgroundColor: 'rgba(159,18,57,0.08)',
        borderWidth: 1.5,
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: '#9F1239',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 1.5,
      },
    ],
  }

  return (
    <Line
      data={chartData}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            ...TOOLTIP_BASE,
            callbacks: {
              label: ctx =>
                ` $${(ctx.parsed.y ?? 0).toLocaleString('es-CL', { maximumFractionDigits: 0 })}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 10 }, maxTicksLimit: 8, autoSkip: true },
          },
          y: {
            grid: { color: '#F1F5F9' },
            ticks: {
              font: { size: 10.5 },
              maxTicksLimit: 5,
              callback: v => `$${Number(v).toLocaleString('es-CL', { maximumFractionDigits: 0 })}`,
            },
          },
        },
      }}
    />
  )
}

function EmptyChart({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex items-center justify-center h-full text-slate-400 text-sm">
      {mensaje}
    </div>
  )
}
