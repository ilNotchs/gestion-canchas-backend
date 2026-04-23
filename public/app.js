// =========================================================
// 1. SISTEMA DE AUTENTICACIÓN Y ROLES
// =========================================================

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
                // Guardar sesión y aplicar permisos
                localStorage.setItem('usuario', JSON.stringify(data.usuario));
                aplicarRoles(data.usuario);
                document.getElementById('login-overlay').style.display = 'none';
            } else {
                document.getElementById('error-login').style.display = 'block';
            }
        } catch (e) {
            alert("Error al conectar con el servidor.");
        }
    });
}

function aplicarRoles(usuario) {
    const btnInventario = document.getElementById('btn-nav-inventario');
    const btnDashboard = document.getElementById('btn-nav-dashboard');

    if (usuario.rol === 'cliente') {
        // El cliente solo ve el botón de Reservar
        if (btnInventario) btnInventario.style.display = 'none';
        if (btnDashboard) btnDashboard.style.display = 'none';
        mostrarModulo('reservar');
    } else {
        // El admin ve todo
        if (btnInventario) btnInventario.style.display = 'block';
        if (btnDashboard) btnDashboard.style.display = 'block';
        mostrarModulo('dashboard');
    }
}

function cerrarSesion() {
    localStorage.removeItem('usuario');
    location.reload(); // Recarga para volver al muro de login
}

// =========================================================
// 2. NAVEGACIÓN Y DASHBOARD (SIGNOS VITALES)
// =========================================================

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
            fetch('/api/inventario'),
            fetch('/api/canchas'),
            fetch('/api/reservas/activas')
        ]);
        const inv = await resInv.json();
        const can = await resCan.json();
        const res = await resRes.json();

        // 1. Ocupación
        const perc = can.length === 0 ? 0 : (res.length / can.length) * 100;
        document.getElementById('stat-ocupacion').innerText = `${perc.toFixed(0)}%`;
        document.getElementById('barra-ocupacion').style.width = `${perc}%`;

        // 2. Ingresos Estimados (Basado en canchas ocupadas)
        let totalIngresos = 0;
        res.forEach(r => {
            totalIngresos += r.nombre_cancha && r.nombre_cancha.includes('Sintética') ? 60000 : 100000;
        });
        document.getElementById('stat-ingresos').innerText = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(totalIngresos);

        // 3. Alerta de Balones
        const balones = inv.find(i => i.articulo === 'Balón');
        const disp = balones ? balones.cantidad_disponible : 0;
        document.getElementById('stat-balones').innerText = disp;
        
        const tarjeta = document.getElementById('tarjeta-alerta-balones');
        const texto = document.getElementById('texto-alerta-balones');
        if (disp < 5) {
            tarjeta.classList.add('alerta-animada');
            texto.innerText = "¡URGENTE: Recuperar balones!";
        } else {
            tarjeta.classList.remove('alerta-animada');
            texto.innerText = "Stock suficiente";
        }
    } catch (e) { console.error("Error en Dashboard:", e); }
}

// =========================================================
// 3. FACTURACIÓN DINÁMICA Y PDF
// =========================================================

function calcularTotal() {
    const sel = document.getElementById('tipo-cancha');
    const opt = sel.options[sel.selectedIndex];
    const precioBase = parseInt(opt.getAttribute('data-precio'));
    
    // Auto-completar implementos base si el usuario no ha movido nada
    if (!document.getElementById('balones').dataset.mod) {
        const es11 = sel.value.includes('11v11');
        document.getElementById('petos_rojos').value = es11 ? 11 : 7;
        document.getElementById('petos_azules').value = es11 ? 11 : 7;
        document.getElementById('balones').dataset.mod = "1";
    }

    // Lógica de cobro extra: Cada balón adicional después del primero cuesta $5.000
    const extraBalones = (Math.max(0, document.getElementById('balones').value - 1) * 5000);
    const total = precioBase + extraBalones;

    const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
    document.getElementById('factura-cancha-precio').innerText = fmt.format(precioBase);
    document.getElementById('factura-total').innerText = fmt.format(total);
    
    const secExtras = document.getElementById('seccion-extras');
    if (extraBalones > 0) {
        secExtras.style.display = 'block';
        document.getElementById('factura-extras-precio').innerText = fmt.format(extraBalones);
    } else {
        secExtras.style.display = 'none';
    }
}

function descargarPDF() {
    const element = document.getElementById('recibo-imprimible');
    document.getElementById('logo-recibo').style.display = 'block'; // Mostrar logo para el PDF
    
    const opt = {
        margin: 1,
        filename: `Recibo_FitCanchas_${new Date().toLocaleDateString()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        document.getElementById('logo-recibo').style.display = 'none'; // Ocultar de nuevo en la web
    });
}

// =========================================================
// 4. GESTIÓN DE RESERVAS E INVENTARIO (RBAC APLICADO)
// =========================================================

async function cargarInventario() {
    const contenedorInv = document.getElementById('lista-inventario');
    const contenedorCanchas = document.getElementById('lista-canchas');

    try {
        // Leer el rol del usuario logueado
        const sesion = localStorage.getItem('usuario');
        const usuarioActual = sesion ? JSON.parse(sesion) : null;
        const esAdmin = usuarioActual && usuarioActual.rol === 'admin';

        const [ri, rc, rr] = await Promise.all([
            fetch('/api/inventario'), fetch('/api/canchas'), fetch('/api/reservas/activas')
        ]);
        const inv = await ri.json();
        const can = await rc.json();
        const res = await rr.json();
        
        // Dibujar Artículos
        contenedorInv.innerHTML = inv.map(i => `
            <div class="tarjeta-inv">
                <h4>${i.articulo}</h4>
                <h3 style="color: #008080;">${i.cantidad_disponible} disp.</h3>
            </div>
        `).join('');

        // Dibujar Canchas con permiso de cancelación
        contenedorCanchas.innerHTML = can.map(c => {
            const r = res.find(re => re.cancha_id === c.id);
            let btnCancelar = "";
            
            if (r && esAdmin) {
                // Solo si es admin aparece el botón
                btnCancelar = `
                    <button onclick="cancelarReserva(${r.id})" style="background: #dc3545; color: white; border: none; padding: 8px; width: 100%; cursor: pointer; border-radius: 4px; margin-top: 8px; font-weight: bold;">
                        ❌ Cancelar Reserva
                    </button>`;
            } else if (r && !esAdmin) {
                // Si es cliente, solo ve el texto de aviso
                btnCancelar = `<p style="color: #dc3545; font-size: 11px; margin-top: 5px;">Ocupada (Contactar Admin para cambios)</p>`;
            }

            return `
                <div class="tarjeta-inv" style="border-left: 5px solid ${r ? '#dc3545' : '#28a745'}">
                    <h4>${c.nombre}</h4>
                    ${r ? `<p><strong>Ocupada por:</strong> ${r.nombre_cliente}</p>` : '<p style="color: #28a745">✅ Disponible</p>'}
                    ${btnCancelar}
                </div>`;
        }).join('');
    } catch (e) { console.error(e); }
}

async function cancelarReserva(reservaId) {
    if (!confirm("¿Seguro que quieres anular esta reserva y devolver el equipo al inventario?")) return;
    try {
        const res = await fetch(`/api/reservas/${reservaId}/cancelar`, { method: 'PUT' });
        if (res.ok) {
            alert("✅ Reserva cancelada correctamente.");
            cargarInventario();
            cargarDashboard();
        } else {
            const data = await res.json();
            alert("❌ Error: " + data.mensaje);
        }
    } catch (e) { alert("Error de red."); }
}

// =========================================================
// 5. INICIALIZACIÓN Y EVENTOS
// =========================================================

window.addEventListener('DOMContentLoaded', () => {
    // Verificar si ya hay una sesión guardada
    const sesion = localStorage.getItem('usuario');
    if (sesion) {
        const u = JSON.parse(sesion);
        aplicarRoles(u);
        document.getElementById('login-overlay').style.display = 'none';
    }
    
    // Escuchar cambios en la cancha para el recibo
    document.getElementById('tipo-cancha').addEventListener('change', () => {
        document.getElementById('balones').dataset.mod = "";
        calcularTotal();
    });

    // Escuchar cambios en implementos para el recibo
    ['balones', 'petos_rojos', 'petos_azules'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', calcularTotal);
    });
});

// Enviar el formulario de reserva
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

    const res = await fetch('/api/reservas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevaReserva)
    });

    if (res.ok) {
        alert("✅ ¡Reserva confirmada con éxito!");
        location.reload(); // Recargar para actualizar todo
    } else {
        const data = await res.json();
        alert("❌ Error: " + data.mensaje);
    }
});