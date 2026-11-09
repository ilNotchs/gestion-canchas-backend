/**
 * FIT CANCHAS v8.0 - PREMIUM REDESIGN
 */

// === 1. UTILIDADES Y GLOBALES ===
const state = { canchas: [], reservasActivas: [], reservasTodas: [], carrito: [], user: null };

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
    if(id === 'dashboard') renderDashboard();
    if(id === 'inventario') renderInventario();
    if(id === 'admin-productos') renderAdminProductos();
    if(id === 'admin-caja') renderAdminCaja();
    if(id === 'admin-usuarios') renderAdminUsuarios();
    if(id === 'tienda') renderTienda();
    if(id === 'carrito') renderCarrito();
    if(id === 'mis-compras') renderMisCompras();
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

        if (state.user.rol === 'admin') {
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'flex');
        }
        
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
        else { showToast(data.mensaje || 'Credenciales incorrectas', 'error'); btn.disabled = false; btn.innerText = "Iniciar Sesión"; }
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
        const [resC, resR, resT] = await Promise.all([
            fetch('/api/canchas'), 
            fetch('/api/reservas/activas'),
            fetch('/api/reservas/todas')
        ]);
        state.canchas = await resC.json();
        state.reservasActivas = await resR.json();
        state.reservasTodas = await resT.json();
        
        // Poblar selects
        const select = document.getElementById('tipo-cancha');
        const pref = document.getElementById('pref-cancha');
        const options = state.canchas.map(c => `<option value="${c.id}" data-tipo="${c.tipo}" data-name="${c.nombre}">${c.nombre} (${c.tipo})</option>`).join('');
        if(select) {
            select.innerHTML = options;
        }
        if(pref) {
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
    document.getElementById('grid-horarios').addEventListener('click', (e) => {
        if(e.target.classList.contains('btn-horario')) {
            if(e.target.classList.contains('reservado')) return;
            document.querySelectorAll('.btn-horario').forEach(b => b.classList.remove('selected'));
            e.target.classList.add('selected');
            document.getElementById('hora-seleccionada').value = e.target.dataset.time;
            recalcularTotal();
        }
    });
}

function recalcularTotal() {
    const selectCancha = document.getElementById('tipo-cancha');
    if(!selectCancha.options.length) return;
    
    const cancha_id = selectCancha.value;
    const opt = selectCancha.options[selectCancha.selectedIndex];
    const tipo = opt.dataset.tipo;
    const nombre = opt.dataset.name;
    const duracion = parseInt(document.getElementById('duracion').value) || 1;
    const promo = document.getElementById('combo-promo').value;
    const balones = parseInt(document.getElementById('val-balones').innerText) || 0;
    const fecha = document.getElementById('fecha').value;

    // Generar horas dinámicas
    const reservasEnFecha = state.reservasActivas.filter(r => r.cancha_id == cancha_id && r.fecha_reserva.substring(0, 10) === fecha);
    
    const horasDisponibles = ['15:00:00', '16:00:00', '17:00:00', '18:00:00', '19:00:00', '20:00:00', '21:00:00', '22:00:00'];
    const gridHorarios = document.getElementById('grid-horarios');
    
    // Guardar la hora actualmente seleccionada si existe
    const selAnterior = document.getElementById('hora-seleccionada').value || '18:00:00';
    let haySeleccionadaValida = false;

    gridHorarios.innerHTML = horasDisponibles.map(h => {
        let isReservado = false;
        const hInt = parseInt(h.split(':')[0]);
        reservasEnFecha.forEach(r => {
            const rStart = parseInt(r.hora_inicio.split(':')[0]);
            const rEnd = rStart + parseInt(r.horas_alquiladas);
            if (hInt >= rStart && hInt < rEnd) isReservado = true;
        });

        let ampm = hInt >= 12 ? 'PM' : 'AM';
        let hour12 = hInt > 12 ? hInt - 12 : (hInt === 0 ? 12 : hInt);
        let format12 = hour12 + ':00 ' + ampm;
        
        let clases = 'btn-horario';
        if (isReservado) {
            clases += ' reservado';
        } else if (h === selAnterior && !haySeleccionadaValida) {
            clases += ' selected';
            document.getElementById('hora-seleccionada').value = h;
            haySeleccionadaValida = true;
        }

        return `<button type="button" class="${clases}" ${isReservado ? 'disabled' : ''} data-time="${h}">${format12}</button>`;
    }).join('');

    // Si la hora que estaba seleccionada ya no es válida, selecciona la primera disponible
    if (!haySeleccionadaValida) {
        const primerBtnDisp = gridHorarios.querySelector('.btn-horario:not(.reservado)');
        if (primerBtnDisp) {
            primerBtnDisp.classList.add('selected');
            document.getElementById('hora-seleccionada').value = primerBtnDisp.dataset.time;
        } else {
            document.getElementById('hora-seleccionada').value = '';
        }
    }
    
    // Calcular costo
    let precioBase = tipo.includes('11v11') ? 100000 : 60000;
    precioBase = precioBase * duracion;
    
    let extraBalones = Math.max(0, balones - 1) * 5000;
    let extraPromo = 0;
    if (promo !== 'nocturno') {
        extraPromo = parseInt(promo) || 0;
    }
    
    let total = precioBase + extraBalones + extraPromo;
    if(promo === 'nocturno') total = total * 0.85; // 15% OFF
    
    document.getElementById('factura-total').innerText = formatearDinero(total);

    // Actualizar Textos Resumen
    document.getElementById('res-cancha').innerText = nombre;
    
    const horabtn = document.querySelector('.btn-horario.selected');
    const horaTexto = horabtn ? horabtn.innerText : 'Seleccione hora';
    
    // Format fecha a texto lindo usando substring
    const fechaLimpia = fecha.substring(0, 10);
    const [y, m, d] = fechaLimpia.split('-');
    const fechaObj = new Date(y, m - 1, d);
    const fechaStr = fechaObj.toLocaleDateString('es-CO', {day:'numeric', month:'long', year:'numeric'});
    
    document.getElementById('res-fecha-hora').innerHTML = `${fechaStr}<br>${horaTexto}`;
    document.getElementById('res-duracion').innerText = `${duracion} hora${duracion>1?'s':''}`;
    
    const p = document.getElementById('val-petos').innerText;
    document.getElementById('res-implementos').innerText = `${balones} Balón${balones !== 1 ? 'es' : ''}, ${p} Petos`;
    document.getElementById('res-promo').innerText = document.getElementById('combo-promo').options[document.getElementById('combo-promo').selectedIndex].text.split('-')[0].trim();
}

// Enviar Formulario
async function enviarReserva() {
    const btn = document.getElementById('btn-confirmar');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...'; btn.disabled = true;

    try {
        // Los implementos (balones, petos rojos, petos azules) se asignan
        // AUTOMÁTICAMENTE en el backend según el tipo de cancha:
        //   - 11v11: 1 balón, 11 petos rojos, 11 petos azules
        //   - 7v7:   1 balón, 7 petos rojos, 7 petos azules
        const payload = {
            usuario_id: state.user.id || 1, nombre_cliente: state.user.username,
            cancha_id: document.getElementById('tipo-cancha').value,
            fecha_reserva: document.getElementById('fecha').value,
            hora_inicio: document.getElementById('hora-seleccionada').value,
            horas_alquiladas: document.getElementById('duracion').value,
            metodo_pago: document.querySelector('input[name="pago"]:checked').value
        };

        const res = await fetch('/api/reservas', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });

        if(res.ok) {
            const data = await res.json();
            showToast(data.mensaje || "¡Reserva confirmada!", "success");
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
        const fechaLimpia = r.fecha_reserva.substring(0, 10);
        const [y, m, d] = fechaLimpia.split('-');
        const fechaObj = new Date(y, m - 1, d);
        
        const hoy = new Date();
        const esHoy = fechaObj.toDateString() === hoy.toDateString();
        
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
    const misR = state.reservasTodas.filter(r => r.nombre_cliente === state.user.username);
    
    let total = 0;
    const body = document.getElementById('tabla-historial');
    body.innerHTML = misR.map(r => {
        let precio = r.nombre_cancha && r.nombre_cancha.includes('11v11') ? 100000 : 60000;
        precio *= r.horas_alquiladas;
        total += precio;
        
        const fechaLimpia = r.fecha_reserva.substring(0, 10);
        const [y, m, d] = fechaLimpia.split('-');
        const fechaObj = new Date(y, m - 1, d);
        
        return `<tr>
            <td>${fechaObj.toLocaleDateString()}</td>
            <td>${r.nombre_cancha || 'Cancha eliminada'}</td>
            <td><span style="text-transform:capitalize;"><i class="fas fa-money-bill" style="color:var(--text-muted); margin-right:5px;"></i>${r.metodo_pago}</span></td>
            <td class="monto-cell">${formatearDinero(precio)}</td>
            <td><span class="badge ${r.estado === 'activa' ? 'activa' : (r.estado === 'cancelada' ? 'cancelada' : 'completada')}">${r.estado}</span></td>
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

// === 7. ADMIN ===
async function renderDashboard() {
    if(state.user?.rol !== 'admin') return;
    try {
        const canchas = state.canchas;
        const res = state.reservasActivas;
        
        // Obtener la fecha local en formato YYYY-MM-DD
        const localDate = new Date();
        const y = localDate.getFullYear();
        const m = String(localDate.getMonth() + 1).padStart(2, '0');
        const d = String(localDate.getDate()).padStart(2, '0');
        const hoyStr = `${y}-${m}-${d}`;

        // Filtrar reservas que corresponden a HOY
        let reservasHoy = res.filter(r => r.fecha_reserva.substring(0, 10) === hoyStr);

        // Fallback: si hoy no hay reservas, usar la fecha de la primera reserva disponible
        if (reservasHoy.length === 0 && res.length > 0) {
            const primeraFecha = res[0].fecha_reserva.substring(0, 10);
            reservasHoy = res.filter(r => r.fecha_reserva.substring(0, 10) === primeraFecha);
        }

        // Ocupación = reservas activas del día / (canchas × 8 franjas horarias disponibles)
        const FRANJAS_DIA = 8;
        const totalSlotsDia = canchas.length * FRANJAS_DIA;
        const perc = totalSlotsDia === 0 ? 0 : (reservasHoy.length / totalSlotsDia) * 100;
        document.getElementById('dash-ocupacion').innerText = `${Math.min(perc, 100).toFixed(1)}%`;
        
        let totalDinero = 0;
        reservasHoy.forEach(r => {
            let precioBase = (r.nombre_cancha && r.nombre_cancha.includes('11v11')) ? 100000 : 60000;
            totalDinero += precioBase * r.horas_alquiladas;
        });
        document.getElementById('dash-ingresos').innerText = formatearDinero(totalDinero);
        document.getElementById('dash-reservas').innerText = res.length;
    } catch(e) { console.error(e); }
}

let inventarioData = [];
let canchasInventarioRenderizadas = false;

async function renderInventario() {
    if(state.user?.rol !== 'admin') return;
    try {
        // Renderizar canchas primero o en paralelo
        renderCanchasInventario();

        const res = await fetch('/api/inventario');
        const inv = await res.json();
        inventarioData = inv;
        renderImplementos(inv);
    } catch(e) { console.error("Error en renderInventario:", e); }
}

function renderImplementos(inv) {
    const contInv = document.getElementById('lista-inventario');
    if (!contInv) return;

    contInv.innerHTML = inv.map(i => {
        const enUso = i.en_uso || 0;
        const total = i.cantidad_total || 0;
        const disponible = Math.max(0, total - enUso);
        const porcentajeUso = total > 0 ? Math.round((enUso / total) * 100) : 0;
        const colorDisp = disponible === 0 ? 'var(--danger)' : disponible < total * 0.2 ? 'var(--warning, #f59e0b)' : 'var(--success)';
        
        let icon = 'fa-cube';
        const artLower = i.articulo.toLowerCase();
        if (artLower.includes('balón') || artLower.includes('balon')) icon = 'fa-futbol';
        else if (artLower.includes('peto')) icon = 'fa-tshirt';
        else if (artLower.includes('inflador')) icon = 'fa-wind';
        else if (artLower.includes('cono')) icon = 'fa-traffic-cone';

        return `
        <div class="stat-card" id="inv-card-${i.id}" style="flex-direction:column; align-items:flex-start; gap:10px; position:relative;">
            <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                <div style="display:flex; align-items:center; gap:8px;">
                    <i class="fas ${icon}" style="color:var(--accent); font-size:1.1em;"></i>
                    <h5 style="margin:0; font-weight:700;">${i.articulo}${i.color ? ` (${i.color})` : ''}</h5>
                </div>
                <div class="inv-controls">
                    <button class="btn-inv-mini" title="Disminuir total en 1" onclick="ajustarStockRapido(${i.id}, -1)">
                        <i class="fas fa-minus"></i>
                    </button>
                    <button class="btn-inv-mini" title="Aumentar total en 1" onclick="ajustarStockRapido(${i.id}, 1)">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button class="btn-inv-mini" title="Editar cantidad" onclick="abrirModalStock(${i.id}, '${i.articulo}${i.color ? ' ' + i.color : ''}', ${total})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-inv-mini" style="color:var(--danger);" title="Eliminar artículo" onclick="eliminarImplemento(${i.id}, '${i.articulo}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div style="display:flex; justify-content:space-between; width:100%; font-size:0.85em;">
                <span style="color:var(--text-muted);">Stock Total: <strong id="inv-total-${i.id}" style="color:var(--text-main);">${total}</strong></span>
                <span>🔴 <strong style="color:#ef4444;">${enUso}</strong> en uso</span>
                <span>🟢 <strong id="inv-disp-${i.id}" style="color:${colorDisp};">${disponible}</strong> disp.</span>
            </div>
            <div style="width:100%; background:var(--bg-app); border-radius:4px; height:6px; overflow:hidden;">
                <div id="inv-bar-${i.id}" style="height:100%; width:${porcentajeUso}%; background:var(--primary); border-radius:4px; transition:width 0.3s;"></div>
            </div>
        </div>`;
    }).join('');
}

function renderCanchasInventario() {
    const contCanAgrupadas = document.getElementById('lista-canchas-agrupadas');
    if (!contCanAgrupadas) return;

    if (!state.canchas || state.canchas.length === 0) {
        contCanAgrupadas.innerHTML = '<div style="text-align:center; padding:30px; color:var(--text-muted);">No hay canchas registradas en el sistema.</div>';
        return;
    }

    // Indexar reservas activas en O(1) usando un Map
    const reservasPorCancha = new Map();
    if (state.reservasActivas && state.reservasActivas.length > 0) {
        for (let idx = 0; idx < state.reservasActivas.length; idx++) {
            const r = state.reservasActivas[idx];
            const list = reservasPorCancha.get(r.cancha_id);
            if (list) {
                list.push(r);
            } else {
                reservasPorCancha.set(r.cancha_id, [r]);
            }
        }
    }

    // Identificar tipos de canchas (11v11 primero, luego 7v7)
    const tipos = [...new Set(state.canchas.map(c => c.tipo))].sort((a, b) => {
        if (a.includes('11') && !b.includes('11')) return -1;
        if (!a.includes('11') && b.includes('11')) return 1;
        return a.localeCompare(b);
    });

    const htmlGrupos = tipos.map(tipo => {
        const canchasDelTipo = state.canchas
            .filter(c => c.tipo === tipo)
            .sort((a, b) => a.nombre.localeCompare(b.nombre, undefined, { numeric: true, sensitivity: 'base' }));

        const totalEnTipo = canchasDelTipo.length;
        const es11 = tipo.toLowerCase().includes('11');
        const iconoTipo = es11 ? 'fa-futbol' : 'fa-bolt';
        const badgeLabel = es11 ? 'Fútbol 11 (11 vs 11)' : 'Fútbol 7 (7 vs 7)';

        const cardsHTML = canchasDelTipo.map(cancha => {
            const reservasAgenda = reservasPorCancha.get(cancha.id) || [];
            const estaOcupada = reservasAgenda.length > 0;
            const precio = cancha.precio_hora || cancha.precio || (es11 ? 100000 : 60000);
            
            let agendaHTML = '';
            if (estaOcupada) {
                agendaHTML = reservasAgenda.map(r => `
                    <div style="background:var(--bg-app); padding:8px; border-radius:6px; margin-top:5px; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <span style="font-size:0.85em; font-weight:600;">👤 ${r.nombre_cliente}</span><br>
                            <span style="font-size:0.75em; color:var(--text-muted);">⏰ ${r.hora_inicio} (${r.horas_alquiladas}h)</span>
                        </div>
                        <button class="btn-outline danger" style="padding:4px 8px; width:auto; font-size:0.75em;" onclick="pedirCancelacion(${r.id})" title="Cancelar reserva">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `).join('');
            } else {
                agendaHTML = '<p style="font-size:0.8em; color:var(--text-muted); margin-top:6px;"><i class="fas fa-check-circle" style="color:var(--success); margin-right:4px;"></i>Libre actualmente</p>';
            }

            return `
                <div class="reserva-card cancha-card-admin" style="border-top: 3px solid ${estaOcupada ? 'var(--danger)' : 'var(--success)'};">
                    <div>
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
                            <h4 style="margin:0; font-size:1.05em; font-weight:700;">${cancha.nombre}</h4>
                            <span class="badge ${estaOcupada ? 'cancelada' : 'activa'}" style="font-size:0.7em;">
                                ${estaOcupada ? 'Ocupada' : 'Disponible'}
                            </span>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                            <span class="cancha-precio-tag">${formatearDinero(precio)} / hora</span>
                            <span style="font-size:0.75em; color:var(--text-muted); font-weight:600;">${cancha.tipo}</span>
                        </div>
                        <div>${agendaHTML}</div>
                    </div>

                    <div style="display:flex; gap:8px; margin-top:14px; padding-top:10px; border-top:1px solid var(--border);">
                        <button class="btn-outline" style="padding:6px 10px; font-size:0.8em;" onclick='editarCancha(${JSON.stringify(cancha).replace(/'/g, "\\'")})'>
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn-outline danger" style="padding:6px 10px; font-size:0.8em;" onclick="eliminarCancha(${cancha.id}, '${cancha.nombre}')">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="grupo-canchas-seccion">
                <div class="grupo-canchas-header">
                    <div class="grupo-canchas-title">
                        <i class="fas ${iconoTipo}" style="color:var(--accent);"></i>
                        <span>Canchas ${badgeLabel}</span>
                    </div>
                    <span class="badge activa" style="font-size:0.8em;">${totalEnTipo} canchas</span>
                </div>
                <div class="reservas-grid">
                    ${cardsHTML}
                </div>
            </div>
        `;
    }).join('');

    contCanAgrupadas.innerHTML = htmlGrupos;
    canchasInventarioRenderizadas = true;
}

// ─── GESTIÓN DE CANCHAS (ADMIN) ───
function abrirModalCancha() {
    document.getElementById('form-cancha').reset();
    document.getElementById('cancha-id').value = '';
    document.getElementById('modal-cancha-title').innerText = 'Nueva Cancha';
    document.getElementById('cancha-precio').value = '100000';
    document.getElementById('modal-cancha').classList.add('visible');
}

function cerrarModalCancha() {
    document.getElementById('modal-cancha').classList.remove('visible');
}

function actualizarPrecioSugeridoCancha() {
    const id = document.getElementById('cancha-id').value;
    if (!id) {
        // Solo autollenar si es una cancha nueva
        const tipo = document.getElementById('cancha-tipo').value;
        document.getElementById('cancha-precio').value = tipo === '11v11' ? '100000' : '60000';
    }
}

function editarCancha(cancha) {
    document.getElementById('cancha-id').value = cancha.id;
    document.getElementById('cancha-nombre').value = cancha.nombre;
    document.getElementById('cancha-tipo').value = cancha.tipo;
    document.getElementById('cancha-precio').value = cancha.precio_hora || cancha.precio || (cancha.tipo === '11v11' ? 100000 : 60000);
    document.getElementById('modal-cancha-title').innerText = 'Editar Cancha';
    document.getElementById('modal-cancha').classList.add('visible');
}

document.getElementById('form-cancha')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-guardar-cancha');
    btn.disabled = true; btn.innerText = 'Guardando...';

    const id = document.getElementById('cancha-id').value;
    const isEdit = !!id;
    const payload = {
        nombre: document.getElementById('cancha-nombre').value.trim(),
        tipo: document.getElementById('cancha-tipo').value,
        precio_hora: parseFloat(document.getElementById('cancha-precio').value)
    };

    const url = isEdit ? `/api/canchas/${id}` : '/api/canchas';
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': state.user.id,
                'x-user-rol': state.user.rol
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok) {
            showToast(data.mensaje, 'success');
            cerrarModalCancha();
            await cargarDatosGlobales();
            renderInventario();
        } else {
            showToast(data.mensaje || 'Error al guardar cancha', 'error');
        }
    } catch(err) {
        showToast('Error de conexión', 'error');
    }
    btn.disabled = false; btn.innerText = 'Guardar Cancha';
});

async function eliminarCancha(id, nombre) {
    if (!confirm(`¿Estás seguro de eliminar la "${nombre}"? Esta acción no se puede deshacer.`)) return;

    try {
        const res = await fetch(`/api/canchas/${id}`, {
            method: 'DELETE',
            headers: {
                'x-user-id': state.user.id,
                'x-user-rol': state.user.rol
            }
        });
        const data = await res.json();
        if (res.ok) {
            showToast(data.mensaje || 'Cancha eliminada', 'success');
            await cargarDatosGlobales();
            renderInventario();
        } else {
            showToast(data.mensaje || 'No se pudo eliminar la cancha', 'error');
        }
    } catch(e) {
        showToast('Error al eliminar', 'error');
    }
}

// ─── GESTIÓN DE IMPLEMENTOS DE INVENTARIO (ADMIN) ───
function abrirModalImplemento() {
    document.getElementById('form-implemento').reset();
    document.getElementById('modal-implemento').classList.add('visible');
}

function cerrarModalImplemento() {
    document.getElementById('modal-implemento').classList.remove('visible');
}

document.getElementById('form-implemento')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-guardar-implemento');
    btn.disabled = true; btn.innerText = 'Guardando...';

    const payload = {
        articulo: document.getElementById('imp-articulo').value.trim(),
        color: document.getElementById('imp-color').value.trim() || null,
        cantidad_total: parseInt(document.getElementById('imp-cantidad').value) || 0
    };

    try {
        const res = await fetch('/api/inventario', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': state.user.id,
                'x-user-rol': state.user.rol
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok) {
            showToast(data.mensaje, 'success');
            cerrarModalImplemento();
            renderInventario();
        } else {
            showToast(data.mensaje || 'Error al guardar implemento', 'error');
        }
    } catch(err) {
        showToast('Error de conexión', 'error');
    }
    btn.disabled = false; btn.innerText = 'Guardar Implemento';
});

function abrirModalStock(id, nombre, actual) {
    document.getElementById('stock-inv-id').value = id;
    document.getElementById('stock-inv-cantidad').value = actual;
    document.getElementById('modal-stock-subtitle').innerText = `Modificar cantidad total de: ${nombre}`;
    document.getElementById('modal-stock-inv').classList.add('visible');
}

function cerrarModalStock() {
    document.getElementById('modal-stock-inv').classList.remove('visible');
}

document.getElementById('form-stock-inv')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('stock-inv-id').value;
    const nuevaCant = parseInt(document.getElementById('stock-inv-cantidad').value);

    try {
        const res = await fetch(`/api/inventario/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': state.user.id,
                'x-user-rol': state.user.rol
            },
            body: JSON.stringify({ cantidad_total: nuevaCant })
        });
        const data = await res.json();
        if (res.ok) {
            showToast(data.mensaje, 'success');
            cerrarModalStock();
            renderInventario();
        } else {
            showToast(data.mensaje || 'Error al actualizar', 'error');
        }
    } catch(err) {
        showToast('Error de conexión', 'error');
    }
});

async function ajustarStockRapido(id, diff) {
    const item = inventarioData.find(i => i.id === id);
    if (!item) return;

    const nuevaCant = Math.max(0, item.cantidad_total + diff);
    item.cantidad_total = nuevaCant;

    // Actualización instantánea en el DOM (Optimistic UI)
    const totalEl = document.getElementById(`inv-total-${id}`);
    const dispEl = document.getElementById(`inv-disp-${id}`);
    const barEl = document.getElementById(`inv-bar-${id}`);

    const enUso = item.en_uso || 0;
    const disponible = Math.max(0, nuevaCant - enUso);
    const porcentajeUso = nuevaCant > 0 ? Math.round((enUso / nuevaCant) * 100) : 0;
    const colorDisp = disponible === 0 ? 'var(--danger)' : disponible < nuevaCant * 0.2 ? 'var(--warning, #f59e0b)' : 'var(--success)';

    if (totalEl) totalEl.innerText = nuevaCant;
    if (dispEl) {
        dispEl.innerText = disponible;
        dispEl.style.color = colorDisp;
    }
    if (barEl) barEl.style.width = `${porcentajeUso}%`;

    // Persistir en backend
    try {
        await fetch(`/api/inventario/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': state.user.id,
                'x-user-rol': state.user.rol
            },
            body: JSON.stringify({ cantidad_total: nuevaCant })
        });
    } catch(err) {
        console.error("Error al actualizar stock rápido:", err);
    }
}

async function eliminarImplemento(id, nombre) {
    if (!confirm(`¿Deseas eliminar el implemento "${nombre}" de la bodega?`)) return;

    try {
        const res = await fetch(`/api/inventario/${id}`, {
            method: 'DELETE',
            headers: {
                'x-user-id': state.user.id,
                'x-user-rol': state.user.rol
            }
        });
        const data = await res.json();
        if (res.ok) {
            showToast(data.mensaje, 'success');
            renderInventario();
        } else {
            showToast(data.mensaje || 'Error al eliminar', 'error');
        }
    } catch(e) {
        showToast('Error al eliminar', 'error');
    }
}

// ─── GESTIÓN DE USUARIOS (DASHBOARD SOLO ADMIN) ───
let usuariosData = [];
let filtroRolActual = 'todos';

async function renderAdminUsuarios() {
    if (state.user?.rol !== 'admin') return;
    try {
        const res = await fetch('/api/usuarios', {
            headers: {
                'x-user-id': state.user.id,
                'x-user-rol': state.user.rol
            }
        });
        usuariosData = await res.json();

        // Calcular estadísticas
        const total = usuariosData.length;
        const clientes = usuariosData.filter(u => u.rol === 'cliente').length;
        const admins = usuariosData.filter(u => u.rol === 'admin').length;

        document.getElementById('stat-usuarios-total').innerText = total;
        document.getElementById('stat-usuarios-clientes').innerText = clientes;
        document.getElementById('stat-usuarios-admins').innerText = admins;

        filtrarUsuariosAdmin();
    } catch(e) {
        console.error("Error al cargar usuarios:", e);
    }
}

function cambiarFiltroRolUsuarios(rol, btn) {
    filtroRolActual = rol;
    document.querySelectorAll('#filtros-roles-usuarios .filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filtrarUsuariosAdmin();
}

function filtrarUsuariosAdmin() {
    const term = document.getElementById('buscar-usuario')?.value.toLowerCase().trim() || '';
    const tbody = document.getElementById('tabla-usuarios-admin');
    if (!tbody) return;

    let filtrados = usuariosData;

    if (filtroRolActual !== 'todos') {
        filtrados = filtrados.filter(u => u.rol === filtroRolActual);
    }

    if (term) {
        filtrados = filtrados.filter(u => 
            (u.username && u.username.toLowerCase().includes(term)) ||
            (u.email && u.email.toLowerCase().includes(term)) ||
            (u.telefono && u.telefono.toLowerCase().includes(term))
        );
    }

    if (filtrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--text-muted);">No se encontraron usuarios que coincidan con la búsqueda.</td></tr>';
        return;
    }

    tbody.innerHTML = filtrados.map(u => {
        const esMismoAdmin = u.id === state.user.id;
        const inicial = u.username ? u.username.charAt(0).toUpperCase() : 'U';
        const badgeRolClass = u.rol === 'admin' ? 'badge-role-admin' : 'badge-role-client';
        const nuevoRol = u.rol === 'admin' ? 'cliente' : 'admin';
        const textoBotonRol = u.rol === 'admin' ? '<i class="fas fa-user"></i> Hacer Cliente' : '<i class="fas fa-shield-alt"></i> Hacer Admin';

        return `
        <tr>
            <td style="font-weight:700; color:var(--text-muted);">#${u.id}</td>
            <td>
                <div style="display:flex; align-items:center; gap:10px;">
                    <div class="avatar-sm" style="width:34px; height:34px; font-size:0.9em;">${inicial}</div>
                    <div>
                        <strong style="color:var(--text-main); font-size:0.95em;">${u.username}</strong>
                        ${esMismoAdmin ? '<span style="font-size:0.7em; margin-left:6px; color:var(--accent); font-weight:700;">(Tú)</span>' : ''}
                    </div>
                </div>
            </td>
            <td>${u.email || '<span style="color:var(--text-muted);">Sin correo</span>'}</td>
            <td>${u.telefono || '<span style="color:var(--text-muted);">Sin teléfono</span>'}</td>
            <td>
                <span class="badge ${badgeRolClass}" style="text-transform:uppercase; font-size:0.75em; padding:4px 10px; border-radius:12px;">
                    ${u.rol}
                </span>
            </td>
            <td>
                ${esMismoAdmin ? '<span style="font-size:0.8em; color:var(--text-muted); font-style:italic;">Sesión activa</span>' : `
                <div style="display:flex; gap:6px;">
                    <button class="btn-outline" style="padding:5px 10px; font-size:0.75em; width:auto;" onclick="cambiarRolUsuario(${u.id}, '${nuevoRol}', '${u.username}')">
                        ${textoBotonRol}
                    </button>
                    <button class="btn-outline danger" style="padding:5px 10px; font-size:0.75em; width:auto;" onclick="eliminarUsuario(${u.id}, '${u.username}')" title="Eliminar usuario">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
                `}
            </td>
        </tr>`;
    }).join('');
}

async function cambiarRolUsuario(id, nuevoRol, username) {
    if (!confirm(`¿Deseas cambiar el rol de "${username}" a ${nuevoRol.toUpperCase()}?`)) return;

    try {
        const res = await fetch(`/api/usuarios/${id}/rol`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': state.user.id,
                'x-user-rol': state.user.rol
            },
            body: JSON.stringify({ rol: nuevoRol })
        });
        const data = await res.json();
        if (res.ok) {
            showToast(data.mensaje, 'success');
            renderAdminUsuarios();
        } else {
            showToast(data.mensaje || 'Error al actualizar rol', 'error');
        }
    } catch(e) {
        showToast('Error de conexión', 'error');
    }
}

async function eliminarUsuario(id, username) {
    if (!confirm(`¿Estás seguro de eliminar permanentemente al usuario "${username}"?`)) return;

    try {
        const res = await fetch(`/api/usuarios/${id}`, {
            method: 'DELETE',
            headers: {
                'x-user-id': state.user.id,
                'x-user-rol': state.user.rol
            }
        });
        const data = await res.json();
        if (res.ok) {
            showToast(data.mensaje, 'success');
            renderAdminUsuarios();
        } else {
            showToast(data.mensaje || 'Error al eliminar usuario', 'error');
        }
    } catch(e) {
        showToast('Error de conexión', 'error');
    }
}

// === 8. LÓGICA DE TIENDA Y CARRITO (CLIENTE) ===
let productosData = []; // Caché de productos

async function renderTienda() {
    try {
        const res = await fetch('/api/productos?limite=200');
        const data = await res.json();
        productosData = data.productos || [];
        filtrarTienda();
    } catch(e) { console.error(e); }
}

function filtrarTienda() {
    const term = document.getElementById('buscar-tienda')?.value.toLowerCase() || '';
    const grid = document.getElementById('grid-tienda');
    if (!grid) return;
    
    const filtrados = productosData.filter(p => p.estado === 'activo' && p.nombre.toLowerCase().includes(term));
    
    if (filtrados.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--text-muted);">No se encontraron productos.</div>';
        return;
    }
    
    grid.innerHTML = filtrados.map(p => {
        const stockClass = p.stock > 10 ? 'stock-ok' : (p.stock > 0 ? 'stock-low' : 'stock-out');
        const stockText = p.stock > 0 ? `${p.stock} disponibles` : 'Agotado';
        const img = p.imagen_url ? p.imagen_url : '/img/productos/placeholder.svg';
        
        return `
        <div class="tienda-card">
            <div class="tienda-img">
                <img src="${img}" alt="${p.nombre}" onerror="this.src='/img/productos/placeholder.svg'">
            </div>
            <div class="tienda-content">
                <h4>${p.nombre}</h4>
                <div class="tienda-precio">${formatearDinero(p.precio)}</div>
                <div class="tienda-desc">${p.descripcion || 'Sin descripción'}</div>
                <div class="tienda-stock ${stockClass}"><i class="fas ${p.stock > 0 ? 'fa-box' : 'fa-times'}"></i> ${stockText}</div>
                <button class="btn-aplicar" ${p.stock <= 0 ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : `onclick="agregarAlCarrito(${p.id}, '${p.nombre}', ${p.precio}, '${img}')"`}>
                    <i class="fas fa-cart-plus"></i> Agregar
                </button>
            </div>
        </div>`;
    }).join('');
}

function agregarAlCarrito(id, nombre, precio, img) {
    const ex = state.carrito.find(i => i.producto_id === id);
    if (ex) {
        ex.cantidad++;
    } else {
        state.carrito.push({ producto_id: id, nombre, precio, imagen_url: img, cantidad: 1 });
    }
    actualizarBadgeCarrito();
    showToast(`${nombre} agregado al carrito`, 'success');
}

function actualizarBadgeCarrito() {
    const badge = document.getElementById('carrito-badge');
    if (!badge) return;
    const totalItems = state.carrito.reduce((acc, curr) => acc + curr.cantidad, 0);
    badge.innerText = totalItems;
    badge.style.display = totalItems > 0 ? 'inline-block' : 'none';
}

function renderCarrito() {
    const lista = document.getElementById('lista-carrito');
    const resumen = document.getElementById('resumen-carrito-lista');
    const totalEl = document.getElementById('carrito-total-dinero');
    
    if (state.carrito.length === 0) {
        lista.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--text-muted);"><i class="fas fa-shopping-cart fa-3x mb-3" style="display:block;margin-bottom:10px;"></i> Tu carrito está vacío</div>';
        resumen.innerHTML = '';
        totalEl.innerText = '$0';
        document.getElementById('btn-confirmar-compra').disabled = true;
        return;
    }
    
    document.getElementById('btn-confirmar-compra').disabled = false;
    
    let total = 0;
    
    lista.innerHTML = state.carrito.map((item, index) => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;
        return `
        <div class="carrito-item">
            <div class="carrito-img">
                <img src="${item.imagen_url}" onerror="this.src='/img/productos/placeholder.svg'">
            </div>
            <div class="carrito-info">
                <h5>${item.nombre}</h5>
                <p>${formatearDinero(item.precio)} c/u</p>
            </div>
            <div class="carrito-actions">
                <button class="btn-counter" onclick="cambiarCantidadCarrito(${index}, -1)"><i class="fas fa-minus"></i></button>
                <span style="font-weight:700; width: 20px; text-align:center;">${item.cantidad}</span>
                <button class="btn-counter" onclick="cambiarCantidadCarrito(${index}, 1)"><i class="fas fa-plus"></i></button>
                <button class="btn-eliminar-carrito" onclick="eliminarDelCarrito(${index})" style="margin-left: 10px;"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
    }).join('');
    
    resumen.innerHTML = state.carrito.map(item => `
        <div class="resumen-item">
            <div class="resumen-detalle" style="width:100%; display:flex; justify-content:space-between;">
                <h5>${item.cantidad}x ${item.nombre}</h5>
                <p>${formatearDinero(item.precio * item.cantidad)}</p>
            </div>
        </div>
    `).join('');
    
    totalEl.innerText = formatearDinero(total);
}

function cambiarCantidadCarrito(index, diff) {
    state.carrito[index].cantidad += diff;
    if (state.carrito[index].cantidad <= 0) {
        state.carrito.splice(index, 1);
    }
    actualizarBadgeCarrito();
    renderCarrito();
}

function eliminarDelCarrito(index) {
    state.carrito.splice(index, 1);
    actualizarBadgeCarrito();
    renderCarrito();
}

async function procesarCompra() {
    if (state.carrito.length === 0) return;
    
    const btn = document.getElementById('btn-confirmar-compra');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...'; 
    btn.disabled = true;
    
    try {
        const payload = {
            usuario_id: state.user.id,
            nombre_cliente: state.user.username,
            metodo_pago: document.getElementById('carrito-metodo-pago').value,
            items: state.carrito.map(i => ({ producto_id: i.producto_id, cantidad: i.cantidad }))
        };
        
        const res = await fetch('/api/ventas', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-user-id': state.user.id,
                'x-user-rol': state.user.rol
            },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        
        if (res.ok) {
            showToast(data.mensaje, "success");
            lanzarConfetti();
            state.carrito = []; // Vaciar carrito
            actualizarBadgeCarrito();
            setTimeout(() => { 
                btn.innerHTML = 'Confirmar Compra <i class="fas fa-check"></i>'; 
                btn.disabled = false; 
                mostrarModulo('mis-compras'); 
            }, 2000);
        } else {
            showToast(data.mensaje, "error");
            btn.innerHTML = 'Confirmar Compra <i class="fas fa-check"></i>'; 
            btn.disabled = false;
        }
    } catch(e) { 
        showToast("Error procesando compra", "error");
        btn.innerHTML = 'Confirmar Compra <i class="fas fa-check"></i>'; 
        btn.disabled = false;
    }
}

async function renderMisCompras() {
    const tbody = document.getElementById('tabla-mis-compras');
    try {
        const res = await fetch(`/api/ventas/mis-pedidos/${state.user.id}`, {
            headers: { 'x-user-id': state.user.id, 'x-user-rol': state.user.rol }
        });
        const pedidos = await res.json();
        
        if (pedidos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No has realizado compras en la tienda aún.</td></tr>';
            return;
        }
        
        tbody.innerHTML = pedidos.map(p => {
            const date = new Date(p.fecha_creacion).toLocaleDateString();
            return `
            <tr>
                <td>#${p.id.toString().padStart(4, '0')}</td>
                <td>${date}</td>
                <td>${p.productos_resumen || 'Detalle no disponible'}</td>
                <td class="monto-cell">${formatearDinero(p.total)}</td>
                <td><span class="badge ${p.estado === 'completado' ? 'activa' : 'cancelada'}">${p.estado}</span></td>
            </tr>`;
        }).join('');
    } catch(e) { console.error(e); }
}

// === 9. LÓGICA DE ADMIN (PRODUCTOS Y VENTAS) ===
async function renderAdminProductos() {
    if(state.user?.rol !== 'admin') return;
    try {
        const res = await fetch('/api/productos');
        const data = await res.json();
        productosData = data.productos || [];
        filtrarProductosAdmin();
    } catch(e) { console.error(e); }
}

function filtrarProductosAdmin() {
    const term = document.getElementById('buscar-producto')?.value.toLowerCase() || '';
    const tbody = document.getElementById('tabla-productos');
    if (!tbody) return;
    
    const filtrados = productosData.filter(p => p.nombre.toLowerCase().includes(term));
    
    if (filtrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay productos registrados.</td></tr>';
        return;
    }
    
    tbody.innerHTML = filtrados.map(p => {
        const img = p.imagen_url ? p.imagen_url : 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=50&q=80';
        return `
        <tr>
            <td><img src="${img}" style="width:40px; height:40px; border-radius:4px; object-fit:cover;" onerror="this.src='https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=50&q=80'"></td>
            <td style="font-weight:600;">${p.nombre}</td>
            <td><span class="badge" style="background:var(--primary-light); color:var(--primary);">${p.categoria}</span></td>
            <td class="monto-cell">${formatearDinero(p.precio)}</td>
            <td style="font-weight:bold; color: ${p.stock > 0 ? 'var(--text-main)' : 'var(--danger)'}">${p.stock}</td>
            <td><span class="badge ${p.estado === 'activo' ? 'activa' : 'cancelada'}">${p.estado}</span></td>
            <td>
                <div style="display:flex; gap:5px;">
                    <button class="btn-outline" style="padding: 6px; width: auto;" onclick='editarProducto(${JSON.stringify(p).replace(/'/g, "\\'")})'><i class="fas fa-edit"></i></button>
                    <button class="btn-outline danger" style="padding: 6px; width: auto;" onclick="eliminarProducto(${p.id})"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function abrirModalProducto() {
    document.getElementById('form-producto').reset();
    document.getElementById('prod-id').value = '';
    document.getElementById('modal-producto-title').innerText = 'Nuevo Producto';
    document.getElementById('modal-producto').classList.add('visible');
}

function cerrarModalProducto() {
    document.getElementById('modal-producto').classList.remove('visible');
}

function editarProducto(p) {
    document.getElementById('prod-id').value = p.id;
    document.getElementById('prod-nombre').value = p.nombre;
    document.getElementById('prod-precio').value = p.precio;
    document.getElementById('prod-stock').value = p.stock;
    document.getElementById('prod-categoria').value = p.categoria;
    document.getElementById('prod-estado').value = p.estado;
    document.getElementById('prod-descripcion').value = p.descripcion || '';
    
    document.getElementById('modal-producto-title').innerText = 'Editar Producto';
    document.getElementById('modal-producto').classList.add('visible');
}

document.getElementById('form-producto')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-guardar-producto');
    btn.disabled = true; btn.innerText = 'Guardando...';
    
    const id = document.getElementById('prod-id').value;
    const isEdit = !!id;
    
    const formData = new FormData();
    formData.append('nombre', document.getElementById('prod-nombre').value);
    formData.append('precio', document.getElementById('prod-precio').value);
    formData.append('stock', document.getElementById('prod-stock').value);
    formData.append('categoria', document.getElementById('prod-categoria').value);
    formData.append('estado', document.getElementById('prod-estado').value);
    formData.append('descripcion', document.getElementById('prod-descripcion').value);
    
    const imageFile = document.getElementById('prod-imagen').files[0];
    if (imageFile) formData.append('imagen', imageFile);
    
    const url = isEdit ? `/api/productos/${id}` : '/api/productos';
    const method = isEdit ? 'PUT' : 'POST';
    
    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'x-user-id': state.user.id, 'x-user-rol': state.user.rol },
            body: formData
        });
        
        const data = await res.json();
        if (res.ok) {
            showToast(data.mensaje, 'success');
            cerrarModalProducto();
            renderAdminProductos();
        } else {
            showToast(data.mensaje || 'Error al guardar', 'error');
        }
    } catch(e) {
        showToast('Error de conexión', 'error');
    }
    
    btn.disabled = false; btn.innerText = 'Guardar Producto';
});

async function eliminarProducto(id) {
    if(!confirm('¿Estás seguro de deshabilitar este producto?')) return;
    try {
        const res = await fetch(`/api/productos/${id}`, {
            method: 'DELETE',
            headers: { 'x-user-id': state.user.id, 'x-user-rol': state.user.rol }
        });
        if (res.ok) {
            showToast('Producto deshabilitado', 'success');
            renderAdminProductos();
        }
    } catch(e) { showToast('Error', 'error'); }
}

async function renderAdminCaja() {
    if(state.user?.rol !== 'admin') return;
    try {
        // Estadisticas
        const resStats = await fetch('/api/ventas/admin/estadisticas', {
            headers: { 'x-user-id': state.user.id, 'x-user-rol': state.user.rol }
        });
        const stats = await resStats.json();
        
        document.getElementById('stat-ventas-total').innerText = formatearDinero(stats.total_vendido);
        document.getElementById('stat-ventas-hoy').innerText = formatearDinero(stats.ventas_hoy);
        document.getElementById('stat-pedidos-hoy').innerText = stats.pedidos_hoy;
        
        // Ventas recientes
        const resVentas = await fetch('/api/ventas/admin/todas', {
            headers: { 'x-user-id': state.user.id, 'x-user-rol': state.user.rol }
        });
        const ventas = await resVentas.json();
        
        const tbody = document.getElementById('tabla-ventas-admin');
        if (ventas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay ventas registradas.</td></tr>';
            return;
        }
        
        tbody.innerHTML = ventas.slice(0, 50).map(v => {
            const date = new Date(v.fecha_creacion).toLocaleString();
            return `
            <tr>
                <td><span style="font-size:0.85em; color:var(--text-muted);">${date}</span><br>#${v.id.toString().padStart(4, '0')}</td>
                <td style="font-weight:600;">${v.nombre_cliente}</td>
                <td><span style="font-size:0.85em;">${v.productos_resumen || 'Detalle no disponible'}</span></td>
                <td class="monto-cell">${formatearDinero(v.total)}<br><span style="font-size:0.7em; font-weight:normal; text-transform:capitalize; color:var(--text-muted);"><i class="fas fa-wallet"></i> ${v.metodo_pago}</span></td>
                <td><span class="badge ${v.estado === 'completado' ? 'activa' : 'cancelada'}">${v.estado}</span></td>
            </tr>`;
        }).join('');
        
    } catch(e) { console.error(e); }
}

// === BOOTSTRAP ===
window.onload = () => {
    if(localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        const td = document.getElementById('toggle-dark'); if(td) td.checked = true;
    }
    inicializarSesion();
};