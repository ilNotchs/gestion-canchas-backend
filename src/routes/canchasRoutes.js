const express = require('express');
const router = express.Router();
const { verificarSesion, soloAdmin } = require('../middleware/authMiddleware');
const { obtenerCanchas, crearCancha, actualizarCancha, eliminarCancha } = require('../controllers/canchasController');

router.get('/', obtenerCanchas);
router.post('/', verificarSesion, soloAdmin, crearCancha);
router.put('/:id', verificarSesion, soloAdmin, actualizarCancha);
router.delete('/:id', verificarSesion, soloAdmin, eliminarCancha);

module.exports = router;