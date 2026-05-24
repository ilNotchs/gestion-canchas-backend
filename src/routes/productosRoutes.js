const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { verificarSesion, soloAdmin } = require('../middleware/authMiddleware');
const {
    obtenerProductos,
    obtenerProductoPorId,
    obtenerCategorias,
    crearProducto,
    actualizarProducto,
    eliminarProducto
} = require('../controllers/productosController');

// Configuración de Multer para subida de imágenes
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Asegurarse de que la carpeta exista antes en index.js
        cb(null, path.join(__dirname, '../../public/uploads/productos'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'prod-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Límite de 5MB
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|webp/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, webp)'));
    }
});

// Rutas públicas (clientes)
router.get('/', obtenerProductos);
router.get('/categorias', obtenerCategorias);
router.get('/:id', obtenerProductoPorId);

// Rutas protegidas (solo admin)
router.post('/', verificarSesion, soloAdmin, upload.single('imagen'), crearProducto);
router.put('/:id', verificarSesion, soloAdmin, upload.single('imagen'), actualizarProducto);
router.delete('/:id', verificarSesion, soloAdmin, eliminarProducto);

module.exports = router;
