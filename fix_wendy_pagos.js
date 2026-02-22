const db = require('./config/db');

async function fix() {
    try {
        console.log("Fixing duplicated commissions for Wendy Miranda on Feb 18th...");

        // Find appointments for Wendy on Feb 18
        const [citas] = await db.query(`
            SELECT c.id_cita, c.precio
            FROM citas c
            WHERE c.email_manicurista = 'wendymiranda100@gmail.com'
            AND DATE(c.fecha) = '2026-02-18'
        `);

        for (let cita of citas) {
            // Find payments for this appointment
            const [pagos] = await db.query('SELECT id_pago, monto FROM pagos WHERE id_cita = ? ORDER BY id_pago ASC', [cita.id_cita]);

            if (pagos.length > 1) {
                console.log(\`Found appointment \${cita.id_cita} with \${pagos.length} payments. Price: \${cita.precio}\`);
                
                // Assuming 50% commission for Wendy (as shown in screenshots)
                const totalCommission = cita.precio * 0.5;
                
                // We apportion the commission based on the payment amount
                for (let pago of pagos) {
                    const proportionalCommission = pago.monto * 0.5;
                    console.log(\`  Updating payment \${pago.id_pago} (Monto: \${pago.monto}) -> \${proportionalCommission} commission\`);
                    
                    await db.query('UPDATE pagos SET comision_manicurista = ? WHERE id_pago = ?', [proportionalCommission, pago.id_pago]);
                }
            } else if (pagos.length === 1) {
               // Ensure single payments are exactly 50%
               const correctComm = cita.precio * 0.5;
               await db.query('UPDATE pagos SET comision_manicurista = ? WHERE id_pago = ?', [correctComm, pagos[0].id_pago]);
            }
        }
        
        console.log("Fix complete.");
    } catch (e) {
        console.error("Error:", e);
    } finally {
        process.exit(0);
    }
}
fix();
