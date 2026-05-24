const express = require('express');
const router = express.Router();
const { crearReserva, obtenerReservasActivas, obtenerTodasReservas, cancelarReserva } = require('../controllers/reservasController');

router.post('/', crearReserva);
router.get('/activas', obtenerReservasActivas);
router.get('/todas', obtenerTodasReservas);
router.put('/:id/cancelar', cancelarReserva);

module.exports = router;