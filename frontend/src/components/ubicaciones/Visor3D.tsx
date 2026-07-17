'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
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

interface Encuadre {
  centro: [number, number, number]
  radio: number
  pisoY: number
}

// Ajusta automáticamente cámara + controles + piso al tamaño real del modelo
// cargado. Antes la cámara usaba una posición fija pensada para un modelo de
// referencia: si el diseño subido por el usuario tiene otra escala o su
// origen no está centrado en (0,0,0), el modelo terminaba diminuto, cortado
// o desplazado hacia una esquina del canvas (dejando la mayor parte del
// espacio vacío). Este componente centra la vista en el modelo real cada vez
// que se carga un diseño nuevo.
function AutoEncuadre({
  escena,
  controlsRef,
  onEncuadre,
}: {
  escena: THREE.Object3D
  controlsRef: React.MutableRefObject<any>
  onEncuadre: (e: Encuadre) => void
}) {
  const { camera } = useThree()

  useEffect(() => {
    const box = new THREE.Box3().setFromObject(escena)
    if (box.isEmpty()) return

    const centro = box.getCenter(new THREE.Vector3())
    const persp = camera as THREE.PerspectiveCamera
    const aspect = persp.aspect || 1
    const vFov = (persp.fov * Math.PI) / 180
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect)

    // Un ajuste basado en "esfera envolvente" es demasiado conservador para
    // modelos alargados (una fila larga de racks, angosta en altura): asume
    // que toda la diagonal 3D debe entrar en el ángulo más chico, aunque en
    // la práctica esa diagonal se proyecte sobre todo en el eje horizontal
    // (que en un panel ancho tiene mucho más margen). En vez de eso,
    // proyectamos las 8 esquinas del bounding box sobre los ejes reales
    // "derecha" y "arriba" de la cámara para este ángulo de vista, y
    // encuadramos el ancho contra el FOV horizontal y el alto contra el FOV
    // vertical por separado — así se aprovecha todo el espacio disponible.
    const direccion = new THREE.Vector3(9, 7.5, 11).normalize()
    const worldUp = new THREE.Vector3(0, 1, 0)
    const forward = direccion.clone().negate()
    let right = new THREE.Vector3().crossVectors(forward, worldUp)
    if (right.lengthSq() < 1e-6) right = new THREE.Vector3(1, 0, 0)
    right.normalize()
    const up = new THREE.Vector3().crossVectors(right, forward).normalize()

    let mitadAncho = 0.1
    let mitadAlto = 0.1
    const esquina = new THREE.Vector3()
    const relativo = new THREE.Vector3()
    for (let i = 0; i < 8; i++) {
      esquina.set(
        i & 1 ? box.max.x : box.min.x,
        i & 2 ? box.max.y : box.min.y,
        i & 4 ? box.max.z : box.min.z,
      )
      relativo.subVectors(esquina, centro)
      mitadAncho = Math.max(mitadAncho, Math.abs(relativo.dot(right)))
      mitadAlto = Math.max(mitadAlto, Math.abs(relativo.dot(up)))
    }

    const distanciaAncho = mitadAncho / Math.tan(hFov / 2)
    const distanciaAlto = mitadAlto / Math.tan(vFov / 2)
    // Margen de ~15% para que el modelo no quede pegado a los bordes.
    const distancia = Math.max(distanciaAncho, distanciaAlto, 1) * 1.15

    camera.position.copy(centro.clone().add(direccion.multiplyScalar(distancia)))
    persp.near = Math.max(distancia / 100, 0.01)
    persp.far = distancia * 20
    persp.updateProjectionMatrix()
    camera.lookAt(centro)

    if (controlsRef.current) {
      controlsRef.current.target.copy(centro)
      controlsRef.current.minDistance = Math.max(distancia * 0.12, 0.5)
      controlsRef.current.maxDistance = distancia * 4
      controlsRef.current.update()
    }

    const tamano = box.getSize(new THREE.Vector3())
    const radioReporte = Math.max(mitadAncho, mitadAlto, tamano.length() / 2)
    onEncuadre({ centro: [centro.x, centro.y, centro.z], radio: radioReporte, pisoY: box.min.y })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escena])

  return null
}

function Modelo(props: Visor3DProps & { controlsRef: React.MutableRefObject<any>; onEncuadre: (e: Encuadre) => void }) {
  const { scene } = useGLTF(props.disenoUrl)
  // Clonamos para no mutar el objeto cacheado por useGLTF entre renders/instancias.
  const escena = useMemo(() => scene.clone(true), [scene])

  return (
    <>
      <primitive object={escena} />
      <AutoEncuadre escena={escena} controlsRef={props.controlsRef} onEncuadre={props.onEncuadre} />
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
  const [encuadre, setEncuadre] = useState<Encuadre | null>(null)

  // El piso (Grid) y la sombra de contacto se reposicionan bajo el modelo
  // real una vez que se calcula su encuadre, en vez de asumir que el modelo
  // siempre está centrado en el origen.
  const centroPiso: [number, number, number] = encuadre
    ? [encuadre.centro[0], encuadre.pisoY, encuadre.centro[2]]
    : [0, 0, 0]
  const escalaPiso = encuadre ? Math.max(encuadre.radio * 2.2, 10) : 22

  return (
    <div className="relative w-full h-full min-h-[65vh] rounded-xl overflow-hidden bg-gradient-to-b from-slate-100 to-slate-200 border border-slate-200">
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
          <Modelo {...props} controlsRef={controlsRef} onEncuadre={setEncuadre} />
          <Environment preset="city" />
        </Suspense>
        <ContactShadows position={[centroPiso[0], centroPiso[1] + 0.001, centroPiso[2]]} opacity={0.4} scale={escalaPiso} blur={2.2} far={10} />
        <Grid
          position={centroPiso}
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
          maxPolarAngle={Math.PI / 2.05}
        />
      </Canvas>
    </div>
  )
}
