'use client'

import { Suspense, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, Grid, Html, useGLTF, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'

export interface PosicionVisor3D {
  id: string
  codigo: string
  zona: string
  rack: string
  nivel: string
}

export interface ProductoEnPosicion {
  producto_id: string
  sku: string
  nombre: string
  stock: number
  categoria_id?: string | null
  categoria_nombre?: string | null
  rotacion?: number | null
  clasificacion?: string
}

export type ModoColor3D = 'ocupacion' | 'rotacion'
export type ClaseRotacion = 'Alta' | 'Media' | 'Baja'

interface Visor3DProps {
  disenoUrl: string
  posiciones: PosicionVisor3D[]
  stockPorPosicion: Record<string, number>
  detallePorPosicion?: Record<string, ProductoEnPosicion[]>
  clasificacionPorPosicion?: Record<string, string>
  modoColor?: ModoColor3D
  filtroSku?: string
  filtroNombre?: string
  filtroCategoriaId?: string
  filtroRotacion?: ClaseRotacion[]
  onSeleccionarPosicion?: (posicion: PosicionVisor3D) => void
}

const COLOR_VACIO = '#94a3b8'      // slate-400
const COLOR_CON_STOCK = '#1AABF0'  // azul de marca
const COLOR_COINCIDE = '#22c55e'   // verde, coincide filtro (modo Ocupación)
const COLOR_MATCH_GLOW = '#38BDF8' // sky-400, brillo de coincidencia en modo Rotación (no pisa el color semántico)
const COLOR_HOVER_EMISSIVE = '#1AABF0'

// Mismos tonos que el badge de clasificación en el resto del dashboard.
const COLOR_ROTACION: Record<string, string> = {
  Alta: '#10B981',       // emerald-500
  Media: '#F59E0B',      // amber-500
  Baja: '#EF4444',       // red-500
  'Sin datos': COLOR_VACIO,
}

function BinsInteractivos({
  scene,
  posiciones,
  stockPorPosicion,
  detallePorPosicion,
  clasificacionPorPosicion,
  modoColor = 'ocupacion',
  filtroSku,
  filtroNombre,
  filtroCategoriaId,
  filtroRotacion,
  onSeleccionarPosicion,
}: {
  scene: THREE.Object3D
  posiciones: PosicionVisor3D[]
  stockPorPosicion: Record<string, number>
  detallePorPosicion: Record<string, ProductoEnPosicion[]>
  clasificacionPorPosicion: Record<string, string>
  modoColor?: ModoColor3D
  filtroSku?: string
  filtroNombre?: string
  filtroCategoriaId?: string
  filtroRotacion?: ClaseRotacion[]
  onSeleccionarPosicion?: (posicion: PosicionVisor3D) => void
}) {
  const [hoverId, setHoverId] = useState<string | null>(null)

  // Localiza, dentro del modelo 3D, el mesh cuyo nombre coincide exactamente
  // con el código de cada posición (ej: "A-3-2"). Los que no se encuentran
  // en el modelo simplemente se omiten (no rompe el render).
  const bins = useMemo(() => {
    scene.updateMatrixWorld(true)
    const encontrados: { pos: PosicionVisor3D; geometry: THREE.BufferGeometry; matrix: THREE.Matrix4 }[] = []
    posiciones.forEach(pos => {
      const node = scene.getObjectByName(pos.codigo) as THREE.Mesh | undefined
      if (node && (node as any).isMesh && node.geometry) {
        node.visible = false // ocultamos el mesh original; lo re-dibujamos con color dinámico
        encontrados.push({ pos, geometry: node.geometry, matrix: node.matrixWorld.clone() })
      }
    })
    return encontrados
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, posiciones])

  const skuActivo = !!filtroSku && filtroSku.trim().length > 0
  const nombreActivo = !!filtroNombre && filtroNombre.trim().length > 0
  const categoriaActiva = !!filtroCategoriaId && filtroCategoriaId.trim().length > 0
  const rotacionActiva = !!filtroRotacion && filtroRotacion.length > 0
  const filtroProductoActivo = skuActivo || nombreActivo || categoriaActiva
  const filtroActivo = filtroProductoActivo || rotacionActiva
  const skuLower = filtroSku?.trim().toLowerCase() ?? ''
  const nombreLower = filtroNombre?.trim().toLowerCase() ?? ''

  return (
    <>
      {bins.map(({ pos, geometry, matrix }) => {
        const stock = stockPorPosicion[pos.id] ?? 0
        const productos = detallePorPosicion[pos.id] ?? []
        const clasificacionPos = clasificacionPorPosicion[pos.id] ?? 'Sin datos'

        const cumpleProducto = !filtroProductoActivo || productos.some(p =>
          (!skuActivo || p.sku.toLowerCase().includes(skuLower)) &&
          (!nombreActivo || p.nombre.toLowerCase().includes(nombreLower)) &&
          (!categoriaActiva || p.categoria_id === filtroCategoriaId)
        )
        const cumpleRotacion = !rotacionActiva || filtroRotacion!.includes(clasificacionPos as ClaseRotacion)
        const coincideFiltro = filtroActivo && cumpleProducto && cumpleRotacion

        // Todos los filtros (SKU, nombre, categoría, rotación) ocultan por
        // completo las posiciones que no coinciden — no se dibujan.
        if (filtroActivo && !coincideFiltro) return null

        const isHover = hoverId === pos.id

        let color = modoColor === 'rotacion'
          ? (COLOR_ROTACION[clasificacionPos] ?? COLOR_VACIO)
          : (stock > 0 ? COLOR_CON_STOCK : COLOR_VACIO)
        let emissive = '#000000'
        let emissiveIntensity = 0
        const opacity = 1

        if (filtroActivo && coincideFiltro) {
          if (modoColor === 'ocupacion') {
            color = COLOR_COINCIDE
            emissive = COLOR_COINCIDE
            emissiveIntensity = 0.55
          } else {
            // En modo Rotación no pisamos el color (ya es semántico: Alta/Media/Baja).
            emissive = COLOR_MATCH_GLOW
            emissiveIntensity = 0.6
          }
        }
        if (isHover) {
          emissive = COLOR_HOVER_EMISSIVE
          emissiveIntensity = 0.8
        }

        return (
          <group key={pos.id} matrix={matrix} matrixAutoUpdate={false}>
            <mesh
              geometry={geometry}
              castShadow
              receiveShadow
              onPointerOver={(e) => { e.stopPropagation(); setHoverId(pos.id) }}
              onPointerOut={(e) => { e.stopPropagation(); setHoverId(id => (id === pos.id ? null : id)) }}
              onClick={(e) => { e.stopPropagation(); onSeleccionarPosicion?.(pos) }}
            >
              <meshStandardMaterial
                color={color}
                emissive={emissive}
                emissiveIntensity={emissiveIntensity}
                transparent={opacity < 1}
                opacity={opacity}
                roughness={0.35}
                metalness={0.15}
              />
            </mesh>
            {isHover && (
              <Html distanceFactor={7} position={[0, 0.35, 0]} style={{ pointerEvents: 'none' }} center>
                <div className="px-4 py-3 rounded-lg bg-slate-900/95 text-white text-base shadow-2xl min-w-[240px] max-w-[300px] whitespace-nowrap">
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <p className="font-bold font-mono text-xl">{pos.codigo}</p>
                    {productos.length > 0 && (
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${COLOR_ROTACION[clasificacionPos]}26`, color: COLOR_ROTACION[clasificacionPos] }}
                      >
                        {clasificacionPos}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-300 mb-1.5 text-base">{stock.toLocaleString('es-CL')} unidades</p>
                  {productos.length > 0 ? (
                    <ul className="space-y-1.5">
                      {productos.slice(0, 5).map(p => (
                        <li key={p.producto_id} className="flex flex-col">
                          <div className="flex justify-between gap-3">
                            <span className="font-mono text-slate-200 truncate max-w-[150px] text-base">{p.sku}</span>
                            <span className="text-slate-400 text-base">{p.stock.toLocaleString('es-CL')} u.</span>
                          </div>
                          <span className="text-slate-400 text-sm truncate whitespace-nowrap">{p.nombre}</span>
                        </li>
                      ))}
                      {productos.length > 5 && (
                        <li className="text-slate-500 text-sm">+{productos.length - 5} más</li>
                      )}
                    </ul>
                  ) : (
                    <p className="text-slate-500 italic text-base">Posición vacía</p>
                  )}
                </div>
              </Html>
            )}
          </group>
        )
      })}
    </>
  )
}

function Modelo(props: Visor3DProps) {
  const { scene } = useGLTF(props.disenoUrl)
  // Clonamos para no mutar el objeto cacheado por useGLTF entre renders/instancias.
  const escena = useMemo(() => scene.clone(true), [scene])

  return (
    <>
      <primitive object={escena} />
      <BinsInteractivos
        scene={escena}
        posiciones={props.posiciones}
        stockPorPosicion={props.stockPorPosicion}
        detallePorPosicion={props.detallePorPosicion ?? {}}
        clasificacionPorPosicion={props.clasificacionPorPosicion ?? {}}
        modoColor={props.modoColor}
        filtroSku={props.filtroSku}
        filtroNombre={props.filtroNombre}
        filtroCategoriaId={props.filtroCategoriaId}
        filtroRotacion={props.filtroRotacion}
        onSeleccionarPosicion={props.onSeleccionarPosicion}
      />
    </>
  )
}

function Cargando() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2 text-slate-400 text-sm">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-[#1AABF0] rounded-full animate-spin" />
        Cargando modelo 3D…
      </div>
    </Html>
  )
}

export default function Visor3D(props: Visor3DProps) {
  return (
    <div className="relative w-full h-full min-h-[360px] rounded-xl overflow-hidden bg-gradient-to-b from-slate-100 to-slate-200 border border-slate-200">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [9, 7.5, 11], fov: 42 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      >
        <color attach="background" args={['#eef2f7']} />
        <ambientLight intensity={0.55} />
        <directionalLight
          position={[6, 11, 5]}
          intensity={1.5}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-12}
          shadow-camera-right={12}
          shadow-camera-top={12}
          shadow-camera-bottom={-12}
        />
        <Suspense fallback={<Cargando />}>
          <Modelo {...props} />
          <Environment preset="city" />
        </Suspense>
        <ContactShadows position={[0, 0.001, 0]} opacity={0.4} scale={22} blur={2.2} far={10} />
        <Grid
          position={[0, 0, 0]}
          args={[10, 10]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#cbd5e1"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#94a3b8"
          fadeDistance={30}
          fadeStrength={1}
          infiniteGrid
        />
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={4}
          maxDistance={32}
          maxPolarAngle={Math.PI / 2.05}
        />
      </Canvas>
    </div>
  )
}
