const express = require('express');
const router = express.Router();
const { crearReserva, obtenerReservasActivas, obtenerTodasReservas, cancelarReserva, finalizarReserva } = require('../controllers/reservasController');

router.post('/', crearReserva);
router.get('/activas', obtenerReservasActivas);
router.get('/todas', obtenerTodasReservas);
router.put('/:id/cancelar', cancelarReserva);
router.put('/:id/finalizar', finalizarReserva);

module.exports = router;