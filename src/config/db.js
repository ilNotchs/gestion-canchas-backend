const mysql = require('mysql2');
require('dotenv').config();

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

        console.log('✅ Base de datos inicializada correctamente.');
    } catch (error) {
        console.error('❌ Error al inicializar la base de datos:', error.message);
    }
};

module.exports = promisePool;
module.exports.initializeDatabase = initializeDatabase;