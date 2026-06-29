// Asegúrate de que esta sea la forma correcta de inicializar en tu versión de la librería
const SUPABASE_URL = 'https://legtxgdwqjfzvlvheaao.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Mantenla igual

const clienteAuth = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.getElementById('loginForm').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const { data, error } = await clienteAuth.auth.signInWithPassword({ 
        email, 
        password 
    });

    if (error) {
        alert("Error de acceso: " + error.message);
    } else {
        // --- AQUÍ ESTABA LA MAGIA QUE FALTABA ---
        // Guardamos el token en localStorage para que index.html pueda leerlo
        if (data.session && data.session.access_token) {
            localStorage.setItem('supabase_token', data.session.access_token);
            
            // Redirigir al dashboard
            window.location.href = 'index.html'; 
        } else {
            alert("Error: No se recibió la sesión correctamente.");
        }
    }
};