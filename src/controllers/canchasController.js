const db = require('../config/db');

const obtenerCanchas = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM canchas');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al obtener las canchas' });
    }
};

module.exports = {
    obtenerCanchas
};