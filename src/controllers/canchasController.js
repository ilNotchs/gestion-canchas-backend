const db = require('../config/db');

const obtenerCanchas = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM canchas ORDER BY tipo ASC, nombre ASC');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al obtener las canchas' });
    }
};

/**
 * Crear una nueva cancha (Admin).
 */
const crearCancha = async (req, res) => {
    try {
        const { nombre, tipo, precio_hora } = req.body;
        if (!nombre || !tipo) {
            return res.status(400).json({ mensaje: 'Nombre y tipo son obligatorios.' });
        }
        if (!['11v11', '7v7'].includes(tipo)) {
            return res.status(400).json({ mensaje: 'El tipo debe ser 11v11 o 7v7.' });
        }
        const precio = precio_hora || (tipo === '11v11' ? 100000 : 60000);
        const [resultado] = await db.query(
            'INSERT INTO canchas (nombre, tipo, precio_hora) VALUES (?, ?, ?)',
            [nombre.trim(), tipo, precio]
        );
        res.status(201).json({
            success: true,
            mensaje: 'Cancha creada exitosamente.',
            cancha: { id: resultado.insertId, nombre, tipo, precio_hora: precio }
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ mensaje: 'Ya existe una cancha con ese nombre.' });
        }
        console.error("❌ Error en crearCancha:", error);
        res.status(500).json({ mensaje: 'Error al crear la cancha.' });
    }
};

/**
 * Actualizar una cancha existente (Admin).
 */
const actualizarCancha = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, tipo, precio_hora } = req.body;

        const [existente] = await db.query('SELECT * FROM canchas WHERE id = ?', [id]);
        if (existente.length === 0) {
            return res.status(404).json({ mensaje: 'Cancha no encontrada.' });
        }

        await db.query(
            'UPDATE canchas SET nombre = ?, tipo = ?, precio_hora = ? WHERE id = ?',
            [
                nombre || existente[0].nombre,
                tipo || existente[0].tipo,
                precio_hora !== undefined ? precio_hora : existente[0].precio_hora,
                id
            ]
        );
        res.json({ success: true, mensaje: 'Cancha actualizada exitosamente.' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ mensaje: 'Ya existe una cancha con ese nombre.' });
        }
        console.error("❌ Error en actualizarCancha:", error);
        res.status(500).json({ mensaje: 'Error al actualizar la cancha.' });
    }
};

/**
 * Eliminar una cancha (Admin).
 * Solo si no tiene reservas activas.
 */
const eliminarCancha = async (req, res) => {
    try {
        const { id } = req.params;
        const [existente] = await db.query('SELECT id FROM canchas WHERE id = ?', [id]);
        if (existente.length === 0) {
            return res.status(404).json({ mensaje: 'Cancha no encontrada.' });
        }

        // Verificar que no tenga reservas activas
        const [reservasActivas] = await db.query(
            "SELECT COUNT(*) as total FROM reservas WHERE cancha_id = ? AND estado = 'activa'",
            [id]
        );
        if (reservasActivas[0].total > 0) {
            return res.status(400).json({ mensaje: 'No se puede eliminar: la cancha tiene reservas activas.' });
        }

        await db.query('DELETE FROM canchas WHERE id = ?', [id]);
        res.json({ success: true, mensaje: 'Cancha eliminada exitosamente.' });
    } catch (error) {
        console.error("❌ Error en eliminarCancha:", error);
        res.status(500).json({ mensaje: 'Error al eliminar la cancha.' });
    }
};

module.exports = {
    obtenerCanchas,
    crearCancha,
    actualizarCancha,
    eliminarCancha
};