const mysql = require('mysql2');
require('dotenv').config();

// Creamos el pool de conexiones usando las variables del archivo .env
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306, // Añadimos soporte para el puerto
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // ESTO ES LO QUE NECESITA AIVEN PARA NO DAR TIMEOUT:
    ssl: {
        rejectUnauthorized: false
    }
});

// Convertimos el pool para que soporte Promesas (async/await)
const promisePool = pool.promise();

module.exports = promisePool;