require('dotenv').config();
const db = require('./config/db');

async function debugCitasJoins() {
    try {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔍 DIAGNÓSTICO DE JOINS EN TABLA CITAS');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // 1. Citas completadas de enero 2026
        const [citas] = await db.query(`
            SELECT id_cita, fecha, email_cliente, id_servicio, email_manicurista, precio, estado
            FROM citas
            WHERE email_manicurista = 'manicurista@spa.com' 
            AND estado = 'completada'
            AND YEAR(fecha) = 2026 
            AND MONTH(fecha) = 1
        `);

        console.log(`📊 Total de citas completadas encontradas: ${citas.length}\n`);

        for (const cita of citas) {
            console.log(`\n🔸 Cita ID: ${cita.id_cita}`);
            console.log(`   Fecha: ${cita.fecha}`);
            console.log(`   Email Cliente: ${cita.email_cliente}`);
            console.log(`   ID Servicio: ${cita.id_servicio}`);
            console.log(`   Precio: $${cita.precio}`);

            // Verificar si el cliente existe
            const [cliente] = await db.query('SELECT email, nombre FROM usuarios WHERE email = ?', [cita.email_cliente]);
            if (cliente.length === 0) {
                console.log(`   ❌ PROBLEMA: El cliente "${cita.email_cliente}" NO EXISTE en la tabla usuarios`);
            } else {
                console.log(`   ✅ Cliente existe: ${cliente[0].nombre}`);
            }

            // Verificar si el servicio existe
            const [servicio] = await db.query('SELECT id_servicio, nombre FROM servicios WHERE id_servicio = ?', [cita.id_servicio]);
            if (servicio.length === 0) {
                console.log(`   ❌ PROBLEMA: El servicio ID ${cita.id_servicio} NO EXISTE en la tabla servicios`);
            } else {
                console.log(`   ✅ Servicio existe: ${servicio[0].nombre}`);
            }
        }

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 VERIFICANDO SI LA CONSULTA CON JOIN FUNCIONA:\n');

        const [citasConJoin] = await db.query(`
            SELECT c.id_cita, c.fecha, s.nombre as servicio, c.precio,
                   u.nombre as cliente_nombre, u.apellido as cliente_apellido
            FROM citas c
            JOIN servicios s ON c.id_servicio = s.id_servicio
            JOIN usuarios u ON c.email_cliente = u.email
            WHERE c.email_manicurista = 'manicurista@spa.com' 
            AND c.estado = 'completada'
            AND YEAR(c.fecha) = 2026 
            AND MONTH(c.fecha) = 1
        `);

        console.log(`✅ Citas encontradas CON JOIN: ${citasConJoin.length}`);
        citasConJoin.forEach(c => {
            console.log(`   - Cita ${c.id_cita}: ${c.servicio}, Cliente: ${c.cliente_nombre} ${c.cliente_apellido}`);
        });

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

debugCitasJoins();
