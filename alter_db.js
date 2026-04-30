const db = require('./src/config/db');

async function run() {
    try {
        await db.query("ALTER TABLE reservas ADD COLUMN total INT DEFAULT 0");
        console.log("Columna 'total' añadida exitosamente.");
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log("La columna 'total' ya existe.");
        } else {
            console.error(e);
        }
    }
    process.exit(0);
}
run();
