/**
 * FIT CANCHAS v3.0 - Lógica Premium
 * Autor: Juan - Ingeniería Informática
 */

// === 1. GESTIÓN DE NAVEGACIÓN Y ROLES ===
function mostrarModulo(id) {
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

    // Cargar datos según el módulo
    if (id === 'dashboard') cargarDashboard();
    if (id === 'inventario') cargarInventario();
    if (id === 'reservar') calcularTotal();
}

// === 2. CÁLCULO DE PRECIOS Y PROMOCIONES ===
function calcularTotal() {
    const selector = document.getElementById('tipo-cancha');
    if (!selector) return;

    const opcion = selector.options[selector.selectedIndex];
    const precioBase = parseInt(opcion.getAttribute('data-precio')) || 0;
    
    // Lógica de implementos extra (Balones adicionales)
    const inputBalones = document.getElementById('balones');
    const cantidadBalones = parseInt(inputBalones.value) || 0;
    
    // Si piden más de 1 balón, cada extra cuesta $5.000
    const extraBalones = Math.max(0, cantidadBalones - 1) * 5000;
    
    const totalFinal = precioBase + extraBalones;

    // Formateo de moneda colombiana
    const formatter = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    });

    document.getElementById('factura-total').innerText = formatter.format(totalFinal);
}

// === 3. GESTIÓN DE DATOS (API CALLS) ===

async function cargarDashboard() {
    try {
        const [rInv, rCan, rRes] = await Promise.all([
            fetch('/api/inventario'),
            fetch('/api/canchas'),
            fetch('/api/reservas/activas')
        ]);
        
        const inv = await rInv.json();
        const can = await rCan.json();
        const res = await rRes.json();

        // Calcular Ocupación
        const porcentaje = can.length === 0 ? 0 : (res.length / can.length) * 100;
        document.getElementById('stat-ocupacion').innerText = `${porcentaje.toFixed(0)}%`;
        document.getElementById('barra-ocupacion').style.width = `${porcentaje}%`;

        // Calcular Ingresos
        const ingresosTotales = res.length * 85000; // Promedio
        const formatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
        document.getElementById('stat-ingresos').innerText = formatter.format(ingresosTotales);

        // Estado de Balones
        const balones = inv.find(i => i.articulo === 'Balón');
        document.getElementById('stat-balones').innerText = balones ? balones.cantidad_disponible : 0;

    } catch (error) {
        console.error("Error cargando Dashboard:", error);
    }
}

async function cargarInventario() {
    const contInv = document.getElementById('lista-inventario');
    const contCan = document.getElementById('lista-canchas');
    if (!contInv || !contCan) return;

    try {
        const sesion = localStorage.getItem('usuario');
        const user = sesion ? JSON.parse(sesion) : null;
        const esAdmin = user && user.rol === 'admin';

        const [rInv, rCan, rRes] = await Promise.all([
            fetch('/api/inventario'),
            fetch('/api/canchas'),
            fetch('/api/reservas/activas')
        ]);

        const inv = await rInv.json();
        const can = await rCan.json();
        const res = await rRes.json();

        // 1. Dibujar Artículos (Balones, Petos, Inflador, etc.)
        contInv.innerHTML = inv.map(item => `
            <div class="tarjeta-inv">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <i class="fas fa-box" style="color:var(--verde-dark); font-size:1.5em;"></i>
                    <span style="background:#f1f5f9; padding:4px 10px; border-radius:20px; font-size:0.8em; font-weight:bold;">STOCK</span>
                </div>
                <h4 style="margin: 15px 0 5px 0; font-size:1.2em;">${item.articulo} ${item.color ? `(${item.color})`:''}</h4>
                <h3 style="color:#22c55e; font-size:1.8em;">${item.cantidad_disponible} <small style="font-size:0.5em; color:gray;">unidades</small></h3>
            </div>
        `).join('');

        // 2. Dibujar Canchas
        contCan.innerHTML = can.map(c => {
            const reserva = res.find(r => r.cancha_id === c.id);
            const colorEstado = reserva ? '#ef4444' : '#22c55e';
            
            return `
                <div class="tarjeta-inv" style="border-top: 6px solid ${colorEstado}">
                    <h4 style="font-size:1.3em;">${c.nombre}</h4>
                    <p style="color:gray; font-size:0.9em; margin-bottom:15px;">${c.tipo}</p>
                    ${reserva ? `
                        <div style="background:#fef2f2; padding:12px; border-radius:10px;">
                            <p style="font-size:0.9em;"><strong>Cliente:</strong> ${reserva.nombre_cliente}</p>
                            <p style="font-size:0.8em; color:#991b1b;">⏰ ${reserva.hora_inicio}</p>
                            ${esAdmin ? `<button onclick="cancelarReserva(${reserva.id})" style="width:100%; margin-top:10px; background:#ef4444; color:white; border:none; padding:8px; border-radius:8px; cursor:pointer; font-weight:bold;">Anular Reserva</button>` : ''}
                        </div>
                    ` : `
                        <p style="color:#16a34a; font-weight:800;"><i class="fas fa-check-circle"></i> DISPONIBLE</p>
                    `}
                </div>
            `;
        }).join('');

    } catch (e) { console.error("Error cargando inventario:", e); }
}

// === 4. ACCIONES (POST / DELETE) ===

const formReserva = document.getElementById('form-reserva');
if (formReserva) {
    formReserva.addEventListener('submit', async (e) => {
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

        try {
            const res = await fetch('/api/reservas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                alert("✅ ¡Reserva realizada con éxito!");
                location.reload();
            } else { alert("❌ Error: La cancha ya podría estar ocupada."); }
        } catch (e) { alert("Error de conexión con el servidor."); }
    });
}

async function cancelarReserva(id) {
    if (!confirm("¿Deseas anular esta reserva? Los implementos volverán al stock.")) return;
    try {
        const res = await fetch(`/api/reservas/${id}/cancelar`, { method: 'PUT' });
        if (res.ok) { cargarInventario(); cargarDashboard(); }
    } catch (e) { alert("Error al cancelar."); }
}

// === 5. INICIALIZACIÓN ===
window.onload = () => {
    const sesion = localStorage.getItem('usuario');
    if (sesion) {
        const u = JSON.parse(sesion);
        document.getElementById('login-overlay').style.display = 'none';
        u.rol === 'admin' ? mostrarModulo('dashboard') : mostrarModulo('reservar');
    }
    
    // Eventos de actualización de precio
    ['tipo-cancha', 'balones'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', calcularTotal);
        if (el) el.addEventListener('input', calcularTotal);
    });
};

function cerrarSesion() { localStorage.removeItem('usuario'); location.reload(); }

function descargarPDF() {
    const el = document.getElementById('recibo-imprimible');
    document.getElementById('logo-recibo').style.display = 'block';
    const opt = { margin: 1, filename: 'Recibo_FitCanchas.pdf', html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' } };
    html2pdf().set(opt).from(el).save().then(() => {
        document.getElementById('logo-recibo').style.display = 'none';
    });
}