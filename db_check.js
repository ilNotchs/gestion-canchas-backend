const db = require('./src/config/db');

async function run() {
    const [rows] = await db.query("SHOW COLUMNS FROM reservas");
    console.log(rows);
    process.exit(0);
}
run();
