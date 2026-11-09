const db = require('../config/db'); // Importamos la conexión a la base de datos

/**
 * Obtiene el inventario con cálculo DINÁMICO de implementos en uso.
 * 
 * En lugar de leer cantidad_disponible de la tabla (valor estático propenso a
 * desincronización), se calcula en tiempo real:
 *   en_uso     = SUM(implementos prestados en reservas activas)
 *   disponible = cantidad_total - en_uso
 * 
 * Esto garantiza que los números siempre coincidan con las reservas reales.
 */
const obtenerInventario = async (req, res) => {
    try {
        const { fecha, hora } = req.query;
        let queryCondition;
        let queryParams = [];

        if (fecha && hora) {
            queryCondition = `
                fecha_reserva = ?
                AND ? >= hora_inicio
                AND ? < ADDTIME(hora_inicio, SEC_TO_TIME(horas_alquiladas * 3600))
            `;
            // Three UNION ALL subqueries, each needing [fecha, hora, hora]
            queryParams = [
                fecha, hora, hora,
                fecha, hora, hora,
                fecha, hora, hora
            ];

            const [rows] = await db.query(`
                SELECT 
                    i.id,
                    i.articulo,
                    i.color,
                    i.cantidad_total,
                    COALESCE(u.en_uso, 0) AS en_uso,
                    GREATEST(0, i.cantidad_total - COALESCE(u.en_uso, 0)) AS cantidad_disponible
                FROM inventario i
                LEFT JOIN (
                    SELECT 'Balón' AS articulo, NULL AS color, SUM(balones_prestados) AS en_uso 
                    FROM reservas 
                    WHERE estado = 'activa' AND ${queryCondition}
                    UNION ALL
                    SELECT 'Peto', 'Rojo', SUM(petos_rojos_prestados) 
                    FROM reservas 
                    WHERE estado = 'activa' AND ${queryCondition}
                    UNION ALL
                    SELECT 'Peto', 'Azul', SUM(petos_azules_prestados) 
                    FROM reservas 
                    WHERE estado = 'activa' AND ${queryCondition}
                ) u ON i.articulo = u.articulo 
                    AND (i.color = u.color OR (i.color IS NULL AND u.color IS NULL))
            `, queryParams);
            
            res.json(rows);
        } else {
            // Para la vista general del dashboard, usamos los valores estáticos de la tabla
            const [rows] = await db.query(`
                SELECT 
                    id,
                    articulo,
                    color,
                    cantidad_total,
                    (cantidad_total - cantidad_disponible) AS en_uso,
                    cantidad_disponible
                FROM inventario
            `);
            
            res.json(rows);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al obtener el inventario' });
    }
};

/**
 * Actualizar un artículo del inventario (Admin).
 * Permite cambiar cantidad_total y cantidad_disponible.
 */
const actualizarInventario = async (req, res) => {
    try {
        const { id } = req.params;
        const { cantidad_total } = req.body;

        const [existente] = await db.query('SELECT * FROM inventario WHERE id = ?', [id]);
        if (existente.length === 0) {
            return res.status(404).json({ mensaje: 'Artículo no encontrado.' });
        }

        if (cantidad_total !== undefined && (isNaN(cantidad_total) || parseInt(cantidad_total) < 0)) {
            return res.status(400).json({ mensaje: 'La cantidad debe ser un número mayor o igual a 0.' });
        }

        const nuevaCantTotal = cantidad_total !== undefined ? parseInt(cantidad_total) : existente[0].cantidad_total;
        // Actualizar también cantidad_disponible proporcionalmente
        const diff = nuevaCantTotal - existente[0].cantidad_total;
        const nuevaCantDisp = Math.max(0, existente[0].cantidad_disponible + diff);

        await db.query(
            'UPDATE inventario SET cantidad_total = ?, cantidad_disponible = ? WHERE id = ?',
            [nuevaCantTotal, nuevaCantDisp, id]
        );

        res.json({ success: true, mensaje: 'Inventario actualizado exitosamente.' });
    } catch (error) {
        console.error("❌ Error en actualizarInventario:", error);
        res.status(500).json({ mensaje: 'Error al actualizar el inventario.' });
    }
};

/**
 * Crear un nuevo artículo en el inventario (Admin).
 */
const crearArticuloInventario = async (req, res) => {
    try {
        const { articulo, color, cantidad_total } = req.body;
        if (!articulo) {
            return res.status(400).json({ mensaje: 'El nombre del artículo es obligatorio.' });
        }
        const cantidad = parseInt(cantidad_total) || 0;
        const [resultado] = await db.query(
            'INSERT INTO inventario (articulo, color, cantidad_total, cantidad_disponible) VALUES (?, ?, ?, ?)',
            [articulo.trim(), color || null, cantidad, cantidad]
        );
        res.status(201).json({
            success: true,
            mensaje: 'Artículo agregado al inventario.',
            articulo: { id: resultado.insertId, articulo, color, cantidad_total: cantidad }
        });
    } catch (error) {
        console.error("❌ Error en crearArticuloInventario:", error);
        res.status(500).json({ mensaje: 'Error al crear el artículo.' });
    }
};

/**
 * Eliminar un artículo del inventario (Admin).
 */
const eliminarArticuloInventario = async (req, res) => {
    try {
        const { id } = req.params;
        const [existente] = await db.query('SELECT id FROM inventario WHERE id = ?', [id]);
        if (existente.length === 0) {
            return res.status(404).json({ mensaje: 'Artículo no encontrado.' });
        }
        await db.query('DELETE FROM inventario WHERE id = ?', [id]);
        res.json({ success: true, mensaje: 'Artículo eliminado del inventario.' });
    } catch (error) {
        console.error("❌ Error en eliminarArticuloInventario:", error);
        res.status(500).json({ mensaje: 'Error al eliminar el artículo.' });
    }
};

module.exports = {
    obtenerInventario,
    actualizarInventario,
    crearArticuloInventario,
    eliminarArticuloInventario
};