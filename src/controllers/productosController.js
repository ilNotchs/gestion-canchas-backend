const db = require('../config/db');

/**
 * Obtener todos los productos con filtros, búsqueda y paginación.
 * Query params: ?buscar=texto&categoria=Cat&estado=activo&pagina=1&limite=12
 */
const obtenerProductos = async (req, res) => {
    try {
        const { buscar, categoria, estado, pagina = 1, limite = 12 } = req.query;
        const offset = (parseInt(pagina) - 1) * parseInt(limite);

        let query = 'SELECT * FROM productos WHERE 1=1';
        let countQuery = 'SELECT COUNT(*) as total FROM productos WHERE 1=1';
        const params = [];
        const countParams = [];

        if (buscar) {
            query += ' AND (nombre LIKE ? OR descripcion LIKE ?)';
            countQuery += ' AND (nombre LIKE ? OR descripcion LIKE ?)';
            const searchTerm = `%${buscar}%`;
            params.push(searchTerm, searchTerm);
            countParams.push(searchTerm, searchTerm);
        }

        if (categoria && categoria !== 'todas') {
            query += ' AND categoria = ?';
            countQuery += ' AND categoria = ?';
            params.push(categoria);
            countParams.push(categoria);
        }

        if (estado && estado !== 'todos') {
            query += ' AND estado = ?';
            countQuery += ' AND estado = ?';
            params.push(estado);
            countParams.push(estado);
        }

        query += ' ORDER BY fecha_creacion DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limite), offset);

        const [rows] = await db.query(query, params);
        const [countResult] = await db.query(countQuery, countParams);
        const total = countResult[0].total;

        res.json({
            productos: rows,
            paginacion: {
                total,
                pagina: parseInt(pagina),
                limite: parseInt(limite),
                totalPaginas: Math.ceil(total / parseInt(limite))
            }
        });
    } catch (error) {
        console.error("❌ Error en obtenerProductos:", error);
        res.status(500).json({ mensaje: 'Error al obtener los productos.' });
    }
};

/**
 * Obtener un producto por ID.
 */
const obtenerProductoPorId = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query('SELECT * FROM productos WHERE id = ?', [id]);

        if (rows.length === 0) {
            return res.status(404).json({ mensaje: 'Producto no encontrado.' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error("❌ Error en obtenerProductoPorId:", error);
        res.status(500).json({ mensaje: 'Error al obtener el producto.' });
    }
};

/**
 * Obtener categorías únicas de productos.
 */
const obtenerCategorias = async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT DISTINCT categoria FROM productos WHERE categoria IS NOT NULL ORDER BY categoria'
        );
        res.json(rows.map(r => r.categoria));
    } catch (error) {
        console.error("❌ Error en obtenerCategorias:", error);
        res.status(500).json({ mensaje: 'Error al obtener categorías.' });
    }
};

/**
 * Crear un nuevo producto (Admin).
 */
const crearProducto = async (req, res) => {
    try {
        const { nombre, precio, stock, descripcion, categoria, estado } = req.body;

        // Validaciones
        if (!nombre || nombre.trim().length === 0) {
            return res.status(400).json({ mensaje: 'El nombre del producto es obligatorio.' });
        }
        if (!precio || isNaN(precio) || parseFloat(precio) <= 0) {
            return res.status(400).json({ mensaje: 'El precio debe ser un número mayor a 0.' });
        }
        if (stock === undefined || isNaN(stock) || parseInt(stock) < 0) {
            return res.status(400).json({ mensaje: 'El stock debe ser un número mayor o igual a 0.' });
        }

        // Si hay archivo de imagen subido via multer
        let imagen_url = '';
        if (req.file) {
            imagen_url = `/uploads/productos/${req.file.filename}`;
        }

        const [resultado] = await db.query(
            `INSERT INTO productos (nombre, precio, stock, descripcion, categoria, imagen_url, estado)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                nombre.trim(),
                parseFloat(precio),
                parseInt(stock),
                descripcion || '',
                categoria || 'General',
                imagen_url,
                estado || 'activo'
            ]
        );

        res.status(201).json({
            success: true,
            mensaje: 'Producto creado exitosamente.',
            producto: { id: resultado.insertId, nombre, precio, stock, imagen_url }
        });
    } catch (error) {
        console.error("❌ Error en crearProducto:", error);
        res.status(500).json({ mensaje: 'Error al crear el producto.' });
    }
};

/**
 * Actualizar un producto existente (Admin).
 */
const actualizarProducto = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, precio, stock, descripcion, categoria, estado } = req.body;

        // Verificar que el producto existe
        const [existente] = await db.query('SELECT * FROM productos WHERE id = ?', [id]);
        if (existente.length === 0) {
            return res.status(404).json({ mensaje: 'Producto no encontrado.' });
        }

        // Validaciones
        if (nombre && nombre.trim().length === 0) {
            return res.status(400).json({ mensaje: 'El nombre no puede estar vacío.' });
        }
        if (precio !== undefined && (isNaN(precio) || parseFloat(precio) <= 0)) {
            return res.status(400).json({ mensaje: 'El precio debe ser mayor a 0.' });
        }
        if (stock !== undefined && (isNaN(stock) || parseInt(stock) < 0)) {
            return res.status(400).json({ mensaje: 'El stock debe ser mayor o igual a 0.' });
        }

        let imagen_url = existente[0].imagen_url;
        if (req.file) {
            imagen_url = `/uploads/productos/${req.file.filename}`;
        }

        await db.query(
            `UPDATE productos SET 
                nombre = ?, precio = ?, stock = ?, descripcion = ?, 
                categoria = ?, imagen_url = ?, estado = ?
             WHERE id = ?`,
            [
                nombre || existente[0].nombre,
                precio !== undefined ? parseFloat(precio) : existente[0].precio,
                stock !== undefined ? parseInt(stock) : existente[0].stock,
                descripcion !== undefined ? descripcion : existente[0].descripcion,
                categoria || existente[0].categoria,
                imagen_url,
                estado || existente[0].estado,
                id
            ]
        );

        res.json({ success: true, mensaje: 'Producto actualizado exitosamente.' });
    } catch (error) {
        console.error("❌ Error en actualizarProducto:", error);
        res.status(500).json({ mensaje: 'Error al actualizar el producto.' });
    }
};

/**
 * Eliminar un producto (soft delete — cambiar estado a inactivo).
 */
const eliminarProducto = async (req, res) => {
    try {
        const { id } = req.params;

        const [existente] = await db.query('SELECT id FROM productos WHERE id = ?', [id]);
        if (existente.length === 0) {
            return res.status(404).json({ mensaje: 'Producto no encontrado.' });
        }

        await db.query('UPDATE productos SET estado = ? WHERE id = ?', ['inactivo', id]);

        res.json({ success: true, mensaje: 'Producto eliminado exitosamente.' });
    } catch (error) {
        console.error("❌ Error en eliminarProducto:", error);
        res.status(500).json({ mensaje: 'Error al eliminar el producto.' });
    }
};

module.exports = {
    obtenerProductos,
    obtenerProductoPorId,
    obtenerCategorias,
    crearProducto,
    actualizarProducto,
    eliminarProducto
};
