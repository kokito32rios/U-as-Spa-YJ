const auth = require('./middleware/auth.middleware');
console.log('Whole export:', auth);
console.log('verificarToken type:', typeof auth.verificarToken);

const { verificarToken } = require('./middleware/auth.middleware');
console.log('Destructured verificarToken type:', typeof verificarToken);
