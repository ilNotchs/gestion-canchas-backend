// === 1. Lógica para cambiar entre módulos ===
function mostrarModulo(moduloId) {
    document.getElementById('modulo-reservar').style.display = 'none';
    document.getElementById('modulo-inventario').style.display = 'none';
    document.querySelectorAll('.menu-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`modulo-${moduloId}`).style.display = 'block';
    if (typeof event !== 'undefined') event.target.classList.add('active');
    if (moduloId === 'inventario') cargarInventario();
}

// === 2. Lógica para calcular total y automatizar implementos ===
function calcularTotal() {
    const selectCancha = document.getElementById('tipo-cancha');
    const selectedOption = selectCancha.options[selectCancha.selectedIndex];
    
    const tipo = selectCancha.value; 
    const precio = selectedOption.getAttribute('data-precio');
    
    // Si es 11v11 o su promoción
    if (tipo === '11v11' || tipo === '11v11_promo') {
        document.getElementById('petos_rojos').value = 11;
        document.getElementById('petos_azules').value = 11;
        document.getElementById('balones').value = 1;
    } 
    // Si es 7v7 o su promoción
    else if (tipo === '7v7' || tipo === '7v7_promo') {
        document.getElementById('petos_rojos').value = 7;
        document.getElementById('petos_azules').value = 7;
        document.getElementById('balones').value = 1;
    }

    const precioFormateado = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(precio);
    document.getElementById('total-precio').innerText = precioFormateado;
}

window.onload = calcularTotal;

// === 3. Lógica para Enviar la Reserva al Backend ===
document.getElementById('form-reserva').addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre = document.getElementById('nombre').value;
    const tipoCancha = document.getElementById('tipo-cancha').value;
    const metodoPago = document.getElementById('metodo-pago').value;
    const fecha = document.getElementById('fecha').value;
    const hora = document.getElementById('hora').value;
    const balones = parseInt(document.getElementById('balones').value) || 0;
    const petosRojos = parseInt(document.getElementById('petos_rojos').value) || 0;
    const petosAzules = parseInt(document.getElementById('petos_azules').value) || 0;

    // Asignar ID: Promo o normal, la de 11 va a la Cancha 1, la de 7 a la Cancha 11
    const canchaId = (tipoCancha === '11v11' || tipoCancha === '11v11_promo') ? 1 : 11;

    const nuevaReserva = {
        nombre_cliente: nombre, cancha_id: canchaId, fecha_reserva: fecha,
        hora_inicio: hora, horas_alquiladas: 1, balones_prestados: balones,
        petos_rojos_prestados: petosRojos, petos_azules_prestados: petosAzules,
        metodo_pago: metodoPago
    };

    try {
        const respuesta = await fetch('/api/reservas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevaReserva)
        });

        const resultado = await respuesta.json();

        if (respuesta.ok) {
            alert('✅ ¡Éxito!\n' + resultado.mensaje);
            document.getElementById('form-reserva').reset(); 
            calcularTotal(); 
        } else {
            alert('❌ No se pudo reservar:\n' + resultado.mensaje);
        }
    } catch (error) {
        alert('❌ Error crítico: El servidor no responde.');
    }
});

// === 4. Cargar Inventario y Canchas juntas (ANTI-CACHÉ APLICADO) ===
async function cargarInventario() {
    const contenedorInv = document.getElementById('lista-inventario');
    const contenedorCanchas = document.getElementById('lista-canchas');

    contenedorInv.innerHTML = 'Cargando artículos...';
    contenedorCanchas.innerHTML = 'Cargando canchas...';

    try {
        // SOLUCIÓN: { cache: 'no-store' } fuerza al navegador a buscar datos reales
        const resInv = await fetch('/api/inventario', { cache: 'no-store' });
        const datosInv = await resInv.json();
        
        contenedorInv.innerHTML = ''; 
        datosInv.forEach(item => {
            const color = item.color ? `(${item.color})` : '';
            contenedorInv.innerHTML += `
                <div class="tarjeta-inv">
                    <h4>${item.articulo} ${color}</h4>
                    <h3 style="color: #008080;">${item.cantidad_disponible} disp.</h3>
                    <p style="font-size: 12px; color: gray;">De ${item.cantidad_total} totales</p>
                </div>
            `;
        });

        const resCanchas = await fetch('/api/canchas', { cache: 'no-store' });
        const canchas = await resCanchas.json();

        const resReservas = await fetch('/api/reservas/activas', { cache: 'no-store' });
        const reservas = await resReservas.json();

        contenedorCanchas.innerHTML = ''; 
        
        canchas.forEach(cancha => {
            const reservasCancha = reservas.filter(r => r.cancha_id === cancha.id);
            let contenidoHtml = '';

            if (reservasCancha.length > 0) {
                reservasCancha.forEach(r => {
                    const fechaLimpia = r.fecha_reserva.split('T')[0];
                    const metodoCapitalizado = r.metodo_pago.charAt(0).toUpperCase() + r.metodo_pago.slice(1);
                    
                    contenidoHtml += `
                        <div style="background-color: #ffe6e6; padding: 10px; margin-top: 10px; border-radius: 5px; border-left: 4px solid red; text-align: left;">
                            <p style="margin-bottom: 5px;"><strong>Ocupada:</strong> ${r.nombre_cliente}</p>
                            <p style="font-size: 13px;">📅 ${fechaLimpia} | ⏰ ${r.hora_inicio}</p>
                            <p style="font-size: 13px; margin-top: 5px;">⚽ ${r.balones_prestados} | 🔴 ${r.petos_rojos_prestados} | 🔵 ${r.petos_azules_prestados}</p>
                            <p style="font-size: 13px; font-weight: bold; color: #333; margin-top: 5px;">Pago: ${metodoCapitalizado}</p>
                            <button type="button" onclick="cancelarReserva(${r.id})" style="background: #dc3545; color: white; border: none; padding: 8px; cursor: pointer; border-radius: 4px; margin-top: 10px; width: 100%; font-weight: bold;">
                                ❌ Cancelar
                            </button>
                        </div>
                    `;
                });
            } else {
                contenidoHtml = `<p style="color: #28a745; font-weight: bold; margin-top: 15px; font-size: 16px;">✅ Disponible</p>`;
            }

            contenedorCanchas.innerHTML += `
                <div class="tarjeta-inv" style="border: 1px solid #ddd;">
                    <h4>${cancha.nombre}</h4>
                    <p style="font-size: 12px; color: gray;">${cancha.tipo === '11v11' ? 'Cancha Completa' : 'Fútbol 7'}</p>
                    ${contenidoHtml}
                </div>
            `;
        });
    } catch (error) {
        contenedorInv.innerHTML = '<p style="color:red;">Error de conexión.</p>';
        contenedorCanchas.innerHTML = '<p style="color:red;">Error de conexión.</p>';
    }
}

// === 5. Cancelar Reserva y DEVOLVER al Inventario ===
async function cancelarReserva(reservaId) {
    const confirmacion = confirm("¿Estás seguro de cancelar esta reserva? La cancha quedará libre y los artículos regresarán al inventario.");
    if (!confirmacion) return;

    try {
        const respuesta = await fetch(`/api/reservas/${reservaId}/cancelar`, { method: 'PUT', headers: { 'Content-Type': 'application/json' } });
        const resultado = await respuesta.json();
        if (respuesta.ok) {
            alert('✅ ' + resultado.mensaje);
            cargarInventario(); 
        } else {
            alert('❌ Error: ' + resultado.mensaje);
        }
    } catch (error) {
        alert('❌ Error de red al intentar cancelar la reserva.');
    }
}