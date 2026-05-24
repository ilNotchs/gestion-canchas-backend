const db = require('../config/db');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

/**
 * Login de usuario.
 * Soporta migración automática: si la contraseña almacenada NO es un hash bcrypt,
 * la verifica como texto plano y luego la re-hashea para futuras sesiones.
 */
const login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ 
            success: false, 
            mensaje: 'Usuario y contraseña son obligatorios.' 
        });
    }

    try {
        const [rows] = await db.query(
            'SELECT id, username, password, rol, email, telefono FROM usuarios WHERE username = ?',
            [username]
        );

        if (rows.length === 0) {
            return res.status(401).json({ 
                success: false, 
                mensaje: 'Usuario o contraseña incorrectos' 
            });
        }

        const usuario = rows[0];
        let passwordValida = false;

        // Detectar si la contraseña almacenada es un hash bcrypt
        const esBcrypt = usuario.password && usuario.password.startsWith('$2');

        if (esBcrypt) {
            passwordValida = await bcrypt.compare(password, usuario.password);
        } else {
            // Migración automática: comparar texto plano
            passwordValida = (password === usuario.password);
            
            if (passwordValida) {
                // Re-hashear la contraseña para futuras sesiones
                const hash = await bcrypt.hash(password, SALT_ROUNDS);
                await db.query('UPDATE usuarios SET password = ? WHERE id = ?', [hash, usuario.id]);
                console.log(`🔐 Contraseña migrada a bcrypt para usuario: ${usuario.username}`);
            }
        }

        if (passwordValida) {
            res.json({
                success: true,
                mensaje: `¡Bienvenido de nuevo, ${usuario.username}!`,
                usuario: {
                    id: usuario.id,
                    username: usuario.username,
                    rol: usuario.rol,
                    email: usuario.email || '',
                    telefono: usuario.telefono || ''
                }
            });
        } else {
            res.status(401).json({ 
                success: false, 
                mensaje: 'Usuario o contraseña incorrectos' 
            });
        }
    } catch (error) {
        console.error("❌ Error en el proceso de login:", error);
        res.status(500).json({ 
            success: false,
            mensaje: 'Error interno en el servidor' 
        });
    }
};

/**
 * Registro de nuevo usuario.
 * Hashea la contraseña con bcrypt antes de guardarla.
 */
const register = async (req, res) => {
    const { username, password, email, telefono } = req.body;

    if (!username || !password || !email || !telefono) {
        return res.status(400).json({ 
            success: false, 
            mensaje: 'Todos los campos son obligatorios.' 
        });
    }

    // Validaciones básicas
    if (username.length < 3) {
        return res.status(400).json({ 
            success: false, 
            mensaje: 'El nombre de usuario debe tener al menos 3 caracteres.' 
        });
    }

    if (password.length < 4) {
        return res.status(400).json({ 
            success: false, 
            mensaje: 'La contraseña debe tener al menos 4 caracteres.' 
        });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ 
            success: false, 
            mensaje: 'El correo electrónico no es válido.' 
        });
    }

    try {
        // Verificar si el usuario ya existe
        const [existente] = await db.query(
            'SELECT id FROM usuarios WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existente.length > 0) {
            return res.status(409).json({ 
                success: false, 
                mensaje: 'El nombre de usuario o correo ya está registrado.' 
            });
        }

        // Hashear contraseña
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // Insertar nuevo usuario con rol 'cliente'
        await db.query(
            'INSERT INTO usuarios (username, password, email, telefono, rol) VALUES (?, ?, ?, ?, ?)',
            [username, hashedPassword, email, telefono, 'cliente']
        );

        res.status(201).json({ 
            success: true, 
            mensaje: '¡Registro exitoso! Ya puedes iniciar sesión.' 
        });

    } catch (error) {
        console.error("❌ Error en registro:", error);
        res.status(500).json({ 
            success: false, 
            mensaje: 'Error interno en el servidor.' 
        });
    }
};

module.exports = { login, register };