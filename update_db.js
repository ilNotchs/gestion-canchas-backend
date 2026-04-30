const db = require('./src/config/db');

async function run() {
    try {
        await db.query("UPDATE reservas SET total = 85000 WHERE total = 0 OR total IS NULL");
        console.log("Reservas existentes actualizadas.");
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
run();
