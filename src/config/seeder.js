const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

// ─── DATOS DE CLIENTES ───────────────────────────────────────────────────────
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

// ─── 45 CANCHAS ──────────────────────────────────────────────────────────────
const NOMBRES_CANCHAS = [
    'Cancha Arena Norte', 'Cancha Arena Sur', 'Cancha Estrella',
    'Cancha Gol de Oro', 'Cancha Campeones', 'Cancha Premier',
    'Cancha El Clásico', 'Cancha Maracaná', 'Cancha Azteca',
    'Cancha Santiago Bernabéu', 'Cancha San Siro', 'Cancha Old Trafford',
    'Cancha Wembley', 'Cancha Monumental', 'Cancha Atanasio Girardot',
    'Cancha El Campín', 'Cancha Metropolitano', 'Cancha Pascual Guerrero',
    'Cancha La Bombonera', 'Cancha Centenario', 'Cancha Olímpico',
    'Cancha La Candelaria', 'Cancha Los Laureles', 'Cancha El Parque',
    'Cancha Villa Verde', 'Cancha Santa Fe', 'Cancha La Victoria',
    'Cancha Deportivo', 'Cancha San Andrés', 'Cancha Real Madrid',
    'Cancha Camp Nou', 'Cancha Allianz Arena', 'Cancha Signal Iduna',
    'Cancha Anfield', 'Cancha Emirates', 'Cancha Stamford Bridge',
    'Cancha Giuseppe Meazza', 'Cancha Da Luz', 'Cancha Dragão',
    'Cancha Velodrome', 'Cancha Parc des Princes', 'Cancha Johan Cruyff',
    'Cancha Celtic Park', 'Cancha Ibrox', 'Cancha Tottenham Stadium'
];

// ─── 8 FRANJAS HORARIAS ──────────────────────────────────────────────────────
const FRANJAS_HORARIAS = [
    '15:00:00', '16:00:00', '17:00:00', '18:00:00',
    '19:00:00', '20:00:00', '21:00:00', '22:00:00'
];

// ─── 3 DÍAS CONSECUTIVOS (dinámicos, desde mañana) ──────────────────────────
function generarFechas() {
    const fechas = [];
    for (let i = 1; i <= 3; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        fechas.push(d.toISOString().split('T')[0]);
    }
    return fechas;
}
const FECHAS_RESERVAS = generarFechas();

// Solo métodos seguros para compatibilidad con columnas ENUM antiguas en producción
const METODOS_PAGO = ['efectivo', 'transferencia', 'tarjeta'];

// ─── ~100 PRODUCTOS CON SKU (23 categorías requeridas) ──────────────────────
const PRODUCTOS = [
    // Agua (5)
    { nombre: 'Agua Cristal 600ml', categoria: 'Agua', descripcion: 'Agua mineral natural embotellada', precio: 2000, stock: 200, sku: 'AGU-001' },
    { nombre: 'Agua Brisa 600ml', categoria: 'Agua', descripcion: 'Agua purificada natural', precio: 1800, stock: 180, sku: 'AGU-002' },
    { nombre: 'Agua Cristal 1.5L', categoria: 'Agua', descripcion: 'Botella grande de agua mineral natural', precio: 3500, stock: 100, sku: 'AGU-003' },
    { nombre: 'Agua Oasis 600ml', categoria: 'Agua', descripcion: 'Agua de manantial purificada', precio: 2200, stock: 120, sku: 'AGU-004' },
    { nombre: 'Agua Manantial Pet 500ml', categoria: 'Agua', descripcion: 'Agua mineral de manantial natural', precio: 1500, stock: 150, sku: 'AGU-005' },

    // Gatorade (4)
    { nombre: 'Gatorade Limón 500ml', categoria: 'Gatorade', descripcion: 'Bebida isotónica sabor limón para rehidratación deportiva', precio: 4500, stock: 80, sku: 'GAT-001' },
    { nombre: 'Gatorade Naranja 500ml', categoria: 'Gatorade', descripcion: 'Bebida isotónica sabor naranja ideal para deportistas', precio: 4500, stock: 75, sku: 'GAT-002' },
    { nombre: 'Gatorade Uva 500ml', categoria: 'Gatorade', descripcion: 'Bebida isotónica sabor uva con electrolitos', precio: 4500, stock: 60, sku: 'GAT-003' },
    { nombre: 'Gatorade Tropical 500ml', categoria: 'Gatorade', descripcion: 'Bebida isotónica sabor tropical refrescante', precio: 4500, stock: 65, sku: 'GAT-004' },

    // Powerade (3)
    { nombre: 'Powerade Frutas 500ml', categoria: 'Powerade', descripcion: 'Bebida deportiva sabor frutas tropicales', precio: 4000, stock: 65, sku: 'POW-001' },
    { nombre: 'Powerade Mountain Blast 500ml', categoria: 'Powerade', descripcion: 'Bebida isotónica sabor mountain blast', precio: 4000, stock: 55, sku: 'POW-002' },
    { nombre: 'Powerade Moras 500ml', categoria: 'Powerade', descripcion: 'Bebida deportiva sabor moras silvestres', precio: 4200, stock: 50, sku: 'POW-003' },

    // Gaseosas (5)
    { nombre: 'Coca-Cola 400ml', categoria: 'Gaseosas', descripcion: 'Gaseosa clásica Coca-Cola', precio: 3000, stock: 100, sku: 'GAS-001' },
    { nombre: 'Sprite 400ml', categoria: 'Gaseosas', descripcion: 'Gaseosa de limón refrescante', precio: 2800, stock: 90, sku: 'GAS-002' },
    { nombre: 'Colombiana 350ml', categoria: 'Gaseosas', descripcion: 'La nuestra, gaseosa sabor colombiana', precio: 2500, stock: 85, sku: 'GAS-003' },
    { nombre: 'Pepsi 400ml', categoria: 'Gaseosas', descripcion: 'Gaseosa Pepsi Cola refrescante', precio: 2800, stock: 70, sku: 'GAS-004' },
    { nombre: 'Manzana Postobón 350ml', categoria: 'Gaseosas', descripcion: 'Gaseosa sabor manzana Postobón', precio: 2500, stock: 95, sku: 'GAS-005' },

    // Energizantes (5)
    { nombre: 'Vive 100 240ml', categoria: 'Energizantes', descripcion: 'Bebida energizante con taurina y cafeína', precio: 3500, stock: 60, sku: 'ENE-001' },
    { nombre: 'Red Bull 250ml', categoria: 'Energizantes', descripcion: 'Bebida energética premium con cafeína', precio: 7000, stock: 40, sku: 'ENE-002' },
    { nombre: 'Monster Energy 473ml', categoria: 'Energizantes', descripcion: 'Bebida energética de alto rendimiento', precio: 8000, stock: 35, sku: 'ENE-003' },
    { nombre: 'Speed Max 250ml', categoria: 'Energizantes', descripcion: 'Energizante colombiano para deportistas', precio: 3000, stock: 55, sku: 'ENE-004' },
    { nombre: 'Peak Energizante 250ml', categoria: 'Energizantes', descripcion: 'Bebida energizante con vitaminas B', precio: 4000, stock: 45, sku: 'ENE-005' },

    // Snacks (5)
    { nombre: 'Papas Margarita Pollo 45g', categoria: 'Snacks', descripcion: 'Papas fritas sabor pollo crujientes', precio: 2500, stock: 100, sku: 'SNA-001' },
    { nombre: 'Papas Margarita Natural 45g', categoria: 'Snacks', descripcion: 'Papas fritas sabor natural y sal', precio: 2300, stock: 90, sku: 'SNA-002' },
    { nombre: 'De Todito Mix 100g', categoria: 'Snacks', descripcion: 'Mix de snacks variados en paquete grande', precio: 4000, stock: 70, sku: 'SNA-003' },
    { nombre: 'Chocoramo', categoria: 'Snacks', descripcion: 'Ponqué de chocolate tradicional colombiano', precio: 2000, stock: 120, sku: 'SNA-004' },
    { nombre: 'Galletas Festival Vainilla', categoria: 'Snacks', descripcion: 'Galletas rellenas de crema sabor vainilla', precio: 1500, stock: 85, sku: 'SNA-005' },

    // Chocolates (4)
    { nombre: 'Chocolate Jet 50g', categoria: 'Chocolates', descripcion: 'Barra de chocolate con leche Jet con lámina coleccionable', precio: 2500, stock: 80, sku: 'CHO-001' },
    { nombre: 'Chocolate Sol Almendras 65g', categoria: 'Chocolates', descripcion: 'Chocolate con leche y almendras enteras', precio: 3500, stock: 60, sku: 'CHO-002' },
    { nombre: 'Snickers 52g', categoria: 'Chocolates', descripcion: 'Barra de chocolate con caramelo, maní y nougat', precio: 4000, stock: 55, sku: 'CHO-003' },
    { nombre: 'M&M Maní 45g', categoria: 'Chocolates', descripcion: 'Chocolates de colores rellenos de maní', precio: 3800, stock: 50, sku: 'CHO-004' },

    // Barras energéticas (5)
    { nombre: 'Barra Tosh Cereal y Frutos Rojos', categoria: 'Barras energéticas', descripcion: 'Barra de cereal con frutos rojos y avena', precio: 3000, stock: 60, sku: 'BAR-001' },
    { nombre: 'Barra Tosh Chocolate y Almendras', categoria: 'Barras energéticas', descripcion: 'Barra energética con chocolate y almendras', precio: 3200, stock: 55, sku: 'BAR-002' },
    { nombre: 'Barra Nature Valley Avena y Miel', categoria: 'Barras energéticas', descripcion: 'Barra de granola crujiente con miel', precio: 4500, stock: 40, sku: 'BAR-003' },
    { nombre: 'Barra Proteica Whey 35g', categoria: 'Barras energéticas', descripcion: 'Barra alta en proteína para recuperación muscular', precio: 6000, stock: 30, sku: 'BAR-004' },
    { nombre: 'Barra Fitness Cereal Integral', categoria: 'Barras energéticas', descripcion: 'Barra de cereal integral con fibra natural', precio: 2800, stock: 50, sku: 'BAR-005' },

    // Medias deportivas (5)
    { nombre: 'Medias Nike Crew Dri-FIT x3', categoria: 'Medias deportivas', descripcion: 'Pack de 3 pares de medias deportivas Nike', precio: 35000, stock: 25, sku: 'MED-001' },
    { nombre: 'Medias Adidas Cushioned x3', categoria: 'Medias deportivas', descripcion: 'Medias acolchadas para fútbol Adidas', precio: 32000, stock: 20, sku: 'MED-002' },
    { nombre: 'Medias Puma Fútbol Largas', categoria: 'Medias deportivas', descripcion: 'Medias largas para fútbol con soporte', precio: 18000, stock: 30, sku: 'MED-003' },
    { nombre: 'Medias Under Armour Training', categoria: 'Medias deportivas', descripcion: 'Medias técnicas para entrenamiento deportivo', precio: 28000, stock: 22, sku: 'MED-004' },
    { nombre: 'Medias Deportivas Genéricas x5', categoria: 'Medias deportivas', descripcion: 'Pack económico de 5 pares de medias blancas', precio: 15000, stock: 50, sku: 'MED-005' },

    // Tobilleras (5)
    { nombre: 'Tobillera Nike Pro Ankle', categoria: 'Tobilleras', descripcion: 'Tobillera de soporte Nike con compresión', precio: 45000, stock: 15, sku: 'TOB-001' },
    { nombre: 'Tobillera Adidas Performance', categoria: 'Tobilleras', descripcion: 'Tobillera elástica de rendimiento deportivo', precio: 38000, stock: 18, sku: 'TOB-002' },
    { nombre: 'Tobillera Mueller Sport', categoria: 'Tobilleras', descripcion: 'Tobillera ortopédica de neopreno', precio: 42000, stock: 12, sku: 'TOB-003' },
    { nombre: 'Tobillera Compresión Pro', categoria: 'Tobilleras', descripcion: 'Tobillera con banda de compresión ajustable', precio: 25000, stock: 20, sku: 'TOB-004' },
    { nombre: 'Tobillera Elástica Básica', categoria: 'Tobilleras', descripcion: 'Tobillera elástica básica de soporte', precio: 12000, stock: 35, sku: 'TOB-005' },

    // Rodilleras (5)
    { nombre: 'Rodillera Nike Pro Knee', categoria: 'Rodilleras', descripcion: 'Rodillera con soporte lateral y compresión', precio: 55000, stock: 12, sku: 'ROD-001' },
    { nombre: 'Rodillera Adidas Knee Support', categoria: 'Rodilleras', descripcion: 'Rodillera deportiva con protección acolchada', precio: 48000, stock: 15, sku: 'ROD-002' },
    { nombre: 'Rodillera Mueller Arquero', categoria: 'Rodilleras', descripcion: 'Rodillera especial para arqueros con padding extra', precio: 65000, stock: 10, sku: 'ROD-003' },
    { nombre: 'Rodillera Compresión Deportiva', categoria: 'Rodilleras', descripcion: 'Rodillera de compresión para actividad intensa', precio: 30000, stock: 18, sku: 'ROD-004' },
    { nombre: 'Par Rodilleras Neopreno', categoria: 'Rodilleras', descripcion: 'Par de rodilleras de neopreno con ajuste velcro', precio: 40000, stock: 14, sku: 'ROD-005' },

    // Guantes de arquero (5)
    { nombre: 'Guantes Adidas Predator Match', categoria: 'Guantes de arquero', descripcion: 'Guantes de arquero con grip superior Adidas', precio: 120000, stock: 8, sku: 'GUA-001' },
    { nombre: 'Guantes Nike Goalkeeper Match', categoria: 'Guantes de arquero', descripcion: 'Guantes portero Nike con palma adherente', precio: 95000, stock: 10, sku: 'GUA-002' },
    { nombre: 'Guantes Puma Ultra Grip', categoria: 'Guantes de arquero', descripcion: 'Guantes con tecnología Ultra Grip para máximo agarre', precio: 85000, stock: 12, sku: 'GUA-003' },
    { nombre: 'Guantes Reusch Attrakt', categoria: 'Guantes de arquero', descripcion: 'Guantes profesionales Reusch con corte negativo', precio: 150000, stock: 6, sku: 'GUA-004' },
    { nombre: 'Guantes Arquero Entrenamiento', categoria: 'Guantes de arquero', descripcion: 'Guantes económicos para entrenamiento diario', precio: 35000, stock: 20, sku: 'GUA-005' },

    // Balones (5)
    { nombre: 'Balón Adidas Tango Rosario', categoria: 'Balones', descripcion: 'Balón de entrenamiento Adidas cosido a mano', precio: 75000, stock: 15, sku: 'BAL-001' },
    { nombre: 'Balón Nike Strike Team', categoria: 'Balones', descripcion: 'Balón Nike con diseño aerodinámico', precio: 85000, stock: 12, sku: 'BAL-002' },
    { nombre: 'Balón Golty Dorado No.5', categoria: 'Balones', descripcion: 'Balón oficial colombiano Golty tamaño 5', precio: 95000, stock: 10, sku: 'BAL-003' },
    { nombre: 'Balón Puma Orbita LaLiga', categoria: 'Balones', descripcion: 'Balón réplica de La Liga española', precio: 110000, stock: 8, sku: 'BAL-004' },
    { nombre: 'Balón Mikasa Recreativo', categoria: 'Balones', descripcion: 'Balón recreativo resistente para cancha sintética', precio: 45000, stock: 25, sku: 'BAL-005' },

    // Conos de entrenamiento (5)
    { nombre: 'Set 10 Conos Agilidad 15cm', categoria: 'Conos de entrenamiento', descripcion: 'Set de 10 conos planos para ejercicios de agilidad', precio: 18000, stock: 30, sku: 'CON-001' },
    { nombre: 'Set 20 Conos Mini Platos', categoria: 'Conos de entrenamiento', descripcion: 'Set de 20 platillos marcadores multicolor', precio: 22000, stock: 25, sku: 'CON-002' },
    { nombre: 'Set 6 Conos Grandes 30cm', categoria: 'Conos de entrenamiento', descripcion: 'Conos grandes de entrenamiento profesional', precio: 28000, stock: 20, sku: 'CON-003' },
    { nombre: 'Escalera Agilidad + 10 Conos', categoria: 'Conos de entrenamiento', descripcion: 'Kit de escalera de coordinación con conos incluidos', precio: 55000, stock: 10, sku: 'CON-004' },
    { nombre: 'Set 4 Estacas Slalom', categoria: 'Conos de entrenamiento', descripcion: 'Estacas flexibles para circuitos de dribling', precio: 35000, stock: 15, sku: 'CON-005' },

    // Silbatos (3)
    { nombre: 'Silbato Fox 40 Classic', categoria: 'Silbatos', descripcion: 'Silbato profesional Fox 40 sin bolilla', precio: 25000, stock: 20, sku: 'SIL-001' },
    { nombre: 'Silbato Molten Dolphin Pro', categoria: 'Silbatos', descripcion: 'Silbato Molten para árbitro profesional', precio: 35000, stock: 15, sku: 'SIL-002' },
    { nombre: 'Silbato Plástico Básico', categoria: 'Silbatos', descripcion: 'Silbato plástico económico para recreación', precio: 5000, stock: 40, sku: 'SIL-003' },

    // Camisetas deportivas (5)
    { nombre: 'Camiseta Dry-Fit Negra Talla M', categoria: 'Camisetas deportivas', descripcion: 'Camiseta deportiva transpirable color negro', precio: 35000, stock: 20, sku: 'CAM-001' },
    { nombre: 'Camiseta Dry-Fit Blanca Talla L', categoria: 'Camisetas deportivas', descripcion: 'Camiseta deportiva transpirable color blanco', precio: 35000, stock: 22, sku: 'CAM-002' },
    { nombre: 'Camiseta Colombia Réplica 2026', categoria: 'Camisetas deportivas', descripcion: 'Réplica de la camiseta de la selección Colombia', precio: 65000, stock: 15, sku: 'CAM-003' },
    { nombre: 'Camiseta Entrenamiento Azul', categoria: 'Camisetas deportivas', descripcion: 'Camiseta de entrenamiento azul rey', precio: 28000, stock: 30, sku: 'CAM-004' },
    { nombre: 'Camiseta FitCanchas Oficial', categoria: 'Camisetas deportivas', descripcion: 'Camiseta oficial del complejo FitCanchas', precio: 40000, stock: 50, sku: 'CAM-005' },

    // Pantalonetas (5)
    { nombre: 'Pantaloneta Nike Dri-FIT Negra', categoria: 'Pantalonetas', descripcion: 'Pantaloneta deportiva Nike tecnología Dri-FIT', precio: 45000, stock: 18, sku: 'PAN-001' },
    { nombre: 'Pantaloneta Adidas Squadra', categoria: 'Pantalonetas', descripcion: 'Pantaloneta fútbol Adidas con tecnología Climalite', precio: 42000, stock: 15, sku: 'PAN-002' },
    { nombre: 'Pantaloneta Deportiva Genérica', categoria: 'Pantalonetas', descripcion: 'Pantaloneta deportiva cómoda y económica', precio: 18000, stock: 40, sku: 'PAN-003' },
    { nombre: 'Pantaloneta Under Armour Tech', categoria: 'Pantalonetas', descripcion: 'Pantaloneta UA con tejido ultraligero', precio: 55000, stock: 12, sku: 'PAN-004' },
    { nombre: 'Pantaloneta Colombia Réplica', categoria: 'Pantalonetas', descripcion: 'Pantaloneta réplica de la selección Colombia', precio: 50000, stock: 14, sku: 'PAN-005' },

    // Cintas deportivas (4)
    { nombre: 'Cinta Cabeza Nike Swoosh', categoria: 'Cintas deportivas', descripcion: 'Cinta para cabeza Nike absorbente de sudor', precio: 22000, stock: 25, sku: 'CIN-001' },
    { nombre: 'Pack 3 Cintas Elásticas Sport', categoria: 'Cintas deportivas', descripcion: 'Pack de 3 cintas elásticas colores variados', precio: 15000, stock: 30, sku: 'CIN-002' },
    { nombre: 'Cinta Kinesiotape 5m', categoria: 'Cintas deportivas', descripcion: 'Cinta kinesiológica para prevención de lesiones', precio: 18000, stock: 20, sku: 'CIN-003' },
    { nombre: 'Muñequera Deportiva Nike x2', categoria: 'Cintas deportivas', descripcion: 'Par de muñequeras Nike absorbentes de sudor', precio: 20000, stock: 28, sku: 'CIN-004' },

    // Protectores (5)
    { nombre: 'Canilleras Nike Charge', categoria: 'Protectores', descripcion: 'Canilleras livianas con protección de impacto', precio: 35000, stock: 20, sku: 'PRO-001' },
    { nombre: 'Canilleras Adidas Predator', categoria: 'Protectores', descripcion: 'Canilleras Adidas con tecnología de absorción', precio: 40000, stock: 18, sku: 'PRO-002' },
    { nombre: 'Protector Bucal Deportivo', categoria: 'Protectores', descripcion: 'Protector bucal moldeable para deportes de contacto', precio: 15000, stock: 25, sku: 'PRO-003' },
    { nombre: 'Protector de Tobillo con Velcro', categoria: 'Protectores', descripcion: 'Protector reforzado para tobillo con cierre velcro', precio: 28000, stock: 15, sku: 'PRO-004' },
    { nombre: 'Coderas Protectoras Par', categoria: 'Protectores', descripcion: 'Par de coderas de protección para arqueros', precio: 32000, stock: 10, sku: 'PRO-005' },

    // Toallas deportivas (4)
    { nombre: 'Toalla Microfibra Sport 80x40cm', categoria: 'Toallas deportivas', descripcion: 'Toalla de microfibra ultra absorbente y compacta', precio: 18000, stock: 30, sku: 'TOA-001' },
    { nombre: 'Toalla Enfriamiento Cooling', categoria: 'Toallas deportivas', descripcion: 'Toalla de enfriamiento instantáneo para deportistas', precio: 25000, stock: 20, sku: 'TOA-002' },
    { nombre: 'Toalla Nike Fundamental', categoria: 'Toallas deportivas', descripcion: 'Toalla grande Nike de algodón 100%', precio: 45000, stock: 12, sku: 'TOA-003' },
    { nombre: 'Toalla Compacta Gym Pack', categoria: 'Toallas deportivas', descripcion: 'Toalla compacta con estuche para deportes', precio: 15000, stock: 35, sku: 'TOA-004' },

    // Hielo (3)
    { nombre: 'Bolsa de Hielo 2kg', categoria: 'Hielo', descripcion: 'Bolsa de hielo picado para bebidas y enfriamiento', precio: 3000, stock: 50, sku: 'HIE-001' },
    { nombre: 'Bolsa de Hielo 5kg', categoria: 'Hielo', descripcion: 'Bolsa grande de hielo para hieleras y eventos', precio: 6000, stock: 30, sku: 'HIE-002' },
    { nombre: 'Gel Frío Instantáneo Deportivo', categoria: 'Hielo', descripcion: 'Compresa de gel frío instantáneo para lesiones', precio: 8000, stock: 25, sku: 'HIE-003' },

    // Vasos desechables (3)
    { nombre: 'Vasos Desechables 7oz x50', categoria: 'Vasos desechables', descripcion: 'Paquete de 50 vasos desechables de 7 onzas', precio: 5000, stock: 40, sku: 'VAS-001' },
    { nombre: 'Vasos Desechables 12oz x25', categoria: 'Vasos desechables', descripcion: 'Paquete de 25 vasos grandes de 12 onzas', precio: 6000, stock: 35, sku: 'VAS-002' },
    { nombre: 'Vasos Biodegradables 8oz x30', categoria: 'Vasos desechables', descripcion: 'Vasos ecológicos biodegradables para eventos', precio: 8000, stock: 20, sku: 'VAS-003' },

    // Implementos deportivos (4)
    { nombre: 'Bomba Inflador Balones', categoria: 'Implementos deportivos', descripcion: 'Bomba manual de doble acción para inflar balones', precio: 15000, stock: 20, sku: 'IMP-001' },
    { nombre: 'Red Portería Mini 1.2x0.8m', categoria: 'Implementos deportivos', descripcion: 'Red de portería pequeña para entrenamientos', precio: 55000, stock: 8, sku: 'IMP-002' },
    { nombre: 'Pechera Entrenamiento Amarilla', categoria: 'Implementos deportivos', descripcion: 'Pechera de malla para diferenciar equipos', precio: 8000, stock: 30, sku: 'IMP-003' },
    { nombre: 'Cronómetro Digital Deportivo', categoria: 'Implementos deportivos', descripcion: 'Cronómetro digital con memoria y alarma', precio: 25000, stock: 15, sku: 'IMP-004' },
];

// ─── UTILIDADES ──────────────────────────────────────────────────────────────
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

// ─── FUNCIÓN PRINCIPAL DE AUTO-SEED ──────────────────────────────────────────
const autoSeed = async (conn) => {
    try {
        console.log('🌱 Iniciando verificación de población de base de datos...');

        // 0. Detectar columna de precio en canchas
        const [canchasCols] = await conn.query('SHOW COLUMNS FROM canchas');
        const canchaFields = canchasCols.map(c => c.Field);
        let priceField = 'precio_hora';
        
        if (!canchaFields.includes('precio_hora')) {
            if (canchaFields.includes('precio')) priceField = 'precio';
            else if (canchaFields.includes('valor')) priceField = 'valor';
            else if (canchaFields.includes('precio_alquiler')) priceField = 'precio_alquiler';
        }
        console.log(`🔍 Columna de precio detectada: "${priceField}"`);

        // Verificar si la tabla productos tiene columna SKU, si no, agregarla
        const [prodCols] = await conn.query('SHOW COLUMNS FROM productos');
        const prodColNames = prodCols.map(c => c.Field);
        if (!prodColNames.includes('sku')) {
            await conn.query('ALTER TABLE productos ADD COLUMN sku VARCHAR(50) DEFAULT NULL');
            console.log('  ✅ Columna SKU agregada a productos');
        }

        // ═══════════════════════════════════════════════════════════════════════
        // 1. USUARIOS (30 clientes + admin + testuser)
        // ═══════════════════════════════════════════════════════════════════════
        const [usersCount] = await conn.query('SELECT COUNT(*) as total FROM usuarios');
        console.log(`📊 Usuarios actuales: ${usersCount[0].total}`);
        
        let clientUsers = [];
        if (usersCount[0].total < 10) {
            console.log('👥 Poblando usuarios...');
            
            // Admin
            const adminHash = await bcrypt.hash('admin123', SALT_ROUNDS);
            const [existAdmin] = await conn.query('SELECT id FROM usuarios WHERE username = ?', ['admin']);
            if (existAdmin.length === 0) {
                await conn.query(
                    'INSERT INTO usuarios (username, password, rol, email, telefono) VALUES (?, ?, ?, ?, ?)',
                    ['admin', adminHash, 'admin', 'admin@fitcanchas.com', '3001234567']
                );
                console.log('  ✅ Usuario admin creado');
            } else {
                await conn.query('UPDATE usuarios SET password = ?, rol = ? WHERE username = ?', [adminHash, 'admin', 'admin']);
            }

            // Testuser
            const testHash = await bcrypt.hash('test1234', SALT_ROUNDS);
            const [existTest] = await conn.query('SELECT id FROM usuarios WHERE username = ?', ['testuser']);
            if (existTest.length === 0) {
                await conn.query(
                    'INSERT INTO usuarios (username, password, rol, email, telefono) VALUES (?, ?, ?, ?, ?)',
                    ['testuser', testHash, 'cliente', 'testuser@correo.com', '3009999999']
                );
            } else {
                await conn.query('UPDATE usuarios SET password = ?, rol = ? WHERE username = ?', [testHash, 'cliente', 'testuser']);
            }

            // 30 clientes colombianos
            const clienteHash = await bcrypt.hash('cliente123', SALT_ROUNDS);
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
            console.log('  ✅ 30 clientes colombianos creados');
        }

        const [allUsers] = await conn.query('SELECT id, username, rol FROM usuarios');
        clientUsers = allUsers.filter(u => u.rol === 'cliente');

        // ═══════════════════════════════════════════════════════════════════════
        // 2. INVENTARIO (balones, petos)
        // ═══════════════════════════════════════════════════════════════════════
        // ─── Cantidades necesarias solicitadas por el usuario ───────────────────
        const INV_BALONES   = 300;
        const INV_PETOS_R   = 2000;
        const INV_PETOS_A   = 2000;

        const [invCount] = await conn.query('SELECT COUNT(*) as total FROM inventario');
        if (invCount[0].total === 0) {
            console.log('📦 Poblando inventario de implementos...');
            await conn.query(
                `INSERT INTO inventario (articulo, color, cantidad_total, cantidad_disponible) VALUES 
                ('Balón', NULL, ?, ?),
                ('Peto', 'Rojo', ?, ?),
                ('Peto', 'Azul', ?, ?)`,
                [INV_BALONES, INV_BALONES, INV_PETOS_R, INV_PETOS_R, INV_PETOS_A, INV_PETOS_A]
            );
            console.log(`  ✅ Inventario creado: ${INV_BALONES} balones, ${INV_PETOS_R} petos rojos, ${INV_PETOS_A} petos azules`);
        } else {
            // Actualizar cantidades si no coinciden con lo requerido (fix para cambiar de 95/480 a 300/2000)
            const [invRows] = await conn.query('SELECT articulo, color, cantidad_total FROM inventario');
            for (const row of invRows) {
                let requiredTotal = 0;
                if (row.articulo === 'Balón') requiredTotal = INV_BALONES;
                else if (row.articulo === 'Peto' && row.color === 'Rojo') requiredTotal = INV_PETOS_R;
                else if (row.articulo === 'Peto' && row.color === 'Azul') requiredTotal = INV_PETOS_A;

                if (requiredTotal > 0 && row.cantidad_total !== requiredTotal) {
                    const diff = requiredTotal - row.cantidad_total;
                    await conn.query(
                        `UPDATE inventario 
                         SET cantidad_total = ?, 
                             cantidad_disponible = GREATEST(0, cantidad_disponible + ?)
                         WHERE articulo = ? AND (color = ? OR (color IS NULL AND ? IS NULL))`,
                        [requiredTotal, diff, row.articulo, row.color, row.color]
                    );
                    console.log(`  🔧 Inventario actualizado: ${row.articulo} ${row.color || ''} → ${requiredTotal} unidades`);
                }
            }
        }

        // ═══════════════════════════════════════════════════════════════════════
        // 3. CANCHAS (exactamente 45)
        // ═══════════════════════════════════════════════════════════════════════
        const [canchasCount] = await conn.query('SELECT COUNT(*) as total FROM canchas');
        console.log(`📊 Canchas actuales: ${canchasCount[0].total}`);
        
        let currentCount = canchasCount[0].total;
        if (currentCount < 45) {
            console.log(`⚽ Poblando canchas hasta llegar a 45 (actuales: ${currentCount})...`);
            for (let i = 0; i < NOMBRES_CANCHAS.length && currentCount < 45; i++) {
                const nombre = NOMBRES_CANCHAS[i];
                const tipo = i < 20 ? '11v11' : '7v7';
                const precio = tipo === '11v11' ? 100000 : 60000;
                
                const [existe] = await conn.query('SELECT id FROM canchas WHERE nombre = ?', [nombre]);
                if (existe.length === 0) {
                    await conn.query(
                        `INSERT INTO canchas (nombre, tipo, ${priceField}) VALUES (?, ?, ?)`,
                        [nombre, tipo, precio]
                    );
                    currentCount++;
                }
            }
            console.log(`  ✅ Canchas creadas. Total ahora: ${currentCount}`);
        }

        const [todasCanchas] = await conn.query(`SELECT id, nombre, tipo, ${priceField} as precio FROM canchas ORDER BY id`);
        console.log(`  📊 Total canchas en BD: ${todasCanchas.length}`);

        // ═══════════════════════════════════════════════════════════════════════
        // 4. RESERVAS (45 canchas × 8 horarios × 3 días = 1,080)
        // ═══════════════════════════════════════════════════════════════════════
        const [reservasCount] = await conn.query('SELECT COUNT(*) as total FROM reservas');
        console.log(`📊 Reservas actuales: ${reservasCount[0].total}`);
        
        const totalReservasRequeridas = todasCanchas.length * FRANJAS_HORARIAS.length * FECHAS_RESERVAS.length;
        console.log(`📊 Reservas requeridas para las 3 fechas: ${totalReservasRequeridas} (fechas: ${FECHAS_RESERVAS.join(', ')})`);
        
        if (reservasCount[0].total < 1080 && clientUsers.length > 0 && todasCanchas.length > 0) {
            console.log(`📅 Generando ${totalReservasRequeridas} reservas (${todasCanchas.length} canchas × ${FRANJAS_HORARIAS.length} horarios × ${FECHAS_RESERVAS.length} días)...`);
            let reservasCreadas = 0;
            let reservasBatch = [];
            const BATCH_SIZE = 100;

            for (const fecha of FECHAS_RESERVAS) {
                for (const cancha of todasCanchas) {
                    for (const hora of FRANJAS_HORARIAS) {
                        // Verificar si ya existe
                        const [existe] = await conn.query(
                            'SELECT id FROM reservas WHERE cancha_id = ? AND fecha_reserva = ? AND hora_inicio = ?',
                            [cancha.id, fecha, hora]
                        );
                        
                        if (existe.length > 0) continue;

                        const cliente = randomItem(clientUsers);
                        const estados = ['activa', 'activa', 'activa', 'activa', 'activa', 'activa', 'activa', 'finalizada', 'finalizada', 'cancelada'];
                        const estado = randomItem(estados);
                        const metodo = randomItem(METODOS_PAGO);
                        const horas = randomInt(1, 2);
                        
                        const precioCancha = parseFloat(cancha.precio) || (cancha.tipo === '11v11' ? 100000 : 60000);
                        const total = precioCancha * horas;

                        const es11 = cancha.tipo === '11v11';
                        const bPrestados = 1;
                        const rPrestados = es11 ? 11 : 7;
                        const aPrestados = es11 ? 11 : 7;

                        reservasBatch.push([
                            cliente.username, cancha.id, fecha, hora, horas,
                            bPrestados, rPrestados, aPrestados,
                            estado, metodo, total
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
                            
                            if (reservasCreadas % 500 === 0) {
                                console.log(`  ... ${reservasCreadas} reservas creadas`);
                            }
                        }
                    }
                }
            }

            // Insertar batch restante
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

        // ═══════════════════════════════════════════════════════════════════════
        // 5. PRODUCTOS (~100 productos con SKU)
        // ═══════════════════════════════════════════════════════════════════════
        const [prodCount] = await conn.query('SELECT COUNT(*) as total FROM productos');
        console.log(`📊 Productos actuales: ${prodCount[0].total}`);
        
        if (prodCount[0].total < PRODUCTOS.length) {
            console.log('🛍️ Generando catálogo de productos...');
            for (const prod of PRODUCTOS) {
                const [existe] = await conn.query('SELECT id FROM productos WHERE nombre = ?', [prod.nombre]);
                if (existe.length === 0) {
                    await conn.query(
                        `INSERT INTO productos (nombre, precio, stock, descripcion, categoria, imagen_url, estado, sku)
                         VALUES (?, ?, ?, ?, ?, '', 'activo', ?)`,
                        [prod.nombre, prod.precio, prod.stock, prod.descripcion, prod.categoria, prod.sku]
                    );
                } else {
                    // Actualizar SKU si no tiene
                    await conn.query(
                        'UPDATE productos SET sku = ? WHERE nombre = ? AND (sku IS NULL OR sku = "")',
                        [prod.sku, prod.nombre]
                    );
                }
            }
            console.log(`  ✅ Catálogo de ${PRODUCTOS.length} productos creado`);
        }

        const [productosDisponibles] = await conn.query("SELECT id, nombre, precio, stock FROM productos WHERE estado = 'activo'");

        // ═══════════════════════════════════════════════════════════════════════
        // 6. PEDIDOS/COMPRAS (150)
        // ═══════════════════════════════════════════════════════════════════════
        const [pedidosCount] = await conn.query('SELECT COUNT(*) as total FROM pedidos');
        console.log(`📊 Pedidos/compras actuales: ${pedidosCount[0].total}`);
        
        if (pedidosCount[0].total < 100 && clientUsers.length > 0 && productosDisponibles.length > 0) {
            console.log('💳 Generando historial de 150 compras...');
            let pedidosCreados = 0;
            const TARGET_PEDIDOS = 150;
            const estadosPedido = ['completado', 'completado', 'completado', 'completado', 'completado', 'completado', 'completado', 'pendiente', 'cancelado'];

            for (let i = 0; i < TARGET_PEDIDOS; i++) {
                const cliente = randomItem(clientUsers);
                const metodo = randomItem(METODOS_PAGO);
                const fechaPedido = randomDate(60);
                const numItems = randomInt(1, 5);
                const estadoPedido = randomItem(estadosPedido);
                
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
                        const cantidad = randomInt(1, 3);
                        productosSeleccionados.push({
                            producto_id: prod.id,
                            cantidad: cantidad,
                            precio_unitario: parseFloat(prod.precio)
                        });
                    }
                }

                if (productosSeleccionados.length === 0) continue;

                const total = productosSeleccionados.reduce((sum, p) => sum + (p.precio_unitario * p.cantidad), 0);
                const horaCompra = `${randomInt(8, 21)}:${randomInt(0, 59).toString().padStart(2, '0')}:00`;

                const [pedidoResult] = await conn.query(
                    `INSERT INTO pedidos (usuario_id, nombre_cliente, total, estado, metodo_pago, fecha_creacion)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [cliente.id, cliente.username, total, estadoPedido, metodo, `${fechaPedido} ${horaCompra}`]
                );

                const pedidoId = pedidoResult.insertId;

                for (const det of productosSeleccionados) {
                    await conn.query(
                        `INSERT INTO pedido_detalle (pedido_id, producto_id, cantidad, precio_unitario)
                         VALUES (?, ?, ?, ?)`,
                        [pedidoId, det.producto_id, det.cantidad, det.precio_unitario]
                    );
                    
                    // Solo descontar stock en compras completadas
                    if (estadoPedido === 'completado') {
                        await conn.query(
                            'UPDATE productos SET stock = GREATEST(0, stock - ?) WHERE id = ?',
                            [det.cantidad, det.producto_id]
                        );
                    }
                }
                pedidosCreados++;
                
                if (pedidosCreados % 50 === 0) {
                    console.log(`  ... ${pedidosCreados} compras registradas`);
                }
            }
            console.log(`  ✅ ${pedidosCreados} compras registradas con éxito`);
        }

        // ═══════════════════════════════════════════════════════════════════════
        // 7. SINCRO DE INVENTARIO (según reservas pico simultáneas para realismo)
        // ═══════════════════════════════════════════════════════════════════════
        console.log('🔧 Actualizando implementos prestados en reservas existentes para coincidir con la regla...');
        await conn.query(`
            UPDATE reservas r
            JOIN canchas c ON r.cancha_id = c.id
            SET r.balones_prestados = 1,
                r.petos_rojos_prestados = IF(c.tipo = '11v11', 11, 7),
                r.petos_azules_prestados = IF(c.tipo = '11v11', 11, 7)
            WHERE r.estado = 'activa'
        `);
        console.log('  ✅ Reservas existentes actualizadas con éxito');

        console.log('🔄 Sincronizando disponibilidad del inventario con las reservas...');
        const [peakRow] = await conn.query(
            `SELECT 
                fecha_reserva,
                hora_inicio,
                SUM(balones_prestados) as balones, 
                SUM(petos_rojos_prestados) as rojos, 
                SUM(petos_azules_prestados) as azules 
             FROM reservas 
             WHERE estado = 'activa' 
             GROUP BY fecha_reserva, hora_inicio 
             ORDER BY (SUM(balones_prestados) + SUM(petos_rojos_prestados)) DESC 
             LIMIT 1`
        );
        
        let balonesLent = 45; // fallbacks realistas si no hay reservas
        let rojosLent = 220;
        let azulesLent = 220;
        let peakDateStr = "N/A";

        if (peakRow.length > 0) {
            balonesLent = parseInt(peakRow[0].balones) || 0;
            rojosLent = parseInt(peakRow[0].rojos) || 0;
            azulesLent = parseInt(peakRow[0].azules) || 0;
            
            let f = peakRow[0].fecha_reserva;
            if (f instanceof Date) {
                f = f.toISOString().substring(0, 10);
            } else {
                f = String(f).substring(0, 10);
            }
            peakDateStr = `${f} ${peakRow[0].hora_inicio}`;
        }

        // Actualizar cantidades disponibles en base a lo prestado en el horario pico
        await conn.query(
            `UPDATE inventario 
             SET cantidad_disponible = GREATEST(0, cantidad_total - ?) 
             WHERE articulo = 'Balón'`,
            [balonesLent]
        );
        await conn.query(
            `UPDATE inventario 
             SET cantidad_disponible = GREATEST(0, cantidad_total - ?) 
             WHERE articulo = 'Peto' AND color = 'Rojo'`,
            [rojosLent]
        );
        await conn.query(
            `UPDATE inventario 
             SET cantidad_disponible = GREATEST(0, cantidad_total - ?) 
             WHERE articulo = 'Peto' AND color = 'Azul'`,
            [azulesLent]
        );
        console.log(`  ✅ Disponibilidad de inventario sincronizada para el horario pico (${peakDateStr}):`);
        console.log(`     - Balones en uso (pico): ${balonesLent}`);
        console.log(`     - Petos Rojos en uso (pico): ${rojosLent}`);
        console.log(`     - Petos Azules en uso (pico): ${azulesLent}`);

        console.log('');
        console.log('═══════════════════════════════════════════════════');
        console.log('✅ Finalizó la verificación/población de la BD.');
        console.log('═══════════════════════════════════════════════════');
    } catch (e) {
        console.error('❌ Error en el proceso de auto-seeding:', e.message);
        console.error(e.stack);
    }
};

module.exports = { autoSeed };
