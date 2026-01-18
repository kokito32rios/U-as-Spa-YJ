const db = require('../config/db');

// =============================================
// OBTENER TODAS LAS CITAS (Admin)
// =============================================
exports.obtenerCitas = async (req, res) => {
    try {
        const { fecha, estado, manicurista } = req.query;

        let query = `
            SELECT 
                c.id_cita,
                c.fecha,
                c.hora_inicio,
                c.hora_fin,
                c.estado,
                c.notas_cliente,
                c.notas_manicurista,
                c.creado_en,
                c.email_cliente,
                CONCAT(uc.nombre, ' ', uc.apellido) as nombre_cliente,
                uc.telefono as telefono_cliente,
                c.email_manicurista,
                CONCAT(um.nombre, ' ', um.apellido) as nombre_manicurista,
                c.id_servicio,
                s.nombre as nombre_servicio,
                s.precio,
                s.duracion_minutos
            FROM citas c
            INNER JOIN usuarios uc ON c.email_cliente = uc.email
            INNER JOIN usuarios um ON c.email_manicurista = um.email
            INNER JOIN servicios s ON c.id_servicio = s.id_servicio
            WHERE 1=1
        `;

        const params = [];

        if (fecha) {
            query += ` AND c.fecha = ?`;
            params.push(fecha);
        }

        if (estado) {
            query += ` AND c.estado = ?`;
            params.push(estado);
        }

        if (manicurista) {
            query += ` AND c.email_manicurista = ?`;
            params.push(manicurista);
        }

        query += ` ORDER BY c.fecha DESC, c.hora_inicio DESC`;

        const [citas] = await db.query(query, params);

        res.json({
            success: true,
            citas
        });

    } catch (error) {
        console.error('Error al obtener citas:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener las citas'
        });
    }
};

// =============================================
// CREAR CITA CON VALIDACIÓN ANTI-SOLAPAMIENTO
// =============================================
exports.crearCita = async (req, res) => {
    try {
        const {
            email_cliente,
            email_manicurista,
            id_servicio,
            fecha,
            hora_inicio,
            notas_cliente
        } = req.body;

        // Validar campos requeridos
        if (!email_cliente || !email_manicurista || !id_servicio || !fecha || !hora_inicio) {
            return res.status(400).json({
                success: false,
                message: 'Faltan campos requeridos'
            });
        }
        
        // Validar formato de hora
        if (!/^\d{2}:\d{2}(:\d{2})?$/.test(hora_inicio)) {
            return res.status(400).json({
                success: false,
                message: 'Formato de hora inválido'
            });
        }

        // Obtener duración del servicio
        const [servicios] = await db.query(
            'SELECT duracion_minutos FROM servicios WHERE id_servicio = ? AND activo = 1',
            [id_servicio]
        );

        if (servicios.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Servicio no encontrado'
            });
        }

        const duracion = servicios[0].duracion_minutos;

        // Calcular hora_fin
        const [horas, minutos] = hora_inicio.split(':').map(Number);
        const totalMinutos = horas * 60 + minutos + duracion;
        const horaFin = `${Math.floor(totalMinutos / 60).toString().padStart(2, '0')}:${(totalMinutos % 60).toString().padStart(2, '0')}:00`;

        // VALIDACIÓN ANTI-SOLAPAMIENTO
        const [solapamientos] = await db.query(`
            SELECT COUNT(*) as count
            FROM citas
            WHERE email_manicurista = ?
            AND fecha = ?
            AND estado NOT IN ('cancelada', 'no_asistio')
            AND (
                (hora_inicio < ? AND hora_fin > ?) OR
                (hora_inicio < ? AND hora_fin > ?) OR
                (hora_inicio >= ? AND hora_fin <= ?)
            )
        `, [
            email_manicurista,
            fecha,
            horaFin, hora_inicio,
            horaFin, horaFin,
            hora_inicio, horaFin
        ]);

        if (solapamientos[0].count > 0) {
            return res.status(409).json({
                success: false,
                message: 'La manicurista ya tiene una cita en ese horario',
                tipo: 'solapamiento'
            });
        }

        // Insertar cita
        const [result] = await db.query(`
            INSERT INTO citas (
                email_cliente,
                email_manicurista,
                id_servicio,
                fecha,
                hora_inicio,
                hora_fin,
                estado,
                notas_cliente
            ) VALUES (?, ?, ?, ?, ?, ?, 'pendiente', ?)
        `, [
            email_cliente,
            email_manicurista,
            id_servicio,
            fecha,
            hora_inicio,
            horaFin,
            notas_cliente || null
        ]);

        res.status(201).json({
            success: true,
            message: 'Cita creada exitosamente',
            id_cita: result.insertId
        });

    } catch (error) {
        console.error('Error al crear cita:', error);
        res.status(500).json({
            success: false,
            error: 'Error al crear la cita'
        });
    }
};

// =============================================
// ACTUALIZAR CITA
// =============================================
exports.actualizarCita = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            email_cliente,
            email_manicurista,
            id_servicio,
            fecha,
            hora_inicio,
            estado,
            notas_cliente,
            notas_manicurista
        } = req.body;

        // Si se cambian datos de horario, recalcular hora_fin
        let horaFin = null;
        if (hora_inicio && id_servicio) {
            const [servicios] = await db.query(
                'SELECT duracion_minutos FROM servicios WHERE id_servicio = ?',
                [id_servicio]
            );

            if (servicios.length > 0) {
                const duracion = servicios[0].duracion_minutos;
                const [horas, minutos] = hora_inicio.split(':').map(Number);
                const totalMinutos = horas * 60 + minutos + duracion;
                horaFin = `${Math.floor(totalMinutos / 60).toString().padStart(2, '0')}:${(totalMinutos % 60).toString().padStart(2, '0')}:00`;
            }
        }

        // Construir query dinámico
        let query = 'UPDATE citas SET ';
        const params = [];
        const updates = [];

        if (email_cliente) {
            updates.push('email_cliente = ?');
            params.push(email_cliente);
        }
        if (email_manicurista) {
            updates.push('email_manicurista = ?');
            params.push(email_manicurista);
        }
        if (id_servicio) {
            updates.push('id_servicio = ?');
            params.push(id_servicio);
        }
        if (fecha) {
            updates.push('fecha = ?');
            params.push(fecha);
        }
        if (hora_inicio) {
            updates.push('hora_inicio = ?');
            params.push(hora_inicio);
        }
        if (horaFin) {
            updates.push('hora_fin = ?');
            params.push(horaFin);
        }
        if (estado) {
            updates.push('estado = ?');
            params.push(estado);
        }
        if (notas_cliente !== undefined) {
            updates.push('notas_cliente = ?');
            params.push(notas_cliente || null);
        }
        if (notas_manicurista !== undefined) {
            updates.push('notas_manicurista = ?');
            params.push(notas_manicurista || null);
        }

        query += updates.join(', ') + ' WHERE id_cita = ?';
        params.push(id);

        const [result] = await db.query(query, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cita no encontrada'
            });
        }

        res.json({
            success: true,
            message: 'Cita actualizada exitosamente'
        });

    } catch (error) {
        console.error('Error al actualizar cita:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar la cita'
        });
    }
};

// =============================================
// ELIMINAR CITA (DELETE real de la BD)
// =============================================
exports.eliminarCita = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query(`
            DELETE FROM citas
            WHERE id_cita = ?
        `, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cita no encontrada'
            });
        }

        res.json({
            success: true,
            message: 'Cita eliminada exitosamente'
        });

    } catch (error) {
        console.error('Error al eliminar cita:', error);
        res.status(500).json({
            success: false,
            error: 'Error al eliminar la cita'
        });
    }
};

// =============================================
// OBTENER MANICURISTAS DISPONIBLES
// =============================================
exports.obtenerManicuristasDisponibles = async (req, res) => {
    try {
        const [manicuristas] = await db.query(`
            SELECT email, CONCAT(nombre, ' ', apellido) as nombre_completo
            FROM usuarios
            WHERE nombre_rol = 'manicurista' AND activo = 1
            ORDER BY nombre ASC
        `);

        res.json({
            success: true,
            manicuristas
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener manicuristas'
        });
    }
};

// =============================================
// OBTENER HORARIOS DISPONIBLES
// =============================================
exports.obtenerHorariosDisponibles = async (req, res) => {
    try {
        const { manicurista, fecha, id_servicio, id_cita_excluir } = req.query;

        console.log('📅 Solicitud de horarios:', { manicurista, fecha, id_servicio, id_cita_excluir });

        if (!manicurista || !fecha || !id_servicio) {
            return res.status(400).json({
                success: false,
                message: 'Faltan parámetros requeridos'
            });
        }

        // Obtener duración del servicio
        const [servicios] = await db.query(
            'SELECT duracion_minutos FROM servicios WHERE id_servicio = ?',
            [id_servicio]
        );

        if (servicios.length === 0) {
            console.log('❌ Servicio no encontrado:', id_servicio);
            return res.status(404).json({
                success: false,
                message: 'Servicio no encontrado'
            });
        }

        const duracion = servicios[0].duracion_minutos;
        console.log('⏱️ Duración del servicio:', duracion, 'minutos');

        // Obtener día de la semana (1=lunes, 7=domingo)
        const fechaObj = new Date(fecha + 'T00:00:00');
        const diaSemana = fechaObj.getDay(); // 0=domingo, 1=lunes, ..., 6=sábado
        const diaAjustado = diaSemana === 0 ? 7 : diaSemana; // Convertir domingo de 0 a 7

        console.log('📆 Día de la semana:', diaAjustado, '(1=Lun, 7=Dom)');

        // Obtener horario laboral de la manicurista para ese día
        const [horarios] = await db.query(`
            SELECT hora_inicio, hora_fin
            FROM horarios_trabajo
            WHERE email_manicurista = ?
            AND dia_semana = ?
            AND activo = 1
        `, [manicurista, diaAjustado]);

        console.log('🕐 Horarios encontrados en BD:', horarios);

        if (horarios.length === 0) {
            console.log('⚠️ No hay horarios laborales para este día');
            return res.json({
                success: true,
                horarios: [],
                mensaje: 'La manicurista no trabaja este día'
            });
        }

        const horarioLaboral = horarios[0];
        console.log('✅ Horario laboral:', horarioLaboral);

        // Verificar si hay excepciones para esta fecha
        const [excepciones] = await db.query(`
            SELECT todo_el_dia, hora_inicio, hora_fin
            FROM excepciones_horario
            WHERE email_manicurista = ?
            AND fecha = ?
        `, [manicurista, fecha]);

        if (excepciones.length > 0 && excepciones[0].todo_el_dia) {
            console.log('🚫 Hay excepción de horario (día completo bloqueado)');
            return res.json({
                success: true,
                horarios: [],
                mensaje: 'La manicurista no está disponible este día'
            });
        }

        // Obtener citas existentes de esa manicurista en esa fecha
        let queryExcluir = '';
        const params = [manicurista, fecha];
        
        if (id_cita_excluir) {
            queryExcluir = ' AND id_cita != ?';
            params.push(id_cita_excluir);
        }

        const [citasOcupadas] = await db.query(`
            SELECT hora_inicio, hora_fin
            FROM citas
            WHERE email_manicurista = ?
            AND fecha = ?
            AND estado NOT IN ('cancelada', 'no_asistio')
            ${queryExcluir}
            ORDER BY hora_inicio
        `, params);

        console.log('📋 Citas ocupadas:', citasOcupadas);

        // Convertir horario laboral a minutos
        const [horaInicioH, horaInicioM] = horarioLaboral.hora_inicio.split(':').map(Number);
        const [horaFinH, horaFinM] = horarioLaboral.hora_fin.split(':').map(Number);
        const minutosInicio = horaInicioH * 60 + horaInicioM;
        const minutosFin = horaFinH * 60 + horaFinM;

        console.log('⏰ Rango laboral en minutos:', minutosInicio, '-', minutosFin);

        // Generar horarios disponibles cada 30 min
        const horariosDisponibles = [];
        const intervalo = 30;

        for (let minutos = minutosInicio; minutos < minutosFin; minutos += intervalo) {
            const hora = Math.floor(minutos / 60);
            const min = minutos % 60;
            const horaStr = `${hora.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:00`;
            
            // Calcular hora fin de esta cita potencial
            const minutosFinCita = minutos + duracion;
            
            // Verificar que no se pase del horario laboral
            if (minutosFinCita > minutosFin) {
                continue;
            }
            
            const horaFinCita = `${Math.floor(minutosFinCita / 60).toString().padStart(2, '0')}:${(minutosFinCita % 60).toString().padStart(2, '0')}:00`;

            // Verificar si hay solapamiento con citas existentes
            const haySolapamiento = citasOcupadas.some(cita => {
                return (
                    (horaStr >= cita.hora_inicio && horaStr < cita.hora_fin) ||
                    (horaFinCita > cita.hora_inicio && horaFinCita <= cita.hora_fin) ||
                    (horaStr <= cita.hora_inicio && horaFinCita >= cita.hora_fin)
                );
            });

            if (!haySolapamiento) {
                horariosDisponibles.push({
                    hora: horaStr.substring(0, 5),
                    disponible: true
                });
            }
        }

        console.log('✅ Horarios disponibles generados:', horariosDisponibles.length);

        res.json({
            success: true,
            horarios: horariosDisponibles
        });

    } catch (error) {
        console.error('❌ Error en obtenerHorariosDisponibles:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener horarios disponibles'
        });
    }
};

// =============================================
// OBTENER CLIENTES
// =============================================
exports.obtenerClientes = async (req, res) => {
    try {
        const [clientes] = await db.query(`
            SELECT email, CONCAT(nombre, ' ', apellido) as nombre_completo, telefono
            FROM usuarios
            WHERE nombre_rol = 'cliente' AND activo = 1
            ORDER BY nombre ASC
        `);

        res.json({
            success: true,
            clientes
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener clientes'
        });
    }
};