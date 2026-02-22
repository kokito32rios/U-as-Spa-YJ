const db = require('./config/db');

async function check() {
    try {
        const [citas] = await db.query(`
            SELECT c.id_cita, c.precio, p.monto, p.metodo_pago_cliente, p.comision_manicurista
            FROM citas c
            JOIN pagos p ON c.id_cita = p.id_cita
            WHERE c.email_manicurista = 'wendymiranda100@gmail.com' -- Assuming this is her email, I will use LIKE
            OR c.email_manicurista LIKE '%wendy%'
            AND DATE(c.fecha) = '2026-02-18'
        `);
        console.log("Pagos rows for Wendy on 18/02/2026:");
        console.table(citas);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
check();
