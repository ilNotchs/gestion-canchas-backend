// === 1. LOGIN Y NAVEGACIÓN ===
const formLogin = document.getElementById('form-login');

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

function aplicarRoles(usuario) {
    const btnInv = document.querySelector('button[onclick*="inventario"]');
    const btnDash = document.querySelector('button[onclick*="dashboard"]');

    if (usuario.rol === 'cliente') {
        if (btnInv) btnInv.style.display = 'none';
        if (btnDash) btnDash.style.display = 'none';
        mostrarModulo('reservar');
    } else {
        if (btnInv) btnInv.style.display = 'block';
        if (btnDash) btnDash.style.display = 'block';
        mostrarModulo('dashboard');
    }
}

function mostrarModulo(id) {
    document.querySelectorAll('.modulo').forEach(m => {
        m.classList.remove('activo');
        m.style.display = 'none';
    });
    document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));

    const mod = document.getElementById(`modulo-${id}`);
    if (mod) {
        mod.style.display = 'block';
        setTimeout(() => mod.classList.add('activo'), 10);
    }
    
    const btnActivo = document.querySelector(`button[onclick*="${id}"]`);
    if (btnActivo) btnActivo.classList.add('active');

    if (id === 'dashboard') cargarDashboard();
    if (id === 'inventario') cargarInventario();
}

// === 2. DASHBOARD E INVENTARIO ===
async function cargarDashboard() {
    try {
        const [rInv, rCan, rRes] = await Promise.all([fetch('/api/inventario'), fetch('/api/canchas'), fetch('/api/reservas/activas')]);
        const inv = await rInv.json(), can = await rCan.json(), res = await rRes.json();

        const perc = can.length === 0 ? 0 : (res.length / can.length) * 100;
        document.getElementById('stat-ocupacion').innerText = `${perc.toFixed(0)}%`;
        document.getElementById('barra-ocupacion').style.width = `${perc}%`;
        
        document.getElementById('stat-ingresos').innerText = new Intl.NumberFormat('es-CO', {style:'currency', currency:'COP', maximumFractionDigits:0}).format(res.length * 85000);
        
        const b = inv.find(i => i.articulo === 'Balón');
        document.getElementById('stat-balones').innerText = b ? b.cantidad_disponible : 0;
        
        if (b && b.cantidad_disponible < 5) document.getElementById('tarjeta-alerta-balones').classList.add('alerta-animada');
        else document.getElementById('tarjeta-alerta-balones').classList.remove('alerta-animada');
    } catch (e) { console.log(e); }
}

async function cargarInventario() {
    const sesion = localStorage.getItem('usuario');
    const u = sesion ? JSON.parse(sesion) : null;
    const esAdmin = u && u.rol === 'admin';

    const [ri, rc, rr] = await Promise.all([fetch('/api/inventario'), fetch('/api/canchas'), fetch('/api/reservas/activas')]);
    const inv = await ri.json(), can = await rc.json(), res = await rr.json();

    // Renderizar Artículos
    document.getElementById('lista-inventario').innerHTML = inv.map(i => `
        <div class="tarjeta-inv">
            <h4>${i.articulo} ${i.color ? `(${i.color})` : ''}</h4>
            <h3 style="color: #008080;">${i.cantidad_disponible} disponibles</h3>
            <p style="font-size:12px; color:gray;">De ${i.cantidad_total} en total</p>
        </div>
    `).join('');

    // Renderizar Canchas
    document.getElementById('lista-canchas').innerHTML = can.map(c => {
        const r = res.find(re => re.cancha_id === c.id);
        return `<div class="tarjeta-inv" style="border-left: 5px solid ${r ? '#dc3545':'#28a745'}">
            <h4>${c.nombre}</h4>
            ${r ? `<p>Ocupada por: ${r.nombre_cliente}</p> ${esAdmin ? `<button onclick="cancelarReserva(${r.id})" style="background:#dc3545; color:white; border:none; padding:8px; border-radius:4px; width:100%; cursor:pointer;">❌ Cancelar Reserva</button>` : ''}` : '<p style="color:#28a745; font-weight:bold;">✅ Disponible</p>'}
        </div>`;
    }).join('');
}

// === 3. RESERVAS ===
function calcularTotal() {
    const s = document.getElementById('tipo-cancha');
    const p = s.options[s.selectedIndex].getAttribute('data-precio');
    const balones = Math.max(0, document.getElementById('balones').value - 1) * 5000;
    const total = parseInt(p) + balones;
    document.getElementById('factura-total').innerText = new Intl.NumberFormat('es-CO', {style:'currency', currency:'COP', maximumFractionDigits:0}).format(total);
}

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
        metodo_pago: 'efectivo'
    };

    const res = await fetch('/api/reservas', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(nuevaReserva)});
    if (res.ok) { alert("✅ ¡Reserva confirmada!"); location.reload(); }
});

window.onload = () => {
    const s = localStorage.getItem('usuario');
    if (s) { aplicarRoles(JSON.parse(s)); document.getElementById('login-overlay').style.display = 'none'; }
    calcularTotal();
    ['balones','petos_rojos','petos_azules'].forEach(id => document.getElementById(id).addEventListener('input', calcularTotal));
};

function cerrarSesion() { localStorage.removeItem('usuario'); location.reload(); }
function descargarPDF() {
    const el = document.getElementById('recibo-imprimible');
    document.getElementById('logo-recibo').style.display = 'block';
    html2pdf().set({ margin: 1, filename: 'Recibo_FitCanchas.pdf', html2canvas: {scale: 2} }).from(el).save().then(() => {
        document.getElementById('logo-recibo').style.display = 'none';
    });
}