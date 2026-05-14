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

const register = async (req, res) => {
    const { username, password, email, telefono } = req.body;

    if (!username || !password || !email || !telefono) {
        return res.status(400).json({ success: false, mensaje: 'Todos los campos son obligatorios.' });
    }

    try {
        // Asegurar que las columnas email y telefono existan en la tabla
        // (esto solo se ejecuta si aún no las has agregado manualmente)
        await db.query(`
            ALTER TABLE usuarios 
            ADD COLUMN IF NOT EXISTS email VARCHAR(100),
            ADD COLUMN IF NOT EXISTS telefono VARCHAR(20)
        `).catch(() => {}); // Ignorar si ya existen o si la sintaxis no es soportada

        // Verificar si el usuario o email ya existe
        const [existente] = await db.query(
            'SELECT id FROM usuarios WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existente.length > 0) {
            return res.status(409).json({ success: false, mensaje: 'El usuario o correo ya está registrado.' });
        }

        // Insertar nuevo usuario con rol 'cliente'
        await db.query(
            'INSERT INTO usuarios (username, password, email, telefono, rol) VALUES (?, ?, ?, ?, ?)',
            [username, password, email, telefono, 'cliente']
        );

        res.status(201).json({ success: true, mensaje: '¡Registro exitoso! Ya puedes iniciar sesión.' });

    } catch (error) {
        console.error("❌ Error en registro:", error);
        res.status(500).json({ success: false, mensaje: 'Error interno en el servidor.' });
    }
};

module.exports = { login, register };