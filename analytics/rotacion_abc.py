"""
Axioma — Análisis de rotación de inventario y clasificación por rotación.

Calcula, para cada SKU de una empresa, la rotación de inventario en un
periodo y la clasifica en Alta, Media o Baja rotación:

    Rotación = Unidades vendidas (periodo) / Inventario promedio diario (periodo)

El "inventario promedio diario" se calcula promediando el saldo de
existencias reconstruido día por día (no solo el promedio entre el stock
inicial y final), igual que el endpoint /dashboard/tabla-principal del
backend. Este script consulta la misma función de base de datos
(f_rotacion_abc_asof) para que los números coincidan siempre con el
dashboard.

Uso:
    pip install -r analytics/requirements.txt
    python analytics/rotacion_abc.py --empresa-id <uuid> [--dias 90] [--out rotacion_abc.png]

Requiere un archivo .env (en este directorio o en backend/) con:
    SUPABASE_URL=...
    SUPABASE_SERVICE_ROLE_KEY=...
"""

from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns
from dotenv import load_dotenv
from supabase import Client, create_client

# Colores por clasificación — mismos tonos que el badge de la UI
# (verde = Alta, ámbar = Media, rojo = Baja) para que el análisis y el
# dashboard se lean como una sola cosa.
COLOR_POR_CLASE = {
    "Alta": "#059669",       # emerald-600
    "Media": "#D97706",      # amber-600
    "Baja": "#DC2626",       # red-600
    "Sin datos": "#94A3B8",  # slate-400
}
ORDEN_CLASES = ["Alta", "Media", "Baja", "Sin datos"]


def cargar_credenciales() -> tuple[str, str]:
    for candidato in (Path(__file__).parent / ".env", Path(__file__).parent.parent / "backend" / ".env"):
        if candidato.exists():
            load_dotenv(candidato)
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        sys.exit(
            "Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.\n"
            "Define un .env en analytics/ o en backend/ con esas variables."
        )
    return url, key


def obtener_rotacion_abc(db: Client, empresa_id: str, desde: datetime, hasta: datetime) -> pd.DataFrame:
    """Trae rotación + clasificación por producto vía la RPC f_rotacion_abc_asof
    (la misma que usa el dashboard) y le agrega sku/nombre desde `productos`."""
    rotacion = db.rpc(
        "f_rotacion_abc_asof",
        {
            "p_empresa_id": empresa_id,
            "p_desde": desde.isoformat(),
            "p_hasta": hasta.isoformat(),
        },
    ).execute().data or []

    productos = (
        db.table("productos")
        .select("id, sku, nombre")
        .eq("empresa_id", empresa_id)
        .execute()
        .data or []
    )
    productos_por_id = {p["id"]: p for p in productos}

    filas = []
    for r in rotacion:
        p = productos_por_id.get(r["producto_id"], {})
        filas.append({
            "sku": p.get("sku", "?"),
            "nombre": p.get("nombre", "?"),
            "unidades_vendidas": r.get("unidades_vendidas") or 0,
            "inventario_promedio_diario": r.get("inventario_promedio_diario") or 0,
            "rotacion": r.get("rotacion"),
            "clasificacion": r.get("clasificacion") or "Sin datos",
        })

    df = pd.DataFrame(filas)
    if not df.empty:
        df["clasificacion"] = pd.Categorical(df["clasificacion"], categories=ORDEN_CLASES, ordered=True)
        df = df.sort_values(["clasificacion", "rotacion"], ascending=[True, False])
    return df


def graficar_conteo_por_clase(df: pd.DataFrame, empresa_id: str, out_path: str) -> None:
    conteo = df["clasificacion"].value_counts().reindex(ORDEN_CLASES, fill_value=0)
    conteo = conteo[conteo > 0]  # no dibujar clases vacías

    sns.set_theme(style="whitegrid", font_scale=1.05)
    fig, ax = plt.subplots(figsize=(7, 4.5))

    colores = [COLOR_POR_CLASE[c] for c in conteo.index]
    barras = ax.bar(conteo.index.astype(str), conteo.values, color=colores, width=0.55, edgecolor="white")

    for barra, valor in zip(barras, conteo.values):
        ax.text(
            barra.get_x() + barra.get_width() / 2, barra.get_height() + max(conteo.values) * 0.02,
            str(int(valor)), ha="center", va="bottom", fontsize=12, fontweight="medium", color="#1E293B",
        )

    ax.set_title("Clasificación de inventario por rotación", fontsize=14, fontweight="medium", pad=14)
    ax.set_xlabel("")
    ax.set_ylabel("Cantidad de SKUs", fontsize=11, color="#475569")
    ax.set_ylim(0, max(conteo.values) * 1.18)
    ax.spines[["top", "right", "left"]].set_visible(False)
    ax.tick_params(left=False)
    ax.grid(axis="x", visible=False)
    fig.tight_layout()
    fig.savefig(out_path, dpi=180)
    print(f"Gráfico guardado en {out_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Rotación de inventario y clasificación ABC (Axioma)")
    parser.add_argument("--empresa-id", required=True, help="UUID de la empresa (tabla empresas.id)")
    parser.add_argument("--dias", type=int, default=90, help="Tamaño del periodo en días (default 90)")
    parser.add_argument("--out", default="rotacion_abc.png", help="Archivo de salida del gráfico")
    args = parser.parse_args()

    url, key = cargar_credenciales()
    db = create_client(url, key)

    hasta = datetime.now(timezone.utc)
    desde = hasta - timedelta(days=args.dias)

    df = obtener_rotacion_abc(db, args.empresa_id, desde, hasta)
    if df.empty:
        sys.exit("No se encontraron productos para esa empresa.")

    pd.set_option("display.max_rows", None)
    pd.set_option("display.width", 120)
    print(df[["sku", "nombre", "unidades_vendidas", "inventario_promedio_diario", "rotacion", "clasificacion"]]
          .to_string(index=False))
    print()
    print(df["clasificacion"].value_counts().reindex(ORDEN_CLASES, fill_value=0))

    graficar_conteo_por_clase(df, args.empresa_id, args.out)


if __name__ == "__main__":
    main()
