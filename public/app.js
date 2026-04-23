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

// === 2. Lógica de Facturación Inteligente (Recibo Dinámico) ===
function calcularTotal() {
    const selectCancha = document.getElementById('tipo-cancha');
    if (!selectCancha) return;

    const selectedOption = selectCancha.options[selectCancha.selectedIndex];
    const tipo = selectCancha.value; 
    let precioCancha = parseInt(selectedOption.getAttribute('data-precio')) || 0;
    let precioExtras = 0;
    
    // 1. Establecer implementos base según la cancha
    let balonesBase = 1;
    let petosRojosBase = 0;
    let petosAzulesBase = 0;

    if (tipo.includes('11v11')) {
        petosRojosBase = 11;
        petosAzulesBase = 11;
    } else if (tipo.includes('7v7')) {
        petosRojosBase = 7;
        petosAzulesBase = 7;
    }

    const inputBalones = document.getElementById('balones');
    const inputRojos = document.getElementById('petos_rojos');
    const inputAzules = document.getElementById('petos_azules');

    // Autocompletar solo si cambiamos de cancha y no hemos modificado manualmente
    if (!inputBalones.dataset.modificado) {
        inputBalones.value = balonesBase;
        inputRojos.value = petosRojosBase;
        inputAzules.value = petosAzulesBase;
        inputBalones.dataset.modificado = "true"; 
    }

    const balonesPedidos = parseInt(inputBalones.value) || 0;
    const rojosPedidos = parseInt(inputRojos.value) || 0;
    const azulesPedidos = parseInt(inputAzules.value) || 0;

    // 2. Calcular Costos Extras (Inventa precios aquí si quieres)
    const costoBalonExtra = 5000;
    const costoPetoExtra = 2000;

    if (balonesPedidos > balonesBase) precioExtras += (balonesPedidos - balonesBase) * costoBalonExtra;
    if (rojosPedidos > petosRojosBase) precioExtras += (rojosPedidos - petosRojosBase) * costoPetoExtra;
    if (azulesPedidos > petosAzulesBase) precioExtras += (azulesPedidos - petosAzulesBase) * costoPetoExtra;

    // 3. Actualizar el Recibo en el HTML
    const formateador = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
    
    document.getElementById('factura-cancha-precio').innerText = formateador.format(precioCancha);
    
    const elSeccionExtras = document.getElementById('seccion-extras');
    const elExtrasPrecio = document.getElementById('factura-extras-precio');

    if (precioExtras > 0) {
        elSeccionExtras.style.display = 'block';
        elExtrasPrecio.innerText = formateador.format(precioExtras);
    } else {
        elSeccionExtras.style.display = 'none';
    }

    const totalApagar = precioCancha + precioExtras;
    document.getElementById('factura-total').innerText = formateador.format(totalApagar);

    // Pequeña animación para que se note el cambio de precio
    const cajaFacturacion = document.querySelector('.facturacion-box');
    if (cajaFacturacion) {
        cajaFacturacion.style.transform = 'scale(1.02)';
        setTimeout(() => cajaFacturacion.style.transform = 'scale(1)', 150);
    }
}

// === Event Listeners de Carga ===
window.onload = () => {
    const selectCancha = document.getElementById('tipo-cancha');
    if (selectCancha) {
        calcularTotal(); // Calcular al inicio
        
        selectCancha.addEventListener('change', () => {
            // Si cambian de cancha, reiniciamos los inputs a sus bases
            document.getElementById('balones').dataset.modificado = "";
            calcularTotal();
        });
    }

    // Si el usuario teclea números en los implementos, recalculamos en tiempo real
    ['balones', 'petos_rojos', 'petos_azules'].forEach(id => {
        const input = document.getElementById(id);
        if (input) input.addEventListener('input', calcularTotal);
    });
};

// === 3. Enviar Reserva al Backend ===
const formReserva = document.getElementById('form-reserva');
if (formReserva) {
    formReserva.addEventListener('submit', async (e) => {
        e.preventDefault();

        const tipoCancha = document.getElementById('tipo-cancha').value;
        const nuevaReserva = {
            nombre_cliente: document.getElementById('nombre').value,
            cancha_id: tipoCancha.includes('11v11') ? 1 : 11, // Puedes mejorar esta lógica después si el usuario elige una específica
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
                alert('✅ ¡Reserva exitosa!\n' + resultado.mensaje);
                formReserva.reset(); 
                document.getElementById('balones').dataset.modificado = ""; // Reiniciar lógica
                calcularTotal(); 
            } else {
                alert('❌ No se pudo reservar: ' + resultado.mensaje);
            }
        } catch (error) {
            alert('❌ Error: El servidor no responde.');
        }
    });
}

// === 4. Cargar Inventario y Canchas ===
async function cargarInventario() {
    const contenedorInv = document.getElementById('lista-inventario');
    const contenedorCanchas = document.getElementById('lista-canchas');

    if (!contenedorInv || !contenedorCanchas) return;

    contenedorInv.innerHTML = '<p>Cargando artículos...</p>';
    contenedorCanchas.innerHTML = '<p>Cargando canchas...</p>';

    try {
        const [resInv, resCan, resRes] = await Promise.all([
            fetch('/api/inventario', { cache: 'no-store' }),
            fetch('/api/canchas', { cache: 'no-store' }),
            fetch('/api/reservas/activas', { cache: 'no-store' })
        ]);

        const datosInv = await resInv.json();
        const canchas = await resCan.json();
        const reservasActivas = await resRes.json();

        // Renderizar Inventario
        contenedorInv.innerHTML = ''; 
        datosInv.forEach(item => {
            const colorInfo = item.color ? `(${item.color})` : '';
            contenedorInv.innerHTML += `
                <div class="tarjeta-inv">
                    <h4>${item.articulo} ${colorInfo}</h4>
                    <h3 style="color: #008080;">${item.cantidad_disponible} disponibles</h3>
                    <p style="font-size: 12px; color: gray;">De ${item.cantidad_total} en total</p>
                </div>
            `;
        });

        // Renderizar Canchas
        contenedorCanchas.innerHTML = ''; 
        canchas.forEach(cancha => {
            const r = reservasActivas.find(res => res.cancha_id === cancha.id);
            let htmlEstado = '';
            
            if (r) {
                const fechaLimpia = r.fecha_reserva.split('T')[0];
                htmlEstado = `
                    <div style="background-color: #ffe6e6; padding: 10px; border-radius: 5px; margin-top: 10px; border-left: 4px solid #dc3545;">
                        <p><strong>Ocupada por:</strong> ${r.nombre_cliente}</p>
                        <p style="font-size: 13px;">⏰ ${r.hora_inicio} | 📅 ${fechaLimpia}</p>
                        <button onclick="cancelarReserva(${r.id})" style="background: #dc3545; color: white; border: none; padding: 8px; width: 100%; cursor: pointer; border-radius: 4px; margin-top: 8px; font-weight: bold;">
                            ❌ Cancelar Reserva
                        </button>
                    </div>
                `;
            } else {
                htmlEstado = `<p style="color: #28a745; font-weight: bold; margin-top: 15px;">✅ Disponible</p>`;
            }

            contenedorCanchas.innerHTML += `
                <div class="tarjeta-inv" style="border: 1px solid #ddd;">
                    <h4>${cancha.nombre}</h4>
                    <p style="font-size: 12px; color: gray;">${cancha.tipo}</p>
                    ${htmlEstado}
                </div>
            `;
        });

    } catch (error) {
        contenedorInv.innerHTML = '<p style="color:red;">Error de conexión.</p>';
        contenedorCanchas.innerHTML = '<p style="color:red;">Error de conexión.</p>';
    }
}

// === 5. Cancelar Reserva ===
async function cancelarReserva(reservaId) {
    if (!confirm("¿Seguro que quieres cancelar esta reserva y devolver los artículos al inventario?")) return;
    try {
        const respuesta = await fetch(`/api/reservas/${reservaId}/cancelar`, { method: 'PUT' });
        if (respuesta.ok) {
            alert('✅ Reserva cancelada con éxito.');
            cargarInventario(); 
        } else {
            const err = await respuesta.json();
            alert('❌ No se pudo cancelar: ' + err.mensaje);
        }
    } catch (error) {
        alert('❌ Error de conexión.');
    }
}