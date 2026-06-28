from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from pydantic import BaseModel
import os
import uuid
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

class Movimiento(BaseModel):
    empresa_id: str
    producto_id: str
    tipo: str
    cantidad: float
    ubicacion_id: str = None 

# --- ENDPOINTS ---

@app.get("/")
def ruta_raiz():
    return {"status": "online", "message": "Backend Axioma Logística listo"}

# 1. Obtener inventario
@app.get("/api/v1/logistica/stock")
def obtener_stock():
    try:
        response = supabase.table("productos").select("sku, nombre, categoria, stock_actual").execute()
        return {"success": True, "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 2. Registrar movimiento
# Nota: Ahora el backend no busca UUIDs, registra directamente el texto 
# y espera que la lógica del frontend envíe la cantidad con signo (+ o -)
@app.post("/api/v1/logistica/movimientos")
def registrar_movimiento(movimiento: Movimiento):
    try:
        data_to_insert = movimiento.dict(exclude_none=True)
        
        # Generar ID único localmente ya que la tabla es TEXT
        data_to_insert["id"] = str(uuid.uuid4())
        
        # Insertar directamente sin búsquedas ni validaciones de UUID
        supabase.table("movimientos").insert(data_to_insert).execute()
        return {"success": True, "message": "Movimiento registrado correctamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))