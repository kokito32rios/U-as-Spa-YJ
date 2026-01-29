const db = require('./config/db');

async function checkPaymentDates() {
    try {
        const [pagos] = await db.query(`
            SELECT 
                p.id_pago,
                p.fecha_pago_cliente,
                DATE(p.fecha_pago_cliente) as fecha_solo,
                p.monto_total,
                p.estado_pago_cliente,
                c.fecha as fecha_cita
            FROM pagos p
            INNER JOIN citas c ON p.id_cita = c.id_cita
            WHERE p.estado_pago_cliente = 'pagado'
            AND DATE(p.fecha_pago_cliente) >= '2026-01-27'
            ORDER BY p.fecha_pago_cliente DESC
        `);

        console.log('\n=== PAGOS RECIENTES (desde 27 ene) ===\n');
        pagos.forEach(p => {
            console.log(`ID Pago: ${p.id_pago}`);
            console.log(`Fecha Pago Completa: ${p.fecha_pago_cliente}`);
            console.log(`Fecha Pago (solo): ${p.fecha_solo}`);
            console.log(`Fecha Cita: ${p.fecha_cita}`);
            console.log(`Monto: $${p.monto_total}`);
            console.log(`Estado: ${p.estado_pago_cliente}`);
            console.log('---');
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkPaymentDates();
