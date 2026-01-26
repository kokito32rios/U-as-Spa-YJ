const express = require('express');
const router = express.Router();
const citasController = require('../controllers/citas.controller');
const { verificarToken, soloAdmin } = require('../middleware/auth.middleware');

// =============================================
// RUTAS PROTEGIDAS (requieren autenticación)
// =============================================

// GET /api/citas - Obtener todas las citas
router.get('/', verificarToken, citasController.obtenerCitas);

// POST /api/citas - Crear nueva cita
router.post('/', verificarToken, citasController.crearCita);

// PUT /api/citas/:id - Actualizar cita
router.put('/:id', verificarToken, citasController.actualizarCita);

// DELETE /api/citas/:id - Eliminar cita
router.delete('/:id', verificarToken, citasController.eliminarCita);

// GET /api/citas/manicuristas - Obtener manicuristas disponibles
router.get('/helpers/manicuristas', verificarToken, citasController.obtenerManicuristasDisponibles);

// GET /api/citas/clientes - Obtener clientes
router.get('/helpers/clientes', verificarToken, citasController.obtenerClientes);

// GET /api/citas/horarios-disponibles - Obtener horarios disponibles
router.get('/helpers/horarios-disponibles', verificarToken, citasController.obtenerHorariosDisponibles);

// GET /api/citas/helpers/agenda - Obtener citas para el calendario
router.get('/helpers/agenda', verificarToken, citasController.obtenerCitasAgenda);

module.exports = router;