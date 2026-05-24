const db = require('../config/db');

/**
 * Crea una nueva reserva con validación de traslape y stock.
 */
const crearReserva = async (req, res) => {
    const conexion = await db.getConnection();
    try {
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

        const duracion = parseInt(horas_alquiladas) || 1;
        const balones = parseInt(balones_prestados) || 0;
        const petosRojos = parseInt(petos_rojos_prestados) || 0;
        const petosAzules = parseInt(petos_azules_prestados) || 0;

        // Validaciones básicas
        if (!cancha_id || !fecha_reserva || !hora_inicio) {
            return res.status(400).json({ 
                mensaje: 'Cancha, fecha y hora son obligatorios.' 
            });
        }

        // 1. VALIDACIÓN DE TRASLAPE
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
            cancha_id, fecha_reserva, hora_inicio, duracion, hora_inicio
        ]);

        if (conflicto.length > 0) {
            return res.status(400).json({ 
                mensaje: '❌ Error: Conflicto de horario en la cancha seleccionada.' 
            });
        }

        // 2. VALIDACIÓN DE STOCK
        const [stock] = await conexion.query(
            'SELECT articulo, color, cantidad_disponible FROM inventario'
        );

        const balonesStock = stock.find(i => i.articulo === 'Balón')?.cantidad_disponible || 0;
        if (balones > balonesStock) {
            return res.status(400).json({ 
                mensaje: `Solo quedan ${balonesStock} balones disponibles.` 
            });
        }

        const rojosStock = stock.find(i => i.articulo === 'Peto' && i.color === 'Rojo')?.cantidad_disponible || 0;
        const azulesStock = stock.find(i => i.articulo === 'Peto' && i.color === 'Azul')?.cantidad_disponible || 0;

        if (petosRojos > rojosStock || petosAzules > azulesStock) {
            return res.status(400).json({ 
                mensaje: 'Stock insuficiente de petos.' 
            });
        }

        // 3. INICIO DE TRANSACCIÓN
        await conexion.beginTransaction();

        const queryReserva = `
            INSERT INTO reservas 
            (nombre_cliente, cancha_id, fecha_reserva, hora_inicio, horas_alquiladas, 
             balones_prestados, petos_rojos_prestados, petos_azules_prestados, metodo_pago, estado) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'activa')`;

        const [resultado] = await conexion.query(queryReserva, [
            username, cancha_id, fecha_reserva, hora_inicio, duracion,
            balones, petosRojos, petosAzules, metodo_pago || 'efectivo'
        ]);

        // 4. ACTUALIZACIÓN DE INVENTARIO
        if (balones > 0) {
            await conexion.query(
                "UPDATE inventario SET cantidad_disponible = cantidad_disponible - ? WHERE articulo = 'Balón'",
                [balones]
            );
        }
        if (petosRojos > 0) {
            await conexion.query(
                "UPDATE inventario SET cantidad_disponible = cantidad_disponible - ? WHERE articulo = 'Peto' AND color = 'Rojo'",
                [petosRojos]
            );
        }
        if (petosAzules > 0) {
            await conexion.query(
                "UPDATE inventario SET cantidad_disponible = cantidad_disponible - ? WHERE articulo = 'Peto' AND color = 'Azul'",
                [petosAzules]
            );
        }

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

/**
 * Obtiene las reservas activas, con JOIN a canchas.
 */
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
        console.error("❌ Error en obtenerReservasActivas:", error);
        res.status(500).json({ mensaje: 'Error al obtener las reservas activas.' });
    }
};

/**
 * Obtiene TODAS las reservas (activas, canceladas, finalizadas).
 * Útil para historial de pagos.
 */
const obtenerTodasReservas = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT r.*, c.nombre as nombre_cancha 
            FROM reservas r 
            JOIN canchas c ON r.cancha_id = c.id 
            ORDER BY r.fecha_reserva DESC, r.hora_inicio DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error("❌ Error en obtenerTodasReservas:", error);
        res.status(500).json({ mensaje: 'Error al obtener las reservas.' });
    }
};

/**
 * Cancela una reserva y devuelve los implementos al inventario.
 */
const cancelarReserva = async (req, res) => {
    const conexion = await db.getConnection();
    try {
        await conexion.beginTransaction();
        const { id } = req.params;

        const [reservaInfo] = await conexion.query('SELECT * FROM reservas WHERE id = ?', [id]);
        if (reservaInfo.length === 0) {
            conexion.release();
            return res.status(404).json({ mensaje: 'Reserva no encontrada' });
        }

        const reserva = reservaInfo[0];
        if (reserva.estado !== 'activa') {
            conexion.release();
            return res.status(400).json({ mensaje: 'La reserva ya está cancelada o finalizada' });
        }

        await conexion.query('UPDATE reservas SET estado = ? WHERE id = ?', ['cancelada', id]);

        // Devolución al inventario
        if (reserva.balones_prestados > 0) {
            await conexion.query(
                "UPDATE inventario SET cantidad_disponible = LEAST(cantidad_total, cantidad_disponible + ?) WHERE articulo = 'Balón'",
                [reserva.balones_prestados]
            );
        }
        if (reserva.petos_rojos_prestados > 0) {
            await conexion.query(
                "UPDATE inventario SET cantidad_disponible = LEAST(cantidad_total, cantidad_disponible + ?) WHERE articulo = 'Peto' AND color = 'Rojo'",
                [reserva.petos_rojos_prestados]
            );
        }
        if (reserva.petos_azules_prestados > 0) {
            await conexion.query(
                "UPDATE inventario SET cantidad_disponible = LEAST(cantidad_total, cantidad_disponible + ?) WHERE articulo = 'Peto' AND color = 'Azul'",
                [reserva.petos_azules_prestados]
            );
        }

        await conexion.commit();
        res.json({ mensaje: 'Reserva cancelada y artículos devueltos al inventario.' });

    } catch (error) {
        if (conexion) await conexion.rollback();
        console.error("❌ Error en cancelarReserva:", error);
        res.status(500).json({ mensaje: 'Error al cancelar la reserva.' });
    } finally {
        if (conexion) conexion.release();
    }
};

module.exports = { crearReserva, obtenerReservasActivas, obtenerTodasReservas, cancelarReserva };