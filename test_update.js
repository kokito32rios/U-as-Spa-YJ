
require('dotenv').config();
const db = require('./config/db');

async function testUpdate() {
    try {
        console.log('🧪 Testing UPDATE persistence...');

        // 0. IDs Validos
        const [manicuristas] = await db.query('SELECT email FROM usuarios WHERE id_rol=2 LIMIT 1');
        const [servicios] = await db.query('SELECT id_servicio FROM servicios LIMIT 1');

        if (!manicuristas.length) throw new Error("No manicurists");

        const mEmail = manicuristas[0].email;
        const sId = servicios[0].id_servicio;
        const testName = 'Update Survivor ' + Date.now();

        // 1. Create
        const [res] = await db.query(`
            INSERT INTO citas 
            (email_manicurista, id_servicio, fecha, hora_inicio, hora_fin, estado, nombre_cliente)
            VALUES (?, ?, CURDATE(), '12:00:00', '13:00:00', 'pendiente', ?)
        `, [mEmail, sId, testName]);

        const id = res.insertId;
        console.log(`Created Cita ${id} with Name: ${testName}`);

        // 2. Simulate Backend UPDATE Logic (what controller does)
        // Scenario A: Frontend sends name again (Full payload)
        console.log('Testing Scenario A: Update with Name sent...');
        await db.query(`UPDATE citas SET estado = ?, nombre_cliente = ? WHERE id_cita = ?`,
            ['confirmada', testName, id]);

        const [rowsA] = await db.query('SELECT nombre_cliente FROM citas WHERE id_cita = ?', [id]);
        if (rowsA[0].nombre_cliente !== testName) {
            console.error('❌ Failed Scenario A. Name lost.');
        } else {
            console.log('✅ Scenario A Passed.');
        }

        // Scenario B: Update ONLY status (Simulation of partial update, though Admin Frontend sends all)
        console.log('Testing Scenario B: Update only status...');
        await db.query(`UPDATE citas SET estado = ? WHERE id_cita = ?`,
            ['completada', id]);

        const [rowsB] = await db.query('SELECT nombre_cliente FROM citas WHERE id_cita = ?', [id]);
        if (rowsB[0].nombre_cliente !== testName) {
            console.error('❌ Failed Scenario B. Name lost.');
        } else {
            console.log('✅ Scenario B Passed.');
        }

        // Cleanup
        await db.query('DELETE FROM citas WHERE id_cita = ?', [id]);

    } catch (e) {
        console.error(e);
    }
    process.exit();
}

testUpdate();
