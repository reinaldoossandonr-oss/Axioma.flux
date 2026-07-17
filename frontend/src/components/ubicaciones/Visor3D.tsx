'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Environment, Grid, Html, useGLTF, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'

// Ángulo de elevación de la cámara por defecto. El valor anterior (9, 7.5, 11)
// mira casi "al ras del piso" (~28° sobre la horizontal): a ese ángulo tan
// rasante, el plano del suelo ocupa la mayor parte del encuadre por simple
// perspectiva (foreshortening), dejando los racks apretados en una franja
// angosta arriba — es la causa real del "espacio gris sin usar" que se veía
// abajo, sin importar cuánto se recentre o acerque la cámara. Con un ángulo
// más picado (~55° sobre la horizontal, más "vista de pájaro") se ve mucho
// menos piso vacío y los racks llenan el encuadre.
const CAMARA_INICIAL: [number, number, number] = [6.5, 13, 6.5]

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

export const COLOR_VACIO = '#94a3b8'      // slate-400
export const COLOR_CON_STOCK = '#1AABF0'  // azul de marca
const COLOR_HOVER_EMISSIVE = '#1AABF0'

// Mismos tonos que el badge de clasificación en el resto del dashboard.
export const COLOR_ROTACION: Record<string, string> = {
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

        // El color base siempre refleja el modo activo (ocupación o rotación);
        // los filtros nunca lo reemplazan, solo agregan un brillo para resaltar coincidencias.
        const color = modoColor === 'rotacion'
          ? (COLOR_ROTACION[clasificacionPos] ?? COLOR_VACIO)
          : (stock > 0 ? COLOR_CON_STOCK : COLOR_VACIO)
        let emissive = '#000000'
        let emissiveIntensity = 0
        const opacity = 1

        if (filtroActivo && coincideFiltro) {
          // Brillo de coincidencia: usa el MISMO tono del color base (ocupación o
          // rotación), solo con más luminosidad. Así resalta sin teñir ni alterar
          // el color semántico (antes usaba un celeste fijo que "ensuciaba" los
          // colores de rotación al combinarse con verde/ámbar/rojo).
          emissive = color
          emissiveIntensity = 0.55
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

// La cámara por defecto mira a (0,0,0). Si el modelo subido no está
// centrado en el origen del mundo (lo más común: cada diseño se modela en
// su propia posición), el visor termina apuntando a un punto vacío y los
// racks quedan arrinconados en una esquina del encuadre, con mucho piso
// "muerto" alrededor. Este componente NO cambia el zoom ni la distancia
// (para no repetir los intentos anteriores de "adivinar" la escala): solo
// desplaza la cámara y el punto de mira para que apunten al centro real de
// las posiciones, manteniendo el mismo ángulo y la misma distancia relativa
// que el encuadre por defecto.
function CentrarVista({
  escena,
  posiciones,
  controlsRef,
  onCentro,
}: {
  escena: THREE.Object3D
  posiciones: PosicionVisor3D[]
  controlsRef: React.MutableRefObject<any>
  onCentro: (centro: [number, number, number]) => void
}) {
  const { camera } = useThree()

  useEffect(() => {
    escena.updateMatrixWorld(true)

    const box = new THREE.Box3()
    let coincidencias = 0
    posiciones.forEach(pos => {
      const nodo = escena.getObjectByName(pos.codigo)
      if (nodo) {
        box.expandByObject(nodo)
        coincidencias++
      }
    })
    // Si ninguna posición coincide por nombre, centramos en el modelo
    // completo (mejor que dejar la cámara mirando al vacío).
    if (coincidencias === 0) box.setFromObject(escena)
    if (box.isEmpty()) return

    const centro = box.getCenter(new THREE.Vector3())
    const offset = new THREE.Vector3(...CAMARA_INICIAL)

    camera.position.copy(centro.clone().add(offset))
    camera.lookAt(centro)

    if (controlsRef.current) {
      controlsRef.current.target.copy(centro)
      controlsRef.current.update()
    }

    onCentro([centro.x, centro.y, centro.z])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escena, posiciones])

  return null
}

function Modelo(props: Visor3DProps & { controlsRef: React.MutableRefObject<any>; onCentro: (centro: [number, number, number]) => void }) {
  const { scene } = useGLTF(props.disenoUrl)
  // Clonamos para no mutar el objeto cacheado por useGLTF entre renders/instancias.
  const escena = useMemo(() => scene.clone(true), [scene])

  return (
    <>
      <primitive object={escena} />
      <CentrarVista escena={escena} posiciones={props.posiciones} controlsRef={props.controlsRef} onCentro={props.onCentro} />
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
  const controlsRef = useRef<any>(null)
  const [centro, setCentro] = useState<[number, number, number]>([0, 0, 0])

  // En vez de adivinar matemáticamente el encuadre "perfecto" (que depende
  // de la escala y forma de cada modelo subido, y es imposible de acertar a
  // ciegas), le damos control manual y directo al usuario: botones de
  // acercar/alejar/restablecer, y un rango de zoom bien amplio para que
  // pueda ajustar la vista él mismo con la rueda del mouse o estos botones.
  function escalarDistancia(factor: number) {
    const controls = controlsRef.current
    if (!controls) return
    const camera = controls.object as THREE.PerspectiveCamera
    const target = controls.target as THREE.Vector3
    const offset = camera.position.clone().sub(target)
    offset.multiplyScalar(factor)
    const distanciaMin = controls.minDistance ?? 0.5
    const distanciaMax = controls.maxDistance ?? 200
    const distanciaActual = offset.length()
    if (distanciaActual < distanciaMin) offset.setLength(distanciaMin)
    if (distanciaActual > distanciaMax) offset.setLength(distanciaMax)
    camera.position.copy(target.clone().add(offset))
    controls.update()
  }

  function restablecerVista() {
    const controls = controlsRef.current
    if (!controls) return
    const camera = controls.object as THREE.PerspectiveCamera
    camera.position.set(centro[0] + CAMARA_INICIAL[0], centro[1] + CAMARA_INICIAL[1], centro[2] + CAMARA_INICIAL[2])
    controls.target.set(...centro)
    controls.update()
  }

  return (
    <div className="relative w-full h-full min-h-[360px] rounded-xl overflow-hidden bg-gradient-to-b from-slate-100 to-slate-200 border border-slate-200">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: CAMARA_INICIAL, fov: 42 }}
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
          <Modelo {...props} controlsRef={controlsRef} onCentro={setCentro} />
          <Environment preset="city" />
        </Suspense>
        <ContactShadows position={[centro[0], 0.001, centro[2]]} opacity={0.4} scale={22} blur={2.2} far={10} />
        <Grid
          position={[centro[0], 0, centro[2]]}
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
          ref={controlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={0.8}
          maxDistance={80}
          maxPolarAngle={Math.PI / 2.05}
        />
      </Canvas>

      {/* Controles manuales de zoom: no dependen de adivinar la escala del
          modelo, el usuario ajusta la vista directamente. */}
      <div className="absolute bottom-3 left-3 flex flex-col gap-1.5 z-10">
        <button
          type="button"
          onClick={() => escalarDistancia(0.7)}
          title="Acercar"
          aria-label="Acercar"
          className="w-8 h-8 rounded-lg bg-white/90 hover:bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-700 font-bold text-lg leading-none transition-colors"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => escalarDistancia(1 / 0.7)}
          title="Alejar"
          aria-label="Alejar"
          className="w-8 h-8 rounded-lg bg-white/90 hover:bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-700 font-bold text-lg leading-none transition-colors"
        >
          −
        </button>
        <button
          type="button"
          onClick={restablecerVista}
          title="Restablecer vista"
          aria-label="Restablecer vista"
          className="w-8 h-8 rounded-lg bg-white/90 hover:bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>
  )
}
