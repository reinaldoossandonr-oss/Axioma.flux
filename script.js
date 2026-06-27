// Inicialización correcta usando el SDK cargado vía CDN
const clienteSupabase = supabase.createClient(
    'https://legtxgdwqjfzvlvheaao.supabase.co', 
    'sb_publishable_OpquiXUBHpb7_a9MvT92Qw_jC8V1...' // Asegúrate de que esta sea tu llave pública completa
);

function mostrarMensaje(t, e) {
    const f = document.getElementById('mensaje-feedback');
    f.textContent = t; f.style.display = 'block';
    f.style.backgroundColor = e ? '#d1fae5' : '#fee2e2';
    f.style.color = e ? '#065f46' : '#991b1b';
    setTimeout(() => f.style.display = 'none', 4000);
}

function mostrarSeccion(id, el) {
    document.querySelectorAll('.main-content > div[id^="seccion-"]').forEach(s => s.classList.add('hidden'));
    document.getElementById('seccion-' + id).classList.remove('hidden');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    el.classList.add('active');
    if(id === 'dotacion') cargarDotacion();
}

function filtrarTabla() {
    const input = document.getElementById("buscador").value.toLowerCase();
    const filas = document.querySelectorAll("#tablaDotacion tbody tr");
    filas.forEach(fila => {
        const nombre = fila.cells[0].textContent.toLowerCase();
        fila.style.display = nombre.includes(input) ? "" : "none";
    });
}

async function cargarDotacion() {
    // Uso del cliente renombrado
    const { data, error } = await clienteSupabase.from('empleados').select('*');
    if (error) return console.error("Error cargando dotación:", error);
    
    document.getElementById('cuerpoTabla').innerHTML = data.map(e => `
        <tr>
            <td style="padding:15px; border-bottom:1px solid #eee;">${e.nombre} ${e.apellido}</td>
            <td style="padding:15px; border-bottom:1px solid #eee;">${e.rol_cargo}</td>
            <td style="padding:15px; border-bottom:1px solid #eee;">${e.area_operacion}</td>
        </tr>`).join('');
}

document.getElementById('formNuevoUsuario').onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    
    // Inserción en Supabase
    const { error } = await clienteSupabase.from('empleados').insert([data]);
    
    if (!error) {
        mostrarMensaje("Empleado registrado con éxito", true);
        document.getElementById('modalRegistro').style.display='none';
        e.target.reset();
        cargarDotacion();
    } else {
        mostrarMensaje("Error: " + error.message, false);
    }
};

// Carga inicial del gráfico
clienteSupabase.from('produccion').select('*').then(({ data }) => {
    if (!data) return;
    const ctx = document.getElementById('graficoRendimiento').getContext('2d');
    new Chart(ctx, { 
        type: 'bar', 
        data: { 
            labels: data.map(d => d.fecha), 
            datasets: [{ label: 'Producción', data: data.map(v => v.total), backgroundColor: '#1aabf0' }] 
        }, 
        options: { responsive: true, maintainAspectRatio: false } 
    });
});