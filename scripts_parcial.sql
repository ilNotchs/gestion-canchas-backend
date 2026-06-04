-- ============================================================
-- PARCIAL - EJERCICIOS PRÁCTICOS - Base de datos: alquiler_canchas
-- ============================================================

-- ============================================================
-- RF-02: Consulta para saber cuántos registros tiene la tabla 
--        más importante (reservas)
-- ============================================================

-- Consulta simple: Contar registros en la tabla reservas
SELECT COUNT(*) AS total_registros FROM reservas;

-- Consulta adicional: Desglose por estado para mayor detalle
SELECT 
    estado, 
    COUNT(*) AS cantidad 
FROM reservas 
GROUP BY estado;


-- ============================================================
-- RF-03: Medir la latencia de la consulta anterior
-- ============================================================
-- ⚠️ IMPORTANTE: En DBeaver ejecuta CADA método por separado.
--    Selecciona las líneas del método que quieras y presiona Ctrl+Enter.

-- ────────────────────────────────────────────────────────────
-- Método 1 (RECOMENDADO): Ejecuta el COUNT(*) solo y mira 
-- el tiempo en la pestaña "Statistics" de DBeaver (abajo).
-- ────────────────────────────────────────────────────────────
SELECT COUNT(*) AS total_registros FROM reservas;

-- ────────────────────────────────────────────────────────────
-- Método 2: BENCHMARK - repite la consulta 1000 veces.
-- El tiempo total se ve en "Statistics". Divide entre 1000
-- para obtener la latencia promedio por ejecución.
-- ────────────────────────────────────────────────────────────
SELECT BENCHMARK(1000, (SELECT COUNT(*) FROM reservas)) AS benchmark_1000_ejecuciones;

-- ────────────────────────────────────────────────────────────
-- Método 3: Todo en una sola sentencia (sin variables de sesión).
-- ────────────────────────────────────────────────────────────
SELECT 
    t.total_registros,
    t.inicio,
    NOW(6) AS fin,
    TIMESTAMPDIFF(MICROSECOND, t.inicio, NOW(6)) / 1000 AS latencia_milisegundos
FROM (
    SELECT COUNT(*) AS total_registros, NOW(6) AS inicio 
    FROM reservas
) t;

-- ────────────────────────────────────────────────────────────
-- Método 4: EXPLAIN ANALYZE - muestra el plan de ejecución
-- con los tiempos reales de cada operación interna.
-- ────────────────────────────────────────────────────────────
EXPLAIN ANALYZE SELECT COUNT(*) FROM reservas;


-- ============================================================
-- RF-04: Revisar las validaciones de stock y otros
-- ============================================================

-- ----------------------------------------------------------------
-- 4.1 VALIDACIÓN DE STOCK EN INVENTARIO (Balones y Petos)
-- ----------------------------------------------------------------
-- Al crear una reserva, el sistema valida que haya suficientes
-- balones y petos antes de confirmar. Veamos el inventario actual:

SELECT 
    articulo, 
    color, 
    cantidad_total, 
    cantidad_disponible,
    (cantidad_total - cantidad_disponible) AS en_uso,
    CASE 
        WHEN cantidad_disponible = 0 THEN '⛔ AGOTADO'
        WHEN cantidad_disponible <= 2 THEN '⚠️ STOCK BAJO'
        ELSE '✅ DISPONIBLE'
    END AS estado_stock
FROM inventario;

-- Verificar que cantidad_disponible nunca sea negativa (integridad)
SELECT * FROM inventario WHERE cantidad_disponible < 0;

-- Verificar que cantidad_disponible no exceda cantidad_total
SELECT * FROM inventario WHERE cantidad_disponible > cantidad_total;


-- ----------------------------------------------------------------
-- 4.2 VALIDACIÓN DE STOCK EN PRODUCTOS (Tienda)
-- ----------------------------------------------------------------
-- Al crear un pedido/venta, el sistema valida stock del producto.

-- Ver productos con stock bajo o agotado
SELECT 
    id, 
    nombre, 
    precio, 
    stock, 
    estado,
    CASE 
        WHEN stock = 0 THEN '⛔ AGOTADO'
        WHEN stock <= 5 THEN '⚠️ STOCK BAJO'
        ELSE '✅ DISPONIBLE'
    END AS estado_stock
FROM productos
ORDER BY stock ASC;

-- Verificar que no haya productos con stock negativo
SELECT * FROM productos WHERE stock < 0;


-- ----------------------------------------------------------------
-- 4.3 VALIDACIÓN DE TRASLAPE DE HORARIOS (Reservas)
-- ----------------------------------------------------------------
-- El sistema verifica que no se solapen reservas en la misma cancha,
-- fecha y rango horario. Verificamos si hay conflictos en los datos:

SELECT 
    r1.id AS reserva_1,
    r2.id AS reserva_2,
    r1.cancha_id,
    r1.fecha_reserva,
    r1.hora_inicio AS inicio_r1,
    ADDTIME(r1.hora_inicio, SEC_TO_TIME(r1.horas_alquiladas * 3600)) AS fin_r1,
    r2.hora_inicio AS inicio_r2,
    ADDTIME(r2.hora_inicio, SEC_TO_TIME(r2.horas_alquiladas * 3600)) AS fin_r2
FROM reservas r1
JOIN reservas r2 
    ON r1.cancha_id = r2.cancha_id 
    AND r1.fecha_reserva = r2.fecha_reserva 
    AND r1.id < r2.id
    AND r1.estado = 'activa' 
    AND r2.estado = 'activa'
WHERE r1.hora_inicio < ADDTIME(r2.hora_inicio, SEC_TO_TIME(r2.horas_alquiladas * 3600))
  AND ADDTIME(r1.hora_inicio, SEC_TO_TIME(r1.horas_alquiladas * 3600)) > r2.hora_inicio;


-- ----------------------------------------------------------------
-- 4.4 VALIDACIÓN DE CAMPOS OBLIGATORIOS (Reservas)
-- ----------------------------------------------------------------
-- Verificar que no existan reservas con datos nulos en campos críticos
SELECT id, nombre_cliente, cancha_id, fecha_reserva, hora_inicio 
FROM reservas 
WHERE nombre_cliente IS NULL 
   OR cancha_id IS NULL 
   OR fecha_reserva IS NULL 
   OR hora_inicio IS NULL;


-- ----------------------------------------------------------------
-- 4.5 VALIDACIÓN DE INTEGRIDAD REFERENCIAL
-- ----------------------------------------------------------------
-- Verificar que las canchas referenciadas en reservas existan
SELECT r.id, r.cancha_id 
FROM reservas r 
LEFT JOIN canchas c ON r.cancha_id = c.id 
WHERE c.id IS NULL;

-- Verificar que los productos referenciados en pedido_detalle existan
SELECT pd.id, pd.producto_id 
FROM pedido_detalle pd 
LEFT JOIN productos p ON pd.producto_id = p.id 
WHERE p.id IS NULL;

-- Verificar que los usuarios referenciados en pedidos existan
SELECT pe.id, pe.usuario_id 
FROM pedidos pe 
LEFT JOIN usuarios u ON pe.usuario_id = u.id 
WHERE u.id IS NULL;


-- ----------------------------------------------------------------
-- 4.6 VALIDACIÓN DE PRECIOS Y MONTOS
-- ----------------------------------------------------------------
-- Verificar que no haya productos con precio <= 0
SELECT id, nombre, precio FROM productos WHERE precio <= 0;

-- Verificar que los pedidos tengan total coherente
SELECT 
    p.id AS pedido_id,
    p.total AS total_pedido,
    SUM(pd.cantidad * pd.precio_unitario) AS total_calculado,
    ABS(p.total - SUM(pd.cantidad * pd.precio_unitario)) AS diferencia
FROM pedidos p
JOIN pedido_detalle pd ON p.id = pd.pedido_id
GROUP BY p.id
HAVING diferencia > 0.01;


-- ================================================================
-- RESUMEN DE VALIDACIONES IMPLEMENTADAS EN EL CÓDIGO BACKEND
-- ================================================================
/*
  MÓDULO RESERVAS (reservasController.js):
  ✅ Campos obligatorios: cancha_id, fecha_reserva, hora_inicio
  ✅ Traslape de horarios: verifica que no haya conflictos en la misma cancha/fecha/hora
  ✅ Stock de balones: valida cantidad_disponible en inventario antes de prestar
  ✅ Stock de petos rojos: valida cantidad_disponible donde color = 'Rojo'
  ✅ Stock de petos azules: valida cantidad_disponible donde color = 'Azul'
  ✅ Transacciones: usa BEGIN/COMMIT/ROLLBACK para atomicidad
  ✅ Devolución de inventario: al cancelar reserva, devuelve implementos
  ✅ Estado de reserva: solo permite cancelar reservas con estado 'activa'

  MÓDULO VENTAS/PEDIDOS (ventasController.js):
  ✅ Items obligatorios: valida que el array de items no esté vacío
  ✅ Usuario obligatorio: valida que usuario_id exista
  ✅ Producto existente: verifica que cada producto_id exista en la BD
  ✅ Producto activo: verifica que el producto tenga estado = 'activo'
  ✅ Stock suficiente: valida stock >= cantidad solicitada por producto
  ✅ Descuento atómico: usa transacciones para descontar stock

  MÓDULO PRODUCTOS (productosController.js):
  ✅ Nombre obligatorio: no puede ser vacío
  ✅ Precio válido: debe ser número > 0
  ✅ Stock válido: debe ser número >= 0
  ✅ Validación de imagen: solo permite jpeg, jpg, png, webp (max 5MB)
  ✅ Soft delete: eliminar cambia estado a 'inactivo' (no borra datos)
*/
