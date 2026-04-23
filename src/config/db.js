const mysql = require('mysql2');
require('dotenv').config();

// Creamos el pool de conexiones usando las variables del archivo .env
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Convertimos el pool para que soporte Promesas (async/await)
// Esto es mucho más moderno y limpio para trabajar
const promisePool = pool.promise();

module.exports = promisePool;