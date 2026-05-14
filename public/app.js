/**
 * FIT CANCHAS v7.0 - PREMIUM EDITION
 */

// === 1. TOAST NOTIFICATIONS & UI UTILS ===
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    toast.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 3500);
}

// Confetti celebration
function lanzarConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const pieces = [];
    const colors = ['#22c55e','#059669','#16a34a','#4ade80','#a7f3d0','#fbbf24'];
    for (let i = 0; i < 120; i++) {
        pieces.push({ x: Math.random()*canvas.width, y: Math.random()*canvas.height - canvas.height, w: Math.random()*8+4, h: Math.random()*4+2, color: colors[Math.floor(Math.random()*colors.length)], vy: Math.random()*3+2, vx: Math.random()*2-1, rot: Math.random()*360 });
    }
    let frame = 0;
    function draw() {
        ctx.clearRect(0,0,canvas.width,canvas.height);
        pieces.forEach(p => {
            ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot*Math.PI/180);
            ctx.fillStyle = p.color; ctx.globalAlpha = Math.max(0, 1 - frame/120);
            ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h); ctx.restore();
            p.y += p.vy; p.x += p.vx; p.rot += 3;
        });
        frame++;
        if (frame < 140) requestAnimationFrame(draw);
        else ctx.clearRect(0,0,canvas.width,canvas.height);
    }
    draw();
}

// Animated counter
function animarContador(el, target, prefix = '', suffix = '') {
    let current = 0;
    const step = Math.max(1, Math.ceil(target / 40));
    const timer = setInterval(() => {
        current += step;
        if (current >= target) { current = target; clearInterval(timer); }
        el.innerText = `${prefix}${current.toLocaleString('es-CO')}${suffix}`;
    }, 30);
}

// Reloj en vivo
setInterval(() => {
    const now = new Date();
    document.getElementById('live-time').innerText = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('live-date').innerText = now.toLocaleDateString('es-CO', { weekday: 'long', month: 'short', day: 'numeric' });
}, 1000);

// Saludo dinámico
function updateGreeting() {
    const hour = new Date().getHours();
    let greeting = 'Buenas noches,';
    if (hour >= 5 && hour < 12) greeting = 'Buenos días,';
    else if (hour >= 12 && hour < 19) greeting = 'Buenas tardes,';
    document.getElementById('greeting-text').innerText = greeting;
}

// Dark Mode Toggle
const themeToggle = document.getElementById('theme-toggle');
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('fitcanchas_theme', isDark ? 'dark' : 'light');
});

// === 2. AUTH & NAVIGATION ===
function mostrarModulo(id) {
    const modulos = document.querySelectorAll('.modulo');
    modulos.forEach(m => {
        m.classList.remove('activo');
        setTimeout(() => m.style.display = 'none', 400); // Wait for transition
    });

    const botones = document.querySelectorAll('.menu-btn');
    botones.forEach(b => b.classList.remove('active'));

    const modDestino = document.getElementById(`modulo-${id}`);
    if (modDestino) {
        setTimeout(() => {
            modDestino.style.display = 'block';
            setTimeout(() => modDestino.classList.add('activo'), 20);
        }, 400);
    }
    
    const btnActivo = document.querySelector(`button[onclick*="${id}"]`);
    if (btnActivo) btnActivo.classList.add('active');

    if (id === 'dashboard') cargarDashboard();
    if (id === 'inventario') cargarInventario();
    if (id === 'reservar') cargarCanchasEnSelect();
    if (id === 'mis-reservas') cargarMisReservas();
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
                showToast('Credenciales incorrectas', 'error');
            }
        } catch (e) { 
            showToast('Falla de conexión al servidor', 'error'); 
        }
    });
}

// Toggle Login <-> Registro
document.getElementById('btn-mostrar-registro')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('vista-login').style.display = 'none';
    document.getElementById('vista-registro').style.display = 'block';
});
document.getElementById('btn-mostrar-login')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('vista-registro').style.display = 'none';
    document.getElementById('vista-login').style.display = 'block';
});

// Solo permitir números en el campo de teléfono
document.getElementById('reg-telefono')?.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, '');
});

// Formulario de Registro
const formRegistro = document.getElementById('form-registro');
if (formRegistro) {
    formRegistro.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('reg-nombre').value;
        const email = document.getElementById('reg-email').value;
        const telefono = document.getElementById('reg-telefono').value;
        const password = document.getElementById('reg-pass').value;

        if (!/^[0-9]+$/.test(telefono)) {
            showToast('El teléfono solo puede contener números', 'error');
            return;
        }

        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, email, telefono })
            });
            const data = await res.json();
            if (data.success) {
                showToast(data.mensaje, 'success');
                // Volver a la vista de login
                document.getElementById('vista-registro').style.display = 'none';
                document.getElementById('vista-login').style.display = 'block';
                formRegistro.reset();
            } else {
                showToast(data.mensaje, 'error');
            }
        } catch (e) { 
            showToast('Error de conexión con el servidor', 'error'); 
        }
    });
}

function aplicarRoles(usuario) {
    document.getElementById('user-display-name').innerText = usuario.username;
    document.getElementById('nombre').value = usuario.username;

    const adminBtns = document.querySelectorAll('.admin-only');
    if (usuario.rol === 'cliente') {
        adminBtns.forEach(btn => btn.style.display = 'none');
        mostrarModulo('mis-reservas');
    } else {
        adminBtns.forEach(btn => btn.style.display = 'flex');
        mostrarModulo('dashboard');
    }
}

function cerrarSesion() {
    localStorage.removeItem('usuario');
    location.reload();
}

// === 3. RESERVAS CORE ===
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
    } catch (e) { showToast("Error al cargar canchas", "error"); }
}

function actualizarPromociones() {
    const selectCancha = document.getElementById('tipo-cancha');
    const selectPromo = document.getElementById('combo-promo');
    if (!selectCancha || !selectPromo) return;

    const opCancha = selectCancha.options[selectCancha.selectedIndex];
    const tipo = opCancha ? opCancha.getAttribute('data-tipo') : "";

    Array.from(selectPromo.options).forEach(opt => {
        const promoTipo = opt.getAttribute('data-promo');
        if (!promoTipo || tipo.includes(promoTipo)) {
            opt.style.display = "block";
        } else {
            opt.style.display = "none";
            if (selectPromo.value === opt.value) selectPromo.value = "0";
        }
    });
    calcularTotal();
}

function calcularTotal() {
    const selectCancha = document.getElementById('tipo-cancha');
    const selectPromo = document.getElementById('combo-promo');
    const inputBalones = document.getElementById('balones');
    const petosR = document.getElementById('petos_rojos')?.value || 0;
    const petosA = document.getElementById('petos_azules')?.value || 0;
    
    if (!selectCancha || !selectPromo) return;

    const op = selectCancha.options[selectCancha.selectedIndex];
    if (!op) return;
    const tipo = op.getAttribute('data-tipo');
    
    let precioBase = tipo.includes('11v11') ? 100000 : 60000;
    let extraP = parseInt(selectPromo.value) || 0;
    let extraB = Math.max(0, parseInt(inputBalones.value) - 1) * 5000;

    const total = precioBase + extraP + extraB;
    document.getElementById('factura-total').innerText = `$${total.toLocaleString('es-CO')}`;

    // Resumen visual (visible en pantalla y en el PDF)
    const user = JSON.parse(localStorage.getItem('usuario'));
    const horaSelect = document.getElementById('hora');
    const horaTexto = horaSelect ? horaSelect.options[horaSelect.selectedIndex].text : '';
    const fechaVal = document.getElementById('fecha')?.value || '';
    const promoTexto = selectPromo.options[selectPromo.selectedIndex].text;

    const resumenHTML = `
        <div class="resumen-visual-grid">
            <p><strong>Cliente:</strong> ${user ? user.username : 'N/A'}</p>
            <p><strong>Cancha:</strong> ${op.text.trim()}</p>
            <p><strong>Fecha:</strong> ${fechaVal}</p>
            <p><strong>Hora:</strong> ${horaTexto}</p>
            <p><strong>Balones:</strong> ${inputBalones.value}</p>
            <p><strong>Petos:</strong> ${parseInt(petosR) + parseInt(petosA)} (R:${petosR} / A:${petosA})</p>
            <p><strong>Promoción:</strong> ${promoTexto}</p>
            <p><strong>Precio Base:</strong> $${precioBase.toLocaleString('es-CO')}</p>
        </div>
    `;
    document.getElementById('resumen-visual').innerHTML = resumenHTML;

    // Detalle oculto para el PDF (se muestra solo al generar)
    document.getElementById('detalle-alquiler-pdf').innerHTML = resumenHTML;
}

document.getElementById('form-reserva')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem('usuario'));
    const metodoPago = document.querySelector('input[name="pago"]:checked').value;

    const payload = {
        usuario_id: user ? user.id : 1,
        nombre_cliente: user ? user.username : 'Cliente',
        cancha_id: document.getElementById('tipo-cancha').value,
        fecha_reserva: document.getElementById('fecha').value,
        hora_inicio: document.getElementById('hora').value,
        balones_prestados: document.getElementById('balones').value,
        petos_rojos_prestados: document.getElementById('petos_rojos').value,
        petos_azules_prestados: document.getElementById('petos_azules').value,
        metodo_pago: metodoPago
    };

    const btn = document.getElementById('btn-confirmar');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
    btn.disabled = true;

    try {
        const res = await fetch('/api/reservas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) { 
            showToast("\u00a1Reserva confirmada exitosamente!", "success");
            lanzarConfetti();
            setTimeout(() => {
                btn.innerHTML = '<i class="fas fa-check-circle"></i> Confirmar Reserva';
                btn.disabled = false;
                mostrarModulo(user.rol === 'admin' ? 'dashboard' : 'mis-reservas');
            }, 2000);
        } else { 
            const data = await res.json();
            showToast(data.mensaje || "Error: Conflicto de horario o stock", "error"); 
            btn.innerHTML = '<i class="fas fa-check-circle"></i> Confirmar Reserva';
            btn.disabled = false;
        }
    } catch(err) {
        showToast("Error de conexi\u00f3n", "error");
        btn.innerHTML = '<i class="fas fa-check-circle"></i> Confirmar Reserva';
        btn.disabled = false;
    }
});

// === 4. CLIENTE: MIS RESERVAS ===
async function cargarMisReservas() {
    const contenedor = document.getElementById('lista-mis-reservas');
    const user = JSON.parse(localStorage.getItem('usuario'));
    if (!user) return;

    try {
        const res = await fetch('/api/reservas/activas');
        const reservas = await res.json();
        
        // Filtrar por nombre de usuario (ya que la DB usa nombre_cliente)
        const misReservas = reservas.filter(r => r.nombre_cliente === user.username);

        if (misReservas.length === 0) {
            contenedor.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--text-muted);">No tienes reservas activas. ¡Anímate a programar un partido!</div>`;
            return;
        }

        contenedor.innerHTML = misReservas.map(r => `
            <div class="card-glass">
                <div class="item-header">
                    <h4>${r.nombre_cancha}</h4>
                    <span class="badge success">Confirmada</span>
                </div>
                <div style="margin: 15px 0; color: var(--text-muted); font-size: 0.9em;">
                    <p><i class="fas fa-calendar"></i> ${new Date(r.fecha_reserva).toLocaleDateString()}</p>
                    <p><i class="fas fa-clock"></i> ${r.hora_inicio}</p>
                    <p><i class="fas fa-futbol"></i> Balones: ${r.balones_prestados} | Petos: ${r.petos_rojos_prestados + r.petos_azules_prestados}</p>
                </div>
                <button onclick="cancelarReserva(${r.id})" class="btn-sm-danger" style="width: 100%; padding: 12px;">
                    <i class="fas fa-times"></i> Cancelar Reserva
                </button>
            </div>
        `).join('');
    } catch(e) { showToast("Error al cargar reservas", "error"); }
}

// === 5. ADMIN: DASHBOARD E INVENTARIO ===
async function cargarDashboard() {
    try {
        const [rCan, rRes] = await Promise.all([fetch('/api/canchas'), fetch('/api/reservas/activas')]);
        const can = await rCan.json(), res = await rRes.json();
        
        const perc = can.length === 0 ? 0 : (res.length / can.length) * 100;
        animarContador(document.getElementById('stat-ocupacion'), Math.round(perc), '', '%');
        document.getElementById('barra-ocupacion').style.width = `${perc}%`;
        
        let totalDinero = 0;
        res.forEach(r => {
            totalDinero += (r.nombre_cancha && r.nombre_cancha.includes('Sintética')) ? 60000 : 100000;
        });
        animarContador(document.getElementById('stat-ingresos'), totalDinero, '$');
        animarContador(document.getElementById('stat-total-res'), res.length);
    } catch (e) { showToast("Error cargando dashboard", "error"); }
}

let todasLasCanchas = [];
let todasLasReservas = [];

async function cargarInventario() {
    const contInv = document.getElementById('lista-inventario');
    const contCan = document.getElementById('lista-canchas');

    try {
        const [ri, rc, rr] = await Promise.all([
            fetch('/api/inventario'), fetch('/api/canchas'), fetch('/api/reservas/activas')
        ]);
        const inv = await ri.json();
        todasLasCanchas = await rc.json();
        todasLasReservas = await rr.json();

        // Inventario Stats
        contInv.innerHTML = inv.map(i => {
            const perc = (i.cantidad_disponible / i.cantidad_total) * 100;
            return `
            <div class="tarjeta-item">
                <div class="item-header">
                    <h4>${i.articulo} ${i.color ? `(${i.color})` : ''}</h4>
                    <span class="badge ${perc < 20 ? 'danger' : 'success'}">${i.cantidad_disponible} unid.</span>
                </div>
                <div style="width: 100%;">
                    <div class="progress-container" style="height: 6px;">
                        <div class="progress-bar" style="width: ${perc}%; background: ${perc < 20 ? 'var(--danger)' : 'var(--primary)'}"></div>
                    </div>
                </div>
            </div>
        `}).join('');

        renderizarCanchasAdmin(todasLasCanchas);

    } catch (e) { showToast("Error cargando inventario", "error"); }
}

function renderizarCanchasAdmin(canchasFiltradas) {
    const contCan = document.getElementById('lista-canchas');
    if (!contCan) return;

    contCan.innerHTML = canchasFiltradas.map(cancha => {
        const reservasAgenda = todasLasReservas.filter(r => r.cancha_id === cancha.id);
        const estaOcupada = reservasAgenda.length > 0;
        
        let agendaHTML = estaOcupada ? reservasAgenda.map(r => `
            <div class="reserva-item">
                <div class="reserva-info">
                    <h5>👤 ${r.nombre_cliente}</h5>
                    <p>⏰ ${r.hora_inicio}</p>
                </div>
                <button onclick="cancelarReserva(${r.id})" class="btn-sm-danger"><i class="fas fa-ban"></i></button>
            </div>
        `).join('') : '<div class="reserva-item" style="border-left-color: var(--success);"><div class="reserva-info"><p>Libre actualmente</p></div></div>';

        return `
            <div class="tarjeta-item ${estaOcupada ? 'ocupada' : 'disponible'}">
                <div class="item-header">
                    <h4>${cancha.nombre}</h4>
                    <span class="badge ${estaOcupada ? 'warning' : 'success'}">${cancha.tipo}</span>
                </div>
                <div style="width:100%;">
                    ${agendaHTML}
                </div>
            </div>
        `;
    }).join('');
}

// Búsqueda de canchas
document.getElementById('buscador-canchas')?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtradas = todasLasCanchas.filter(c => 
        c.nombre.toLowerCase().includes(query) || 
        c.tipo.toLowerCase().includes(query)
    );
    renderizarCanchasAdmin(filtradas);
});

// Modal de cancelación personalizado
function mostrarModalCancelar() {
    return new Promise((resolve) => {
        const modal = document.getElementById('modal-cancelar');
        modal.classList.add('visible');

        const btnSi = document.getElementById('modal-si');
        const btnNo = document.getElementById('modal-no');

        function limpiar() {
            modal.classList.remove('visible');
            btnSi.replaceWith(btnSi.cloneNode(true));
            btnNo.replaceWith(btnNo.cloneNode(true));
        }

        btnSi.addEventListener('click', () => { limpiar(); resolve(true); }, { once: true });
        btnNo.addEventListener('click', () => { limpiar(); resolve(false); }, { once: true });
        modal.addEventListener('click', (e) => { if (e.target === modal) { limpiar(); resolve(false); } }, { once: true });
    });
}

async function cancelarReserva(id) {
    const confirmado = await mostrarModalCancelar();
    if (!confirmado) return;

    try {
        await fetch(`/api/reservas/${id}/cancelar`, { method: 'PUT' });
        showToast("Reserva cancelada y stock devuelto", "success");
        
        const user = JSON.parse(localStorage.getItem('usuario'));
        if(user.rol === 'admin') cargarInventario();
        else cargarMisReservas();
    } catch(e) {
        showToast("Error al cancelar la reserva", "error");
    }
}

// === BOOTSTRAP ===
window.onload = () => {
    // Configuración de fecha mínima a hoy
    const fechaInput = document.getElementById('fecha');
    if (fechaInput) {
        const today = new Date().toISOString().split('T')[0];
        fechaInput.setAttribute('min', today);
        fechaInput.value = today;
    }

    updateGreeting();

    // Preferencia de tema
    const savedTheme = localStorage.getItem('fitcanchas_theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }

    const sesion = localStorage.getItem('usuario');
    if (sesion) {
        const user = JSON.parse(sesion);
        document.getElementById('login-overlay').style.display = 'none';
        aplicarRoles(user);
    }
    
    // Listeners interactivos
    document.getElementById('tipo-cancha')?.addEventListener('change', actualizarPromociones);
    document.getElementById('combo-promo')?.addEventListener('change', calcularTotal);
    ['balones', 'petos_rojos', 'petos_azules'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', calcularTotal);
    });

    // Mobile sidebar
    const mobileBtn = document.getElementById('mobile-menu-btn');
    if (mobileBtn && window.innerWidth <= 900) {
        mobileBtn.style.display = 'flex';
        mobileBtn.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
        });
    }
};

function descargarPDF() {
    // Aseguramos que calcularTotal actualice el detalle antes de generar
    calcularTotal();

    showToast("Generando recibo PDF...", "success");
    const el = document.getElementById('recibo-imprimible');
    const head = document.getElementById('pdf-header');
    const detalle = document.getElementById('detalle-alquiler-pdf');
    
    head.style.display = 'block';
    detalle.style.display = 'block';
    
    html2pdf().set({
        margin: 0.75,
        filename: `FitCanchas_Comprobante_${Date.now()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    }).from(el).save().then(() => {
        head.style.display = 'none';
        detalle.style.display = 'none';
    });
}