const express = require('express');
const router = express.Router();
const { verificarSesion, soloAdmin } = require('../middleware/authMiddleware');
const { 
    crearReserva, 
    obtenerReservasActivas, 
    obtenerTodasReservas, 
    cancelarReserva, 
    finalizarReserva,
    obtenerReporteAlquileres
} = require('../controllers/reservasController');

router.post('/', crearReserva);
router.get('/activas', obtenerReservasActivas);
router.get('/todas', obtenerTodasReservas);
router.get('/reportes', verificarSesion, soloAdmin, obtenerReporteAlquileres);
router.put('/:id/cancelar', cancelarReserva);
router.put('/:id/finalizar', finalizarReserva);

module.exports = router;