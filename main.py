from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from pydantic import BaseModel
import os
from dotenv import load_dotenv

# Configuración
load_dotenv()
app = FastAPI(title="Axioma Logística API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Conexión Supabase
supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

# --- MODELOS ---
class Producto(BaseModel):
    empresa_id: str
    sku: str
    nombre: str
    categoria: str
    stock_actual: float
    proveedor: str

# --- ENDPOINTS ---

@app.get("/")
def ruta_raiz():
    return {"status": "online", "message": "Backend Axioma Logística listo"}

# 1. Obtener inventario para gráficos y tabla (ACTUALIZADO)
@app.get("/api/v1/logistica/stock")
def obtener_stock():
    try:
        # Se agregaron 'sku' y 'categoria' al select
        response = supabase.table("productos").select("sku, nombre, categoria, stock_actual").execute()
        return {"success": True, "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 2. Registrar movimiento (Entrada/Salida)
@app.post("/api/v1/logistica/movimientos") # Ajustado a plural para coincidir con tu fetch en JS
def registrar_movimiento(empresa_id: str, producto_id: str, tipo: str, cantidad: float):
    try:
        data = supabase.table("movimientos").insert({
            "empresa_id": empresa_id,
            "producto_id": producto_id,
            "tipo": tipo,
            "cantidad": cantidad
        }).execute()
        return {"success": True, "message": "Movimiento registrado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))