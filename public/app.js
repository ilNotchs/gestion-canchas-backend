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
    
    const horasDisponibles = ['16:00:00', '17:00:00', '18:00:00', '19:00:00', '20:00:00', '21:00:00', '22:00:00'];
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
        
        const perc = canchas.length === 0 ? 0 : (res.length / canchas.length) * 100;
        document.getElementById('dash-ocupacion').innerText = `${perc.toFixed(0)}%`;
        
        let totalDinero = 0;
        res.forEach(r => {
            let precioBase = (r.nombre_cancha && r.nombre_cancha.includes('11v11')) ? 100000 : 60000;
            totalDinero += precioBase * r.horas_alquiladas;
        });
        document.getElementById('dash-ingresos').innerText = formatearDinero(totalDinero);
        document.getElementById('dash-reservas').innerText = res.length;
    } catch(e) { console.error(e); }
}

async function renderInventario() {
    if(state.user?.rol !== 'admin') return;
    try {
        const res = await fetch('/api/inventario');
        const inv = await res.json();
        
        const contInv = document.getElementById('lista-inventario');
        contInv.innerHTML = inv.map(i => {
            return `
            <div class="stat-card" style="flex-direction:column; align-items:flex-start;">
                <div style="display:flex; justify-content:space-between; width:100%;">
                    <h5>${i.articulo} ${i.color ? `(${i.color})` : ''}</h5>
                    <span style="font-weight:bold; color:var(--success);">${i.cantidad_disponible} unid.</span>
                </div>
            </div>`;
        }).join('');

        const contCan = document.getElementById('lista-canchas');
        contCan.innerHTML = state.canchas.map(cancha => {
            const reservasAgenda = state.reservasActivas.filter(r => r.cancha_id === cancha.id);
            const estaOcupada = reservasAgenda.length > 0;
            
            let agendaHTML = estaOcupada ? reservasAgenda.map(r => `
                <div style="background:var(--bg-app); padding:8px; border-radius:6px; margin-top:5px; display:flex; justify-content:space-between; align-items:center;">
                    <div><span style="font-size:0.85em;">👤 ${r.nombre_cliente}</span><br><span style="font-size:0.8em; color:var(--text-muted);">⏰ ${r.hora_inicio} (${r.horas_alquiladas}h)</span></div>
                    <button class="btn-outline danger" style="padding:4px 8px; width:auto;" onclick="pedirCancelacion(${r.id})"><i class="fas fa-times"></i></button>
                </div>
            `).join('') : '<p style="font-size:0.8em; color:var(--text-muted); margin-top:5px;">Libre actualmente</p>';

            return `
                <div class="reserva-card" style="border-top: 3px solid ${estaOcupada ? 'var(--danger)' : 'var(--success)'};">
                    <h4 style="margin-bottom:2px;">${cancha.nombre}</h4>
                    <span class="badge ${estaOcupada ? 'cancelada' : 'activa'}" style="margin-bottom:10px; display:inline-block;">${cancha.tipo}</span>
                    <div>${agendaHTML}</div>
                </div>
            `;
        }).join('');
    } catch(e) { console.error(e); }
}

// === 8. LÓGICA DE TIENDA Y CARRITO (CLIENTE) ===
let productosData = []; // Caché de productos

async function renderTienda() {
    try {
        const res = await fetch('/api/productos');
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
        const img = p.imagen_url ? p.imagen_url : 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=300&q=80';
        
        return `
        <div class="tienda-card">
            <div class="tienda-img">
                <img src="${img}" alt="${p.nombre}" onerror="this.src='https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=300&q=80'">
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
                <img src="${item.imagen_url}" onerror="this.src='https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=300&q=80'">
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