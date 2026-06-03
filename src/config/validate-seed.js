/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SCRIPT DE VALIDACIÓN DE DATOS DE PRUEBA
 * Verifica la integridad de todos los registros creados por el seeder.
 * Ejecutar: node src/config/validate-seed.js
 * ═══════════════════════════════════════════════════════════════════════════
 */
const mysql = require('mysql2');
require('dotenv').config();

const poolConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
};

if (process.env.DB_SSL === 'true') {
    poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = mysql.createPool(poolConfig);
const db = pool.promise();

const SEPARATOR = '═'.repeat(60);
const LINE = '─'.repeat(60);

async function validate() {
    console.log('');
    console.log(SEPARATOR);
    console.log('  🔍 VALIDACIÓN COMPLETA DE DATOS DE PRUEBA');
    console.log(SEPARATOR);
    console.log('');

    const results = {};
    let errores = [];

    try {
        // ═══════════════════════════════════════════════════════════════
        // SECCIÓN 1: CONTEO DE REGISTROS POR TABLA
        // ═══════════════════════════════════════════════════════════════
        console.log('📊 SECCIÓN 1: CONTEO DE REGISTROS POR TABLA');
        console.log(LINE);

        const tablas = ['usuarios', 'canchas', 'reservas', 'productos', 'pedidos', 'pedido_detalle', 'inventario'];
        
        for (const tabla of tablas) {
            try {
                const [rows] = await db.query(`SELECT COUNT(*) as total FROM ${tabla}`);
                results[tabla] = rows[0].total;
                const icon = rows[0].total > 0 ? '✅' : '⚠️';
                console.log(`  ${icon} ${tabla}: ${rows[0].total} registros`);
            } catch (e) {
                results[tabla] = 0;
                errores.push(`Tabla ${tabla} no existe: ${e.message}`);
                console.log(`  ❌ ${tabla}: ERROR - ${e.message}`);
            }
        }

        console.log('');

        // ═══════════════════════════════════════════════════════════════
        // SECCIÓN 2: VALIDACIÓN DE CANCHAS
        // ═══════════════════════════════════════════════════════════════
        console.log('⚽ SECCIÓN 2: VALIDACIÓN DE CANCHAS');
        console.log(LINE);

        const [canchasDetalle] = await db.query(`
            SELECT tipo, COUNT(*) as total, 
                   MIN(precio_hora) as precio_min, 
                   MAX(precio_hora) as precio_max
            FROM canchas GROUP BY tipo
        `);
        for (const c of canchasDetalle) {
            console.log(`  ⚽ Tipo ${c.tipo}: ${c.total} canchas (precio: $${c.precio_min} - $${c.precio_max})`);
        }

        const [canchasNombres] = await db.query('SELECT id, nombre, tipo FROM canchas ORDER BY id LIMIT 10');
        console.log(`  📋 Primeras 10 canchas:`);
        for (const c of canchasNombres) {
            console.log(`     [${c.id}] ${c.nombre} (${c.tipo})`);
        }

        if (results.canchas < 45) {
            errores.push(`Se esperaban ≥45 canchas, se encontraron ${results.canchas}`);
        }
        console.log('');

        // ═══════════════════════════════════════════════════════════════
        // SECCIÓN 3: VALIDACIÓN DE RESERVAS
        // ═══════════════════════════════════════════════════════════════
        console.log('📅 SECCIÓN 3: VALIDACIÓN DE RESERVAS');
        console.log(LINE);

        const [reservasPorFecha] = await db.query(`
            SELECT fecha_reserva, COUNT(*) as total 
            FROM reservas 
            GROUP BY fecha_reserva 
            ORDER BY fecha_reserva
        `);
        console.log('  📅 Reservas por fecha:');
        for (const r of reservasPorFecha) {
            console.log(`     ${r.fecha_reserva}: ${r.total} reservas`);
        }

        const [reservasPorEstado] = await db.query(`
            SELECT estado, COUNT(*) as total 
            FROM reservas 
            GROUP BY estado
        `);
        console.log('  📊 Reservas por estado:');
        for (const r of reservasPorEstado) {
            console.log(`     ${r.estado}: ${r.total}`);
        }

        const [reservasPorMetodo] = await db.query(`
            SELECT metodo_pago, COUNT(*) as total 
            FROM reservas 
            GROUP BY metodo_pago
        `);
        console.log('  💳 Reservas por método de pago:');
        for (const r of reservasPorMetodo) {
            console.log(`     ${r.metodo_pago}: ${r.total}`);
        }

        const [reservasSample] = await db.query(`
            SELECT r.id, r.nombre_cliente, c.nombre as cancha, r.fecha_reserva, 
                   r.hora_inicio, r.estado, r.metodo_pago, r.total
            FROM reservas r JOIN canchas c ON r.cancha_id = c.id 
            ORDER BY r.id LIMIT 5
        `);
        console.log('  📋 Muestra de 5 reservas:');
        for (const r of reservasSample) {
            console.log(`     [${r.id}] ${r.nombre_cliente} | ${r.cancha} | ${r.fecha_reserva} ${r.hora_inicio} | ${r.estado} | $${r.total}`);
        }

        if (results.reservas < 1080) {
            errores.push(`Se esperaban ≥1,080 reservas, se encontraron ${results.reservas}`);
        }
        console.log('');

        // ═══════════════════════════════════════════════════════════════
        // SECCIÓN 4: VALIDACIÓN DE PRODUCTOS
        // ═══════════════════════════════════════════════════════════════
        console.log('🛍️ SECCIÓN 4: VALIDACIÓN DE PRODUCTOS');
        console.log(LINE);

        const [productosPorCat] = await db.query(`
            SELECT categoria, COUNT(*) as total, 
                   MIN(precio) as precio_min, MAX(precio) as precio_max
            FROM productos 
            GROUP BY categoria 
            ORDER BY categoria
        `);
        console.log('  📦 Productos por categoría:');
        for (const p of productosPorCat) {
            console.log(`     ${p.categoria}: ${p.total} productos ($${p.precio_min} - $${p.precio_max})`);
        }
        console.log(`  📊 Total categorías: ${productosPorCat.length}`);

        // Verificar SKU
        const [skuCheck] = await db.query('SELECT COUNT(*) as total FROM productos WHERE sku IS NOT NULL AND sku != ""');
        console.log(`  🏷️ Productos con SKU: ${skuCheck[0].total}`);

        const [skuDuplicados] = await db.query(`
            SELECT sku, COUNT(*) as total FROM productos 
            WHERE sku IS NOT NULL AND sku != '' 
            GROUP BY sku HAVING total > 1
        `);
        if (skuDuplicados.length > 0) {
            errores.push(`Se encontraron ${skuDuplicados.length} SKUs duplicados`);
            console.log(`  ⚠️ SKUs duplicados: ${skuDuplicados.length}`);
        } else {
            console.log('  ✅ No hay SKUs duplicados');
        }

        const [productosSample] = await db.query('SELECT id, nombre, categoria, precio, stock, sku, estado FROM productos LIMIT 5');
        console.log('  📋 Muestra de 5 productos:');
        for (const p of productosSample) {
            console.log(`     [${p.id}] ${p.nombre} | ${p.categoria} | $${p.precio} | Stock: ${p.stock} | SKU: ${p.sku} | ${p.estado}`);
        }

        if (results.productos < 90) {
            errores.push(`Se esperaban ≥90 productos, se encontraron ${results.productos}`);
        }
        console.log('');

        // ═══════════════════════════════════════════════════════════════
        // SECCIÓN 5: VALIDACIÓN DE COMPRAS/PEDIDOS
        // ═══════════════════════════════════════════════════════════════
        console.log('💳 SECCIÓN 5: VALIDACIÓN DE COMPRAS/PEDIDOS');
        console.log(LINE);

        const [pedidosPorEstado] = await db.query(`
            SELECT estado, COUNT(*) as total, COALESCE(SUM(total), 0) as monto_total
            FROM pedidos GROUP BY estado
        `);
        console.log('  📊 Pedidos por estado:');
        for (const p of pedidosPorEstado) {
            console.log(`     ${p.estado}: ${p.total} pedidos (monto: $${parseFloat(p.monto_total).toLocaleString()})`);
        }

        const [pedidosPorMetodo] = await db.query(`
            SELECT metodo_pago, COUNT(*) as total 
            FROM pedidos GROUP BY metodo_pago
        `);
        console.log('  💰 Pedidos por método de pago:');
        for (const p of pedidosPorMetodo) {
            console.log(`     ${p.metodo_pago}: ${p.total}`);
        }

        const [detallePedidoStats] = await db.query(`
            SELECT COUNT(DISTINCT pedido_id) as pedidos_con_detalle,
                   COUNT(*) as total_lineas,
                   SUM(cantidad) as unidades_vendidas
            FROM pedido_detalle
        `);
        console.log(`  📦 Líneas de detalle: ${detallePedidoStats[0].total_lineas}`);
        console.log(`  📦 Pedidos con detalle: ${detallePedidoStats[0].pedidos_con_detalle}`);
        console.log(`  📦 Unidades vendidas total: ${detallePedidoStats[0].unidades_vendidas}`);

        const [pedidosSample] = await db.query(`
            SELECT p.id, p.nombre_cliente, p.total, p.estado, p.metodo_pago, p.fecha_creacion,
                   GROUP_CONCAT(CONCAT(pd.cantidad, 'x ', pr.nombre) SEPARATOR ', ') as items
            FROM pedidos p
            LEFT JOIN pedido_detalle pd ON p.id = pd.pedido_id
            LEFT JOIN productos pr ON pd.producto_id = pr.id
            GROUP BY p.id
            ORDER BY p.id LIMIT 5
        `);
        console.log('  📋 Muestra de 5 compras:');
        for (const p of pedidosSample) {
            console.log(`     [${p.id}] ${p.nombre_cliente} | $${p.total} | ${p.estado} | ${p.metodo_pago}`);
            console.log(`          Items: ${p.items}`);
        }

        if (results.pedidos < 100) {
            errores.push(`Se esperaban ≥150 pedidos, se encontraron ${results.pedidos}`);
        }
        console.log('');

        // ═══════════════════════════════════════════════════════════════
        // SECCIÓN 6: INTEGRIDAD REFERENCIAL
        // ═══════════════════════════════════════════════════════════════
        console.log('🔗 SECCIÓN 6: INTEGRIDAD REFERENCIAL');
        console.log(LINE);

        // Reservas con cancha inexistente
        const [reservasHuerfanas] = await db.query(`
            SELECT COUNT(*) as total FROM reservas r 
            LEFT JOIN canchas c ON r.cancha_id = c.id 
            WHERE c.id IS NULL
        `);
        const reservasOrph = reservasHuerfanas[0].total;
        if (reservasOrph > 0) {
            errores.push(`${reservasOrph} reservas con cancha_id inexistente`);
            console.log(`  ❌ Reservas huérfanas (cancha inexistente): ${reservasOrph}`);
        } else {
            console.log('  ✅ Todas las reservas tienen cancha válida');
        }

        // Pedidos con usuario inexistente
        const [pedidosHuerfanos] = await db.query(`
            SELECT COUNT(*) as total FROM pedidos p 
            LEFT JOIN usuarios u ON p.usuario_id = u.id 
            WHERE u.id IS NULL
        `);
        const pedidosOrph = pedidosHuerfanos[0].total;
        if (pedidosOrph > 0) {
            errores.push(`${pedidosOrph} pedidos con usuario_id inexistente`);
            console.log(`  ❌ Pedidos huérfanos (usuario inexistente): ${pedidosOrph}`);
        } else {
            console.log('  ✅ Todos los pedidos tienen usuario válido');
        }

        // Detalles con pedido inexistente
        const [detallesHuerfanos] = await db.query(`
            SELECT COUNT(*) as total FROM pedido_detalle pd 
            LEFT JOIN pedidos p ON pd.pedido_id = p.id 
            WHERE p.id IS NULL
        `);
        const detallesOrph = detallesHuerfanos[0].total;
        if (detallesOrph > 0) {
            errores.push(`${detallesOrph} detalles con pedido_id inexistente`);
            console.log(`  ❌ Detalles huérfanos (pedido inexistente): ${detallesOrph}`);
        } else {
            console.log('  ✅ Todos los detalles tienen pedido válido');
        }

        // Detalles con producto inexistente
        const [detallesProdHuerfanos] = await db.query(`
            SELECT COUNT(*) as total FROM pedido_detalle pd 
            LEFT JOIN productos pr ON pd.producto_id = pr.id 
            WHERE pr.id IS NULL
        `);
        const detProdOrph = detallesProdHuerfanos[0].total;
        if (detProdOrph > 0) {
            errores.push(`${detProdOrph} detalles con producto_id inexistente`);
            console.log(`  ❌ Detalles huérfanos (producto inexistente): ${detProdOrph}`);
        } else {
            console.log('  ✅ Todos los detalles tienen producto válido');
        }

        // Pedidos sin detalles
        const [pedidosSinDetalle] = await db.query(`
            SELECT COUNT(*) as total FROM pedidos p 
            LEFT JOIN pedido_detalle pd ON p.id = pd.pedido_id 
            WHERE pd.id IS NULL
        `);
        const pedSinDet = pedidosSinDetalle[0].total;
        if (pedSinDet > 0) {
            errores.push(`${pedSinDet} pedidos sin detalles asociados`);
            console.log(`  ❌ Pedidos sin detalles: ${pedSinDet}`);
        } else {
            console.log('  ✅ Todos los pedidos tienen detalles asociados');
        }

        // Reservas asociadas correctamente a canchas
        const [reservasCanchaCheck] = await db.query(`
            SELECT COUNT(DISTINCT r.cancha_id) as canchas_con_reservas
            FROM reservas r
            JOIN canchas c ON r.cancha_id = c.id
        `);
        console.log(`  ✅ Canchas con reservas asociadas: ${reservasCanchaCheck[0].canchas_con_reservas}`);

        console.log('');

        // ═══════════════════════════════════════════════════════════════
        // SECCIÓN 7: RESUMEN FINAL
        // ═══════════════════════════════════════════════════════════════
        console.log(SEPARATOR);
        console.log('  📋 RESUMEN FINAL');
        console.log(SEPARATOR);
        console.log('');
        console.log(`  Usuarios:        ${results.usuarios}`);
        console.log(`  Canchas:          ${results.canchas}`);
        console.log(`  Reservas:         ${results.reservas}`);
        console.log(`  Productos:        ${results.productos}`);
        console.log(`  Pedidos:          ${results.pedidos}`);
        console.log(`  Detalle pedidos:  ${results.pedido_detalle}`);
        console.log(`  Inventario:       ${results.inventario}`);
        console.log('');

        if (errores.length > 0) {
            console.log('  ⚠️ ERRORES ENCONTRADOS:');
            for (const e of errores) {
                console.log(`     ❌ ${e}`);
            }
        } else {
            console.log('  ✅ NO SE ENCONTRARON ERRORES DE INTEGRIDAD');
        }

        console.log('');
        console.log(SEPARATOR);
        console.log(`  Validación completada: ${new Date().toLocaleString()}`);
        console.log(SEPARATOR);
        console.log('');

    } catch (e) {
        console.error('❌ Error durante la validación:', e.message);
        console.error(e.stack);
    } finally {
        pool.end();
        process.exit(0);
    }
}

validate();
