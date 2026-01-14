const express = require('express');
const router = express.Router();
const serviciosController = require('../controllers/servicios.controller');

// =============================================
// RUTAS PÚBLICAS
// =============================================

// GET /api/servicios - Obtener todos los servicios activos
router.get('/', serviciosController.obtenerServicios);

// GET /api/servicios/:id - Obtener un servicio específico
router.get('/:id', serviciosController.obtenerServicioPorId);

module.exports = router;