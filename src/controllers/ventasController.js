const db = require('../config/db');

/**
 * Crear un pedido (compra del cliente).
 * Recibe un array de items: [{ producto_id, cantidad }]
 */
const crearPedido = async (req, res) => {
    const conexion = await db.getConnection();
    try {
        const { usuario_id, nombre_cliente, items, metodo_pago } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ mensaje: 'El pedido debe tener al menos un producto.' });
        }

        if (!usuario_id) {
            return res.status(400).json({ mensaje: 'Usuario no identificado.' });
        }

        await conexion.beginTransaction();

        let total = 0;
        const detalles = [];

        // Validar stock y calcular total
        for (const item of items) {
            const [producto] = await conexion.query(
                'SELECT id, nombre, precio, stock, estado FROM productos WHERE id = ?',
                [item.producto_id]
            );

            if (producto.length === 0) {
                await conexion.rollback();
                return res.status(400).json({ 
                    mensaje: `Producto con ID ${item.producto_id} no encontrado.` 
                });
            }

            if (producto[0].estado !== 'activo') {
                await conexion.rollback();
                return res.status(400).json({ 
                    mensaje: `El producto "${producto[0].nombre}" no está disponible.` 
                });
            }

            if (producto[0].stock < item.cantidad) {
                await conexion.rollback();
                return res.status(400).json({ 
                    mensaje: `Stock insuficiente de "${producto[0].nombre}". Disponible: ${producto[0].stock}` 
                });
            }

            const subtotal = parseFloat(producto[0].precio) * parseInt(item.cantidad);
            total += subtotal;
            detalles.push({
                producto_id: producto[0].id,
                cantidad: parseInt(item.cantidad),
                precio_unitario: parseFloat(producto[0].precio)
            });
        }

        // Crear pedido
        const [pedidoResult] = await conexion.query(
            `INSERT INTO pedidos (usuario_id, nombre_cliente, total, estado, metodo_pago)
             VALUES (?, ?, ?, 'completado', ?)`,
            [usuario_id, nombre_cliente || 'Cliente', total, metodo_pago || 'efectivo']
        );

        const pedidoId = pedidoResult.insertId;

        // Insertar detalles y descontar stock
        for (const det of detalles) {
            await conexion.query(
                `INSERT INTO pedido_detalle (pedido_id, producto_id, cantidad, precio_unitario)
                 VALUES (?, ?, ?, ?)`,
                [pedidoId, det.producto_id, det.cantidad, det.precio_unitario]
            );

            await conexion.query(
                'UPDATE productos SET stock = stock - ? WHERE id = ?',
                [det.cantidad, det.producto_id]
            );
        }

        await conexion.commit();
        res.status(201).json({
            success: true,
            mensaje: '¡Compra realizada exitosamente!',
            pedido: { id: pedidoId, total }
        });

    } catch (error) {
        if (conexion) await conexion.rollback();
        console.error("❌ Error en crearPedido:", error);
        res.status(500).json({ mensaje: 'Error al procesar la compra.' });
    } finally {
        if (conexion) conexion.release();
    }
};

/**
 * Obtener pedidos de un usuario específico.
 */
const obtenerPedidosUsuario = async (req, res) => {
    try {
        const { userId } = req.params;

        const [pedidos] = await db.query(
            `SELECT p.*, 
                    GROUP_CONCAT(
                        CONCAT(pd.cantidad, 'x ', pr.nombre) SEPARATOR ', '
                    ) as productos_resumen
             FROM pedidos p
             LEFT JOIN pedido_detalle pd ON p.id = pd.pedido_id
             LEFT JOIN productos pr ON pd.producto_id = pr.id
             WHERE p.usuario_id = ?
             GROUP BY p.id
             ORDER BY p.fecha_creacion DESC`,
            [userId]
        );

        res.json(pedidos);
    } catch (error) {
        console.error("❌ Error en obtenerPedidosUsuario:", error);
        res.status(500).json({ mensaje: 'Error al obtener el historial de compras.' });
    }
};

/**
 * Obtener TODAS las ventas (Admin).
 * Query params: ?fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD
 */
const obtenerTodasVentas = async (req, res) => {
    try {
        const { fecha_inicio, fecha_fin } = req.query;

        let query = `
            SELECT p.*, 
                   GROUP_CONCAT(
                       CONCAT(pd.cantidad, 'x ', pr.nombre) SEPARATOR ', '
                   ) as productos_resumen
            FROM pedidos p
            LEFT JOIN pedido_detalle pd ON p.id = pd.pedido_id
            LEFT JOIN productos pr ON pd.producto_id = pr.id
            WHERE 1=1`;
        const params = [];

        if (fecha_inicio) {
            query += ' AND DATE(p.fecha_creacion) >= ?';
            params.push(fecha_inicio);
        }
        if (fecha_fin) {
            query += ' AND DATE(p.fecha_creacion) <= ?';
            params.push(fecha_fin);
        }

        query += ' GROUP BY p.id ORDER BY p.fecha_creacion DESC';

        const [ventas] = await db.query(query, params);
        res.json(ventas);
    } catch (error) {
        console.error("❌ Error en obtenerTodasVentas:", error);
        res.status(500).json({ mensaje: 'Error al obtener las ventas.' });
    }
};

/**
 * Obtener estadísticas de ventas (Admin).
 */
const obtenerEstadisticas = async (req, res) => {
    try {
        // Total vendido
        const [totalResult] = await db.query(
            "SELECT COALESCE(SUM(total), 0) as total_vendido FROM pedidos WHERE estado = 'completado'"
        );

        // Ventas del día
        const [hoyResult] = await db.query(
            "SELECT COALESCE(SUM(total), 0) as ventas_hoy, COUNT(*) as pedidos_hoy FROM pedidos WHERE estado = 'completado' AND DATE(fecha_creacion) = CURDATE()"
        );

        // Total de pedidos
        const [pedidosResult] = await db.query(
            "SELECT COUNT(*) as total_pedidos FROM pedidos"
        );

        // Productos más vendidos (top 5)
        const [topProductos] = await db.query(
            `SELECT pr.nombre, pr.imagen_url, SUM(pd.cantidad) as total_vendido, 
                    SUM(pd.cantidad * pd.precio_unitario) as ingresos
             FROM pedido_detalle pd
             JOIN productos pr ON pd.producto_id = pr.id
             JOIN pedidos p ON pd.pedido_id = p.id
             WHERE p.estado = 'completado'
             GROUP BY pd.producto_id
             ORDER BY total_vendido DESC
             LIMIT 5`
        );

        // Ventas por estado
        const [estadoResult] = await db.query(
            `SELECT estado, COUNT(*) as cantidad, COALESCE(SUM(total), 0) as monto
             FROM pedidos GROUP BY estado`
        );

        // Ventas últimos 7 días
        const [ventasSemana] = await db.query(
            `SELECT DATE(fecha_creacion) as fecha, 
                    COUNT(*) as pedidos, 
                    COALESCE(SUM(total), 0) as ingresos
             FROM pedidos 
             WHERE estado = 'completado' AND fecha_creacion >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
             GROUP BY DATE(fecha_creacion)
             ORDER BY fecha ASC`
        );

        res.json({
            total_vendido: totalResult[0].total_vendido,
            ventas_hoy: hoyResult[0].ventas_hoy,
            pedidos_hoy: hoyResult[0].pedidos_hoy,
            total_pedidos: pedidosResult[0].total_pedidos,
            top_productos: topProductos,
            ventas_por_estado: estadoResult,
            ventas_semana: ventasSemana
        });
    } catch (error) {
        console.error("❌ Error en obtenerEstadisticas:", error);
        res.status(500).json({ mensaje: 'Error al obtener estadísticas.' });
    }
};

module.exports = {
    crearPedido,
    obtenerPedidosUsuario,
    obtenerTodasVentas,
    obtenerEstadisticas
};
