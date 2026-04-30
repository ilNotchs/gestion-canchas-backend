const db = require('../config/db');

const crearReserva = async (req, res) => {
    const conexion = await db.getConnection();
    try {
        // Obtenemos los datos del usuario directamente del body (ya que no hay middleware de sesión/JWT configurado)
        const usuario_id = req.body.usuario_id || 1; 
        const username = req.body.nombre_cliente || 'Cliente';

        const { 
            cancha_id, 
            fecha_reserva, 
            hora_inicio, 
            horas_alquiladas, 
            balones_prestados, 
            petos_rojos_prestados, 
            petos_azules_prestados, 
            metodo_pago 
        } = req.body;

        const duracion = horas_alquiladas || 1;

        // 1. VALIDACIÓN DE TRASLAPE (Evita el error de conflicto de horario)
        const queryTraslape = `
            SELECT id FROM reservas 
            WHERE cancha_id = ? 
            AND fecha_reserva = ? 
            AND estado = 'activa'
            AND (
                hora_inicio < ADDTIME(?, SEC_TO_TIME(? * 3600)) 
                AND ADDTIME(hora_inicio, SEC_TO_TIME(horas_alquiladas * 3600)) > ?
            )`;

        const [conflicto] = await conexion.query(queryTraslape, [
            cancha_id, 
            fecha_reserva, 
            hora_inicio, 
            duracion, 
            hora_inicio
        ]);
        
        if (conflicto.length > 0) {
            return res.status(400).json({ 
                mensaje: '❌ Error: Conflicto de horario en la cancha seleccionada.' 
            });
        }

        // 2. VALIDACIÓN DE STOCK (Basado en el inventario de FitCanchas)
        const [stock] = await conexion.query('SELECT articulo, color, cantidad_disponible FROM inventario');
        
        const balonesStock = stock.find(i => i.articulo === 'Balón')?.cantidad_disponible || 0;
        if (balones_prestados > balonesStock) {
            return res.status(400).json({ mensaje: `Solo quedan ${balonesStock} balones disponibles.` });
        }

        const rojosStock = stock.find(i => i.articulo === 'Peto' && i.color === 'Rojo')?.cantidad_disponible || 0;
        const azulesStock = stock.find(i => i.articulo === 'Peto' && i.color === 'Azul')?.cantidad_disponible || 0;
        
        if (petos_rojos_prestados > rojosStock || petos_azules_prestados > azulesStock) {
            return res.status(400).json({ mensaje: `Stock insuficiente de petos.` });
        }

        // 3. INICIO DE TRANSACCIÓN
        await conexion.beginTransaction();

        // Insertamos usando el nombre del cliente de la sesión
        const queryReserva = `
            INSERT INTO reservas 
            (nombre_cliente, cancha_id, fecha_reserva, hora_inicio, horas_alquiladas, balones_prestados, petos_rojos_prestados, petos_azules_prestados, metodo_pago, estado) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'activa')`;
        
        const [resultado] = await conexion.query(queryReserva, [
            username, 
            cancha_id, 
            fecha_reserva, 
            hora_inicio, 
            duracion, 
            balones_prestados || 0, 
            petos_rojos_prestados || 0, 
            petos_azules_prestados || 0, 
            metodo_pago || 'efectivo'
        ]);

        // 4. ACTUALIZACIÓN DE INVENTARIO
        await conexion.query("UPDATE inventario SET cantidad_disponible = cantidad_disponible - ? WHERE articulo = 'Balón'", [balones_prestados || 0]);
        await conexion.query("UPDATE inventario SET cantidad_disponible = cantidad_disponible - ? WHERE articulo = 'Peto' AND color = 'Rojo'", [petos_rojos_prestados || 0]);
        await conexion.query("UPDATE inventario SET cantidad_disponible = cantidad_disponible - ? WHERE articulo = 'Peto' AND color = 'Azul'", [petos_azules_prestados || 0]);

        await conexion.commit();
        res.status(201).json({ 
            mensaje: 'Reserva creada exitosamente e inventario actualizado.', 
            reservaId: resultado.insertId 
        });

    } catch (error) {
        if (conexion) await conexion.rollback();
        console.error("❌ Error en crearReserva:", error);
        res.status(500).json({ mensaje: 'Error interno al procesar la reserva.' });
    } finally {
        if (conexion) conexion.release();
    }
};

const obtenerReservasActivas = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT r.*, c.nombre as nombre_cancha 
            FROM reservas r 
            JOIN canchas c ON r.cancha_id = c.id 
            WHERE r.estado = 'activa'
            ORDER BY r.fecha_reserva ASC, r.hora_inicio ASC
        `);
        res.json(rows);
    } catch (error) {
        console.error("❌ Error crítico en obtenerReservasActivas:", error);
        res.status(500).json({ mensaje: 'Error al obtener las reservas activas.' });
    }
};

const cancelarReserva = async (req, res) => {
    const conexion = await db.getConnection();
    try {
        await conexion.beginTransaction();
        const { id } = req.params;

        const [reservaInfo] = await conexion.query('SELECT * FROM reservas WHERE id = ?', [id]);
        if (reservaInfo.length === 0) throw new Error('Reserva no encontrada');
        
        const reserva = reservaInfo[0];
        if (reserva.estado !== 'activa') throw new Error('La reserva ya está cancelada o finalizada');

        await conexion.query('UPDATE reservas SET estado = ? WHERE id = ?', ['cancelada', id]);

        // Devolución al inventario
        if (reserva.balones_prestados > 0) {
            await conexion.query("UPDATE inventario SET cantidad_disponible = LEAST(cantidad_total, cantidad_disponible + ?) WHERE articulo = 'Balón'", [reserva.balones_prestados]);
        }
        if (reserva.petos_rojos_prestados > 0) {
            await conexion.query("UPDATE inventario SET cantidad_disponible = LEAST(cantidad_total, cantidad_disponible + ?) WHERE articulo = 'Peto' AND color = 'Rojo'", [reserva.petos_rojos_prestados]);
        }
        if (reserva.petos_azules_prestados > 0) {
            await conexion.query("UPDATE inventario SET cantidad_disponible = LEAST(cantidad_total, cantidad_disponible + ?) WHERE articulo = 'Peto' AND color = 'Azul'", [reserva.petos_azules_prestados]);
        }

        await conexion.commit();
        res.json({ mensaje: 'Reserva cancelada y artículos devueltos al inventario.' });

    } catch (error) {
        if (conexion) await conexion.rollback();
        console.error("❌ Error en cancelarReserva:", error);
        res.status(500).json({ mensaje: error.message });
    } finally {
        if (conexion) conexion.release();
    }
};

module.exports = { crearReserva, obtenerReservasActivas, cancelarReserva };