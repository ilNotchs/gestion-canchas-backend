const db = require('../config/db');

/**
 * Crea una nueva reserva con validación de traslape y stock.
 * 
 * Los implementos se asignan AUTOMÁTICAMENTE según el tipo de cancha:
 *   - 11v11: 11 petos rojos, 11 petos azules, 1 balón
 *   - 7v7:   7 petos rojos, 7 petos azules, 1 balón
 * 
 * La validación de stock se calcula DINÁMICAMENTE:
 *   disponible = cantidad_total - SUM(implementos en reservas activas)
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
            metodo_pago
        } = req.body;

        const duracion = parseInt(horas_alquiladas) || 1;

        // Validaciones básicas
        if (!cancha_id || !fecha_reserva || !hora_inicio) {
            return res.status(400).json({ 
                mensaje: 'Cancha, fecha y hora son obligatorios.' 
            });
        }

        // 1. OBTENER TIPO DE CANCHA para calcular implementos automáticamente
        const [canchaInfo] = await conexion.query(
            'SELECT id, tipo FROM canchas WHERE id = ?', [cancha_id]
        );
        if (canchaInfo.length === 0) {
            return res.status(400).json({ mensaje: 'Cancha no encontrada.' });
        }

        const tipoCancha = canchaInfo[0].tipo;
        const es11v11 = tipoCancha === '11v11';

        // Asignar implementos según regla de negocio
        const balones = 1;
        const petosRojos = es11v11 ? 11 : 7;
        const petosAzules = es11v11 ? 11 : 7;

        // 2. VALIDACIÓN DE TRASLAPE
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

        // 3. VALIDACIÓN DE STOCK DINÁMICA
        // Calculamos disponible = total - SUM(en uso por reservas activas que se traslapan en esta franja)
        const queryStockDinamico = `
            SELECT 
                i.articulo,
                i.color,
                i.cantidad_total,
                COALESCE(u.en_uso, 0) AS en_uso,
                GREATEST(0, i.cantidad_total - COALESCE(u.en_uso, 0)) AS disponible
            FROM inventario i
            LEFT JOIN (
                SELECT 'Balón' AS articulo, NULL AS color, SUM(balones_prestados) AS en_uso 
                FROM reservas 
                WHERE estado = 'activa' 
                  AND fecha_reserva = ?
                  AND (
                      hora_inicio < ADDTIME(?, SEC_TO_TIME(? * 3600)) 
                      AND ADDTIME(hora_inicio, SEC_TO_TIME(horas_alquiladas * 3600)) > ?
                  )
                UNION ALL
                SELECT 'Peto', 'Rojo', SUM(petos_rojos_prestados) 
                FROM reservas 
                WHERE estado = 'activa' 
                  AND fecha_reserva = ?
                  AND (
                      hora_inicio < ADDTIME(?, SEC_TO_TIME(? * 3600)) 
                      AND ADDTIME(hora_inicio, SEC_TO_TIME(horas_alquiladas * 3600)) > ?
                  )
                UNION ALL
                SELECT 'Peto', 'Azul', SUM(petos_azules_prestados) 
                FROM reservas 
                WHERE estado = 'activa' 
                  AND fecha_reserva = ?
                  AND (
                      hora_inicio < ADDTIME(?, SEC_TO_TIME(? * 3600)) 
                      AND ADDTIME(hora_inicio, SEC_TO_TIME(horas_alquiladas * 3600)) > ?
                  )
            ) u ON i.articulo = u.articulo 
                AND (i.color = u.color OR (i.color IS NULL AND u.color IS NULL))
        `;

        const [stockDinamico] = await conexion.query(queryStockDinamico, [
            fecha_reserva, hora_inicio, duracion, hora_inicio,
            fecha_reserva, hora_inicio, duracion, hora_inicio,
            fecha_reserva, hora_inicio, duracion, hora_inicio
        ]);

        const balonesDisp = stockDinamico.find(i => i.articulo === 'Balón')?.disponible || 0;
        if (balones > balonesDisp) {
            return res.status(400).json({ 
                mensaje: `Solo quedan ${balonesDisp} balones disponibles para este horario.` 
            });
        }

        const rojosDisp = stockDinamico.find(i => i.articulo === 'Peto' && i.color === 'Rojo')?.disponible || 0;
        const azulesDisp = stockDinamico.find(i => i.articulo === 'Peto' && i.color === 'Azul')?.disponible || 0;

        if (petosRojos > rojosDisp || petosAzules > azulesDisp) {
            return res.status(400).json({ 
                mensaje: `Stock insuficiente de petos para este horario. Disponibles: ${rojosDisp} rojos, ${azulesDisp} azules.` 
            });
        }

        // 4. INICIO DE TRANSACCIÓN
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

        // NO se actualiza inventario manualmente.
        // cantidad_disponible se calcula dinámicamente a partir de reservas activas.

        await conexion.commit();
        res.status(201).json({ 
            mensaje: `Reserva creada exitosamente. Implementos asignados: ${balones} balón, ${petosRojos} petos rojos, ${petosAzules} petos azules.`,
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
            SELECT r.*, c.nombre as nombre_cancha, c.tipo as tipo_cancha
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
            SELECT r.*, c.nombre as nombre_cancha, c.tipo as tipo_cancha
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
 * Cancela una reserva.
 * Al cambiar el estado a 'cancelada', los implementos se liberan automáticamente
 * porque el cálculo dinámico solo cuenta reservas con estado = 'activa'.
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

        // NO se actualiza inventario manualmente.
        // Al cambiar estado a 'cancelada', el cálculo dinámico automáticamente
        // deja de contar estos implementos como "en uso".

        await conexion.commit();
        res.json({ mensaje: 'Reserva cancelada. Implementos liberados automáticamente.' });

    } catch (error) {
        if (conexion) await conexion.rollback();
        console.error("❌ Error en cancelarReserva:", error);
        res.status(500).json({ mensaje: 'Error al cancelar la reserva.' });
    } finally {
        if (conexion) conexion.release();
    }
};

/**
 * Finaliza una reserva.
 * Al cambiar el estado a 'finalizada', los implementos se liberan automáticamente
 * porque el cálculo dinámico solo cuenta reservas con estado = 'activa'.
 */
const finalizarReserva = async (req, res) => {
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

        await conexion.query('UPDATE reservas SET estado = ? WHERE id = ?', ['finalizada', id]);

        // NO se actualiza inventario manualmente.
        // Al cambiar estado a 'finalizada', el cálculo dinámico automáticamente
        // deja de contar estos implementos como "en uso".

        await conexion.commit();
        res.json({ mensaje: 'Reserva finalizada. Implementos liberados automáticamente.' });

    } catch (error) {
        if (conexion) await conexion.rollback();
        console.error("❌ Error en finalizarReserva:", error);
        res.status(500).json({ mensaje: 'Error al finalizar la reserva.' });
    } finally {
        if (conexion) conexion.release();
    }
};

/**
 * Obtener reporte detallado de alquileres para administradores.
 * Filtros opcionales: fecha_inicio, fecha_fin, estado, cancha_id, cliente
 */
const obtenerReporteAlquileres = async (req, res) => {
    try {
        const { fecha_inicio, fecha_fin, estado, cancha_id, buscar } = req.query;

        let query = `
            SELECT 
                r.id,
                r.nombre_cliente,
                r.fecha_reserva,
                r.hora_inicio,
                r.horas_alquiladas,
                r.balones_prestados,
                r.petos_rojos_prestados,
                r.petos_azules_prestados,
                r.estado,
                r.metodo_pago,
                COALESCE(r.total, 0) as total,
                c.id as cancha_id,
                c.nombre as nombre_cancha,
                c.tipo as tipo_cancha,
                COALESCE(c.precio_hora, CASE WHEN c.tipo = '11v11' THEN 100000 ELSE 60000 END) as precio_hora_cancha
            FROM reservas r
            JOIN canchas c ON r.cancha_id = c.id
            WHERE 1=1
        `;
        const params = [];

        if (fecha_inicio) {
            query += ' AND r.fecha_reserva >= ?';
            params.push(fecha_inicio);
        }
        if (fecha_fin) {
            query += ' AND r.fecha_reserva <= ?';
            params.push(fecha_fin);
        }
        if (estado && estado !== 'todos') {
            query += ' AND r.estado = ?';
            params.push(estado);
        }
        if (cancha_id && cancha_id !== 'todas') {
            query += ' AND r.cancha_id = ?';
            params.push(cancha_id);
        }
        if (buscar) {
            query += ' AND (r.nombre_cliente LIKE ? OR c.nombre LIKE ?)';
            const term = `%${buscar}%`;
            params.push(term, term);
        }

        query += ' ORDER BY r.fecha_reserva DESC, r.hora_inicio DESC';

        const [reservas] = await db.query(query, params);

        // Calcular estadísticas acumuladas del reporte
        let totalHoras = 0;
        let totalIngresos = 0;
        let totalBalones = 0;
        let totalPetos = 0;
        const clientesSet = new Set();
        const canchasUso = {};

        const registros = reservas.map(r => {
            const horas = parseInt(r.horas_alquiladas) || 1;
            const precioHora = parseFloat(r.precio_hora_cancha) || (r.tipo_cancha === '11v11' ? 100000 : 60000);
            const totalCalculado = (r.total && parseFloat(r.total) > 0) ? parseFloat(r.total) : (precioHora * horas);
            
            totalHoras += horas;
            totalIngresos += totalCalculado;
            totalBalones += (parseInt(r.balones_prestados) || 0);
            totalPetos += (parseInt(r.petos_rojos_prestados) || 0) + (parseInt(r.petos_azules_prestados) || 0);
            clientesSet.add(r.nombre_cliente);

            canchasUso[r.nombre_cancha] = (canchasUso[r.nombre_cancha] || 0) + horas;

            return {
                ...r,
                horas_alquiladas: horas,
                total: totalCalculado
            };
        });

        res.json({
            resumen: {
                total_alquileres: registros.length,
                total_horas: totalHoras,
                total_ingresos: totalIngresos,
                clientes_unicos: clientesSet.size,
                total_balones: totalBalones,
                total_petos: totalPetos,
                canchas_uso: canchasUso
            },
            alquileres: registros
        });
    } catch (error) {
        console.error("❌ Error en obtenerReporteAlquileres:", error);
        res.status(500).json({ mensaje: 'Error al generar el reporte de alquileres.' });
    }
};

module.exports = { 
    crearReserva, 
    obtenerReservasActivas, 
    obtenerTodasReservas, 
    cancelarReserva, 
    finalizarReserva,
    obtenerReporteAlquileres
};