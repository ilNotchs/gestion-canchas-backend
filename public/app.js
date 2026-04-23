// === 1. Lógica de Navegación y Estética ===
function mostrarModulo(moduloId) {
    document.getElementById('modulo-reservar').style.display = 'none';
    document.getElementById('modulo-inventario').style.display = 'none';
    
    // Quitar clase activa de todos los botones
    document.querySelectorAll('.menu-btn').forEach(btn => btn.classList.remove('active'));
    
    // Mostrar módulo seleccionado con una pequeña transición (vía CSS)
    const modulo = document.getElementById(`modulo-${moduloId}`);
    modulo.style.display = 'block';
    modulo.classList.add('fade-in');

    // Activar botón en el menú
    if (event && event.target) {
        event.target.classList.add('active');
    }

    if (moduloId === 'inventario') {
        actualizarDashboard(); // Actualiza los Signos Vitales
        cargarInventario();
    }
}

// === 2. Facturación Visual y Automatización ===
function calcularTotal() {
    const selectCancha = document.getElementById('tipo-cancha');
    const selectedOption = selectCancha.options[selectCancha.selectedIndex];
    
    const tipo = selectCancha.value; 
    const precioBase = parseInt(selectedOption.getAttribute('data-precio')) || 0;
    
    // Automatización de implementos según tipo de cancha
    if (tipo.includes('11v11')) {
        document.getElementById('petos_rojos').value = 11;
        document.getElementById('petos_azules').value = 11;
        document.getElementById('balones').value = 1;
    } else if (tipo.includes('7v7')) {
        document.getElementById('petos_rojos').value = 7;
        document.getElementById('petos_azules').value = 7;
        document.getElementById('balones').value = 1;
    }

    // Actualizar el "Ticket de Facturación" visual
    const precioFormateado = new Intl.NumberFormat('es-CO', { 
        style: 'currency', 
        currency: 'COP', 
        maximumFractionDigits: 0 
    }).format(precioBase);
    
    document.getElementById('total-precio').innerText = precioFormateado;
    
    // Efecto visual en el total
    const displayTotal = document.querySelector('.total-box');
    if(displayTotal) {
        displayTotal.style.transform = 'scale(1.05)';
        setTimeout(() => displayTotal.style.transform = 'scale(1)', 200);
    }
}

// === 3. Dashboard de Signos Vitales (KPIs) ===
async function actualizarDashboard() {
    try {
        const resInv = await fetch('/api/inventario', { cache: 'no-store' });
        const inventario = await resInv.json();
        
        const resRes = await fetch('/api/reservas/activas', { cache: 'no-store' });
        const reservasActivas = await resRes.json();

        // 1. Ocupación Actual (Basado en 15 canchas totales)
        const porcentajeOcupacion = Math.round((reservasActivas.length / 15) * 100);
        const kpiOcupacion = document.getElementById('kpi-ocupacion');
        if(kpiOcupacion) {
            kpiOcupacion.innerText = `${porcentajeOcupacion}%`;
            kpiOcupacion.parentElement.style.borderBottom = porcentajeOcupacion > 80 ? '4px solid red' : '4px solid green';
        }

        // 2. Alerta de Inventario (Balones críticos)
        const balones = inventario.find(i => i.articulo === 'Balón');
        const alertaInv = document.getElementById('kpi-inventario');
        if(alertaInv && balones) {
            alertaInv.innerText = balones.cantidad_disponible;
            if(balones.cantidad_disponible < 5) {
                alertaInv.classList.add('parpadeo-alerta');
                alertaInv.style.color = 'red';
            } else {
                alertaInv.classList.remove('parpadeo-alerta');
                alertaInv.style.color = '#008080';
            }
        }

        // 3. Ingresos Diarios (Simulado con reservas de hoy)
        const ingresos = reservasActivas.length * 80000; // Precio promedio
        const kpiIngresos = document.getElementById('kpi-ingresos');
        if(kpiIngresos) {
            kpiIngresos.innerText = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(ingresos);
        }

    } catch (e) {
        console.error("Error actualizando Dashboard", e);
    }
}

// === 4. Enviar Reserva (Refactorizado) ===
document.getElementById('form-reserva').addEventListener('submit', async (e) => {
    e.preventDefault();

    const nuevaReserva = {
        nombre_cliente: document.getElementById('nombre').value,
        cancha_id: (document.getElementById('tipo-cancha').value.includes('11v11')) ? 1 : 11,
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
            alert('⚽ ¡Reserva Confirmada!\n' + resultado.mensaje);
            document.getElementById('form-reserva').reset(); 
            calcularTotal();
            actualizarDashboard();
        } else {
            alert('❌ Error: ' + resultado.mensaje);
        }
    } catch (error) {
        alert('❌ Error crítico de red.');
    }
});

// === 5. Cargar Inventario y Canchas (Visual Moderno) ===
async function cargarInventario() {
    const contenedorInv = document.getElementById('lista-inventario');
    const contenedorCanchas = document.getElementById('lista-canchas');

    contenedorInv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...';
    contenedorCanchas.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...';

    try {
        const [resInv, resCan, resRes] = await Promise.all([
            fetch('/api/inventario', { cache: 'no-store' }),
            fetch('/api/canchas', { cache: 'no-store' }),
            fetch('/api/reservas/activas', { cache: 'no-store' })
        ]);

        const datosInv = await resInv.json();
        const canchas = await resCan.json();
        const reservas = await resRes.json();

        // Renderizar Inventario con Iconos
        contenedorInv.innerHTML = ''; 
        datosInv.forEach(item => {
            const icono = item.articulo === 'Balón' ? 'fa-futbol' : (item.articulo === 'Peto' ? 'fa-vest' : 'fa-pump-medical');
            contenedorInv.innerHTML += `
                <div class="tarjeta-inv card-hover">
                    <i class="fas ${icono} fa-2x" style="color: #008080;"></i>
                    <h4>${item.articulo} ${item.color ? `(${item.color})` : ''}</h4>
                    <h3 class="${item.cantidad_disponible < 5 ? 'text-danger' : ''}">${item.cantidad_disponible}</h3>
                    <p>Disponibles</p>
                </div>
            `;
        });

        // Renderizar Canchas (Grid Visual)
        contenedorCanchas.innerHTML = ''; 
        canchas.forEach(cancha => {
            const r = reservas.find(res => res.cancha_id === cancha.id);
            const estadoClase = r ? 'ocupada' : 'disponible';
            
            contenedorCanchas.innerHTML += `
                <div class="tarjeta-cancha ${estadoClase}">
                    <div class="status-badge">${r ? 'OCUPADA' : 'LIBRE'}</div>
                    <h4><i class="fas fa-map-marker-alt"></i> ${cancha.nombre}</h4>
                    <p>${cancha.tipo}</p>
                    ${r ? `
                        <div class="info-reserva">
                            <p>👤 ${r.nombre_cliente}</p>
                            <p>⏰ ${r.hora_inicio}</p>
                            <button onclick="cancelarReserva(${r.id})" class="btn-cancel">❌ Liberar</button>
                        </div>
                    ` : '<p class="text-success">Lista para jugar</p>'}
                </div>
            `;
        });
    } catch (error) {
        contenedorInv.innerHTML = 'Error al cargar datos.';
    }
}

// === 6. Cancelar Reserva ===
async function cancelarReserva(reservaId) {
    if (!confirm("¿Liberar cancha y devolver implementos?")) return;

    try {
        const res = await fetch(`/api/reservas/${reservaId}/cancelar`, { method: 'PUT' });
        if (res.ok) {
            actualizarDashboard();
            cargarInventario();
        }
    } catch (e) { alert("Error al cancelar"); }
}

// Inicialización
window.onload = () => {
    calcularTotal();
    actualizarDashboard();
};