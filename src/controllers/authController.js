const db = require('../config/db');

const login = async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await db.query('SELECT username, rol FROM usuarios WHERE username = ? AND password = ?', [username, password]);
        
        if (rows.length > 0) {
            // Si coincide, le mandamos sus datos al frontend
            res.json({ success: true, usuario: rows[0] });
        } else {
            res.status(401).json({ success: false, mensaje: 'Usuario o contraseña incorrectos' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error en el servidor' });
    }
};

module.exports = { login };