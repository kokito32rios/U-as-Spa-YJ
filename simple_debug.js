require('dotenv').config();
const db = require('./config/db');

async function simpleCheck() {
    try {
        // Verificar citas sin JOIN
        const [citasSinJoin] = await db.query(`
            SELECT COUNT(*) as total
            FROM citas
            WHERE email_manicurista = 'manicurista@spa.com' 
            AND estado = 'completada'
            AND YEAR(fecha) = 2026 
            AND MONTH(fecha) = 1
        `);
        console.log('Citas SIN JOIN:', citasSinJoin[0].total);

        // Verificar citas CON JOIN
        const [citasConJoin] = await db.query(`
            SELECT COUNT(*) as total
            FROM citas c
            JOIN servicios s ON c.id_servicio = s.id_servicio
            JOIN usuarios u ON c.email_cliente = u.email
            WHERE c.email_manicurista = 'manicurista@spa.com' 
            AND c.estado = 'completada'
            AND YEAR(c.fecha) = 2026 
            AND MONTH(c.fecha) = 1
        `);
        console.log('Citas CON JOIN:', citasConJoin[0].total);

        // Ver los datos brutos de las citas
        const [detalle] = await db.query(`
            SELECT id_cita, email_cliente, id_servicio, precio
            FROM citas
            WHERE email_manicurista = 'manicurista@spa.com' 
            AND estado = 'completada'
            AND YEAR(fecha) = 2026 
            AND MONTH(fecha) = 1
        `);
        console.log('\nDetalle de citas:', JSON.stringify(detalle, null, 2));

        await db.end();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

simpleCheck();
