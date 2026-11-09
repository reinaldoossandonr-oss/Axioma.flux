'use client'

/** Portada de Axioma Flux (la misma de la app de Apps Script). "Entrar" lleva al login. */
import { useEffect } from 'react'
import { LOGO_SVG } from './marca'
import './portada.css'

export default function Portada() {
  useEffect(() => {
    const entrar = () => { window.location.href = '/login' }
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Enter') entrar() }
    document.addEventListener('keydown', tecla)
    return () => document.removeEventListener('keydown', tecla)
  }, [])

  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: LOGO_SVG }} />
      <div id="portada" role="dialog" aria-label="Portada">
        <video id="p-video" autoPlay muted loop playsInline preload="auto"
          src="https://axiomaanalytics.com/wp-content/uploads/2026/06/13814619_3840_2160_100fps.mp4" />
        <div className="p-capa" />
        <div className="p-bloque">
          <svg className="p-logo" viewBox="215 260 825 200" role="img" aria-label="Axioma">
            <use href="#logo-axioma" x="215" y="260" width="825" height="200" />
          </svg>
          <div className="p-ante">— Bodega &amp; distribución</div>
          <div className="p-titulo">Cada producto en su lugar,<br /><span>cada decisión a tiempo</span></div>
          <p className="p-texto">Inventario, posiciones de bodega, embudo comercial y facturación en una sola pantalla.</p>
          <div className="p-botones">
            <a className="p-entrar" href="/login" style={{ textDecoration: 'none' }}>Entrar a la aplicación →</a>
            <a className="p-soporte" href="tel:+34634042251">Soporte</a>
          </div>
        </div>
      </div>
    </>
  )
}
