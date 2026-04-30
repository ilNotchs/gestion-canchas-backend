/**
 * FIT CANCHAS v6.0 - THE ENGINE
 */

// === 1. ACCESO Y SEGURIDAD DE NAVEGACIÓN ===

function mostrarModulo(id) {
    const sesion = localStorage.getItem('usuario');
    const usuario = sesion ? JSON.parse(sesion) : null;

    if (id === 'dashboard' && usuario && usuario.rol !== 'admin') {
        alert("⛔ Acceso Restringido: Solo el administrador puede visualizar las estadísticas financieras.");
        return; 
    }

    const modulos = document.querySelectorAll('.modulo');
    modulos.forEach(m => {
        m.classList.remove('activo');
        m.style.display = 'none';
    });

    const botones = document.querySelectorAll('.menu-btn');
    botones.forEach(b => b.classList.remove('active'));

    const modDestino = document.getElementById(`modulo-${id}`);
    if (modDestino) {
        modDestino.style.display = 'block';
        setTimeout(() => modDestino.classList.add('activo'), 20);
    }
    
    const btnActivo = document.querySelector(`button[onclick*="${id}"]`);
    if (btnActivo) btnActivo.classList.add('active');

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
                location.reload();
            } else {
                document.getElementById('error-login').style.display = 'block';
            }
        } catch (e) { alert("Falla de comunicación con el servidor."); }
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

// === 2. LÓGICA DE CANCHAS Y FILTRO DE PROMOCIONES ===

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

        actualizarPromociones(); 
    } catch (e) { console.error("Error al poblar canchas:", e); }
}

function actualizarPromociones() {
    const selectCancha = document.getElementById('tipo-cancha');
    const selectPromo = document.getElementById('combo-promo');
    if (!selectCancha || !selectPromo) return;

    const opCancha = selectCancha.options[selectCancha.selectedIndex];
    const tipo = opCancha ? opCancha.getAttribute('data-tipo') : "";

    Array.from(selectPromo.options).forEach(opt => {
        const promoTipo = opt.getAttribute('data-promo');
        
        // Regla: Mostrar siempre si es normal/premium, o si coincide con el tipo de cancha
        if (!promoTipo || tipo.includes(promoTipo)) {
            opt.style.display = "block";
        } else {
            opt.style.display = "none";
            // Si la opción seleccionada ahora está oculta, volver a "Normal"
            if (selectPromo.value === opt.value) selectPromo.value = "0";
        }
    });
    calcularTotal();
}

function calcularTotal() {
    const selectCancha = document.getElementById('tipo-cancha');
    const selectPromo = document.getElementById('combo-promo');
    const inputBalones = document.getElementById('balones');
    const petosR = document.getElementById('petos_rojos').value;
    const petosA = document.getElementById('petos_azules').value;

    if (!selectCancha || !selectPromo) return;

    const op = selectCancha.options[selectCancha.selectedIndex];
    if (!op) return;
    const tipo = op.getAttribute('data-tipo');
    
    let precioBase = tipo.includes('11v11') ? 100000 : 60000;
    let extraP = parseInt(selectPromo.value) || 0;
    let extraB = Math.max(0, parseInt(inputBalones.value) - 1) * 5000;

    const total = precioBase + extraP + extraB;

    const totalFormateado = new Intl.NumberFormat('es-CO', {
        style: 'currency', currency: 'COP', maximumFractionDigits: 0
    }).format(total);

    document.getElementById('factura-total').innerText = totalFormateado;

    // Llenar detalle para el PDF
    const detalleCont = document.getElementById('detalle-alquiler-pdf');
    detalleCont.innerHTML = `
        <div style="font-size:12px; color:#444;">
            <p><strong>Cancha:</strong> ${op.text}</p>
            <p><strong>Promoción:</strong> ${selectPromo.options[selectPromo.selectedIndex].text}</p>
            <p><strong>Implementos:</strong> Balones (${inputBalones.value}), Petos (${parseInt(petosR) + parseInt(petosA)})</p>
            <p><strong>Precio Base:</strong> $${precioBase.toLocaleString()}</p>
        </div>
    `;
}

// === 3. GESTIÓN DE LA AGENDA Y DASHBOARD ===

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

        contInv.innerHTML = inv.map(i => `
            <div class="tarjeta-inv">
                <h4 style="color:var(--verde-deep); margin-bottom:12px;">${i.articulo}</h4>
                <h2 style="color:var(--verde-neon); font-size:2.8em;">${i.cantidad_disponible}</h2>
                <p style="color:var(--slate); font-size:0.9em;">Disponibles</p>
            </div>
        `).join('');

        contCan.innerHTML = can.map(cancha => {
            const reservasAgenda = res.filter(r => r.cancha_id === cancha.id);
            let agendaHTML = reservasAgenda.length > 0 ? reservasAgenda.map(reserva => `
                <div class="reserva-item">
                    <h5>👤 ${reserva.nombre_cliente}</h5>
                    <p>⏰ ${reserva.hora_inicio}</p>
                    ${esAdmin ? `<button onclick="cancelarReserva(${reserva.id})" class="btn-anular">Anular</button>` : ''}
                </div>
            `).join('') : '<p class="cancha-libre">✅ CANCHA LIBRE</p>';

            return `
                <div class="tarjeta-inv" style="border-top: 8px solid ${reservasAgenda.length > 0 ? 'var(--danger)' : 'var(--verde-neon)'}">
                    <h4>${cancha.nombre}</h4>
                    <p>${cancha.tipo}</p>
                    ${agendaHTML}
                </div>
            `;
        }).join('');
    } catch (e) { console.error("Error Inventario:", e); }
}

async function cargarDashboard() {
    try {
        const [rInv, rCan, rRes] = await Promise.all([fetch('/api/inventario'), fetch('/api/canchas'), fetch('/api/reservas/activas')]);
        const inv = await rInv.json(), can = await rCan.json(), res = await rRes.json();
        
        const perc = can.length === 0 ? 0 : (res.length / can.length) * 100;
        document.getElementById('stat-ocupacion').innerText = `${perc.toFixed(0)}%`;
        document.getElementById('barra-ocupacion').style.width = `${perc}%`;
        
        const totalDinero = res.length * 85000; // Estimado base
        document.getElementById('stat-ingresos').innerText = `$${totalDinero.toLocaleString()}`;
        
        const b = inv.find(i => i.articulo === 'Balón');
        document.getElementById('stat-balones').innerText = b ? b.cantidad_disponible : 0;
    } catch (e) { console.error("Error Dashboard:", e); }
}

// === 4. SISTEMA DE EXPORTACIÓN Y EVENTOS ===

function descargarPDF() {
    const el = document.getElementById('recibo-imprimible');
    const head = document.getElementById('pdf-header');
    const detalle = document.getElementById('detalle-alquiler-pdf');
    
    head.style.display = 'block';
    detalle.style.display = 'block';

    const options = {
        margin: 1,
        filename: `FitCanchas_Ticket_${Date.now()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 3 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(options).from(el).save().then(() => {
        head.style.display = 'none';
        detalle.style.display = 'none';
    });
}

window.onload = () => {
    const sesion = localStorage.getItem('usuario');
    if (sesion) {
        const user = JSON.parse(sesion);
        document.getElementById('login-overlay').style.display = 'none';
        
        // Bloquear y autollenar nombre
        const inputNombre = document.getElementById('nombre');
        if (inputNombre) {
            inputNombre.value = user.username;
            inputNombre.readOnly = true;
        }
        aplicarRoles(user);
    }
    
    // Listeners de cambio
    document.getElementById('tipo-cancha')?.addEventListener('change', actualizarPromociones);
    document.getElementById('combo-promo')?.addEventListener('change', calcularTotal);
    ['balones', 'petos_rojos', 'petos_azules'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', calcularTotal);
    });
};

document.getElementById('form-reserva').addEventListener('submit', async (e) => {
    e.preventDefault();
    const sesion = localStorage.getItem('usuario');
    const user = sesion ? JSON.parse(sesion) : null;

    const payload = {
        usuario_id: user ? user.id : 1,
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
    else { alert("❌ Error: Conflicto de horario."); }
});

async function cancelarReserva(id) {
    if (!confirm("¿Deseas liberar la cancha?")) return;
    await fetch(`/api/reservas/${id}/cancelar`, { method: 'PUT' });
    cargarInventario();
}