// 1. Inicialización
const SUPABASE_URL = 'https://legtxgdwqjfzvlvheaao.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxlZ3R4Z2R3cWpmenZsdmhlYWFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNjM5MDAsImV4cCI6MjA5NzYzOTkwMH0.EXACa14BiJshtfU8i-1SmpjTtOYjlCjyNUiazd8RX20'; // Asegúrate de tener la clave correcta

const clienteSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. Función global de navegación
window.mostrarSeccion = (id, el) => {
    document.querySelectorAll('.main-content > div[id^="seccion-"]').forEach(s => s.classList.add('hidden'));
    const seccion = document.getElementById('seccion-' + id);
    if(seccion) seccion.classList.remove('hidden');
    
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if(el) el.classList.add('active');
    
    // Si la sección es inventario, cargamos los datos
    if(id === 'inventario') cargarInventario();
};

// 3. Función del buscador para Inventario
window.filtrarInventario = () => {
    const input = document.getElementById('buscadorInventario');
    const filtro = input.value.toLowerCase();
    const tabla = document.getElementById('cuerpoTablaInventario');
    const filas = tabla.getElementsByTagName('tr');

    for (let i = 0; i < filas.length; i++) {
        const textoFila = filas[i].textContent.toLowerCase();
        filas[i].style.display = textoFila.includes(filtro) ? "" : "none";
    }
};

// 4. Carga de datos de productos (Usando tu lógica de backend profesional)
async function cargarInventario() {
    try {
        // AQUÍ ES DONDE LLAMARÁS A TU API DE RENDER
        // const response = await fetch('https://tu-api-en-render.com/api/v1/logistica/stock');
        // Por ahora, para probar, mantenemos la llamada directa a Supabase:
        const { data, error } = await clienteSupabase.from('productos').select('*');
        
        if (error) throw error;
        
        const tabla = document.getElementById('cuerpoTablaInventario');
        if (tabla && data) {
            tabla.innerHTML = data.map(p => `
                <tr>
                    <td>${p.sku}</td>
                    <td>${p.nombre}</td>
                    <td>${p.categoria}</td>
                    <td>${p.stock_actual}</td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error("Error cargando inventario:", err);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // Inicialización del Gráfico de Stock
    const ctx = document.getElementById('graficoStock');
    if (ctx) {
        cargarDatosGrafico(ctx);
    }
});

async function cargarDatosGrafico(ctx) {
    const { data, error } = await clienteSupabase.from('productos').select('nombre, stock_actual');
    if (error) return;

    new Chart(ctx.getContext('2d'), { 
        type: 'bar', 
        data: { 
            labels: data.map(p => p.nombre), 
            datasets: [{ 
                label: 'Stock Disponible', 
                data: data.map(p => p.stock_actual), 
                backgroundColor: '#1aabf0' 
            }] 
        }
    });
}