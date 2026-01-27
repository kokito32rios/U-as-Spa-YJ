require('dotenv').config();
const db = require('./config/db');

async function checkIndices() {
    try {
        const [rows] = await db.query('SHOW INDEX FROM horarios_trabajo');
        console.log('Indices on horarios_trabajo:');
        rows.forEach(row => {
            console.log(`- Key_name: ${row.Key_name}, Column_name: ${row.Column_name}, Non_unique: ${row.Non_unique}`);
        });
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkIndices();
