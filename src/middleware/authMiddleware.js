/**
 * Middleware de autenticación simplificado.
 * Verifica que el request incluya headers de sesión del usuario.
 * En producción, esto debería ser JWT.
 */
const verificarSesion = (req, res, next) => {
    const userId = req.headers['x-user-id'];
    const userRol = req.headers['x-user-rol'];

    if (!userId) {
        return res.status(401).json({ 
            success: false, 
            mensaje: 'No autorizado. Inicia sesión.' 
        });
    }

    req.usuario = {
        id: parseInt(userId),
        rol: userRol || 'cliente'
    };

    next();
};

/**
 * Middleware que verifica que el usuario sea administrador.
 */
const soloAdmin = (req, res, next) => {
    if (!req.usuario || req.usuario.rol !== 'admin') {
        return res.status(403).json({ 
            success: false, 
            mensaje: 'Acceso denegado. Se requieren permisos de administrador.' 
        });
    }
    next();
};

module.exports = { verificarSesion, soloAdmin };
