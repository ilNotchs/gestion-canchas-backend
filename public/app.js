/**
 * FIT CANCHAS v8.0 - PREMIUM REDESIGN
 */

// === 1. UTILIDADES Y GLOBALES ===
const state = { canchas: [], reservasActivas: [], user: null };

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

function lanzarConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const pieces = []; const colors = ['#22c55e','#059669','#16a34a','#4ade80','#a7f3d0','#fbbf24'];
    for (let i = 0; i < 120; i++) pieces.push({ x: Math.random()*canvas.width, y: Math.random()*canvas.height - canvas.height, w: Math.random()*8+4, h: Math.random()*4+2, color: colors[Math.floor(Math.random()*colors.length)], vy: Math.random()*3+2, vx: Math.random()*2-1, rot: Math.random()*360 });
    let frame = 0;
    function draw() {
        ctx.clearRect(0,0,canvas.width,canvas.height);
        pieces.forEach(p => {
            ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot*Math.PI/180);
            ctx.fillStyle = p.color; ctx.globalAlpha = Math.max(0, 1 - frame/120);
            ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h); ctx.restore();
            p.y += p.vy; p.x += p.vx; p.rot += 3;
        });
        frame++; if (frame < 140) requestAnimationFrame(draw); else ctx.clearRect(0,0,canvas.width,canvas.height);
    }
    draw();
}

function formatearDinero(num) { return `$${parseInt(num).toLocaleString('es-CO')}`; }

// === 2. NAVEGACIÓN Y SESIÓN ===
function mostrarModulo(id) {
    document.querySelectorAll('.modulo').forEach(m => m.classList.remove('activo'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    
    document.getElementById(`modulo-${id}`).classList.add('activo');
    const btn = document.querySelector(`.nav-item[onclick="mostrarModulo('${id}')"]`);
    if(btn) btn.classList.add('active');

    // Cerrar sidebar en movil
    if(window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');

    // Hooks
    if(id === 'reservar') recalcularTotal();
    if(id === 'mis-reservas') renderMisReservas();
    if(id === 'pagos') renderPagos();
    if(id === 'perfil') renderPerfil();
}

document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
});

// Config Theme
const toggleDark = document.getElementById('toggle-dark');
if(toggleDark) {
    toggleDark.addEventListener('change', (e) => {
        if(e.target.checked) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('theme', 'light');
        }
    });
}

function inicializarSesion() {
    const sesion = localStorage.getItem('usuario');
    if(sesion) {
        state.user = JSON.parse(sesion);
        document.getElementById('login-overlay').style.display = 'none';
        
        // Setup UI con datos del user
        document.getElementById('user-display-name').innerText = state.user.username;
        const inicial = state.user.username.charAt(0).toUpperCase();
        document.getElementById('topbar-name').innerText = state.user.username;
        document.getElementById('topbar-avatar').innerText = inicial;
        
        cargarDatosGlobales();
    }
}

function cerrarSesion() {
    localStorage.removeItem('usuario');
    location.reload();
}

// === 3. AUTH LOGIC ===
document.getElementById('btn-mostrar-registro')?.addEventListener('click', (e) => {
    e.preventDefault(); document.getElementById('vista-login').style.display = 'none'; document.getElementById('vista-registro').style.display = 'block';
});
document.getElementById('btn-mostrar-login')?.addEventListener('click', (e) => {
    e.preventDefault(); document.getElementById('vista-registro').style.display = 'none'; document.getElementById('vista-login').style.display = 'block';
});

document.getElementById('form-login')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button'); btn.disabled = true; btn.innerText = "Verificando...";
    try {
        const res = await fetch('/api/login', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: document.getElementById('user').value, password: document.getElementById('pass').value })
        });
        const data = await res.json();
        if(data.success) { localStorage.setItem('usuario', JSON.stringify(data.usuario)); location.reload(); }
        else { showToast('Credenciales incorrectas', 'error'); btn.disabled = false; btn.innerText = "Iniciar Sesión"; }
    } catch(err) { showToast('Error de servidor', 'error'); btn.disabled = false; btn.innerText = "Iniciar Sesión"; }
});

document.getElementById('form-registro')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button'); btn.disabled = true; btn.innerText = "Creando...";
    try {
        const res = await fetch('/api/register', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username: document.getElementById('reg-nombre').value, email: document.getElementById('reg-email').value,
                telefono: document.getElementById('reg-telefono').value, password: document.getElementById('reg-pass').value 
            })
        });
        const data = await res.json();
        if(data.success) { showToast(data.mensaje, 'success'); document.getElementById('btn-mostrar-login').click(); e.target.reset(); }
        else { showToast(data.mensaje, 'error'); }
    } catch(err) { showToast('Error', 'error'); }
    btn.disabled = false; btn.innerText = "Registrarse";
});

// === 4. DATOS Y FORMULARIO DE RESERVA ===
async function cargarDatosGlobales() {
    try {
        const [resC, resR] = await Promise.all([fetch('/api/canchas'), fetch('/api/reservas/activas')]);
        state.canchas = await resC.json();
        state.reservasActivas = await resR.json();
        
        // Poblar selects
        const select = document.getElementById('tipo-cancha');
        const pref = document.getElementById('pref-cancha');
        if(select && pref) {
            const options = state.canchas.map(c => `<option value="${c.id}" data-tipo="${c.tipo}" data-name="${c.nombre}">${c.nombre} (${c.tipo})</option>`).join('');
            select.innerHTML = options;
            pref.innerHTML = `<option value="none">Ninguna</option>` + options;
        }
        
        setupFormReservaListeners();
        recalcularTotal();
        renderMisReservas();
    } catch(e) { console.error(e); showToast("Error cargando canchas", "error"); }
}

function ajustarContador(tipo, diff) {
    const el = document.getElementById(`val-${tipo}`);
    let val = parseInt(el.innerText) + diff;
    if(tipo === 'balones' && val < 0) val = 0;
    if(tipo === 'petos' && val < 0) val = 0;
    el.innerText = val;
    recalcularTotal();
}

function setupFormReservaListeners() {
    // Fecha min hoy
    const fechaInp = document.getElementById('fecha');
    const hoy = new Date().toISOString().split('T')[0];
    fechaInp.min = hoy; fechaInp.value = hoy;

    // Listeners interactivos
    ['tipo-cancha', 'combo-promo', 'fecha', 'duracion'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', recalcularTotal);
    });

    // Grid horarios interactivo
    document.querySelectorAll('.btn-horario').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if(e.target.classList.contains('reservado')) return;
            document.querySelectorAll('.btn-horario').forEach(b => b.classList.remove('selected'));
            e.target.classList.add('selected');
            document.getElementById('hora-seleccionada').value = e.target.dataset.time;
            recalcularTotal();
        });
    });
}

function recalcularTotal() {
    const selectCancha = document.getElementById('tipo-cancha');
    if(!selectCancha.options.length) return;
    
    const opt = selectCancha.options[selectCancha.selectedIndex];
    const tipo = opt.dataset.tipo;
    const nombre = opt.dataset.name;
    const duracion = parseInt(document.getElementById('duracion').value) || 1;
    const promo = document.getElementById('combo-promo').value;
    const balones = parseInt(document.getElementById('val-balones').innerText) || 0;
    
    // Calcular costo
    let precioBase = tipo.includes('11v11') ? 100000 : 60000;
    precioBase = precioBase * duracion;
    
    let extraBalones = Math.max(0, balones - 1) * 5000;
    let extraPromo = promo === 'nocturno' ? 0 : (parseInt(promo) || 0);
    
    let total = precioBase + extraBalones + extraPromo;
    if(promo === 'nocturno') total = total * 0.85; // 15% OFF
    
    document.getElementById('factura-total').innerText = formatearDinero(total);

    // Actualizar Textos Resumen
    document.getElementById('res-cancha').innerText = nombre;
    
    const fecha = document.getElementById('fecha').value;
    const horabtn = document.querySelector('.btn-horario.selected');
    const horaTexto = horabtn ? horabtn.innerText : '06:00 PM';
    
    // Format fecha a texto lindo
    const fechaStr = new Date(fecha + 'T00:00:00').toLocaleDateString('es-CO', {day:'numeric', month:'long', year:'numeric'});
    document.getElementById('res-fecha-hora').innerHTML = `${fechaStr}<br>${horaTexto}`;
    document.getElementById('res-duracion').innerText = `${duracion} hora${duracion>1?'s':''}`;
    
    const p = document.getElementById('val-petos').innerText;
    document.getElementById('res-implementos').innerText = `${balones} Balón${balones!==1?'es':''}, ${p} Petos`;
    document.getElementById('res-promo').innerText = document.getElementById('combo-promo').options[document.getElementById('combo-promo').selectedIndex].text.split('-')[0].trim();
}

// Enviar Formulario
async function enviarReserva() {
    const btn = document.getElementById('btn-confirmar');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...'; btn.disabled = true;

    try {
        const payload = {
            usuario_id: state.user.id || 1, nombre_cliente: state.user.username,
            cancha_id: document.getElementById('tipo-cancha').value,
            fecha_reserva: document.getElementById('fecha').value,
            hora_inicio: document.getElementById('hora-seleccionada').value,
            horas_alquiladas: document.getElementById('duracion').value,
            balones_prestados: document.getElementById('val-balones').innerText,
            petos_rojos_prestados: document.getElementById('val-petos').innerText,
            petos_azules_prestados: 0,
            metodo_pago: document.querySelector('input[name="pago"]:checked').value
        };

        const res = await fetch('/api/reservas', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });

        if(res.ok) {
            showToast("¡Reserva confirmada!", "success");
            lanzarConfetti();
            cargarDatosGlobales(); // recarga reservas activas
            setTimeout(() => { btn.innerHTML = 'Confirmar Reserva <i class="fas fa-arrow-right"></i>'; btn.disabled = false; mostrarModulo('mis-reservas'); }, 2000);
        } else {
            const err = await res.json();
            showToast(err.mensaje || "Conflicto de horario", "error");
            btn.innerHTML = 'Confirmar Reserva <i class="fas fa-arrow-right"></i>'; btn.disabled = false;
        }
    } catch(e) { showToast("Error de conexión", "error"); btn.innerHTML = 'Confirmar Reserva <i class="fas fa-arrow-right"></i>'; btn.disabled = false; }
}

// === 5. RENDER MODULOS ===
function renderMisReservas() {
    const list = document.getElementById('lista-mis-reservas');
    const misR = state.reservasActivas.filter(r => r.nombre_cliente === state.user.username && r.estado === 'activa');
    
    if(misR.length === 0) {
        list.innerHTML = `<div class="empty-state">
            <i class="far fa-calendar-times"></i><h3>Sin reservas</h3>
            <p>¡Tu próximo gol te espera!</p>
            <button class="btn-confirmar" style="width:auto; margin:0 auto; padding:12px 24px;" onclick="mostrarModulo('reservar')">Programar Partido</button>
        </div>`;
        return;
    }

    list.innerHTML = misR.map(r => {
        const fechaObj = new Date(r.fecha_reserva + 'T00:00:00');
        const esHoy = fechaObj.toDateString() === new Date().toDateString();
        
        return `<div class="reserva-card">
            <div class="countdown">${esHoy ? '🔥 JUEGAS HOY' : '⏳ PRÓXIMAMENTE'}</div>
            <div class="reserva-header" style="margin-top:15px;">
                <h4>${r.nombre_cancha}</h4>
                <span class="badge activa">Confirmada</span>
            </div>
            <div class="reserva-info">
                <p><i class="far fa-calendar"></i> ${fechaObj.toLocaleDateString()}</p>
                <p><i class="far fa-clock"></i> ${r.hora_inicio} (${r.horas_alquiladas}h)</p>
                <p><i class="fas fa-futbol"></i> Balones: ${r.balones_prestados} | Petos: ${r.petos_rojos_prestados}</p>
            </div>
            <div class="reserva-actions">
                <button class="btn-outline" onclick="compartirReserva('${r.nombre_cancha}', '${fechaObj.toLocaleDateString()}', '${r.hora_inicio}')"><i class="fas fa-share-alt"></i></button>
                <button class="btn-outline danger" onclick="pedirCancelacion(${r.id})"><i class="fas fa-times"></i> Cancelar</button>
            </div>
        </div>`;
    }).join('');
}

function compartirReserva(cancha, fecha, hora) {
    const texto = `¡Tengo cancha en FitCanchas! 🏟️ Jugaré en ${cancha} el ${fecha} a las ${hora}. ¡Allá nos vemos!`;
    navigator.clipboard.writeText(texto).then(() => showToast("Copiado al portapapeles", "success"));
}

function renderPagos() {
    const misR = state.reservasActivas.filter(r => r.nombre_cliente === state.user.username);
    // Para simplificar, asumimos que reservas activas incluye todo en este mock, o que el endpoint fue ajustado. 
    // Usaremos lo que hay.
    
    let total = 0;
    const body = document.getElementById('tabla-historial');
    body.innerHTML = misR.map(r => {
        let precio = r.nombre_cancha.includes('11v11') ? 100000 : 60000;
        precio *= r.horas_alquiladas;
        total += precio;
        return `<tr>
            <td>${new Date(r.fecha_reserva + 'T00:00:00').toLocaleDateString()}</td>
            <td>${r.nombre_cancha}</td>
            <td><span style="text-transform:capitalize;"><i class="fas fa-money-bill" style="color:var(--text-muted); margin-right:5px;"></i>${r.metodo_pago}</span></td>
            <td class="monto-cell">${formatearDinero(precio)}</td>
            <td><span class="badge activa">Activa</span></td>
        </tr>`;
    }).join('');

    if(misR.length === 0) body.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay transacciones recientes</td></tr>';

    document.getElementById('stat-gastado').innerText = formatearDinero(total);
    document.getElementById('stat-reservas').innerText = misR.length;
}

function renderPerfil() {
    document.getElementById('perfil-nombre').innerText = state.user.username;
    document.getElementById('perfil-email').innerText = state.user.email;
    document.getElementById('perfil-tel').value = state.user.telefono || "No registrado";
    document.getElementById('perfil-rol').value = state.user.rol.toUpperCase();
    document.getElementById('perfil-avatar').innerText = state.user.username.charAt(0).toUpperCase();
}

// === 6. MODAL Y CANCELACIÓN ===
function mostrarModalCancelar() {
    return new Promise(resolve => {
        const modal = document.getElementById('modal-cancelar'); modal.classList.add('visible');
        const btnSi = document.getElementById('modal-si'), btnNo = document.getElementById('modal-no');
        const cleanup = (v) => { modal.classList.remove('visible'); resolve(v); };
        btnSi.onclick = () => cleanup(true); btnNo.onclick = () => cleanup(false);
    });
}

async function pedirCancelacion(id) {
    if(await mostrarModalCancelar()) {
        try {
            await fetch(`/api/reservas/${id}/cancelar`, { method: 'PUT' });
            showToast("Reserva cancelada", "success");
            cargarDatosGlobales();
        } catch(e) { showToast("Error", "error"); }
    }
}

// === BOOTSTRAP ===
window.onload = () => {
    if(localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        const td = document.getElementById('toggle-dark'); if(td) td.checked = true;
    }
    inicializarSesion();
};