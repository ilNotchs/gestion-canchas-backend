const express = require('express');
const router = express.Router();
const { verificarSesion, soloAdmin } = require('../middleware/authMiddleware');
const {
    obtenerInventario,
    actualizarInventario,
    crearArticuloInventario,
    eliminarArticuloInventario
} = require('../controllers/inventarioController');

router.get('/', obtenerInventario);
router.post('/', verificarSesion, soloAdmin, crearArticuloInventario);
router.put('/:id', verificarSesion, soloAdmin, actualizarInventario);
router.delete('/:id', verificarSesion, soloAdmin, eliminarArticuloInventario);

module.exports = router;