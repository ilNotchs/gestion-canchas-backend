// === 1. Lógica para cambiar entre módulos ===
function mostrarModulo(moduloId) {
    document.getElementById('modulo-reservar').style.display = 'none';
    document.getElementById('modulo-inventario').style.display = 'none';
    document.querySelectorAll('.menu-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(`modulo-${moduloId}`).style.display = 'block';
    
    if (event && event.target && event.target.classList.contains('menu-btn')) {
        event.target.classList.add('active');
    }
    
    if (moduloId === 'inventario') cargarInventario();
}

// === 2. Lógica para calcular total y automatizar implementos ===
function calcularTotal() {
    const selectCancha = document.getElementById('tipo-cancha');
    if (!selectCancha) return;

    const selectedOption = selectCancha.options[selectCancha.selectedIndex];
    const tipo = selectCancha.value; 
    const precio = selectedOption.getAttribute('data-precio');
    
    // Automatización básica
    if (tipo.includes('11v11')) {
        document.getElementById('petos_rojos').value = 11;
        document.getElementById('petos_azules').value = 11;
        document.getElementById('balones').value = 1;
    } else if (tipo.includes('7v7')) {
        document.getElementById('petos_rojos').value = 7;
        document.getElementById('petos_azules').value = 7;
        document.getElementById('balones').value = 1;
    }

    const precioFormateado = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(precio);
    document.getElementById('total-precio').innerText = precioFormateado;
}

window.onload = () => {
    if(document.getElementById('tipo-cancha')) calcularTotal();
};

// === 3. Lógica para Enviar la Reserva (URL RELATIVA) ===
const formReserva = document.getElementById('form-reserva');
if (formReserva) {
    formReserva.addEventListener('submit', async (e) => {
        e.preventDefault();

        const tipoCancha = document.getElementById('tipo-cancha').value;
        const nuevaReserva = {
            nombre_cliente: document.getElementById('nombre').value,
            cancha_id: tipoCancha.includes('11v11') ? 1 : 11,
            fecha_reserva: document.getElementById('fecha').value,
            hora_inicio: document.getElementById('hora').value,
            horas_alquiladas: 1,
            balones_prestados: parseInt(document.getElementById('balones').value) || 0,
            petos_rojos_prestados: parseInt(document.getElementById('petos_rojos').value) || 0,
            petos_azules_prestados: parseInt(document.getElementById('petos_azules').value) || 0,
            metodo_pago: document.getElementById('metodo-pago').value
        };

        try {
            const respuesta = await fetch('/api/reservas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevaReserva)
            });

            const resultado = await respuesta.json();

            if (respuesta.ok) {
                alert('✅ ¡Reserva realizada!\n' + resultado.mensaje);
                formReserva.reset(); 
                calcularTotal(); 
            } else {
                alert('❌ Error: ' + resultado.mensaje);
            }
        } catch (error) {
            alert('❌ Error de conexión con el servidor.');
        }
    });
}

// === 4. Cargar Inventario (URL RELATIVA + ANTI-CACHÉ) ===
async function cargarInventario() {
    const contenedorInv = document.getElementById('lista-inventario');
    const contenedorCanchas = document.getElementById('lista-canchas');

    if(!contenedorInv || !contenedorCanchas) return;

    contenedorInv.innerHTML = 'Cargando artículos...';
    contenedorCanchas.innerHTML = 'Cargando canchas...';

    try {
        // FETCH RELATIVO: Funciona en local y en Render
        const [resInv, resCan, resRes] = await Promise.all([
            fetch('/api/inventario', { cache: 'no-store' }),
            fetch('/api/canchas', { cache: 'no-store' }),
            fetch('/api/reservas/activas', { cache: 'no-store' })
        ]);

        const datosInv = await resInv.json();
        const canchas = await resCan.json();
        const reservas = await resRes.json();

        // Render Inventario
        contenedorInv.innerHTML = ''; 
        datosInv.forEach(item => {
            contenedorInv.innerHTML += `
                <div class="tarjeta-inv">
                    <h4>${item.articulo} ${item.color ? `(${item.color})` : ''}</h4>
                    <h3 style="color: #008080;">${item.cantidad_disponible} disp.</h3>
                    <p style="font-size: 12px; color: gray;">De ${item.cantidad_total} totales</p>
                </div>
            `;
        });

        // Render Canchas
        contenedorCanchas.innerHTML = ''; 
        canchas.forEach(cancha => {
            const r = reservas.find(res => res.cancha_id === cancha.id);
            let htmlEstado = r 
                ? `<div style="background:#ffe6e6; padding:10px; border-radius:5px; margin-top:10px;">
                    <p><strong>Ocupada:</strong> ${r.nombre_cliente}</p>
                    <p style="font-size:12px;">⏰ ${r.hora_inicio}</p>
                    <button onclick="cancelarReserva(${r.id})" style="background:#dc3545; color:white; border:none; padding:5px; width:100%; cursor:pointer; margin-top:5px; border-radius:4px;">Cancelar</button>
                   </div>`
                : `<p style="color:#28a745; font-weight:bold; margin-top:15px;">✅ Disponible</p>`;

            contenedorCanchas.innerHTML += `
                <div class="tarjeta-inv" style="border: 1px solid #ddd;">
                    <h4>${cancha.nombre}</h4>
                    <p style="font-size: 12px; color: gray;">${cancha.tipo}</p>
                    ${htmlEstado}
                </div>
            `;
        });
    } catch (error) {
        contenedorInv.innerHTML = '<p style="color:red;">Error al conectar.</p>';
    }
}

// === 5. Cancelar Reserva ===
async function cancelarReserva(reservaId) {
    if (!confirm("¿Seguro que quieres cancelar?")) return;
    try {
        const res = await fetch(`/api/reservas/${reservaId}/cancelar`, { method: 'PUT' });
        if (res.ok) cargarInventario();
    } catch (e) { alert("Error de red"); }
}