/**
 * FIT CANCHAS v4.0 - PREMIUM LOGIC
 * Full Stack Logic: Reservas, Dashboard, Inventario & PDF
 */

// === 1. NAVEGACIÓN Y ACCESO ===

function mostrarModulo(id) {
    // Escondemos todo con animación
    document.querySelectorAll('.modulo').forEach(m => {
        m.classList.remove('activo');
        m.style.display = 'none';
    });

    // Desactivamos botones
    document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));

    // Activamos el módulo solicitado
    const mod = document.getElementById(`modulo-${id}`);
    if (mod) {
        mod.style.display = 'block';
        setTimeout(() => mod.classList.add('activo'), 20);
    }
    
    // Iluminamos botón de la sidebar
    const btnActivo = document.querySelector(`button[onclick*="${id}"]`);
    if (btnActivo) btnActivo.classList.add('active');

    // Cargas de datos dinámicas
    if (id === 'dashboard') cargarDashboard();
    if (id === 'inventario') cargarInventario();
}

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
                // REGLA: Siempre aterrizar en RESERVAR al iniciar
                location.reload();
            } else {
                document.getElementById('error-login').style.display = 'block';
            }
        } catch (e) { alert("Error de conexión con Render."); }
    });
}

function cerrarSesion() { localStorage.removeItem('usuario'); location.reload(); }

// === 2. LÓGICA DE PRECIOS Y FACTURACIÓN ===

function calcularTotal() {
    const selector = document.getElementById('tipo-cancha');
    if (!selector) return;

    const precioBase = parseInt(selector.options[selector.selectedIndex].getAttribute('data-precio')) || 0;
    
    // Lógica de implementos extra (cada balón adicional cuesta 5k)
    const balonesInput = document.getElementById('balones');
    const totalBalones = parseInt(balonesInput.value) || 0;
    const extraCosto = Math.max(0, totalBalones - 1) * 5000;

    const final = precioBase + extraCosto;

    const formatter = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    });

    document.getElementById('factura-total').innerText = formatter.format(final);
}

// === 3. GENERADOR DE PDF PRO ===

function descargarPDF() {
    const element = document.getElementById('recibo-imprimible');
    const header = document.getElementById('pdf-header');
    
    // Mostramos header solo para la foto
    header.style.display = 'block';

    const options = {
        margin: 1,
        filename: `Recibo_FitCanchas_${Date.now()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 3, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(options).from(element).save().then(() => {
        header.style.display = 'none';
    });
}

// === 4. CARGA DE DATOS DESDE AIVEN ===

async function cargarDashboard() {
    try {
        const [rInv, rCan, rRes] = await Promise.all([
            fetch('/api/inventario'), fetch('/api/canchas'), fetch('/api/reservas/activas')
        ]);
        const inv = await rInv.json();
        const can = await rCan.json();
        const res = await rRes.json();

        // Stats
        const porc = can.length === 0 ? 0 : (res.length / can.length) * 100;
        document.getElementById('stat-ocupacion').innerText = `${porc.toFixed(0)}%`;
        document.getElementById('barra-ocupacion').style.width = `${porc}%`;

        const totalPesos = res.length * 85000; // Valor promedio
        document.getElementById('stat-ingresos').innerText = new Intl.NumberFormat('es-CO', {style:'currency', currency:'COP', maximumFractionDigits:0}).format(totalPesos);

        const balones = inv.find(i => i.articulo === 'Balón');
        document.getElementById('stat-balones').innerText = balones ? balones.cantidad_disponible : 0;
    } catch (e) { console.error(e); }
}

async function cargarInventario() {
    const contInv = document.getElementById('lista-inventario');
    const contCan = document.getElementById('lista-canchas');

    try {
        const sesion = localStorage.getItem('usuario');
        const user = sesion ? JSON.parse(sesion) : null;
        const esAdmin = user && user.rol === 'admin';

        const [ri, rc, rr] = await Promise.all([
            fetch('/api/inventario'), fetch('/api/canchas'), fetch('/api/reservas/activas')
        ]);
        const inv = await ri.json(), can = await rc.json(), res = await rr.json();

        // Pintar Inventario
        contInv.innerHTML = inv.map(i => `
            <div class="tarjeta-inv">
                <h4 style="color:var(--verde-deep); margin-bottom:10px;">${i.articulo}</h4>
                <h2 style="color:var(--verde-neon); font-size:2em;">${i.cantidad_disponible}</h2>
                <p style="color:gray; font-size:0.8em;">Unidades en bodega</p>
            </div>
        `).join('');

        // Pintar Canchas
        contCan.innerHTML = can.map(c => {
            const reserva = res.find(r => r.cancha_id === c.id);
            return `
                <div class="tarjeta-inv" style="border-top: 5px solid ${reserva ? '#ef4444':'#22c55e'}">
                    <h4>${c.nombre}</h4>
                    <p style="font-size:0.8em; margin-bottom:10px;">${c.tipo}</p>
                    ${reserva ? `
                        <div style="background:#fff1f2; padding:10px; border-radius:10px;">
                            <p style="font-size:0.9em;"><strong>${reserva.nombre_cliente}</strong></p>
                            <p style="font-size:0.8em; color:#ef4444;">${reserva.hora_inicio}</p>
                            ${esAdmin ? `<button onclick="cancelarReserva(${reserva.id})" style="margin-top:10px; width:100%; background:#ef4444; color:white; border:none; padding:8px; border-radius:8px; cursor:pointer;">Cancelar</button>` : ''}
                        </div>
                    ` : '<p style="color:#22c55e; font-weight:800;">✅ DISPONIBLE</p>'}
                </div>
            `;
        }).join('');
    } catch (e) { console.error(e); }
}

// === 5. CRUD: RESERVAR Y CANCELAR ===

document.getElementById('form-reserva').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        nombre_cliente: document.getElementById('nombre').value,
        cancha_id: document.getElementById('tipo-cancha').value.includes('11v11') ? 1 : 12,
        fecha_reserva: document.getElementById('fecha').value,
        hora_inicio: document.getElementById('hora').value,
        balones_prestados: document.getElementById('balones').value,
        petos_rojos_prestados: document.getElementById('petos_rojos').value,
        petos_azules_prestados: document.getElementById('petos_azules').value,
        metodo_pago: 'efectivo'
    };

    const res = await fetch('/api/reservas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    if (res.ok) { alert("✅ Reserva Confirmada"); location.reload(); }
    else { alert("❌ Error: La cancha ya está ocupada."); }
});

async function cancelarReserva(id) {
    if (!confirm("¿Deseas anular esta reserva?")) return;
    await fetch(`/api/reservas/${id}/cancelar`, { method: 'PUT' });
    cargarInventario();
}

// === 6. INIT ===
window.onload = () => {
    const s = localStorage.getItem('usuario');
    if (s) {
        document.getElementById('login-overlay').style.display = 'none';
        mostrarModulo('reservar');
    }
    
    calcularTotal();
    ['tipo-cancha', 'balones'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', calcularTotal);
    });
};