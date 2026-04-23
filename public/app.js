// === 1. SISTEMA DE LOGIN Y ROLES ===
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
        } catch (e) { alert("Error al conectar con el servidor."); }
    });
}

function aplicarRoles(usuario) {
    const btnInventario = document.getElementById('btn-nav-inventario');
    const btnDashboard = document.getElementById('btn-nav-dashboard');

    if (usuario.rol === 'cliente') {
        if (btnInventario) btnInventario.style.display = 'none';
        if (btnDashboard) btnDashboard.style.display = 'none';
        mostrarModulo('reservar');
    } else {
        if (btnInventario) btnInventario.style.display = 'block';
        if (btnDashboard) btnDashboard.style.display = 'block';
        mostrarModulo('dashboard');
    }
}

function cerrarSesion() {
    localStorage.removeItem('usuario');
    location.reload();
}

// === 2. NAVEGACIÓN Y DASHBOARD ===
function mostrarModulo(moduloId) {
    document.querySelectorAll('.modulo').forEach(m => {
        m.classList.remove('activo');
        setTimeout(() => m.style.display = 'none', 300);
    });
    document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));

    setTimeout(() => {
        const mod = document.getElementById(`modulo-${moduloId}`);
        if (mod) {
            mod.style.display = 'block';
            setTimeout(() => mod.classList.add('activo'), 50);
        }
    }, 310);

    if (moduloId === 'inventario') cargarInventario();
    if (moduloId === 'dashboard') cargarDashboard();
}

async function cargarDashboard() {
    try {
        const [resInv, resCan, resRes] = await Promise.all([
            fetch('/api/inventario'), fetch('/api/canchas'), fetch('/api/reservas/activas')
        ]);
        const inv = await resInv.json(), can = await resCan.json(), res = await resRes.json();

        // Ocupación
        const perc = can.length === 0 ? 0 : (res.length / can.length) * 100;
        document.getElementById('stat-ocupacion').innerText = `${perc.toFixed(0)}%`;
        document.getElementById('barra-ocupacion').style.width = `${perc}%`;

        // Ingresos
        const ingresos = res.length * 80000; // Valor promedio por reserva
        document.getElementById('stat-ingresos').innerText = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(ingresos);

        // Alerta Balones
        const balones = inv.find(i => i.articulo === 'Balón');
        const disp = balones ? balones.cantidad_disponible : 0;
        document.getElementById('stat-balones').innerText = disp;
        const tarjeta = document.getElementById('tarjeta-alerta-balones');
        if (disp < 5) tarjeta.classList.add('alerta-animada');
        else tarjeta.classList.remove('alerta-animada');
    } catch (e) { console.error(e); }
}

// === 3. FACTURACIÓN Y PDF ===
function calcularTotal() {
    const sel = document.getElementById('tipo-cancha');
    const opt = sel.options[sel.selectedIndex];
    const precioBase = parseInt(opt.getAttribute('data-precio'));
    
    // Auto-completar según tipo
    if (!document.getElementById('balones').dataset.mod) {
        const es11 = sel.value.includes('11v11');
        document.getElementById('petos_rojos').value = es11 ? 11 : 7;
        document.getElementById('petos_azules').value = es11 ? 11 : 7;
        document.getElementById('balones').dataset.mod = "1";
    }

    const extras = (Math.max(0, document.getElementById('balones').value - 1) * 5000);
    const total = precioBase + extras;

    const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' });
    document.getElementById('factura-cancha-precio').innerText = fmt.format(precioBase);
    document.getElementById('factura-total').innerText = fmt.format(total);
    document.getElementById('seccion-extras').style.display = extras > 0 ? 'block' : 'none';
    if(extras > 0) document.getElementById('factura-extras-precio').innerText = fmt.format(extras);
}

function descargarPDF() {
    const element = document.getElementById('recibo-imprimible');
    document.getElementById('logo-recibo').style.display = 'block';
    const opt = { margin: 1, filename: 'Recibo_FitCanchas.pdf', html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'letter' } };
    html2pdf().set(opt).from(element).save().then(() => document.getElementById('logo-recibo').style.display = 'none');
}

// === 4. RESERVAS e INVENTARIO ===
window.addEventListener('DOMContentLoaded', () => {
    const sesion = localStorage.getItem('usuario');
    if (sesion) {
        const u = JSON.parse(sesion);
        aplicarRoles(u);
        document.getElementById('login-overlay').style.display = 'none';
    }
    
    document.getElementById('tipo-cancha').addEventListener('change', () => {
        document.getElementById('balones').dataset.mod = "";
        calcularTotal();
    });
    ['balones','petos_rojos','petos_azules'].forEach(id => document.getElementById(id).addEventListener('input', calcularTotal));
});

document.getElementById('form-reserva').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nuevaReserva = {
        nombre_cliente: document.getElementById('nombre').value,
        cancha_id: document.getElementById('tipo-cancha').value.includes('11v11') ? 1 : 12,
        fecha_reserva: document.getElementById('fecha').value,
        hora_inicio: document.getElementById('hora').value,
        balones_prestados: document.getElementById('balones').value,
        petos_rojos_prestados: document.getElementById('petos_rojos').value,
        petos_azules_prestados: document.getElementById('petos_azules').value,
        metodo_pago: document.getElementById('metodo-pago').value
    };

    const res = await fetch('/api/reservas', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(nuevaReserva)});
    if (res.ok) { alert("✅ Reserva Exitosa"); location.reload(); }
});

async function cargarInventario() {
    const [ri, rc, rr] = await Promise.all([fetch('/api/inventario'), fetch('/api/canchas'), fetch('/api/reservas/activas')]);
    const inv = await ri.json(), can = await rc.json(), res = await rr.json();
    
    document.getElementById('lista-inventario').innerHTML = inv.map(i => `
        <div class="tarjeta-inv"><h4>${i.articulo}</h4><h3>${i.cantidad_disponible} disp.</h3></div>
    `).join('');

    document.getElementById('lista-canchas').innerHTML = can.map(c => {
        const r = res.find(re => re.cancha_id === c.id);
        return `<div class="tarjeta-inv" style="border-left: 5px solid ${r ? '#dc3545':'#28a745'}">
            <h4>${c.nombre}</h4>${r ? `<p>Ocupada por: ${r.nombre_cliente}</p>` : '<p>Libre</p>'}
        </div>`;
    }).join('');
}