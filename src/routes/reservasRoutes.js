const express = require('express');
const router = express.Router();
const { crearReserva, obtenerReservasActivas, cancelarReserva } = require('../controllers/reservasController');

router.post('/', crearReserva);
router.get('/activas', obtenerReservasActivas); // Ruta para pedir las reservas
router.put('/:id/cancelar', cancelarReserva);   // Ruta para cancelar una específica

module.exports = router;