const express = require('express');
const router = express.Router();
const galeriaController = require('../controllers/galeria.controller');
const { authMiddleware } = require('../controllers/auth.controller');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// =============================================
// CONFIGURACIÓN MULTER
// =============================================
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../public/uploads/galeria');
        // Crear carpeta si no existe
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Nombre único: fecha + random + extensión
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, webp)'));
    }
});

// =============================================
// RUTAS
// =============================================

// Obtener galería (Admin)
router.get('/', authMiddleware, galeriaController.obtenerGaleriaAdmin);

// Subir imagen
router.post('/subir', (req, res, next) => {
    console.log('DEBUG: Route /subir hit');
    next();
}, authMiddleware, upload.single('imagen'), galeriaController.subirImagen);

// Eliminar imagen
router.delete('/:id', authMiddleware, galeriaController.eliminarImagen);

// Toggle principal
router.patch('/:id/principal', authMiddleware, galeriaController.togglePrincipal);

module.exports = router;
