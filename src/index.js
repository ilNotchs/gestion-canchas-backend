const express = require('express');
const cors = require('cors');
const db = require('./config/db');
require('dotenv').config();

const app = express();

// 1. Middlewares (Para que entienda JSON y permita conexiones)
app.use(cors());
app.use(express.json());

// === CONFIGURACIÓN DEL FRONTEND ===
// Le decimos a Express que la carpeta 'public' contiene nuestra página web.
// Al hacer esto, Express buscará automáticamente un archivo "index.html" para mostrar.
app.use(express.static('public'));

// 2. Importar todas las Rutas
const inventarioRoutes = require('./routes/inventarioRoutes');
const canchasRoutes = require('./routes/canchasRoutes');
const reservasRoutes = require('./routes/reservasRoutes');

// 3. Usar las Rutas (Definir las URLs para los datos)
app.use('/api/inventario', inventarioRoutes);
app.use('/api/canchas', canchasRoutes);
app.use('/api/reservas', reservasRoutes);

// Nota: Eliminamos el app.get('/') de prueba porque ahora el frontend 
// (el archivo index.html) tomará el control de la ruta principal.

// 4. Verificación de Base de Datos
const checkConnection = async () => {
    try {
        await db.query('SELECT 1 + 1 AS result');
        console.log('✅ Conexión a la base de datos establecida con éxito.');
    } catch (error) {
        console.error('❌ Error al conectar a la base de datos:', error.message);
    }
};

checkConnection();

// 5. Encender Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
    console.log(`🌐 Frontend web listo en: http://localhost:${PORT}`);
    console.log(`🔗 Inventario API: http://localhost:${PORT}/api/inventario`);
    console.log(`🔗 Canchas API: http://localhost:${PORT}/api/canchas`);
    console.log(`🔗 Reservas API: http://localhost:${PORT}/api/reservas`);
});