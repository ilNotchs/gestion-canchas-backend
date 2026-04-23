// === 1. Lógica de Navegación con Animaciones Suaves ===
function mostrarModulo(moduloId) {
    // Quitar clase activa a todas las pantallas
    document.querySelectorAll('.modulo').forEach(m => {
        m.classList.remove('activo');
        // Esperamos que termine la animación de opacidad antes de ocultar el div
        setTimeout(() => m.style.display = 'none', 300); 
    });
    
    document.querySelectorAll('.menu-btn').forEach(btn => btn.classList.remove('active'));

    // Mostrar el módulo deseado con retraso para que se vea el deslizamiento
    setTimeout(() => {
        const mod = document.getElementById(`modulo-${moduloId}`);
        mod.style.display = 'block';
        // Un pequeño tick de tiempo para que CSS detecte el cambio de 'display' antes de animar
        setTimeout(() => mod.classList.add('activo'), 50);
    }, 300);

    if (event && event.target && event.target.classList.contains('menu-btn')) {
        event.target.classList.add('active');
    }

    if (moduloId === 'inventario') cargarInventario();
    if (moduloId === 'dashboard') cargarDashboard();
}

// === 2. Lógica del Dashboard de Signos Vitales ===
async function cargarDashboard() {
    try {
        const [resInv, resCan, resRes] = await Promise.all([
            fetch('/api/inventario', { cache: 'no-store' }),
            fetch('/api/canchas', { cache: 'no-store' }),
            fetch('/api/reservas/activas', { cache: 'no-store' })
        ]);

        const datosInv = await resInv.json();
        const canchas = await resCan.json();
        const reservas = await resRes.json();

        // A. Ocupación (¿Cuántas canchas están alquiladas?)
        const totalCanchas = canchas.length;
        const canchasOcupadas = reservas.length;
        let porcentajeOcupacion = totalCanchas === 0 ? 0 : (canchasOcupadas / totalCanchas) * 100;
        
        document.getElementById('stat-ocupacion').innerText = `${porcentajeOcupacion.toFixed(0)}%`;
        document.getElementById('barra-ocupacion').style.width = `${porcentajeOcupacion}%`;

        // B. Ingresos del Día (Sumamos el valor aproximado de las reservas activas)
        let ingresos = 0;
        reservas.forEach(r => {
            // Lógica simple: Si es sintética asume 60k, sino 100k
            if (r.nombre_cancha && r.nombre_cancha.includes('Sintética')) ingresos += 60000;
            else ingresos += 100000;
        });
        
        const formatMoney = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
        document.getElementById('stat-ingresos').innerText = formatMoney.format(ingresos);

        // C. Sistema de Alarma de Inventario de Balones
        const balones = datosInv.find(i => i.articulo === 'Balón');
        const statBalones = document.getElementById('stat-balones');
        const tarjetaAlerta = document.getElementById('tarjeta-alerta-balones');
        const textoAlerta = document.getElementById('texto-alerta-balones');

        statBalones.innerText = balones ? balones.cantidad_disponible : 0;

        if (balones && balones.cantidad_disponible < 5) {
            tarjetaAlerta.classList.add('alerta-animada');
            textoAlerta.innerText = "¡ALERTA! Recuperar balones urgente";
            textoAlerta.style.color = "#dc3545";
            textoAlerta.style.fontWeight = "bold";
        } else {
            tarjetaAlerta.classList.remove('alerta-animada');
            textoAlerta.innerText = "Nivel óptimo para operar";
            textoAlerta.style.color = "gray";
            textoAlerta.style.fontWeight = "normal";
        }

    } catch (error) {
        console.error("Error cargando el Dashboard", error);
    }
}

window.onload = () => {
    // Al abrir la página, cargamos el Dashboard primero
    cargarDashboard();

    const selectCancha = document.getElementById('tipo-cancha');
    if (selectCancha) {
        calcularTotal();
        selectCancha.addEventListener('change', () => {
            document.getElementById('balones').dataset.modificado = "";
            calcularTotal();
        });
    }

    ['balones', 'petos_rojos', 'petos_azules'].forEach(id => {
        const input = document.getElementById(id);
        if (input) input.addEventListener('input', calcularTotal);
    });
};

// === 3. Generador de Recibos en PDF ===
function descargarPDF() {
    const elemento = document.getElementById('recibo-imprimible');
    const botones = document.getElementById('botones-accion');
    const logoHeader = document.getElementById('logo-recibo');
    
    // Preparar el recibo para la foto (ocultar botones, mostrar logo superior)
    botones.style.display = 'none';
    logoHeader.style.display = 'block';

    const opt = {
        margin:       0.5,
        filename:     `Factura_FitCanchas_${document.getElementById('fecha').value || 'Hoy'}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 }, // Mayor escala = mejor resolución
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    // Generar PDF y cuando termine, restaurar la vista normal
    html2pdf().set(opt).from(elemento).save().then(() => {
        botones.style.display = 'flex';
        logoHeader.style.display = 'none';
    });
}

// === 4. Lógica de Facturación (Se mantiene igual) ===
function calcularTotal() {
    const selectCancha = document.getElementById('tipo-cancha');
    if (!selectCancha) return;

    const selectedOption = selectCancha.options[selectCancha.selectedIndex];
    const tipo = selectCancha.value; 
    let precioCancha = parseInt(selectedOption.getAttribute('data-precio')) || 0;
    let precioExtras = 0;
    
    let balonesBase = 1, petosRojosBase = 0, petosAzulesBase = 0;

    if (tipo.includes('11v11')) { petosRojosBase = 11; petosAzulesBase = 11; } 
    else if (tipo.includes('7v7')) { petosRojosBase = 7; petosAzulesBase = 7; }

    const inputBalones = document.getElementById('balones'), inputRojos = document.getElementById('petos_rojos'), inputAzules = document.getElementById('petos_azules');

    if (!inputBalones.dataset.modificado) {
        inputBalones.value = balonesBase; inputRojos.value = petosRojosBase; inputAzules.value = petosAzulesBase;
        inputBalones.dataset.modificado = "true"; 
    }

    const balonesPedidos = parseInt(inputBalones.value) || 0, rojosPedidos = parseInt(inputRojos.value) || 0, azulesPedidos = parseInt(inputAzules.value) || 0;
    const costoBalonExtra = 5000, costoPetoExtra = 2000;

    if (balonesPedidos > balonesBase) precioExtras += (balonesPedidos - balonesBase) * costoBalonExtra;
    if (rojosPedidos > petosRojosBase) precioExtras += (rojosPedidos - petosRojosBase) * costoPetoExtra;
    if (azulesPedidos > petosAzulesBase) precioExtras += (azulesPedidos - petosAzulesBase) * costoPetoExtra;

    const formateador = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
    
    document.getElementById('factura-cancha-precio').innerText = formateador.format(precioCancha);
    
    const elSeccionExtras = document.getElementById('seccion-extras');
    if (precioExtras > 0) {
        elSeccionExtras.style.display = 'block';
        document.getElementById('factura-extras-precio').innerText = formateador.format(precioExtras);
    } else {
        elSeccionExtras.style.display = 'none';
    }

    document.getElementById('factura-total').innerText = formateador.format(precioCancha + precioExtras);
}

// === 5. Enviar Reserva al Backend ===
const formReserva = document.getElementById('form-reserva');
if (formReserva) {
    formReserva.addEventListener('submit', async (e) => {
        e.preventDefault();

        const tipoCancha = document.getElementById('tipo-cancha').value;
        const nuevaReserva = {
            nombre_cliente: document.getElementById('nombre').value,
            cancha_id: tipoCancha.includes('11v11') ? 1 : 12, 
            fecha_reserva: document.getElementById('fecha').value,
            hora_inicio: document.getElementById('hora').value,
            horas_alquiladas: 1,
            balones_prestados: parseInt(document.getElementById('balones').value) || 0,
            petos_rojos_prestados: parseInt(document.getElementById('petos_rojos').value) || 0,
            petos_azules_prestados: parseInt(document.getElementById('petos_azules').value) || 0,
            metodo_pago: document.getElementById('metodo-pago').value
        };

        try {
            const respuesta = await fetch('/api/reservas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nuevaReserva) });
            const resultado = await respuesta.json();

            if (respuesta.ok) {
                alert('✅ ¡Reserva exitosa!\n' + resultado.mensaje);
                formReserva.reset(); 
                document.getElementById('balones').dataset.modificado = ""; 
                calcularTotal(); 
                cargarDashboard(); // Actualizar las finanzas
            } else { alert('❌ No se pudo reservar: ' + resultado.mensaje); }
        } catch (error) { alert('❌ Error de red.'); }
    });
}

// === 6. Inventario y Cancelar Reserva ===
async function cargarInventario() {
    const contenedorInv = document.getElementById('lista-inventario'), contenedorCanchas = document.getElementById('lista-canchas');
    if (!contenedorInv || !contenedorCanchas) return;

    contenedorInv.innerHTML = '<p>Cargando...</p>'; contenedorCanchas.innerHTML = '<p>Cargando...</p>';

    try {
        const [resInv, resCan, resRes] = await Promise.all([ fetch('/api/inventario', { cache: 'no-store' }), fetch('/api/canchas', { cache: 'no-store' }), fetch('/api/reservas/activas', { cache: 'no-store' }) ]);
        const datosInv = await resInv.json(), canchas = await resCan.json(), reservasActivas = await resRes.json();

        contenedorInv.innerHTML = ''; 
        datosInv.forEach(item => {
            contenedorInv.innerHTML += `<div class="tarjeta-inv"><h4>${item.articulo} ${item.color ? `(${item.color})` : ''}</h4><h3 style="color: #008080;">${item.cantidad_disponible} disponibles</h3><p style="font-size: 12px; color: gray;">De ${item.cantidad_total} en total</p></div>`;
        });

        contenedorCanchas.innerHTML = ''; 
        canchas.forEach(cancha => {
            const r = reservasActivas.find(res => res.cancha_id === cancha.id);
            let htmlEstado = r 
                ? `<div style="background-color: #ffe6e6; padding: 10px; border-radius: 5px; margin-top: 10px; border-left: 4px solid #dc3545;">
                    <p><strong>Ocupada:</strong> ${r.nombre_cliente}</p><button onclick="cancelarReserva(${r.id})" style="background: #dc3545; color: white; border: none; padding: 8px; width: 100%; cursor: pointer; border-radius: 4px; margin-top: 8px;">❌ Cancelar</button></div>`
                : `<p style="color: #28a745; font-weight: bold; margin-top: 15px;">✅ Disponible</p>`;

            contenedorCanchas.innerHTML += `<div class="tarjeta-inv" style="border: 1px solid #ddd;"><h4>${cancha.nombre}</h4><p style="font-size: 12px; color: gray;">${cancha.tipo}</p>${htmlEstado}</div>`;
        });
    } catch (error) { contenedorInv.innerHTML = '<p>Error.</p>'; contenedorCanchas.innerHTML = '<p>Error.</p>'; }
}

async function cancelarReserva(reservaId) {
    if (!confirm("¿Seguro que quieres cancelar esta reserva?")) return;
    try {
        const respuesta = await fetch(`/api/reservas/${reservaId}/cancelar`, { method: 'PUT' });
        if (respuesta.ok) { alert('✅ Reserva cancelada.'); cargarInventario(); cargarDashboard(); } 
        else { const err = await respuesta.json(); alert('❌ ' + err.mensaje); }
    } catch (error) { alert('❌ Error de red.'); }
}