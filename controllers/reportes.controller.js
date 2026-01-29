const db = require('../config/db');

// Crear un nuevo reporte manual
exports.crearReporte = async (req, res) => {
    try {
        const { descripcion, valor } = req.body;
        const email_manicurista = req.usuario.email; // Del token

        if (!descripcion || !valor) {
            return res.status(400).json({
                success: false,
                message: 'Descripción y valor son requeridos'
            });
        }

        const query = `
            INSERT INTO reportes_manicurista (email_manicurista, fecha, descripcion, valor_reportado)
            VALUES (?, CURRENT_DATE(), ?, ?)
        `;

        await db.query(query, [email_manicurista, descripcion, valor]);

        res.json({ success: true, message: 'Reporte registrado exitosamente' });

    } catch (error) {
        console.error('Error al crear reporte:', error);
        res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
};

// Obtener reportes (con filtros de fecha y cálculo de ganancia)
exports.obtenerReportes = async (req, res) => {
    try {
        const email_manicurista = req.usuario.email;
        const { tipo, anio, mes, desde, hasta } = req.query;

        console.log('Consultando reportes:', { email_manicurista, tipo, anio, mes, desde, hasta });

        // 1. Obtener el porcentaje de comisión del manicurista
        const [config] = await db.query(`
            SELECT porcentaje FROM comisiones_manicuristas 
            WHERE email_manicurista = ? AND anio = YEAR(CURDATE())
        `, [email_manicurista]);

        const porcentaje = config.length > 0 ? config[0].porcentaje : 50;

        // 2. Construir Query de Reportes
        let query = `
            SELECT id_reporte, fecha, descripcion, valor_reportado, fecha_registro
            FROM reportes_manicurista
            WHERE email_manicurista = ?
        `;

        const params = [email_manicurista];

        // Filtros (similar a comisiones)
        if (tipo === 'mes') {
            if (anio && mes) {
                query += " AND YEAR(fecha) = ? AND MONTH(fecha) = ?";
                params.push(anio, mes);
            } else if (anio) {
                query += " AND YEAR(fecha) = ?";
                params.push(anio);
            }
        } else if (tipo === 'semana' || tipo === 'rango') {
            if (desde && hasta) {
                query += " AND fecha BETWEEN ? AND ?";
                params.push(desde, hasta);
            }
        } else {
            // Por defecto hoy si no hay filtro explícito o parámetros vacíos
            query += " AND fecha = CURRENT_DATE()";
        }

        query += ' ORDER BY fecha_registro DESC';

        const [reportes] = await db.query(query, params);

        // 3. Procesar datos y calcular totales con comisión
        const reportesProcesados = reportes.map(r => {
            const valor = parseFloat(r.valor_reportado);
            const ganancia = (valor * porcentaje) / 100;
            return {
                ...r,
                valor_reportado: valor,
                porcentaje_aplicado: porcentaje,
                ganancia_estimada: ganancia
            };
        });

        // Calcular totales
        const totalReportado = reportesProcesados.reduce((sum, r) => sum + r.valor_reportado, 0);
        const totalGanancia = reportesProcesados.reduce((sum, r) => sum + r.ganancia_estimada, 0);

        res.json({
            success: true,
            reportes: reportesProcesados,
            totalReportado,
            totalGanancia,
            porcentaje
        });

    } catch (error) {
        console.error('Error al obtener reportes:', error);
        res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
};

// Eliminar un reporte
exports.eliminarReporte = async (req, res) => {
    try {
        const { id } = req.params;
        const email_manicurista = req.usuario.email;

        // Verificar que sea del usuario y de hoy
        const checkQuery = `
            SELECT id_reporte FROM reportes_manicurista 
            WHERE id_reporte = ? AND email_manicurista = ? AND fecha = CURRENT_DATE()
        `;

        const [rows] = await db.query(checkQuery, [id, email_manicurista]);

        if (rows.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'No puedes eliminar este reporte (no existe o no es de hoy)'
            });
        }

        await db.query('DELETE FROM reportes_manicurista WHERE id_reporte = ?', [id]);

        res.json({ success: true, message: 'Reporte eliminado' });

    } catch (error) {
        console.error('Error al eliminar reporte:', error);
        res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
};

// Actualizar un reporte existente
exports.actualizarReporte = async (req, res) => {
    try {
        const { id } = req.params;
        const { descripcion, valor, fecha } = req.body;
        const email_manicurista = req.usuario.email;

        if (!descripcion || !valor || !fecha) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son requeridos'
            });
        }

        // Verificar pertenencia (solo el dueño puede editar)
        const checkQuery = `
            SELECT id_reporte FROM reportes_manicurista 
            WHERE id_reporte = ? AND email_manicurista = ?
        `;
        const [rows] = await db.query(checkQuery, [id, email_manicurista]);

        if (rows.length === 0) {
            return res.status(403).json({ success: false, message: 'No autorizado para editar este reporte' });
        }

        const updateQuery = `
            UPDATE reportes_manicurista 
            SET descripcion = ?, valor_reportado = ?, fecha = ?
            WHERE id_reporte = ?
        `;

        await db.query(updateQuery, [descripcion, valor, fecha, id]);

        res.json({ success: true, message: 'Reporte actualizado exitosamente' });

    } catch (error) {
        console.error('Error al actualizar reporte:', error);
        res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
};
