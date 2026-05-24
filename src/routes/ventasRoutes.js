const express = require('express');
const router = express.Router();
const { verificarSesion, soloAdmin } = require('../middleware/authMiddleware');
const {
    crearPedido,
    obtenerPedidosUsuario,
    obtenerTodasVentas,
    obtenerEstadisticas
} = require('../controllers/ventasController');

// Rutas de cliente
router.post('/', verificarSesion, crearPedido);
router.get('/mis-pedidos/:userId', verificarSesion, obtenerPedidosUsuario);

// Rutas de administrador
router.get('/admin/todas', verificarSesion, soloAdmin, obtenerTodasVentas);
router.get('/admin/estadisticas', verificarSesion, soloAdmin, obtenerEstadisticas);

module.exports = router;
