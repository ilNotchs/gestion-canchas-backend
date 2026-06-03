const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

const NOMBRES_COLOMBIANOS = [
    'Carlos Rodríguez', 'Andrés Martínez', 'Juan Pérez', 'David López',
    'Santiago García', 'Sebastián Hernández', 'Mateo González', 'Daniel Torres',
    'Alejandro Ramírez', 'Nicolás Díaz', 'Samuel Morales', 'Felipe Castillo',
    'Camilo Restrepo', 'Jorge Vargas', 'Luis Rojas', 'Miguel Ortiz',
    'Pablo Jiménez', 'Diego Mejía', 'Julián Cardona', 'Tomás Ospina',
    'Esteban Ríos', 'Martín Salazar', 'Ricardo Gómez', 'Fernando Muñoz',
    'Cristian Agudelo', 'Óscar Herrera', 'Iván Castaño', 'Brayan Quintero',
    'Kevin Parra', 'Jhon Duque'
];

const NOMBRES_CANCHAS_NUEVAS = [
    'Cancha Arena Norte', 'Cancha Arena Sur', 'Cancha Estrella',
    'Cancha Gol de Oro', 'Cancha Campeones', 'Cancha Premier',
    'Cancha El Clásico', 'Cancha Maracaná', 'Cancha Azteca',
    'Cancha Santiago Bernabéu', 'Cancha San Siro', 'Cancha Old Trafford',
    'Cancha Wembley', 'Cancha Monumental', 'Cancha Atanasio Girardot',
    'Cancha El Campín', 'Cancha Metropolitano', 'Cancha Pascual Guerrero',
    'Cancha La Bombonera', 'Cancha Centenario', 'Cancha Olímpico',
    'Cancha La Candelaria', 'Cancha Los Laureles', 'Cancha El Parque',
    'Cancha Villa Verde', 'Cancha Santa Fe', 'Cancha La Victoria',
    'Cancha Deportivo', 'Cancha San Andrés', 'Cancha Real Madrid'
];

const FRANJAS_HORARIAS = [
    '08:00:00', '10:00:00', '12:00:00', '14:00:00',
    '16:00:00', '18:00:00', '20:00:00', '22:00:00'
];

const FECHAS_RESERVAS = ['2026-06-04', '2026-06-05', '2026-06-06'];

const METODOS_PAGO = ['efectivo', 'transferencia', 'tarjeta'];

const PRODUCTOS = [
    { nombre: 'Gatorade Limón 500ml', categoria: 'Bebidas hidratantes', descripcion: 'Bebida isotónica sabor limón para rehidratación deportiva', precio: 4500, stock: 80 },
    { nombre: 'Gatorade Naranja 500ml', categoria: 'Bebidas hidratantes', descripcion: 'Bebida isotónica sabor naranja ideal para deportistas', precio: 4500, stock: 75 },
    { nombre: 'Gatorade Uva 500ml', categoria: 'Bebidas hidratantes', descripcion: 'Bebida isotónica sabor uva con electrolitos', precio: 4500, stock: 60 },
    { nombre: 'Powerade Frutas 500ml', categoria: 'Bebidas hidratantes', descripcion: 'Bebida deportiva sabor frutas tropicales', precio: 4000, stock: 65 },
    { nombre: 'Squash Hidratante Naranja 600ml', categoria: 'Bebidas hidratantes', descripcion: 'Bebida hidratante con vitaminas y minerales', precio: 3800, stock: 50 },
    { nombre: 'Agua Cristal 600ml', categoria: 'Agua', descripcion: 'Agua mineral natural embotellada', precio: 2000, stock: 200 },
    { nombre: 'Agua Brisa 600ml', categoria: 'Agua', descripcion: 'Agua purificada natural', precio: 1800, stock: 180 },
    { nombre: 'Agua Cristal 1.5L', categoria: 'Agua', descripcion: 'Botella grande de agua mineral natural', precio: 3500, stock: 100 },
    { nombre: 'Agua Oasis 600ml', categoria: 'Agua', descripcion: 'Agua de manantial purificada', precio: 2200, stock: 120 },
    { nombre: 'Agua Manantial Pet 500ml', categoria: 'Agua', descripcion: 'Agua mineral de manantial natural', precio: 1500, stock: 150 },
    { nombre: 'Coca-Cola 400ml', categoria: 'Gaseosas', descripcion: 'Gaseosa clásica Coca-Cola', precio: 3000, stock: 100 },
    { nombre: 'Sprite 400ml', categoria: 'Gaseosas', descripcion: 'Gaseosa de limón refrescante', precio: 2800, stock: 90 },
    { nombre: 'Colombiana 350ml', categoria: 'Gaseosas', descripcion: 'La nuestra, gaseosa sabor colombiana', precio: 2500, stock: 85 },
    { nombre: 'Pepsi 400ml', categoria: 'Gaseosas', descripcion: 'Gaseosa Pepsi Cola refrescante', precio: 2800, stock: 70 },
    { nombre: 'Manzana Postobón 350ml', categoria: 'Gaseosas', descripcion: 'Gaseosa sabor manzana Postobón', precio: 2500, stock: 95 },
    { nombre: 'Vive 100 240ml', categoria: 'Energizantes', descripcion: 'Bebida energizante con taurina y cafeína', precio: 3500, stock: 60 },
    { nombre: 'Red Bull 250ml', categoria: 'Energizantes', descripcion: 'Bebida energética premium con cafeína', precio: 7000, stock: 40 },
    { nombre: 'Monster Energy 473ml', categoria: 'Energizantes', descripcion: 'Bebida energética de alto rendimiento', precio: 8000, stock: 35 },
    { nombre: 'Speed Max 250ml', categoria: 'Energizantes', descripcion: 'Energizante colombiano para deportistas', precio: 3000, stock: 55 },
    { nombre: 'Peak Energizante 250ml', categoria: 'Energizantes', descripcion: 'Bebida energizante con vitaminas B', precio: 4000, stock: 45 },
    { nombre: 'Papas Margarita Pollo 45g', categoria: 'Snacks', descripcion: 'Papas fritas sabor pollo crujientes', precio: 2500, stock: 100 },
    { nombre: 'Papas Margarita Natural 45g', categoria: 'Snacks', descripcion: 'Papas fritas sabor natural y sal', precio: 2300, stock: 90 },
    { nombre: 'De Todito Mix 100g', categoria: 'Snacks', descripcion: 'Mix de snacks variados en paquete grande', precio: 4000, stock: 70 },
    { nombre: 'Chocoramo', categoria: 'Snacks', descripcion: 'Ponqué de chocolate tradicional colombiano', precio: 2000, stock: 120 },
    { nombre: 'Galletas Festival Vainilla', categoria: 'Snacks', descripcion: 'Galletas rellenas de crema sabor vainilla', precio: 1500, stock: 85 },
    { nombre: 'Barra Tosh Cereal y Frutos Rojos', categoria: 'Barras energéticas', descripcion: 'Barra de cereal con frutos rojos y avena', precio: 3000, stock: 60 },
    { nombre: 'Barra Tosh Chocolate y Almendras', categoria: 'Barras energéticas', descripcion: 'Barra energética con chocolate y almendras', precio: 3200, stock: 55 },
    { nombre: 'Barra Nature Valley Avena y Miel', categoria: 'Barras energéticas', descripcion: 'Barra de granola crujiente con miel', precio: 4500, stock: 40 },
    { nombre: 'Barra Proteica Whey 35g', categoria: 'Barras energéticas', descripcion: 'Barra alta en proteína para recuperación muscular', precio: 6000, stock: 30 },
    { nombre: 'Barra Fitness Cereal Integral', categoria: 'Barras energéticas', descripcion: 'Barra de cereal integral con fibra natural', precio: 2800, stock: 50 },
    { nombre: 'Manilla Nike Dri-FIT', categoria: 'Manillas deportivas', descripcion: 'Manilla absorbente de sudor tecnología Dri-FIT', precio: 15000, stock: 30 },
    { nombre: 'Manilla Adidas Aeroready', categoria: 'Manillas deportivas', descripcion: 'Manilla deportiva con tecnología de ventilación', precio: 12000, stock: 35 },
    { nombre: 'Manilla Under Armour Performance', categoria: 'Manillas deportivas', descripcion: 'Manilla elástica de alto rendimiento', precio: 18000, stock: 20 },
    { nombre: 'Manilla Puma Active', categoria: 'Manillas deportivas', descripcion: 'Manilla deportiva ligera y cómoda', precio: 10000, stock: 40 },
    { nombre: 'Pack x3 Manillas Colombia', categoria: 'Manillas deportivas', descripcion: 'Pack de 3 manillas con los colores de Colombia', precio: 8000, stock: 25 },
    { nombre: 'Medias Nike Crew Dri-FIT x3', categoria: 'Medias deportivas', descripcion: 'Pack de 3 pares de medias deportivas Nike', precio: 35000, stock: 25 },
    { nombre: 'Medias Adidas Cushioned x3', categoria: 'Medias deportivas', descripcion: 'Medias acolchadas para fútbol Adidas', precio: 32000, stock: 20 },
    { nombre: 'Medias Puma Fútbol Largas', categoria: 'Medias deportivas', descripcion: 'Medias largas para fútbol con soporte', precio: 18000, stock: 30 },
    { nombre: 'Medias Under Armour Training', categoria: 'Medias deportivas', descripcion: 'Medias técnicas para entrenamiento deportivo', precio: 28000, stock: 22 },
    { nombre: 'Medias Deportivas Genéricas x5', categoria: 'Medias deportivas', descripcion: 'Pack económico de 5 pares de medias blancas', precio: 15000, stock: 50 },
    { nombre: 'Tobillera Nike Pro Ankle', categoria: 'Tobilleras', descripcion: 'Tobillera de soporte Nike con compresión', precio: 45000, stock: 15 },
    { nombre: 'Tobillera Adidas Performance', categoria: 'Tobilleras', descripcion: 'Tobillera elástica de rendimiento deportivo', precio: 38000, stock: 18 },
    { nombre: 'Tobillera Mueller Sport', categoria: 'Tobilleras', descripcion: 'Tobillera ortopédica de neopreno', precio: 42000, stock: 12 },
    { nombre: 'Tobillera Compresión Pro', categoria: 'Tobilleras', descripcion: 'Tobillera con banda de compresión ajustable', precio: 25000, stock: 20 },
    { nombre: 'Tobillera Elástica Básica', categoria: 'Tobilleras', descripcion: 'Tobillera elástica básica de soporte', precio: 12000, stock: 35 },
    { nombre: 'Rodillera Nike Pro Knee', categoria: 'Rodilleras', descripcion: 'Rodillera con soporte lateral y compresión', precio: 55000, stock: 12 },
    { nombre: 'Rodillera Adidas Knee Support', categoria: 'Rodilleras', descripcion: 'Rodillera deportiva con protección acolchada', precio: 48000, stock: 15 },
    { nombre: 'Rodillera Mueller Arquero', categoria: 'Rodilleras', descripcion: 'Rodillera especial para arqueros con padding extra', precio: 65000, stock: 10 },
    { nombre: 'Rodillera Compresión Deportiva', categoria: 'Rodilleras', descripcion: 'Rodillera de compresión para actividad intensa', precio: 30000, stock: 18 },
    { nombre: 'Par Rodilleras Neopreno', categoria: 'Rodilleras', descripcion: 'Par de rodilleras de neopreno con ajuste velcro', precio: 40000, stock: 14 },
    { nombre: 'Guantes Adidas Predator Match', categoria: 'Guantes de arquero', descripcion: 'Guantes de arquero con grip superior Adidas', precio: 120000, stock: 8 },
    { nombre: 'Guantes Nike Goalkeeper Match', categoria: 'Guantes de arquero', descripcion: 'Guantes portero Nike con palma adherente', precio: 95000, stock: 10 },
    { nombre: 'Guantes Puma Ultra Grip', categoria: 'Guantes de arquero', descripcion: 'Guantes con tecnología Ultra Grip para máximo agarre', precio: 85000, stock: 12 },
    { nombre: 'Guantes Reusch Attrakt', categoria: 'Guantes de arquero', descripcion: 'Guantes profesionales Reusch con corte negativo', precio: 150000, stock: 6 },
    { nombre: 'Guantes Arquero Entrenamiento', categoria: 'Guantes de arquero', descripcion: 'Guantes económicos para entrenamiento diario', precio: 35000, stock: 20 },
    { nombre: 'Balón Adidas Tango Rosario', categoria: 'Balones', descripcion: 'Balón de entrenamiento Adidas cosido a mano', precio: 75000, stock: 15 },
    { nombre: 'Balón Nike Strike Team', categoria: 'Balones', descripcion: 'Balón Nike con diseño aerodinámico', precio: 85000, stock: 12 },
    { nombre: 'Balón Golty Dorado No.5', categoria: 'Balones', descripcion: 'Balón oficial colombiano Golty tamaño 5', precio: 95000, stock: 10 },
    { nombre: 'Balón Puma Orbita LaLiga', categoria: 'Balones', descripcion: 'Balón réplica de La Liga española', precio: 110000, stock: 8 },
    { nombre: 'Balón Mikasa Recreativo', categoria: 'Balones', descripcion: 'Balón recreativo resistente para cancha sintética', precio: 45000, stock: 25 },
    { nombre: 'Set 10 Conos Agilidad 15cm', categoria: 'Conos de entrenamiento', descripcion: 'Set de 10 conos planos para ejercicios de agilidad', precio: 18000, stock: 30 },
    { nombre: 'Set 20 Conos Mini Platos', categoria: 'Conos de entrenamiento', descripcion: 'Set de 20 platillos marcadores multicolor', precio: 22000, stock: 25 },
    { nombre: 'Set 6 Conos Grandes 30cm', categoria: 'Conos de entrenamiento', descripcion: 'Conos grandes de entrenamiento profesional', precio: 28000, stock: 20 },
    { nombre: 'Escalera Agilidad + 10 Conos', categoria: 'Conos de entrenamiento', descripcion: 'Kit de escalera de coordinación con conos incluidos', precio: 55000, stock: 10 },
    { nombre: 'Set 4 Estacas Slalom', categoria: 'Conos de entrenamiento', descripcion: 'Estacas flexibles para circuitos de dribling', precio: 35000, stock: 15 },
    { nombre: 'Silbato Fox 40 Classic', categoria: 'Silbatos', descripcion: 'Silbato profesional Fox 40 sin bolilla', precio: 25000, stock: 20 },
    { nombre: 'Silbato Molten Dolphin Pro', categoria: 'Silbatos', descripcion: 'Silbato Molten para árbitro profesional', precio: 35000, stock: 15 },
    { nombre: 'Silbato Plástico Básico', categoria: 'Silbatos', descripcion: 'Silbato plástico económico para recreación', precio: 5000, stock: 40 },
    { nombre: 'Camiseta Dry-Fit Negra Talla M', categoria: 'Camisetas deportivas', descripcion: 'Camiseta deportiva transpirable color negro', precio: 35000, stock: 20 },
    { nombre: 'Camiseta Dry-Fit Blanca Talla L', categoria: 'Camisetas deportivas', descripcion: 'Camiseta deportiva transpirable color blanco', precio: 35000, stock: 22 },
    { nombre: 'Camiseta Colombia Réplica 2026', categoria: 'Camisetas deportivas', descripcion: 'Réplica de la camiseta de la selección Colombia', precio: 65000, stock: 15 },
    { nombre: 'Camiseta Entrenamiento Azul', categoria: 'Camisetas deportivas', descripcion: 'Camiseta de entrenamiento azul rey', precio: 28000, stock: 30 },
    { nombre: 'Camiseta FitCanchas Oficial', categoria: 'Camisetas deportivas', descripcion: 'Camiseta oficial del complejo FitCanchas', precio: 40000, stock: 50 },
    { nombre: 'Pantaloneta Nike Dri-FIT Negra', categoria: 'Pantalonetas', descripcion: 'Pantaloneta deportiva Nike tecnología Dri-FIT', precio: 45000, stock: 18 },
    { nombre: 'Pantaloneta Adidas Squadra', categoria: 'Pantalonetas', descripcion: 'Pantaloneta fútbol Adidas con tecnología Climalite', precio: 42000, stock: 15 },
    { nombre: 'Pantaloneta Deportiva Genérica', categoria: 'Pantalonetas', descripcion: 'Pantaloneta deportiva cómoda y económica', precio: 18000, stock: 40 },
    { nombre: 'Pantaloneta Under Armour Tech', categoria: 'Pantalonetas', descripcion: 'Pantaloneta UA con tejido ultraligero', precio: 55000, stock: 12 },
    { nombre: 'Pantaloneta Colombia Réplica', categoria: 'Pantalonetas', descripcion: 'Pantaloneta réplica de la selección Colombia', precio: 50000, stock: 14 },
    { nombre: 'Cinta Cabeza Nike Swoosh', categoria: 'Cintas deportivas', descripcion: 'Cinta para cabeza Nike absorbente de sudor', precio: 22000, stock: 25 },
    { nombre: 'Pack 3 Cintas Elásticas Sport', categoria: 'Cintas deportivas', descripcion: 'Pack de 3 cintas elásticas colores variados', precio: 15000, stock: 30 },
    { nombre: 'Cinta Kinesiotape 5m', categoria: 'Cintas deportivas', descripcion: 'Cinta kinesiológica para prevención de lesiones', precio: 18000, stock: 20 },
    { nombre: 'Canilleras Nike Charge', categoria: 'Protectores', descripcion: 'Canilleras livianas con protección de impacto', precio: 35000, stock: 20 },
    { nombre: 'Canilleras Adidas Predator', categoria: 'Protectores', descripcion: 'Canilleras Adidas con tecnología de absorción', precio: 40000, stock: 18 },
    { nombre: 'Protector Bucal Deportivo', categoria: 'Protectores', descripcion: 'Protector bucal moldeable para deportes de contacto', precio: 15000, stock: 25 },
    { nombre: 'Protector de Tobillo con Velcro', categoria: 'Protectores', descripcion: 'Protector reforzado para tobillo con cierre velcro', precio: 28000, stock: 15 },
    { nombre: 'Coderas Protectoras Par', categoria: 'Protectores', descripcion: 'Par de coderas de protección para arqueros', precio: 32000, stock: 10 },
    { nombre: 'Hielera Coleman 5L', categoria: 'Hieleras', descripcion: 'Hielera portátil Coleman 5 litros para bebidas', precio: 85000, stock: 8 },
    { nombre: 'Hielera Igloo 10L', categoria: 'Hieleras', descripcion: 'Hielera grande Igloo ideal para equipos', precio: 120000, stock: 5 },
    { nombre: 'Bolsa Térmica Deportiva 3L', categoria: 'Hieleras', descripcion: 'Bolsa térmica compacta para bebidas frías', precio: 25000, stock: 15 },
    { nombre: 'Toalla Microfibra Sport 80x40cm', categoria: 'Toallas deportivas', descripcion: 'Toalla de microfibra ultra absorbente y compacta', precio: 18000, stock: 30 },
    { nombre: 'Toalla Enfriamiento Cooling', categoria: 'Toallas deportivas', descripcion: 'Toalla de enfriamiento instantáneo para deportistas', precio: 25000, stock: 20 },
    { nombre: 'Toalla Nike Fundamental', categoria: 'Toallas deportivas', descripcion: 'Toalla grande Nike de algodón 100%', precio: 45000, stock: 12 },
    { nombre: 'Toalla Compacta Gym Pack', categoria: 'Toallas deportivas', descripcion: 'Toalla compacta con estuche para deportes', precio: 15000, stock: 35 },
];

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysBack) {
    const d = new Date();
    d.setDate(d.getDate() - randomInt(0, daysBack));
    return d.toISOString().split('T')[0];
}

const autoSeed = async (conn) => {
    try {
        console.log('🌱 Iniciando verificación de población de base de datos...');

        // 1. Verificar conteo de usuarios
        const [usersCount] = await conn.query('SELECT COUNT(*) as total FROM usuarios');
        console.log(`📊 Usuarios actuales en BD: ${usersCount[0].total}`);
        
        let clientUsers = [];
        if (usersCount[0].total < 10) {
            console.log('👥 Poblando usuarios...');
            
            // Asegurar contraseña de testuser
            const testPassword = 'test1234';
            const testHash = await bcrypt.hash(testPassword, SALT_ROUNDS);
            await conn.query('UPDATE usuarios SET password = ?, rol = ? WHERE username = ?', [testHash, 'cliente', 'testuser']);
            console.log(`  ✅ Contraseña de "testuser" reseteada`);

            // Asegurar admin
            const adminPassword = 'admin123';
            const adminHash = await bcrypt.hash(adminPassword, SALT_ROUNDS);
            const [existAdmin] = await conn.query('SELECT id FROM usuarios WHERE username = ?', ['admin']);
            if (existAdmin.length === 0) {
                await conn.query(
                    'INSERT INTO usuarios (username, password, rol, email, telefono) VALUES (?, ?, ?, ?, ?)',
                    ['admin', adminHash, 'admin', 'admin@fitcanchas.com', '3001234567']
                );
                console.log(`  ✅ Usuario admin creado`);
            } else {
                await conn.query('UPDATE usuarios SET password = ?, rol = ? WHERE username = ?', [adminHash, 'admin', 'admin']);
            }

            // Crear los 30 clientes colombianos
            const clientePassword = 'cliente123';
            const clienteHash = await bcrypt.hash(clientePassword, SALT_ROUNDS);
            for (const nombre of NOMBRES_COLOMBIANOS) {
                const username = nombre.toLowerCase().replace(/\s+/g, '.').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                const email = `${username}@correo.com`;
                const telefono = `30${randomInt(0, 9)}${randomInt(1000000, 9999999)}`;
                
                const [existe] = await conn.query('SELECT id FROM usuarios WHERE username = ?', [username]);
                if (existe.length === 0) {
                    await conn.query(
                        'INSERT INTO usuarios (username, password, rol, email, telefono) VALUES (?, ?, ?, ?, ?)',
                        [username, clienteHash, 'cliente', email, telefono]
                    );
                }
            }
            console.log('  ✅ Clientes creados con éxito');
        }

        // Obtener usuarios para las relaciones
        const [allUsers] = await conn.query('SELECT id, username, rol FROM usuarios');
        clientUsers = allUsers.filter(u => u.rol === 'cliente');

        // 2. Verificar conteo de canchas
        const [canchasCount] = await conn.query('SELECT COUNT(*) as total FROM canchas');
        console.log(`📊 Canchas actuales en BD: ${canchasCount[0].total}`);
        if (canchasCount[0].total < 40) {
            console.log('⚽ Poblando canchas adicionales...');
            for (let i = 0; i < NOMBRES_CANCHAS_NUEVAS.length; i++) {
                const nombre = NOMBRES_CANCHAS_NUEVAS[i];
                const tipo = i < 15 ? '11v11' : '7v7';
                const precio = tipo === '11v11' ? 100000 : 60000;
                
                const [existe] = await conn.query('SELECT id FROM canchas WHERE nombre = ?', [nombre]);
                if (existe.length === 0) {
                    await conn.query(
                        'INSERT INTO canchas (nombre, tipo, precio_hora) VALUES (?, ?, ?)',
                        [nombre, tipo, precio]
                    );
                }
            }
            console.log('  ✅ Canchas adicionales creadas');
        }

        const [todasCanchas] = await conn.query('SELECT id, nombre, tipo, precio_hora FROM canchas ORDER BY id');

        // 3. Verificar conteo de reservas
        const [reservasCount] = await conn.query('SELECT COUNT(*) as total FROM reservas');
        console.log(`📊 Reservas actuales en BD: ${reservasCount[0].total}`);
        if (reservasCount[0].total < 200 && clientUsers.length > 0 && todasCanchas.length > 0) {
            console.log('📅 Generando reservas...');
            let reservasCreadas = 0;
            let reservasBatch = [];
            const BATCH_SIZE = 50;

            for (const fecha of FECHAS_RESERVAS) {
                for (const cancha of todasCanchas) {
                    for (const hora of FRANJAS_HORARIAS) {
                        const [existe] = await conn.query(
                            'SELECT id FROM reservas WHERE cancha_id = ? AND fecha_reserva = ? AND hora_inicio = ?',
                            [cancha.id, fecha, hora]
                        );
                        
                        if (existe.length > 0) continue;

                        const cliente = randomItem(clientUsers);
                        const estados = ['activa', 'activa', 'activa', 'activa', 'activa', 'activa', 'activa', 'activa', 'finalizada', 'cancelada'];
                        const estado = randomItem(estados);
                        const metodo = randomItem(METODOS_PAGO);
                        const horas = randomInt(1, 2);
                        const total = parseFloat(cancha.precio_hora) * horas;

                        reservasBatch.push([
                            cliente.username, cancha.id, fecha, hora, horas,
                            randomInt(0, 2), randomInt(0, 10), 0, estado, metodo, total
                        ]);

                        if (reservasBatch.length >= BATCH_SIZE) {
                            await conn.query(
                                `INSERT INTO reservas (nombre_cliente, cancha_id, fecha_reserva, hora_inicio, horas_alquiladas,
                                 balones_prestados, petos_rojos_prestados, petos_azules_prestados, estado, metodo_pago, total)
                                 VALUES ${reservasBatch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')}`,
                                reservasBatch.flat()
                            );
                            reservasCreadas += reservasBatch.length;
                            reservasBatch = [];
                        }
                    }
                }
            }

            if (reservasBatch.length > 0) {
                await conn.query(
                    `INSERT INTO reservas (nombre_cliente, cancha_id, fecha_reserva, hora_inicio, horas_alquiladas,
                     balones_prestados, petos_rojos_prestados, petos_azules_prestados, estado, metodo_pago, total)
                     VALUES ${reservasBatch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')}`,
                    reservasBatch.flat()
                );
                reservasCreadas += reservasBatch.length;
            }
            console.log(`  ✅ ${reservasCreadas} reservas creadas con éxito`);
        }

        // 4. Verificar productos
        const [prodCount] = await conn.query('SELECT COUNT(*) as total FROM productos');
        console.log(`📊 Productos actuales en BD: ${prodCount[0].total}`);
        if (prodCount[0].total < 50) {
            console.log('🛍️ Generando catálogo de productos...');
            for (const prod of PRODUCTOS) {
                const [existe] = await conn.query('SELECT id FROM productos WHERE nombre = ?', [prod.nombre]);
                if (existe.length === 0) {
                    await conn.query(
                        `INSERT INTO productos (nombre, precio, stock, descripcion, categoria, imagen_url, estado)
                         VALUES (?, ?, ?, ?, ?, '', 'activo')`,
                        [prod.nombre, prod.precio, prod.stock, prod.descripcion, prod.categoria]
                    );
                }
            }
            console.log('  ✅ Catálogo de productos creado');
        }

        const [productosDisponibles] = await conn.query('SELECT id, nombre, precio, stock FROM productos WHERE estado = "activo"');

        // 5. Verificar pedidos/compras
        const [pedidosCount] = await conn.query('SELECT COUNT(*) as total FROM pedidos');
        console.log(`📊 Pedidos actuales en BD: ${pedidosCount[0].total}`);
        if (pedidosCount[0].total < 50 && clientUsers.length > 0 && productosDisponibles.length > 0) {
            console.log('💳 Generando historial de compras...');
            let pedidosCreados = 0;
            const TARGET_PEDIDOS = 150;

            for (let i = 0; i < TARGET_PEDIDOS; i++) {
                const cliente = randomItem(clientUsers);
                const metodo = randomItem(METODOS_PAGO);
                const fechaPedido = randomDate(30);
                const numItems = randomInt(1, 4);
                
                const productosSeleccionados = [];
                const productosUsados = new Set();
                
                for (let j = 0; j < numItems; j++) {
                    let prod;
                    let intentos = 0;
                    do {
                        prod = randomItem(productosDisponibles);
                        intentos++;
                    } while (productosUsados.has(prod.id) && intentos < 20);
                    
                    if (!productosUsados.has(prod.id)) {
                        productosUsados.add(prod.id);
                        const cantidad = randomInt(1, 2);
                        productosSeleccionados.push({
                            producto_id: prod.id,
                            cantidad: cantidad,
                            precio_unitario: parseFloat(prod.precio)
                        });
                    }
                }

                if (productosSeleccionados.length === 0) continue;

                const total = productosSeleccionados.reduce((sum, p) => sum + (p.precio_unitario * p.cantidad), 0);

                const [pedidoResult] = await conn.query(
                    `INSERT INTO pedidos (usuario_id, nombre_cliente, total, estado, metodo_pago, fecha_creacion)
                     VALUES (?, ?, ?, 'completado', ?, ?)`,
                    [cliente.id, cliente.username, total, metodo, fechaPedido + ' ' + `${randomInt(8, 21)}:${randomInt(0, 59).toString().padStart(2, '0')}:00`]
                );

                const pedidoId = pedidoResult.insertId;

                for (const det of productosSeleccionados) {
                    await conn.query(
                        `INSERT INTO pedido_detalle (pedido_id, producto_id, cantidad, precio_unitario)
                         VALUES (?, ?, ?, ?)`,
                        [pedidoId, det.producto_id, det.cantidad, det.precio_unitario]
                    );
                    
                    await conn.query(
                        'UPDATE productos SET stock = GREATEST(0, stock - ?) WHERE id = ?',
                        [det.cantidad, det.producto_id]
                    );
                }
                pedidosCreados++;
            }
            console.log(`  ✅ ${pedidosCreados} compras registradas con éxito`);
        }

        console.log('✅ Finalizó la verificación/población de la base de datos.');
    } catch (e) {
        console.error('❌ Error en el proceso de auto-seeding:', e.message);
    }
};

module.exports = { autoSeed };
