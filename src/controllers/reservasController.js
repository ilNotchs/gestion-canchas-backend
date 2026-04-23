const db = require('../config/db');

const crearReserva = async (req, res) => {
    const conexion = await db.getConnection();
    try {
        // Agregamos metodo_pago a los datos que recibimos
        const { nombre_cliente, cancha_id, fecha_reserva, hora_inicio, horas_alquiladas, balones_prestados, petos_rojos_prestados, petos_azules_prestados, metodo_pago } = req.body;

        const [conflicto] = await conexion.query('SELECT id FROM reservas WHERE cancha_id = ? AND fecha_reserva = ? AND hora_inicio = ? AND estado = "activa"', [cancha_id, fecha_reserva, hora_inicio]);
        if (conflicto.length > 0) return res.status(400).json({ mensaje: 'La cancha ya está reservada para esa fecha y hora.' });

        const [stock] = await conexion.query('SELECT articulo, color, cantidad_disponible FROM inventario');
        const balonesStock = stock.find(i => i.articulo === 'Balón').cantidad_disponible;
        if (balones_prestados > balonesStock) return res.status(400).json({ mensaje: `Solo quedan ${balonesStock} balones disponibles.` });

        const rojosStock = stock.find(i => i.articulo === 'Peto' && i.color === 'Rojo').cantidad_disponible;
        const azulesStock = stock.find(i => i.articulo === 'Peto' && i.color === 'Azul').cantidad_disponible;
        if (petos_rojos_prestados > rojosStock || petos_azules_prestados > azulesStock) return res.status(400).json({ mensaje: `Stock insuficiente de petos.` });

        await conexion.beginTransaction();

        // Agregamos metodo_pago al INSERT
        const queryReserva = `INSERT INTO reservas (nombre_cliente, cancha_id, fecha_reserva, hora_inicio, horas_alquiladas, balones_prestados, petos_rojos_prestados, petos_azules_prestados, metodo_pago) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const [resultado] = await conexion.query(queryReserva, [nombre_cliente, cancha_id, fecha_reserva, hora_inicio, horas_alquiladas || 1, balones_prestados || 0, petos_rojos_prestados || 0, petos_azules_prestados || 0, metodo_pago || 'efectivo']);

        await conexion.query("UPDATE inventario SET cantidad_disponible = cantidad_disponible - ? WHERE articulo = 'Balón'", [balones_prestados]);
        await conexion.query("UPDATE inventario SET cantidad_disponible = cantidad_disponible - ? WHERE articulo = 'Peto' AND color = 'Rojo'", [petos_rojos_prestados]);
        await conexion.query("UPDATE inventario SET cantidad_disponible = cantidad_disponible - ? WHERE articulo = 'Peto' AND color = 'Azul'", [petos_azules_prestados]);

        await conexion.commit();
        res.status(201).json({ mensaje: 'Reserva creada exitosamente e inventario actualizado.', reservaId: resultado.insertId });
    } catch (error) {
        if (conexion) await conexion.rollback();
        res.status(500).json({ mensaje: 'Error interno al procesar la reserva.' });
    } finally {
        if (conexion) conexion.release();
    }
};

const obtenerReservasActivas = async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT r.*, c.nombre as nombre_cancha FROM reservas r JOIN canchas c ON r.cancha_id = c.id WHERE r.estado = 'activa'`);
        res.json(rows);
    } catch (error) {
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

        await conexion.query('UPDATE reservas SET estado = "cancelada" WHERE id = ?', [id]);

        // SOLUCIÓN AL BUG: Usamos LEAST para no pasarnos del límite de cantidad_total
        if (reserva.balones_prestados > 0) await conexion.query("UPDATE inventario SET cantidad_disponible = LEAST(cantidad_total, cantidad_disponible + ?) WHERE articulo = 'Balón'", [reserva.balones_prestados]);
        if (reserva.petos_rojos_prestados > 0) await conexion.query("UPDATE inventario SET cantidad_disponible = LEAST(cantidad_total, cantidad_disponible + ?) WHERE articulo = 'Peto' AND color = 'Rojo'", [reserva.petos_rojos_prestados]);
        if (reserva.petos_azules_prestados > 0) await conexion.query("UPDATE inventario SET cantidad_disponible = LEAST(cantidad_total, cantidad_disponible + ?) WHERE articulo = 'Peto' AND color = 'Azul'", [reserva.petos_azules_prestados]);

        await conexion.commit();
        res.json({ mensaje: 'Reserva cancelada. La cancha está libre y los artículos regresaron a la normalidad.' });

    } catch (error) {
        await conexion.rollback();
        res.status(500).json({ mensaje: error.message });
    } finally {
        conexion.release();
    }
};

module.exports = { crearReserva, obtenerReservasActivas, cancelarReserva };