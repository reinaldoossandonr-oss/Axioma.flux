// 1. Inicialización
const API_URL = 'https://axioma-flux.onrender.com';
let miGrafico;
let graficoVentas;

// 2. Función global de navegación
window.mostrarSeccion = (id, el) => {
    document.querySelectorAll('main > div[id^="seccion-"]').forEach(s => s.classList.add('hidden'));
    const seccion = document.getElementById('seccion-' + id);
    if(seccion) seccion.classList.remove('hidden');
    
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if(el) el.classList.add('active');
    
    if(id === 'inventario') cargarInventario();
};

// 3. Función del buscador
window.filtrarInventario = () => {
    const input = document.getElementById('buscadorInventario');
    const filtro = input.value.toLowerCase();
    const tabla = document.getElementById('cuerpoTablaInventario');
    if(!tabla) return;
    const filas = tabla.getElementsByTagName('tr');

    for (let i = 0; i < filas.length; i++) {
        const textoFila = filas[i].textContent.toLowerCase();
        filas[i].style.display = textoFila.includes(filtro) ? "" : "none";
    }
};

// Función para actualizar las tarjetas KPI
function actualizarKPIs(datos) {
    const optimos = datos.filter(p => p.estado_stock === 'Óptimo').length;
    const reponer = datos.filter(p => p.estado_stock === 'REPONER').length;
    
    document.getElementById('kpi-optimo').innerText = optimos;
    document.getElementById('kpi-reponer').innerText = reponer;
    document.getElementById('kpi-total').innerText = datos.length;
}

// 4. Carga de datos de productos (Ajustado a nombres de vista SQL)
async function cargarInventario() {
    try {
        const response = await fetch(`${API_URL}/api/v1/logistica/reporte-inventario`);
        const result = await response.json();
        
        const tabla = document.getElementById('cuerpoTablaInventario');
        if (tabla && result.data) {
            actualizarKPIs(result.data);
            
            tabla.innerHTML = result.data.map(p => {
                // Usamos las propiedades exactas de la vista SQL: nombre, sku, stock_actual, etc.
                const estadoClass = p.estado_stock === 'REPONER' ? 'badge-reponer' : 'badge-optimo';
                return `
                    <tr>
                        <td style="padding: 12px;">${p.nombre || 'N/A'}</td>
                        <td style="padding: 12px;">${p.sku || 'N/A'}</td>
                        <td style="padding: 12px; font-weight: bold;">${p.stock_actual || 0}</td>
                        <td style="padding: 12px;">${p.consumo_promedio_diario || 0}</td>
                        <td style="padding: 12px;">${p.dias_inventario || 0}</td>
                        <td style="padding: 12px;">
                            <span class="badge ${estadoClass}">${p.estado_stock || 'N/A'}</span>
                        </td>
                        <td style="padding: 12px; font-weight: bold; color: #ef4444;">${p.cantidad_a_reponer || 0}</td>
                    </tr>
                `;
            }).join('');
        }
    } catch (err) {
        console.error("Error cargando inventario:", err);
    }
}

// 5. Carga de datos para gráficos
async function cargarDatosGrafico() {
    const ctx = document.getElementById('graficoStock');
    if (!ctx) return;

    try {
        const response = await fetch(`${API_URL}/api/v1/logistica/stock`);
        const result = await response.json();
        const data = result.data;

        if (miGrafico) miGrafico.destroy();
        miGrafico = new Chart(ctx.getContext('2d'), { 
            type: 'bar', 
            data: { 
                labels: data.map(p => p.nombre), 
                datasets: [{ label: 'Stock Disponible', data: data.map(p => p.stock_actual), backgroundColor: '#1aabf0' }] 
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    } catch (err) { console.error("Error gráfico stock:", err); }
}

async function cargarGraficoVentas() {
    const ctx = document.getElementById('graficoVentas');
    if (!ctx) return;
    try {
        const response = await fetch(`${API_URL}/api/v1/logistica/ventas-diarias`);
        const result = await response.json(); 
        
        if (graficoVentas) graficoVentas.destroy();
        graficoVentas = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: result.labels,
                datasets: [{
                    label: 'Unidades Vendidas',
                    data: result.data,
                    borderColor: '#1aabf0',
                    backgroundColor: 'rgba(26, 171, 240, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                scales: { x: { ticks: { maxRotation: 45, minRotation: 45 } } }
            }
        });
    } catch (err) { console.error("Error gráfico ventas:", err); }
}

window.cerrarSesion = async () => {
    // Implementar lógica de signOut de Supabase aquí
    window.location.href = 'login.html';
};

// 7. Registro de movimientos
window.registrarMovimiento = async (event, tipo) => {
    event.preventDefault();
    const form = event.target;
    const datos = {
        producto_id: form.producto_id.value,
        cantidad: parseFloat(form.cantidad.value),
        tipo: tipo
    };
    if (tipo === 'SALIDA') datos.cantidad *= -1;

    try {
        const response = await fetch(`${API_URL}/api/v1/logistica/movimientos`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('supabase_token')}` // Asumiendo que guardas el token aquí
            },
            body: JSON.stringify(datos)
        });

        if (response.ok) {
            alert(`${tipo} registrado con éxito.`);
            form.reset();
            cargarInventario();
            cargarDatosGrafico();
            cargarGraficoVentas();
        } else {
            const err = await response.json();
            alert('Error: ' + (err.detail || 'No se pudo registrar el movimiento.'));
        }
    } catch (err) {
        alert("Error de conexión con el servidor.");
    }
};

document.addEventListener("DOMContentLoaded", () => {
    cargarInventario();
    cargarDatosGrafico();
    cargarGraficoVentas();
});