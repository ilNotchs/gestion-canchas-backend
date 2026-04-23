const express = require('express');
const router = express.Router();
const { obtenerInventario } = require('../controllers/inventarioController');

// Cuando alguien haga una petición GET a la raíz de esta ruta, ejecuta obtenerInventario
router.get('/', obtenerInventario);

module.exports = router;