// === 1. Lógica para cambiar entre módulos ===
function mostrarModulo(moduloId) {
    // Ocultar todos los módulos
    document.getElementById('modulo-reservar').style.display = 'none';
    document.getElementById('modulo-inventario').style.display = 'none';
    
    // Quitar clase activa de los botones del menú
    document.querySelectorAll('.menu-btn').forEach(btn => btn.classList.remove('active'));
    
    // Mostrar el módulo seleccionado
    document.getElementById(`modulo-${moduloId}`).style.display = 'block';
    
    // Marcar botón como activo si el evento existe
    if (event && event.target && event.target.classList.contains('menu-btn')) {
        event.target.classList.add('active');
    }
    
    // Si entramos a inventario, cargamos los datos automáticamente
    if (moduloId === 'inventario') {
        cargarInventario();
    }
}

// === 2. Lógica para calcular total y automatizar implementos ===
function calcularTotal() {
    const selectCancha = document.getElementById('tipo-cancha');
    if (!selectCancha) return;

    const selectedOption = selectCancha.options[selectCancha.selectedIndex];
    const tipo = selectCancha.value; 
    const precio = selectedOption.getAttribute('data-precio');
    
    // Automatización de implementos según la cancha
    if (tipo.includes('11v11')) {
        document.getElementById('petos_rojos').value = 11;
        document.getElementById('petos_azules').value = 11;
        document.getElementById('balones').value = 1;
    } else if (tipo.includes('7v7')) {
        document.getElementById('petos_rojos').value = 7;
        document.getElementById('petos_azules').value = 7;
        document.getElementById('balones').value = 1;
    }

    // Formatear precio a moneda colombiana
    const precioFormateado = new Intl.NumberFormat('es-CO', { 
        style: 'currency', 
        currency: 'COP', 
        maximumFractionDigits: 0 
    }).format(precio);
    
    document.getElementById('total-precio').innerText = precioFormateado;
}

// Inicializar el cálculo al cargar la página
window.onload = () => {
    if (document.getElementById('tipo-cancha')) {
        calcularTotal();
    }
};

// === 3. Enviar Reserva al Backend (RUTAS RELATIVAS) ===
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
                alert('✅ ¡Reserva exitosa!\n' + resultado.mensaje);
                formReserva.reset(); 
                calcularTotal(); 
            } else {
                alert('❌ No se pudo reservar: ' + resultado.mensaje);
            }
        } catch (error) {
            alert('❌ Error: El servidor no responde.');
        }
    });
}

// === 4. Cargar Inventario y Canchas (RUTAS RELATIVAS) ===
async function cargarInventario() {
    const contenedorInv = document.getElementById('lista-inventario');
    const contenedorCanchas = document.getElementById('lista-canchas');

    if (!contenedorInv || !contenedorCanchas) return;

    contenedorInv.innerHTML = '<p>Cargando artículos...</p>';
    contenedorCanchas.innerHTML = '<p>Cargando canchas...</p>';

    try {
        // Ejecutamos todas las peticiones al tiempo para más velocidad
        const [resInv, resCan, resRes] = await Promise.all([
            fetch('/api/inventario', { cache: 'no-store' }),
            fetch('/api/canchas', { cache: 'no-store' }),
            fetch('/api/reservas/activas', { cache: 'no-store' })
        ]);

        const datosInv = await resInv.json();
        const canchas = await resCan.json();
        const reservasActivas = await resRes.json();

        // --- Renderizar Inventario ---
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

        // --- Renderizar Canchas ---
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
        console.error("Error al cargar datos:", error);
        contenedorInv.innerHTML = '<p style="color:red;">Error al conectar con la base de datos.</p>';
        contenedorCanchas.innerHTML = '<p style="color:red;">Error al conectar con la base de datos.</p>';
    }
}

// === 5. Cancelar Reserva ===
async function cancelarReserva(reservaId) {
    if (!confirm("¿Seguro que quieres cancelar esta reserva y devolver los artículos al inventario?")) return;

    try {
        const respuesta = await fetch(`/api/reservas/${reservaId}/cancelar`, { 
            method: 'PUT' 
        });
        
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