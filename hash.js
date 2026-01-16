// =============================================
// SCRIPT PARA GENERAR HASHES DE CONTRASEÑAS
// =============================================
// Ejecutar: node generar_hash.js

const bcrypt = require('bcrypt');

async function generarHashes() {
    const passwords = [
        { nombre: 'Admin', password: 'admin123' },
        { nombre: 'Manicurista', password: 'mani123' },
        { nombre: 'Cliente', password: 'cliente123' }
    ];

    console.log('\n=== HASHES GENERADOS ===\n');

    for (const user of passwords) {
        const hash = await bcrypt.hash(user.password, 10);
        console.log(`${user.nombre}:`);
        console.log(`Password: ${user.password}`);
        console.log(`Hash: ${hash}`);
        console.log('---\n');
    }
}

generarHashes().catch(console.error);