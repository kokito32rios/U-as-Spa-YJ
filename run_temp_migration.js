require('dotenv').config();
const db = require('./config/db');

async function runMigration() {
    try {
        console.log('Running migration...');
        // Attempt to drop the index. If it doesn't exist, this might throw specific error or warning.
        // We use a try-catch to handle the case where it might already be gone.
        try {
            await db.query('ALTER TABLE horarios_trabajo DROP INDEX uk_manicurista_dia');
            console.log('✅ Constraint uk_manicurista_dia dropped successfully.');
        } catch (error) {
            // Check if error is because index does not exist (Error 1091)
            if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
                console.log('ℹ️ Constraint uk_manicurista_dia does not exist (already removed).');
            } else {
                throw error;
            }
        }
        console.log('Migration completed.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
