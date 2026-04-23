const db = require('../config/db'); // Importamos la conexión a la base de datos

// Función para obtener todo el inventario
const obtenerInventario = async (req, res) => {
    try {
        // Hacemos la consulta SQL
        const [rows] = await db.query('SELECT * FROM inventario');
        
        // Enviamos los datos como respuesta en formato JSON
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al obtener el inventario' });
    }
};

module.exports = {
    obtenerInventario
};