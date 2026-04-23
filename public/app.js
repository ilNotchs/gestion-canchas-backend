// === 1. LOGIN Y SEGURIDAD ===
const formLogin = document.getElementById('form-login');

if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('user').value;
        const password = document.getElementById('pass').value;

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();

            if (data.success) {
                localStorage.setItem('usuario', JSON.stringify(data.usuario));
                aplicarRoles(data.usuario);
                document.getElementById('login-overlay').style.display = 'none';
            } else {
                document.getElementById('error-login').style.display = 'block';
            }
        } catch (e) { alert("Error de servidor."); }
    });
}

function aplicarRoles(usuario) {
    const btnInv = document.querySelector('button[onclick*="inventario"]');
    const btnDash = document.querySelector('button[onclick*="dashboard"]');

    if (usuario.rol === 'cliente') {
        if (btnInv) btnInv.style.display = 'none';
        if (btnDash) btnDash.style.display = 'none';
        mostrarModulo('reservar'); // El cliente va directo a reservar
    } else {
        if (btnInv) btnInv.style.display = 'block';
        if (btnDash) btnDash.style.display = 'block';
        mostrarModulo('dashboard'); // El admin va directo al dashboard
    }
}

// === 2. NAVEGACIÓN ===
function mostrarModulo(id) {
    // Ocultar todo
    document.querySelectorAll('.modulo').forEach(m => {
        m.style.display = 'none';
        m.classList.remove('activo');
    });
    document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));

    // Mostrar el seleccionado
    const mod = document.getElementById(`modulo-${id}`);
    if (mod) {
        mod.style.display = 'block';
        setTimeout(() => mod.classList.add('activo'), 10);
    }
    
    // Iluminar botón
    const btn = document.querySelector(`button[onclick*="${id}"]`);
    if (btn) btn.classList.add('active');

    if (id === 'dashboard') cargarDashboard();
    if (id === 'inventario') cargarInventario();
}

// === 3. DATOS ===
async function cargarDashboard() {
    try {
        const [rInv, rCan, rRes] = await Promise.all([
            fetch('/api/inventario'), fetch('/api/canchas'), fetch('/api/reservas/activas')
        ]);
        const inv = await rInv.json(), can = await rCan.json(), res = await rRes.json();

        const perc = can.length === 0 ? 0 : (res.length / can.length) * 100;
        document.getElementById('stat-ocupacion').innerText = `${perc.toFixed(0)}%`;
        document.getElementById('barra-ocupacion').style.width = `${perc}%`;
        document.getElementById('stat-ingresos').innerText = `$${res.length * 85000}`;
        
        const b = inv.find(i => i.articulo === 'Balón');
        document.getElementById('stat-balones').innerText = b ? b.cantidad_disponible : 0;
        
        const tar = document.getElementById('tarjeta-alerta-balones');
        if (b && b.cantidad_disponible < 5) tar.classList.add('alerta-animada');
        else tar.classList.remove('alerta-animada');
    } catch (e) { console.error(e); }
}

async function cargarInventario() {
    const sesion = localStorage.getItem('usuario');
    const u = sesion ? JSON.parse(sesion) : null;
    const esAdmin = u && u.rol === 'admin';

    const [rc, rr] = await Promise.all([fetch('/api/canchas'), fetch('/api/reservas/activas')]);
    const can = await rc.json(), res = await rr.json();

    document.getElementById('lista-canchas').innerHTML = can.map(c => {
        const r = res.find(re => re.cancha_id === c.id);
        return `<div class="tarjeta-inv">
            <h4>${c.nombre}</h4>
            ${r ? `<p>Ocupada por: ${r.nombre_cliente}</p> ${esAdmin ? `<button onclick="cancelarReserva(${r.id})" style="background:#dc3545; color:white; border:none; padding:5px; cursor:pointer;">Cancelar</button>` : ''}` : '<p style="color:green">✅ Disponible</p>'}
        </div>`;
    }).join('');
}

// === INICIO AUTOMÁTICO ===
window.onload = () => {
    const sesion = localStorage.getItem('usuario');
    if (sesion) {
        const u = JSON.parse(sesion);
        aplicarRoles(u);
        document.getElementById('login-overlay').style.display = 'none';
    }
};

function calcularTotal() {
    const s = document.getElementById('tipo-cancha');
    const p = s.options[s.selectedIndex].getAttribute('data-precio');
    document.getElementById('factura-total').innerText = `$${parseInt(p).toLocaleString()}`;
}

function cerrarSesion() { localStorage.removeItem('usuario'); location.reload(); }

function descargarPDF() {
    const el = document.getElementById('recibo-imprimible');
    document.getElementById('logo-recibo').style.display = 'block';
    html2pdf().set({ margin: 1, filename: 'Recibo_FitCanchas.pdf' }).from(el).save().then(() => {
        document.getElementById('logo-recibo').style.display = 'none';
    });
}