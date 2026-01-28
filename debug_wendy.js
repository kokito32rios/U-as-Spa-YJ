require('dotenv').config();
const db = require('./config/db');

async function debugWendy() {
    try {
        console.log('--- Buscando usuarios "Wendy" ---');
        const [users] = await db.query("SELECT * FROM usuarios WHERE nombre LIKE '%Wendy%' OR nombre LIKE '%wendy%'");
        console.log(users);

        if (users.length > 0) {
            const email = users[0].email;
            console.log(`--- Buscando citas para ${email} ---`);
            const [citas] = await db.query(`
                SELECT id_cita, fecha, hora_inicio, estado, precio 
                FROM citas 
                WHERE email_manicurista = ? 
                ORDER BY fecha DESC
            `, [email]);
            console.log(citas);
        } else {
            console.log('No se encontró manicurista llamada Wendy');
        }

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

debugWendy();
