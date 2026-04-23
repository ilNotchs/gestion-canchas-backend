/**
 * FIT CANCHAS v6.0 - THE ENGINE
 * Full Logic: RBAC, Multiple Reservations Agenda, Dynamic Pricing & PDF
 */

// === 1. ACCESO Y SEGURIDAD DE NAVEGACIÓN ===

function mostrarModulo(id) {
    const sesion = localStorage.getItem('usuario');
    const usuario = sesion ? JSON.parse(sesion) : null;

    // PORTERO: Si un cliente intenta entrar al dashboard (por inspección), se le niega.
    if (id === 'dashboard' && usuario && usuario.rol !== 'admin') {
        alert("⛔ Acceso Restringido: Solo el administrador puede visualizar las estadísticas financieras.");
        return; 
    }

    // Limpieza de estados visuales
    const modulos = document.querySelectorAll('.modulo');
    modulos.forEach(m => {
        m.classList.remove('activo');
        m.style.display = 'none';
    });

    const botones = document.querySelectorAll('.menu-btn');
    botones.forEach(b => b.classList.remove('active'));

    // Encendido del módulo solicitado
    const modDestino = document.getElementById(`modulo-${id}`);
    if (modDestino) {
        modDestino.style.display = 'block';
        // Delay técnico para que el motor de renderizado de CSS aplique la transición
        setTimeout(() => modDestino.classList.add('activo'), 20);
    }
    
    // Iluminación del botón en la sidebar
    const btnActivo = document.querySelector(`button[onclick*="${id}"]`);
    if (btnActivo) btnActivo.classList.add('active');

    // Despacho de carga de datos
    if (id === 'dashboard') cargarDashboard();
    if (id === 'inventario') cargarInventario();
    if (id === 'reservar') cargarCanchasEnSelect();
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
                // REGLA DE NEGOCIO: Al entrar, siempre aterrizar en RESERVAR
                location.reload();
            } else {
                document.getElementById('error-login').style.display = 'block';
            }
        } catch (e) { alert("Falla de comunicación con el servidor en Render."); }
    });
}

function aplicarRoles(usuario) {
    const btnInv = document.getElementById('btn-nav-inventario');
    const btnDash = document.getElementById('btn-nav-dashboard');

    if (usuario.rol === 'cliente') {
        if (btnInv) btnInv.style.display = 'none';
        if (btnDash) btnDash.style.display = 'none';
        mostrarModulo('reservar');
    } else {
        if (btnInv) btnInv.style.display = 'block';
        if (btnDash) btnDash.style.display = 'block';
        mostrarModulo('reservar');
    }
}

function cerrarSesion() {
    localStorage.removeItem('usuario');
    location.reload();
}

// === 2. LÓGICA DE CANCHAS DINÁMICAS Y PRECIOS ===

async function cargarCanchasEnSelect() {
    const select = document.getElementById('tipo-cancha');
    if (!select) return;

    try {
        const res = await fetch('/api/canchas');
        const canchas = await res.json();

        select.innerHTML = canchas.map(c => `
            <option value="${c.id}" data-tipo="${c.tipo}">
                ${c.nombre} (${c.tipo})
            </option>
        `).join('');

        calcularTotal(); 
    } catch (e) { console.error("Error al poblar el selector de canchas:", e); }
}

function calcularTotal() {
    const selectCancha = document.getElementById('tipo-cancha');
    const selectPromo = document.getElementById('combo-promo');
    const inputBalones = document.getElementById('balones');

    if (!selectCancha || !selectPromo) return;

    const op = selectCancha.options[selectCancha.selectedIndex];
    if (!op) return;
    const tipo = op.getAttribute('data-tipo');
    
    // Matriz de precios por tipo de cancha
    let precioBase = tipo.includes('11v11') ? 100000 : 60000;
    
    // Valor adicional de promociones
    let extraP = parseInt(selectPromo.value) || 0;

    // Costo marginal de balones (5000 COP por unidad adicional)
    let extraB = Math.max(0, parseInt(inputBalones.value) - 1) * 5000;

    const total = precioBase + extraP + extraB;

    document.getElementById('factura-total').innerText = new Intl.NumberFormat('es-CO', {
        style: 'currency', currency: 'COP', maximumFractionDigits: 0
    }).format(total);
}

// === 3. GESTIÓN DE LA AGENDA (MÚLTIPLES RESERVAS POR CANCHA) ===

async function cargarInventario() {
    const contInv = document.getElementById('lista-inventario');
    const contCan = document.getElementById('lista-canchas');
    if (!contInv || !contCan) return;

    try {
        const sesion = localStorage.getItem('usuario');
        const user = sesion ? JSON.parse(sesion) : null;
        const esAdmin = user && user.rol === 'admin';

        const [ri, rc, rr] = await Promise.all([
            fetch('/api/inventario'), fetch('/api/canchas'), fetch('/api/reservas/activas')
        ]);
        const inv = await ri.json(), can = await rc.json(), res = await rr.json();

        // Renderización de Stock
        contInv.innerHTML = inv.map(i => `
            <div class="tarjeta-inv">
                <h4 style="color:var(--verde-deep); margin-bottom:12px;">${i.articulo}</h4>
                <h2 style="color:var(--verde-neon); font-size:2.8em;">${i.cantidad_disponible}</h2>
                <p style="color:var(--slate); font-size:0.9em;">Disponibles para entrega</p>
            </div>
        `).join('');

        // Renderización de Agenda de Canchas (USO DE FILTER PARA MOSTRAR TODO)
        contCan.innerHTML = can.map(cancha => {
            const reservasAgenda = res.filter(r => r.cancha_id === cancha.id);
            
            let agendaHTML = '';
            if (reservasAgenda.length > 0) {
                agendaHTML = reservasAgenda.map(reserva => `
                    <div class="reserva-item">
                        <h5>👤 ${reserva.nombre_cliente}</h5>
                        <p>⏰ Horario: ${reserva.hora_inicio}</p>
                        ${esAdmin ? `<button onclick="cancelarReserva(${reserva.id})" style="width:100%; margin-top:15px; background:var(--danger); color:white; border:none; padding:10px; border-radius:12px; cursor:pointer; font-weight:800;">Anular Reserva</button>` : ''}
                    </div>
                `).join('');
            } else {
                agendaHTML = '<p style="color:var(--verde-neon); font-weight:800; margin-top:20px;"><i class="fas fa-check-circle"></i> CANCHA LIBRE</p>';
            }

            return `
                <div class="tarjeta-inv" style="border-top: 8px solid ${reservasAgenda.length > 0 ? 'var(--danger)' : 'var(--verde-neon)'}">
                    <h4 style="font-weight:800;">${cancha.nombre}</h4>
                    <p style="font-size:0.85em; color:var(--slate);">${cancha.tipo}</p>
                    ${agendaHTML}
                </div>
            `;
        }).join('');
    } catch (e) { console.error("Fallo al sincronizar inventario:", e); }
}

// === 4. SISTEMA DE DATOS Y EXPORTACIÓN ===

async function cargarDashboard() {
    try {
        const [rInv, rCan, rRes] = await Promise.all([fetch('/api/inventario'), fetch('/api/canchas'), fetch('/api/reservas/activas')]);
        const inv = await rInv.json(), can = await rCan.json(), res = await rRes.json();
        
        const perc = can.length === 0 ? 0 : (res.length / can.length) * 100;
        document.getElementById('stat-ocupacion').innerText = `${perc.toFixed(0)}%`;
        document.getElementById('barra-ocupacion').style.width = `${perc}%`;
        
        const money = new Intl.NumberFormat('es-CO', {style:'currency', currency:'COP', maximumFractionDigits:0}).format(res.length * 85000);
        document.getElementById('stat-ingresos').innerText = money;
        
        const b = inv.find(i => i.articulo === 'Balón');
        document.getElementById('stat-balones').innerText = b ? b.cantidad_disponible : 0;
    } catch (e) { console.error("Error Dashboard:", e); }
}

function descargarPDF() {
    const el = document.getElementById('recibo-imprimible');
    const head = document.getElementById('pdf-header');
    
    head.style.display = 'block';

    const options = {
        margin: 1,
        filename: `Comprobante_FitCanchas_${Date.now()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 3, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(options).from(el).save().then(() => {
        head.style.display = 'none';
    });
}

// === 5. EVENTOS GLOBALES ===

window.onload = () => {
    const sesion = localStorage.getItem('usuario');
    if (sesion) {
        document.getElementById('login-overlay').style.display = 'none';
        aplicarRoles(JSON.parse(sesion));
    }
    
    ['tipo-cancha', 'balones', 'combo-promo'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', calcularTotal);
    });
};

document.getElementById('form-reserva').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        nombre_cliente: document.getElementById('nombre').value,
        cancha_id: document.getElementById('tipo-cancha').value,
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
        body: JSON.stringify(payload)
    });

    if (res.ok) { alert("✅ Reserva Confirmada."); location.reload(); }
    else { alert("❌ Error: Conflicto de horario en la cancha seleccionada."); }
});

async function cancelarReserva(id) {
    if (!confirm("¿Deseas liberar la cancha?")) return;
    await fetch(`/api/reservas/${id}/cancelar`, { method: 'PUT' });
    cargarInventario();
}