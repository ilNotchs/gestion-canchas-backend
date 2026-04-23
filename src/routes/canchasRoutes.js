const express = require('express');
const router = express.Router();
const { obtenerCanchas } = require('../controllers/canchasController');

router.get('/', obtenerCanchas);

module.exports = router;