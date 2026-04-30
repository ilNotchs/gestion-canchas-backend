const db = require('../config/db');

const crearReserva = async (req, res) => {
    const conexion = await db.getConnection();
    try {
        const { 
            nombre_cliente, 
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

        // 1. VALIDACIÓN DE TRASLAPE (Lógica mejorada)
        // Buscamos si existe alguna reserva activa que:
        // - Empiece antes de que la nueva reserva termine
        // - Y termine después de que la nueva reserva empiece
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
                mensaje: 'La cancha ya está ocupada en el rango de horario solicitado.' 
            });
        }

        // 2. VALIDACIÓN DE STOCK EN INVENTARIO
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

        const queryReserva = `
            INSERT INTO reservas 
            (nombre_cliente, cancha_id, fecha_reserva, hora_inicio, horas_alquiladas, balones_prestados, petos_rojos_prestados, petos_azules_prestados, metodo_pago, estado) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'activa')`;
        
        const [resultado] = await conexion.query(queryReserva, [
            nombre_cliente, 
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
        if (balones_prestados > 0) {
            await conexion.query("UPDATE inventario SET cantidad_disponible = cantidad_disponible - ? WHERE articulo = 'Balón'", [balones_prestados]);
        }
        if (petos_rojos_prestados > 0) {
            await conexion.query("UPDATE inventario SET cantidad_disponible = cantidad_disponible - ? WHERE articulo = 'Peto' AND color = 'Rojo'", [petos_rojos_prestados]);
        }
        if (petos_azules_prestados > 0) {
            await conexion.query("UPDATE inventario SET cantidad_disponible = cantidad_disponible - ? WHERE articulo = 'Peto' AND color = 'Azul'", [petos_azules_prestados]);
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

        // Cambiar estado a cancelada
        await conexion.query('UPDATE reservas SET estado = ? WHERE id = ?', ['cancelada', id]);

        // Devolver artículos al inventario (usando LEAST para no exceder la cantidad_total)
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
        res.json({ mensaje: 'Reserva cancelada. La cancha está libre y los artículos regresaron al stock.' });

    } catch (error) {
        if (conexion) await conexion.rollback();
        console.error("❌ Error en cancelarReserva:", error);
        res.status(500).json({ mensaje: error.message });
    } finally {
        if (conexion) conexion.release();
    }
};

module.exports = { crearReserva, obtenerReservasActivas, cancelarReserva };