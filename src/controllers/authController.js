const db = require('../config/db');

const login = async (req, res) => {
    const { username, password } = req.body;
    
    try {
        // 1. Agregamos el 'id' a la consulta para que el backend sepa 
        // exactamente qué usuario está operando en las reservas.
        const [rows] = await db.query(
            'SELECT id, username, rol FROM usuarios WHERE username = ? AND password = ?', 
            [username, password]
        );
        
        if (rows.length > 0) {
            const usuario = rows[0];

            // 2. Enviamos la información completa al frontend.
            // Si en el futuro implementas JWT, aquí es donde generarías el token.
            res.json({ 
                success: true, 
                mensaje: `¡Bienvenido de nuevo, ${usuario.username}!`,
                usuario: {
                    id: usuario.id,
                    username: usuario.username,
                    rol: usuario.rol
                }
            });
        } else {
            // 3. Manejo de error de credenciales
            res.status(401).json({ 
                success: false, 
                mensaje: 'Usuario o contraseña incorrectos' 
            });
        }
    } catch (error) {
        // 4. El "chivato" para depuración en consola
        console.error("❌ Error en el proceso de login:", error);
        res.status(500).json({ 
            success: false,
            mensaje: 'Error interno en el servidor' 
        });
    }
};

module.exports = { login };