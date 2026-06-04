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

module.exports = {
    obtenerInventario
};