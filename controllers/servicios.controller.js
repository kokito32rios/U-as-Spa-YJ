const db = require('../config/db');

// =============================================
// OBTENER TODOS LOS SERVICIOS ACTIVOS CON IMAGEN
// =============================================
exports.obtenerServicios = async (req, res) => {
    try {
        const query = `
            SELECT 
                s.id_servicio,
                s.nombre,
                s.precio,
                s.duracion_minutos,
                s.descripcion,
                (
                    SELECT ti.url_imagen 
                    FROM trabajos_imagenes ti 
                    WHERE ti.id_servicio = s.id_servicio 
                    AND ti.activo = 1 
                    AND ti.imagen_principal = 1
                    LIMIT 1
                ) as url_imagen,
                (
                    SELECT COUNT(*) 
                    FROM trabajos_imagenes ti 
                    WHERE ti.id_servicio = s.id_servicio 
                    AND ti.activo = 1
                ) as total_imagenes
            FROM servicios s
            WHERE s.activo = 1
            ORDER BY s.nombre ASC
        `;

        const [servicios] = await db.query(query);

        res.json({
            success: true,
            servicios
        });

    } catch (error) {
        console.error('Error al obtener servicios:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener los servicios'
        });
    }
};

// =============================================
// OBTENER UN SERVICIO POR ID
// =============================================
exports.obtenerServicioPorId = async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
            SELECT 
                s.id_servicio,
                s.nombre,
                s.precio,
                s.duracion_minutos,
                s.descripcion,
                s.activo
            FROM servicios s
            WHERE s.id_servicio = ?
        `;

        const [servicios] = await db.query(query, [id]);

        if (servicios.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Servicio no encontrado'
            });
        }

        res.json({
            success: true,
            servicio: servicios[0]
        });

    } catch (error) {
        console.error('Error al obtener servicio:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener el servicio'
        });
    }
};