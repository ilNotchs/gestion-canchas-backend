const mysql = require('mysql2');
require('dotenv').config();
const seeder = require('./seeder');

// Creamos el pool de conexiones usando las variables del archivo .env
const poolConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// SSL solo cuando se conecta a servicios externos (Aiven, PlanetScale, etc.)
if (process.env.DB_SSL === 'true') {
    poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = mysql.createPool(poolConfig);

// Convertimos el pool para que soporte Promesas (async/await)
const promisePool = pool.promise();

/**
 * Inicializa la base de datos creando las tablas necesarias si no existen.
 * Se ejecuta una sola vez al arrancar el servidor.
 */
const initializeDatabase = async () => {
    try {
        // Asegurar tabla usuarios
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                rol ENUM('admin', 'cliente') DEFAULT 'cliente',
                email VARCHAR(100),
                telefono VARCHAR(20)
            )
        `);

        // Asegurar tabla canchas
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS canchas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nombre VARCHAR(50) NOT NULL UNIQUE,
                tipo ENUM('11v11', '7v7') NOT NULL,
                precio_hora DECIMAL(10,2) NOT NULL DEFAULT 60000.00
            )
        `);

        // Asegurar columnas de canchas si ya existían
        const [canchasCols] = await promisePool.query(`SHOW COLUMNS FROM canchas`);
        const canchaColsNames = canchasCols.map(c => c.Field);
        if (!canchaColsNames.includes('precio_hora') && !canchaColsNames.includes('precio') && !canchaColsNames.includes('valor')) {
            await promisePool.query('ALTER TABLE canchas ADD COLUMN precio_hora DECIMAL(10,2) NOT NULL DEFAULT 60000.00');
            console.log('  ✅ Columna precio_hora agregada a canchas');
        }

        // Asegurar columnas email/telefono en tabla usuarios si ya existía antes del update
        const [cols] = await promisePool.query(`SHOW COLUMNS FROM usuarios`);
        const columnNames = cols.map(c => c.Field);

        if (!columnNames.includes('email')) {
            await promisePool.query('ALTER TABLE usuarios ADD COLUMN email VARCHAR(100)');
            console.log('  ✅ Columna email agregada a usuarios');
        }
        if (!columnNames.includes('telefono')) {
            await promisePool.query('ALTER TABLE usuarios ADD COLUMN telefono VARCHAR(20)');
            console.log('  ✅ Columna telefono agregada a usuarios');
        }

        // Asegurar que la columna password tenga suficiente longitud para bcrypt (255)
        const passwordCol = cols.find(c => c.Field === 'password');
        if (passwordCol) {
            const type = passwordCol.Type.toLowerCase();
            // Si la longitud no es suficiente (por ejemplo, menor de 60 caracteres para un hash bcrypt)
            if (!type.includes('255') && !type.includes('256') && !type.includes('500') && !type.includes('text')) {
                await promisePool.query('ALTER TABLE usuarios MODIFY COLUMN password VARCHAR(255) NOT NULL');
                console.log('  ✅ Columna password modificada a VARCHAR(255) para soportar hashes bcrypt');
            }
        }

        // Tabla de productos de la tienda
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS productos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nombre VARCHAR(200) NOT NULL,
                precio DECIMAL(12,2) NOT NULL,
                stock INT NOT NULL DEFAULT 0,
                descripcion TEXT,
                categoria VARCHAR(100) DEFAULT 'General',
                imagen_url VARCHAR(500) DEFAULT '',
                estado ENUM('activo', 'inactivo') DEFAULT 'activo',
                fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabla de pedidos/ventas
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS pedidos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                usuario_id INT NOT NULL,
                nombre_cliente VARCHAR(100),
                total DECIMAL(12,2) NOT NULL DEFAULT 0,
                estado ENUM('pendiente', 'completado', 'cancelado') DEFAULT 'pendiente',
                metodo_pago VARCHAR(50) DEFAULT 'efectivo',
                fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Detalle de cada producto en un pedido
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS pedido_detalle (
                id INT AUTO_INCREMENT PRIMARY KEY,
                pedido_id INT NOT NULL,
                producto_id INT NOT NULL,
                cantidad INT NOT NULL,
                precio_unitario DECIMAL(12,2) NOT NULL
            )
        `);

        // Tabla de reservas de canchas
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS reservas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nombre_cliente VARCHAR(100) NOT NULL,
                cancha_id INT NOT NULL,
                fecha_reserva DATE NOT NULL,
                hora_inicio TIME NOT NULL,
                horas_alquiladas INT NOT NULL DEFAULT 1,
                balones_prestados INT DEFAULT 0,
                petos_rojos_prestados INT DEFAULT 0,
                petos_azules_prestados INT DEFAULT 0,
                estado ENUM('activa', 'finalizada', 'cancelada') DEFAULT 'activa',
                metodo_pago VARCHAR(50) DEFAULT 'efectivo',
                total DECIMAL(12,2) DEFAULT 0,
                fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabla de inventario de implementos deportivos
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS inventario (
                id INT AUTO_INCREMENT PRIMARY KEY,
                articulo VARCHAR(100) NOT NULL,
                color VARCHAR(50) DEFAULT NULL,
                cantidad_total INT NOT NULL DEFAULT 0,
                cantidad_disponible INT NOT NULL DEFAULT 0
            )
        `);

        // Asegurar columnas de reservas si la tabla ya existía con esquema anterior
        const [reservasCols] = await promisePool.query(`SHOW COLUMNS FROM reservas`);
        const reservasColNames = reservasCols.map(c => c.Field);
        if (!reservasColNames.includes('total')) {
            await promisePool.query('ALTER TABLE reservas ADD COLUMN total DECIMAL(12,2) DEFAULT 0');
            console.log('  ✅ Columna total agregada a reservas');
        }
        if (!reservasColNames.includes('metodo_pago')) {
            await promisePool.query('ALTER TABLE reservas ADD COLUMN metodo_pago VARCHAR(50) DEFAULT "efectivo"');
            console.log('  ✅ Columna metodo_pago agregada a reservas');
        }
        if (!reservasColNames.includes('horas_alquiladas')) {
            await promisePool.query('ALTER TABLE reservas ADD COLUMN horas_alquiladas INT NOT NULL DEFAULT 1');
            console.log('  ✅ Columna horas_alquiladas agregada a reservas');
        }
        if (!reservasColNames.includes('balones_prestados')) {
            await promisePool.query('ALTER TABLE reservas ADD COLUMN balones_prestados INT DEFAULT 0');
            console.log('  ✅ Columna balones_prestados agregada a reservas');
        }
        if (!reservasColNames.includes('petos_rojos_prestados')) {
            await promisePool.query('ALTER TABLE reservas ADD COLUMN petos_rojos_prestados INT DEFAULT 0');
            console.log('  ✅ Columna petos_rojos_prestados agregada a reservas');
        }
        if (!reservasColNames.includes('petos_azules_prestados')) {
            await promisePool.query('ALTER TABLE reservas ADD COLUMN petos_azules_prestados INT DEFAULT 0');
            console.log('  ✅ Columna petos_azules_prestados agregada a reservas');
        }
        if (!reservasColNames.includes('estado')) {
            await promisePool.query("ALTER TABLE reservas ADD COLUMN estado ENUM('activa', 'finalizada', 'cancelada') DEFAULT 'activa'");
            console.log('  ✅ Columna estado agregada a reservas');
        }
        if (!reservasColNames.includes('fecha_creacion')) {
            await promisePool.query('ALTER TABLE reservas ADD COLUMN fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
            console.log('  ✅ Columna fecha_creacion agregada a reservas');
        }

        // Asegurar columnas de pedidos si la tabla ya existía con esquema anterior
        const [pedidosCols] = await promisePool.query(`SHOW COLUMNS FROM pedidos`);
        const pedidosColNames = pedidosCols.map(c => c.Field);
        if (!pedidosColNames.includes('nombre_cliente')) {
            await promisePool.query('ALTER TABLE pedidos ADD COLUMN nombre_cliente VARCHAR(100)');
            console.log('  ✅ Columna nombre_cliente agregada a pedidos');
        }
        if (!pedidosColNames.includes('metodo_pago')) {
            await promisePool.query('ALTER TABLE pedidos ADD COLUMN metodo_pago VARCHAR(50) DEFAULT "efectivo"');
            console.log('  ✅ Columna metodo_pago agregada a pedidos');
        }
        if (!pedidosColNames.includes('fecha_creacion')) {
            await promisePool.query('ALTER TABLE pedidos ADD COLUMN fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
            console.log('  ✅ Columna fecha_creacion agregada a pedidos');
        }

        // Asegurar tipos de columnas correctos (por ejemplo, VARCHAR(50) para metodo_pago en lugar de ENUM limitado)
        try {
            await promisePool.query('ALTER TABLE reservas MODIFY COLUMN metodo_pago VARCHAR(50) DEFAULT "efectivo"');
            console.log('  ✅ Tipo de columna metodo_pago verificado en reservas');
        } catch (err) {
            console.error('  ⚠️ No se pudo modificar metodo_pago en reservas:', err.message);
        }
        try {
            await promisePool.query('ALTER TABLE pedidos MODIFY COLUMN metodo_pago VARCHAR(50) DEFAULT "efectivo"');
            console.log('  ✅ Tipo de columna metodo_pago verificado en pedidos');
        } catch (err) {
            console.error('  ⚠️ No se pudo modificar metodo_pago en pedidos:', err.message);
        }
        try {
            await promisePool.query("ALTER TABLE reservas MODIFY COLUMN estado ENUM('activa', 'finalizada', 'cancelada') DEFAULT 'activa'");
            console.log('  ✅ Tipo de columna estado verificado en reservas');
        } catch (err) {
            console.error('  ⚠️ No se pudo modificar estado en reservas:', err.message);
        }
        try {
            await promisePool.query("ALTER TABLE pedidos MODIFY COLUMN estado ENUM('pendiente', 'completado', 'cancelado') DEFAULT 'pendiente'");
            console.log('  ✅ Tipo de columna estado verificado en pedidos');
        } catch (err) {
            console.error('  ⚠️ No se pudo modificar estado en pedidos:', err.message);
        }

        // Asegurar AUTO_INCREMENT en todas las tablas por si fueron creadas sin él en entornos previos (como en Render)
        const tablesToAutoIncrement = ['usuarios', 'canchas', 'productos', 'pedidos', 'pedido_detalle', 'reservas', 'inventario'];
        for (const table of tablesToAutoIncrement) {
            try {
                const [columns] = await promisePool.query(`SHOW COLUMNS FROM \`${table}\` WHERE Field = 'id'`);
                if (columns.length > 0) {
                    const col = columns[0];
                    if (!col.Extra.toLowerCase().includes('auto_increment')) {
                        console.log(`  🔧 Agregando AUTO_INCREMENT a la columna id de la tabla ${table}...`);
                        await promisePool.query(`ALTER TABLE \`${table}\` MODIFY COLUMN id INT AUTO_INCREMENT`);
                        console.log(`  ✅ AUTO_INCREMENT agregado a ${table}.id`);
                    }
                }
            } catch (alterError) {
                console.error(`  ⚠️ No se pudo asegurar AUTO_INCREMENT en la tabla ${table}:`, alterError.message);
            }
        }

        // Ejecutar población automática de datos si faltan registros
        await seeder.autoSeed(promisePool);

        console.log('✅ Base de datos inicializada correctamente.');
    } catch (error) {
        console.error('❌ Error al inicializar la base de datos:', error.message);
    }
};

module.exports = promisePool;
module.exports.initializeDatabase = initializeDatabase;