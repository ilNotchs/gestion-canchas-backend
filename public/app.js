/**
 * FIT CANCHAS v5.0 - THE ENGINE
 * Full Logic for Dynamic Booking and Real-time Management
 */

// === 1. GESTIÓN DE ACCESO Y NAVEGACIÓN ===

function mostrarModulo(id) {
    // Escondemos todo lo que esté activo
    const modulos = document.querySelectorAll('.modulo');
    modulos.forEach(m => {
        m.classList.remove('activo');
        m.style.display = 'none';
    });

    // Desmarcamos botones de la sidebar
    const botones = document.querySelectorAll('.menu-btn');
    botones.forEach(b => b.classList.remove('active'));

    // Activamos el módulo destino
    const modDestino = document.getElementById(`modulo-${id}`);
    if (modDestino) {
        modDestino.style.display = 'block';
        // Delay para que CSS note el cambio de display antes de animar
        setTimeout(() => modDestino.classList.add('activo'), 20);
    }
    
    // Iluminamos el botón correspondiente
    const btnActivo = document.querySelector(`button[onclick*="${id}"]`);
    if (btnActivo) btnActivo.classList.add('active');

    // Disparar cargas de datos específicas
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
                // Al aterrizar, siempre vamos a RESERVAR
                location.reload();
            } else {
                document.getElementById('error-login').style.display = 'block';
            }
        } catch (e) { alert("Error de red con el servidor de Render."); }
    });
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

        // Llenar el select con los nombres e IDs reales de la BD
        select.innerHTML = canchas.map(c => `
            <option value="${c.id}" data-tipo="${c.tipo}">
                ${c.nombre} (${c.tipo})
            </option>
        `).join('');

        // Disparar el primer cálculo de precio
        calcularTotal();
    } catch (e) {
        console.error("Fallo crítico al obtener canchas:", e);
    }
}

function calcularTotal() {
    const selectCancha = document.getElementById('tipo-cancha');
    const selectPromo = document.getElementById('combo-promo');
    const inputBalones = document.getElementById('balones');

    if (!selectCancha || !selectPromo) return;

    // 1. Obtener tipo de cancha seleccionada
    const opcionCancha = selectCancha.options[selectCancha.selectedIndex];
    if (!opcionCancha) return;
    const tipo = opcionCancha.getAttribute('data-tipo');
    
    // 2. Lógica de precio base (Negocio)
    let precioBase = tipo.includes('11v11') ? 100000 : 60000;
    
    // 3. Sumar Combos/Promos
    let extraPromo = parseInt(selectPromo.value) || 0;

    // 4. Sumar Balones (Costo extra de 5k por cada balón después del primero)
    let extraBalones = Math.max(0, parseInt(inputBalones.value) - 1) * 5000;

    const totalFinal = precioBase + extraPromo + extraBalones;

    // 5. Formateo Moneda (COP)
    const formatter = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    });

    document.getElementById('factura-total').innerText = formatter.format(totalFinal);
}

// === 3. GESTIÓN DE DATOS (DASHBOARD E INVENTARIO) ===

async function cargarDashboard() {
    try {
        const [rInv, rCan, rRes] = await Promise.all([
            fetch('/api/inventario'), fetch('/api/canchas'), fetch('/api/reservas/activas')
        ]);
        const inv = await rInv.json();
        const can = await rCan.json();
        const res = await rRes.json();

        // Stats: Ocupación
        const perc = can.length === 0 ? 0 : (res.length / can.length) * 100;
        document.getElementById('stat-ocupacion').innerText = `${perc.toFixed(0)}%`;
        document.getElementById('barra-ocupacion').style.width = `${perc}%`;

        // Stats: Ingresos Estimados
        const pesosTotales = res.length * 85000; // Valor promedio por reserva
        const fmt = new Intl.NumberFormat('es-CO', {style:'currency', currency:'COP', maximumFractionDigits:0});
        document.getElementById('stat-ingresos').innerText = fmt.format(pesosTotales);

        // Stats: Balones
        const itemBalon = inv.find(i => i.articulo === 'Balón');
        document.getElementById('stat-balones').innerText = itemBalon ? itemBalon.cantidad_disponible : 0;
    } catch (e) { console.error("Error en Dashboard:", e); }
}

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

        // Render Artículos
        contInv.innerHTML = inv.map(i => `
            <div class="tarjeta-inv">
                <h4 style="color:var(--verde-deep); margin-bottom:10px;">${i.articulo}</h4>
                <h2 style="color:var(--verde-neon); font-size:2.5em;">${i.cantidad_disponible}</h2>
                <p style="color:var(--slate); font-size:0.85em;">Unidades en bodega</p>
            </div>
        `).join('');

        // Render Canchas con Lógica de Ocupación
        contCan.innerHTML = can.map(c => {
            const r = res.find(re => re.cancha_id === c.id);
            return `
                <div class="tarjeta-inv" style="border-top: 6px solid ${r ? '#ef4444' : '#22c55e'}">
                    <h4>${c.nombre}</h4>
                    <p style="font-size:0.8em; margin-bottom:12px;">${c.tipo}</p>
                    ${r ? `
                        <div style="background:#fff1f2; padding:12px; border-radius:12px;">
                            <p style="font-size:0.9em; font-weight:700;">${r.nombre_cliente}</p>
                            <p style="font-size:0.8em; color:#ef4444; font-weight:600;">⏰ ${r.hora_inicio}</p>
                            ${esAdmin ? `<button onclick="cancelarReserva(${r.id})" style="margin-top:12px; width:100%; background:#ef4444; color:white; border:none; padding:10px; border-radius:10px; cursor:pointer; font-weight:800;">Anular Reserva</button>` : ''}
                        </div>
                    ` : '<p style="color:#22c55e; font-weight:800; font-size:0.9em;"><i class="fas fa-check-circle"></i> DISPONIBLE</p>'}
                </div>
            `;
        }).join('');
    } catch (e) { console.error("Error en Inventario:", e); }
}

// === 4. ACCIONES (POST / PUT) ===

const formReserva = document.getElementById('form-reserva');
if (formReserva) {
    formReserva.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const data = {
            nombre_cliente: document.getElementById('nombre').value,
            cancha_id: document.getElementById('tipo-cancha').value, // ID Dinámico real
            fecha_reserva: document.getElementById('fecha').value,
            hora_inicio: document.getElementById('hora').value,
            balones_prestados: document.getElementById('balones').value,
            petos_rojos_prestados: document.getElementById('petos_rojos').value,
            petos_azules_prestados: document.getElementById('petos_azules').value,
            metodo_pago: 'efectivo'
        };

        try {
            const res = await fetch('/api/reservas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                alert("✅ Reserva exitosa. Se ha descontado el equipo del inventario.");
                location.reload();
            } else { alert("❌ Error: Esa cancha ya tiene una reserva activa."); }
        } catch (e) { alert("Error de servidor."); }
    });
}

async function cancelarReserva(id) {
    if (!confirm("¿Deseas liberar la cancha y devolver los artículos al stock?")) return;
    try {
        await fetch(`/api/reservas/${id}/cancelar`, { method: 'PUT' });
        cargarInventario();
        cargarDashboard();
    } catch (e) { alert("Error al anular."); }
}

// === 5. INICIALIZACIÓN DE LA WEB APP ===

window.onload = () => {
    const sesion = localStorage.getItem('usuario');
    if (sesion) {
        // Cerramos el login y entramos a la app
        document.getElementById('login-overlay').style.display = 'none';
        
        // REGLA: Siempre aterrizar en RESERVAR
        mostrarModulo('reservar');
        
        // Carga inicial de canchas en el select
        cargarCanchasEnSelect();
    }
    
    // Escuchar cambios de precio en tiempo real
    ['tipo-cancha', 'balones', 'combo-promo'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', calcularTotal);
        if (el) el.addEventListener('change', calcularTotal);
    });
};

function descargarPDF() {
    const element = document.getElementById('recibo-imprimible');
    const header = document.getElementById('pdf-header');
    
    header.style.display = 'block';

    const opt = {
        margin: 0.8,
        filename: `Recibo_FitCanchas_${Date.now()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 3, useCORS: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        header.style.display = 'none';
    });
}