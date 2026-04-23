const express = require('express');
const cors = require('cors');
const db = require('./config/db');
require('dotenv').config();

const app = express();

// === 1. MIDDLEWARES ===
// Permite que el servidor entienda JSON y acepte peticiones desde el navegador
app.use(cors());
app.use(express.json());

// Servir archivos estáticos: Express buscará automáticamente el index.html en la carpeta 'public'
app.use(express.static('public'));

// === 2. IMPORTAR RUTAS Y CONTROLADORES ===
const inventarioRoutes = require('./routes/inventarioRoutes');
const canchasRoutes = require('./routes/canchasRoutes');
const reservasRoutes = require('./routes/reservasRoutes');
const authController = require('./controllers/authController'); // <-- Importamos el controlador de Login

// === 3. DEFINIR PUNTOS DE ACCESO (APIs) ===
app.use('/api/inventario', inventarioRoutes);
app.use('/api/canchas', canchasRoutes);
app.use('/api/reservas', reservasRoutes);

// RUTA DE LOGIN: Recibe el usuario y contraseña del frontend para validarlos
app.post('/api/login', authController.login); 

// === 4. VERIFICACIÓN DE CONEXIÓN A LA BASE DE DATOS ===
const checkConnection = async () => {
    try {
        // Hacemos una consulta simple para asegurar que la base de datos en Aiven responde
        await db.query('SELECT 1 + 1 AS result');
        console.log('✅ Conexión a la base de datos establecida con éxito.');
    } catch (error) {
        console.error('❌ Error crítico al conectar a la base de datos:', error.message);
    }
};

checkConnection();

// === 5. ENCENDER EL SERVIDOR ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor FitCanchas corriendo con éxito`);
    console.log(`🌐 Frontend web listo en el puerto ${PORT}`);
    console.log(`🔑 Endpoint de Login configurado en: /api/login`);
});