// Variables globales
let token = localStorage.getItem('token');
let usuarioActual = null;

// =============================================
// VERIFICAR AUTENTICACIÓN
// =============================================
if (!token) {
    window.location.href = '/login.html';
}

try {
    const payload = JSON.parse(atob(token.split('.')[1]));

    // Verificar expiración
    if (payload.exp * 1000 < Date.now()) {
        localStorage.removeItem('token');
        window.location.href = '/login.html';
    }

    // Verificar que sea admin
    if (payload.nombre_rol !== 'admin') {
        window.location.href = `/dashboard-${payload.nombre_rol}.html`;
    }

    usuarioActual = payload;

    // Mostrar bienvenida
    document.getElementById('user-welcome').textContent =
        `Bienvenid@ ${payload.nombre} ${payload.apellido}`;

} catch (e) {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
}

// =============================================
// HELPER: FETCH CON TOKEN
// =============================================
async function fetchConToken(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
    };

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login.html';
        return;
    }

    return response;
}

// =============================================
// CAMBIAR SECCIÓN
// =============================================
function cambiarSeccion(seccion) {
    // Actualizar nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    event.currentTarget.classList.add('active');

    // Actualizar secciones
    document.querySelectorAll('.content-section').forEach(s => {
        s.classList.remove('active');
    });
    document.getElementById(`seccion-${seccion}`).classList.add('active');

    // Actualizar título
    const titulos = {
        'agendamiento': 'Gestión de Agendamiento',
        'agenda': 'Agenda - Calendario',
        'servicios': 'Gestión de Servicios',
        'usuarios': 'Gestión de Usuarios',
        'comisiones': 'Gestión de Comisiones',
        'horarios': 'Gestión de Horarios',
        'galeria': 'Gestión de Galería'
    };
    document.getElementById('section-title').textContent = titulos[seccion];

    // Cargar datos según sección
    if (seccion === 'agendamiento') {
        cargarCitas();
    } else if (seccion === 'agenda') {
        inicializarAgenda();
    } else if (seccion === 'horarios') {
        inicializarHorarios();
    }
}

// =============================================
// CARGAR CITAS
// =============================================
async function cargarCitas() {
    const loader = document.getElementById('citas-loader');
    const tabla = document.getElementById('tabla-citas');
    const vacio = document.getElementById('citas-vacio');
    const tbody = document.getElementById('citas-tbody');

    loader.classList.remove('hidden');
    tabla.classList.add('hidden');
    vacio.classList.add('hidden');

    try {
        // Construir query params
        const params = new URLSearchParams();
        const fecha = document.getElementById('filtro-fecha').value;
        const estado = document.getElementById('filtro-estado').value;
        const manicurista = document.getElementById('filtro-manicurista').value;

        if (fecha) params.append('fecha', fecha);
        if (estado) params.append('estado', estado);
        if (manicurista) params.append('manicurista', manicurista);

        const response = await fetchConToken(`/api/citas?${params}`);
        const data = await response.json();

        loader.classList.add('hidden');

        if (data.success && data.citas.length > 0) {
            renderizarCitas(data.citas);
            tabla.classList.remove('hidden');
        } else {
            vacio.classList.remove('hidden');
        }

    } catch (error) {
        console.error('Error:', error);
        loader.classList.add('hidden');
        mostrarMensaje('error', '❌', 'Error', 'No se pudieron cargar las citas');
    }
}

// =============================================
// RENDERIZAR CITAS
// =============================================
function renderizarCitas(citas) {
    const tbody = document.getElementById('citas-tbody');

    tbody.innerHTML = citas.map(cita => {
        const estadoBadge = `badge-${cita.estado}`;

        return `
            <tr>
                <td>${formatearFecha(cita.fecha)}</td>
                <td>${formatearHora(cita.hora_inicio)} - ${formatearHora(cita.hora_fin)}</td>
                <td>
                    <strong>${cita.nombre_cliente}</strong><br>
                    <small>${cita.telefono_cliente}</small>
                </td>
                <td>${cita.nombre_servicio}</td>
                <td>${cita.nombre_manicurista}</td>
                <td><span class="badge ${estadoBadge}">${capitalize(cita.estado)}</span></td>
                <td>
                    <div class="table-actions">
                        <button class="btn-icon btn-edit" onclick="editarCita(${cita.id_cita})" title="Editar">
                            ✏️
                        </button>
                        ${cita.estado !== 'cancelada' ? `
                            <button class="btn-icon btn-warning" onclick="confirmarCancelar(${cita.id_cita})" title="Cancelar cita">
                                ⚠️
                            </button>
                        ` : ''}
                        <button class="btn-icon btn-delete" onclick="confirmarEliminar(${cita.id_cita})" title="Eliminar permanentemente">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// =============================================
// ABRIR MODAL NUEVA CITA
// =============================================
async function abrirModalNuevaCita() {
    document.getElementById('modal-cita-titulo').textContent = 'Nueva Cita';
    document.getElementById('form-cita').reset();
    document.getElementById('cita-id').value = '';
    document.getElementById('cita-estado').value = 'pendiente';

    // Deshabilitar botón guardar hasta que se seleccione horario
    document.getElementById('btn-guardar-cita').disabled = true;

    // Cargar datos
    await cargarClientes();
    await cargarManicuristas();
    await cargarServiciosSelect();

    // Establecer fecha mínima (hoy)
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('cita-fecha').min = hoy;

    // Mostrar modal
    const modal = document.getElementById('modal-cita');
    modal.classList.remove('hidden');

    // Scroll al top del modal
    setTimeout(() => {
        modal.scrollTop = 0;
    }, 100);
}

// =============================================
// CARGAR CLIENTES
// =============================================
async function cargarClientes() {
    try {
        const response = await fetchConToken('/api/citas/helpers/clientes');
        const data = await response.json();

        const select = document.getElementById('cita-cliente');
        select.innerHTML = '<option value="">Seleccionar cliente</option>' +
            data.clientes.map(c =>
                `<option value="${c.email}">${c.nombre_completo}</option>`
            ).join('');

    } catch (error) {
        console.error('Error:', error);
    }
}

// =============================================
// CARGAR MANICURISTAS
// =============================================
async function cargarManicuristas() {
    try {
        const response = await fetchConToken('/api/citas/helpers/manicuristas');
        const data = await response.json();

        const select = document.getElementById('cita-manicurista');
        const selectFiltro = document.getElementById('filtro-manicurista');

        const options = data.manicuristas.map(m =>
            `<option value="${m.email}">${m.nombre_completo}</option>`
        ).join('');

        select.innerHTML = '<option value="">Seleccionar manicurista</option>' + options;
        selectFiltro.innerHTML = '<option value="">Todas</option>' + options;

    } catch (error) {
        console.error('Error:', error);
    }
}

// =============================================
// CARGAR SERVICIOS SELECT
// =============================================
async function cargarServiciosSelect() {
    try {
        const response = await fetchConToken('/api/servicios');
        const data = await response.json();

        const select = document.getElementById('cita-servicio');
        select.innerHTML = '<option value="">Seleccionar servicio</option>' +
            data.servicios.map(s =>
                `<option value="${s.id_servicio}">${s.nombre} ($${s.precio.toLocaleString()} - ${s.duracion_minutos} min)</option>`
            ).join('');

    } catch (error) {
        console.error('Error:', error);
    }
}

// =============================================
// GUARDAR CITA
// =============================================
async function guardarCita() {
    const form = document.getElementById('form-cita');

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const id = document.getElementById('cita-id').value;
    const selectHora = document.getElementById('cita-hora');
    const hora = selectHora.value;

    // Validación adicional: verificar que se haya seleccionado un horario válido
    if (!hora || hora === '') {
        mostrarMensaje('warning', '⚠️', 'Horario requerido', 'Por favor selecciona un horario disponible');
        selectHora.focus();
        return;
    }

    // Verificar que el select no esté deshabilitado (no hay horarios disponibles)
    if (selectHora.disabled) {
        mostrarMensaje('warning', '⚠️', 'Sin horarios disponibles', 'No hay horarios disponibles para la fecha y manicurista seleccionadas');
        return;
    }

    const datos = {
        email_cliente: document.getElementById('cita-cliente').value,
        email_manicurista: document.getElementById('cita-manicurista').value,
        id_servicio: document.getElementById('cita-servicio').value,
        fecha: document.getElementById('cita-fecha').value,
        hora_inicio: hora + ':00',
        notas_cliente: document.getElementById('cita-notas-cliente').value
    };

    // Si es edición
    if (id) {
        datos.estado = document.getElementById('cita-estado').value;
        datos.notas_manicurista = document.getElementById('cita-notas-manicurista').value;
    }

    const btn = document.getElementById('btn-guardar-cita');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
        const url = id ? `/api/citas/${id}` : '/api/citas';
        const method = id ? 'PUT' : 'POST';

        const response = await fetchConToken(url, {
            method,
            body: JSON.stringify(datos)
        });

        const data = await response.json();

        if (data.success) {
            cerrarModalCita();
            mostrarMensaje('success', '✓', 'Éxito', data.message);
            // Recargar vista activa
            const seccionActiva = document.querySelector('.content-section.active').id;
            if (seccionActiva === 'seccion-agenda') {
                cargarAgenda();
            } else {
                cargarCitas();
            }
        } else {
            if (data.tipo === 'solapamiento') {
                mostrarMensaje('warning', '⚠️', 'Conflicto de horario', data.message);
            } else {
                mostrarMensaje('error', '❌', 'Error', data.message);
            }
        }

    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje('error', '❌', 'Error', 'No se pudo guardar la cita');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Guardar Cita';
    }
}

// =============================================
// CERRAR MODAL CITA
// =============================================
function cerrarModalCita() {
    document.getElementById('modal-cita').classList.add('hidden');
}

// =============================================
// APLICAR FILTROS
// =============================================
function aplicarFiltros() {
    cargarCitas();
}

// =============================================
// LIMPIAR FILTROS
// =============================================
function limpiarFiltros() {
    document.getElementById('filtro-fecha').value = '';
    document.getElementById('filtro-estado').value = '';
    document.getElementById('filtro-manicurista').value = '';
    cargarCitas();
}

// =============================================
// MOSTRAR MENSAJE
// =============================================
function mostrarMensaje(tipo, icono, titulo, mensaje) {
    // Validar que haya contenido
    if (!tipo || !icono || !titulo || !mensaje) {
        console.error('Faltan parámetros para mostrar el mensaje');
        return;
    }

    const modal = document.getElementById('modal-mensaje');
    const iconElement = document.getElementById('mensaje-icon');
    const tituloElement = document.getElementById('mensaje-titulo');
    const textoElement = document.getElementById('mensaje-texto');

    // Validar que existan los elementos
    if (!modal || !iconElement || !tituloElement || !textoElement) {
        console.error('Elementos del modal no encontrados');
        return;
    }

    iconElement.textContent = icono;
    iconElement.className = `modal-icon ${tipo}`;
    tituloElement.textContent = titulo;
    textoElement.textContent = mensaje;

    modal.classList.remove('hidden');
}

function cerrarModalMensaje() {
    const modal = document.getElementById('modal-mensaje');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// =============================================
// EDITAR CITA
// =============================================
async function editarCita(idCita) {
    try {
        // Obtener datos de la cita
        const response = await fetchConToken('/api/citas');
        const data = await response.json();

        const cita = data.citas.find(c => c.id_cita === idCita);

        if (!cita) {
            mostrarMensaje('error', '❌', 'Error', 'Cita no encontrada');
            return;
        }

        // Cargar selects
        await cargarClientes();
        await cargarManicuristas();
        await cargarServiciosSelect();

        // Llenar formulario
        document.getElementById('modal-cita-titulo').textContent = 'Editar Cita';
        document.getElementById('cita-id').value = cita.id_cita;
        document.getElementById('cita-cliente').value = cita.email_cliente;
        document.getElementById('cita-manicurista').value = cita.email_manicurista;
        document.getElementById('cita-servicio').value = cita.id_servicio;

        // Formatear fecha correctamente para input type="date" (YYYY-MM-DD)
        const fechaFormateada = cita.fecha.split('T')[0];
        document.getElementById('cita-fecha').value = fechaFormateada;

        const horaActual = cita.hora_inicio.substring(0, 5);

        // Cargar horarios disponibles y luego seleccionar el actual
        await cargarHorariosDisponibles();

        // Agregar la hora actual si no está en la lista
        const selectHora = document.getElementById('cita-hora');
        const existeOpcion = Array.from(selectHora.options).some(opt => opt.value === horaActual);

        if (!existeOpcion && horaActual) {
            const option = document.createElement('option');
            option.value = horaActual;
            option.textContent = horaActual + ' (hora actual)';
            selectHora.appendChild(option);
        }

        document.getElementById('cita-hora').value = horaActual;
        document.getElementById('cita-estado').value = cita.estado;
        document.getElementById('cita-notas-cliente').value = cita.notas_cliente || '';
        document.getElementById('cita-notas-manicurista').value = cita.notas_manicurista || '';

        // Mostrar modal
        document.getElementById('modal-cita').classList.remove('hidden');
        document.getElementById('btn-guardar-cita').disabled = false;

    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje('error', '❌', 'Error', 'No se pudo cargar la cita');
    }
}

// Variable para almacenar la acción a confirmar
let accionPendiente = null;

// =============================================
// CONFIRMAR CANCELAR CITA
// =============================================
function confirmarCancelar(idCita) {
    mostrarModalConfirmacion(
        '⚠️',
        '¿Cancelar cita?',
        'Esta acción cambiará el estado de la cita a "cancelada". La cita permanecerá en el historial.',
        () => cancelarCita(idCita)
    );
}

// =============================================
// CONFIRMAR ELIMINAR CITA
// =============================================
function confirmarEliminar(idCita) {
    mostrarModalConfirmacion(
        '🗑️',
        '¿Eliminar cita?',
        'Esta acción eliminará permanentemente la cita de la base de datos. Esta acción NO se puede deshacer.',
        () => eliminarCita(idCita)
    );
}

// =============================================
// MOSTRAR MODAL DE CONFIRMACIÓN
// =============================================
function mostrarModalConfirmacion(icono, titulo, mensaje, callback) {
    document.getElementById('confirm-icon').textContent = icono;
    document.getElementById('confirm-titulo').textContent = titulo;
    document.getElementById('confirm-mensaje').textContent = mensaje;

    accionPendiente = callback;

    document.getElementById('modal-confirmacion').classList.remove('hidden');
}

// =============================================
// CERRAR MODAL DE CONFIRMACIÓN
// =============================================
function cerrarModalConfirmacion() {
    document.getElementById('modal-confirmacion').classList.add('hidden');
    accionPendiente = null;
}

// =============================================
// EJECUTAR ACCIÓN CONFIRMADA
// =============================================
function ejecutarAccionConfirmada() {
    if (accionPendiente) {
        accionPendiente();
        cerrarModalConfirmacion();
    }
}

// =============================================
// CANCELAR CITA (cambia estado a cancelada)
// =============================================
async function cancelarCita(idCita) {
    try {
        const response = await fetchConToken(`/api/citas/${idCita}`, {
            method: 'PUT',
            body: JSON.stringify({ estado: 'cancelada' })
        });

        const data = await response.json();

        if (data.success) {
            mostrarMensaje('success', '✓', 'Éxito', 'Cita cancelada exitosamente');
            cargarCitas();
        } else {
            mostrarMensaje('error', '❌', 'Error', data.message);
        }

    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje('error', '❌', 'Error', 'No se pudo cancelar la cita');
    }
}

// =============================================
// ELIMINAR CITA (borra de la BD)
// =============================================
async function eliminarCita(idCita) {
    try {
        const response = await fetchConToken(`/api/citas/${idCita}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            mostrarMensaje('success', '✓', 'Éxito', 'Cita eliminada exitosamente');
            cargarCitas();
        } else {
            mostrarMensaje('error', '❌', 'Error', data.message);
        }

    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje('error', '❌', 'Error', 'No se pudo eliminar la cita');
    }
}

// =============================================
// CERRAR SESIÓN (con confirmación)
// =============================================
function cerrarSesion() {
    mostrarModalConfirmacion(
        '🚪',
        '¿Cerrar sesión?',
        '¿Estás seguro de que deseas cerrar tu sesión?',
        () => {
            localStorage.removeItem('token');
            window.location.href = '/login.html';
        }
    );
}

// =============================================
// HELPERS
// =============================================
function formatearFecha(fecha) {
    // Asegurar que la fecha esté en formato correcto
    const [year, month, day] = fecha.split('T')[0].split('-');
    const date = new Date(year, month - 1, day);

    return date.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function formatearHora(hora) {
    if (!hora) return '';
    return hora.substring(0, 5);
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// =============================================
// CARGAR HORARIOS DISPONIBLES
// =============================================
async function cargarHorariosDisponibles() {
    const manicurista = document.getElementById('cita-manicurista').value;
    const fecha = document.getElementById('cita-fecha').value;
    const servicio = document.getElementById('cita-servicio').value;
    const idCita = document.getElementById('cita-id').value;

    const selectHora = document.getElementById('cita-hora');
    const btnGuardar = document.getElementById('btn-guardar-cita');

    if (!manicurista || !fecha || !servicio) {
        selectHora.disabled = true;
        selectHora.innerHTML = '<option value="">Selecciona manicurista, servicio y fecha</option>';
        btnGuardar.disabled = true;
        return;
    }

    try {
        const params = new URLSearchParams({
            manicurista,
            fecha,
            id_servicio: servicio
        });

        if (idCita) {
            params.append('id_cita_excluir', idCita);
        }

        const response = await fetchConToken(`/api/citas/helpers/horarios-disponibles?${params}`);
        const data = await response.json();

        if (data.success && data.horarios.length > 0) {
            selectHora.disabled = false;
            selectHora.innerHTML = '<option value="">Seleccionar horario</option>' +
                data.horarios.map(h =>
                    `<option value="${h.hora}">${h.hora}</option>`
                ).join('');

            // Habilitar botón guardar solo cuando se seleccione un horario
            selectHora.addEventListener('change', function () {
                btnGuardar.disabled = !this.value;
            });

            // Si no hay horario seleccionado, deshabilitar botón
            btnGuardar.disabled = true;
        } else {
            selectHora.disabled = true;
            const mensaje = data.mensaje || 'No hay horarios disponibles';
            selectHora.innerHTML = `<option value="">${mensaje}</option>`;
            btnGuardar.disabled = true;
        }

    } catch (error) {
        console.error('Error:', error);
        selectHora.disabled = true;
        selectHora.innerHTML = '<option value="">Error al cargar horarios</option>';
        btnGuardar.disabled = true;
    }
}

// =============================================
// INICIALIZAR
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    cargarCitas();
    cargarManicuristas();

    // Listeners para actualizar horarios disponibles
    document.getElementById('cita-manicurista').addEventListener('change', cargarHorariosDisponibles);
    document.getElementById('cita-fecha').addEventListener('change', cargarHorariosDisponibles);
    document.getElementById('cita-servicio').addEventListener('change', cargarHorariosDisponibles);

    // Cerrar modales con click fuera o ESC
    document.getElementById('modal-cita').addEventListener('click', (e) => {
        if (e.target.id === 'modal-cita') {
            cerrarModalCita();
        }
    });

    document.getElementById('modal-mensaje').addEventListener('click', (e) => {
        if (e.target.id === 'modal-mensaje') {
            cerrarModalMensaje();
        }
    });

    document.getElementById('modal-confirmacion').addEventListener('click', (e) => {
        if (e.target.id === 'modal-confirmacion') {
            cerrarModalConfirmacion();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            cerrarModalCita();
            cerrarModalMensaje();
            cerrarModalConfirmacion();
        }
    });
});

// =============================================
// AGENDA - VARIABLES GLOBALES
// =============================================
let agendaFechaActual = new Date();
let agendaVistaActual = 'semanal';
let agendaDatos = { citas: [], manicuristas: [], horarios_trabajo: [], excepciones: [] };
let agendaInicializada = false;

// =============================================
// INICIALIZAR AGENDA
// =============================================
async function inicializarAgenda() {
    if (!agendaInicializada) {
        await cargarManicuristasAgenda();
        agendaInicializada = true;
    }
    await cargarAgenda();
}

// =============================================
// CARGAR MANICURISTAS PARA FILTRO
// =============================================
async function cargarManicuristasAgenda() {
    try {
        const response = await fetchConToken('/api/citas/helpers/manicuristas');
        const data = await response.json();

        const select = document.getElementById('agenda-filtro-manicurista');
        select.innerHTML = '<option value="">Todas</option>' +
            data.manicuristas.map(m =>
                `<option value="${m.email}">${m.nombre_completo}</option>`
            ).join('');
    } catch (error) {
        console.error('Error cargando manicuristas:', error);
    }
}

// =============================================
// CARGAR DATOS DE AGENDA
// =============================================
async function cargarAgenda() {
    const loader = document.getElementById('agenda-loader');
    const gridSemanal = document.getElementById('calendario-semanal-grid');

    loader.classList.remove('hidden');
    gridSemanal.classList.add('hidden');

    try {
        const { fechaInicio, fechaFin } = obtenerRangoFechas();
        const manicurista = document.getElementById('agenda-filtro-manicurista').value;

        const params = new URLSearchParams({
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin
        });

        if (manicurista) {
            params.append('manicurista', manicurista);
        }

        const response = await fetchConToken(`/api/citas/helpers/agenda?${params}`);
        const data = await response.json();

        if (data.success) {
            agendaDatos = data;
            actualizarTituloFecha();

            if (agendaVistaActual === 'semanal') {
                renderizarVistaSemanal();
            } else {
                renderizarVistaMensual();
            }
        }

        loader.classList.add('hidden');
        gridSemanal.classList.remove('hidden');

    } catch (error) {
        console.error('Error cargando agenda:', error);
        loader.classList.add('hidden');
        mostrarMensaje('error', '❌', 'Error', 'No se pudo cargar la agenda');
    }
}

// =============================================
// OBTENER RANGO DE FECHAS
// =============================================
function obtenerRangoFechas() {
    const fecha = new Date(agendaFechaActual);

    if (agendaVistaActual === 'semanal') {
        // Obtener lunes de la semana
        const dia = fecha.getDay();
        const diff = fecha.getDate() - dia + (dia === 0 ? -6 : 1);
        const lunes = new Date(fecha.setDate(diff));
        const domingo = new Date(lunes);
        domingo.setDate(lunes.getDate() + 6);

        return {
            fechaInicio: formatearFechaISO(lunes),
            fechaFin: formatearFechaISO(domingo)
        };
    } else {
        // Obtener primer y último día del mes
        const primerDia = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
        const ultimoDia = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);

        return {
            fechaInicio: formatearFechaISO(primerDia),
            fechaFin: formatearFechaISO(ultimoDia)
        };
    }
}

function formatearFechaISO(fecha) {
    return fecha.toISOString().split('T')[0];
}

// =============================================
// ACTUALIZAR TÍTULO DE FECHA
// =============================================
function actualizarTituloFecha() {
    const titulo = document.getElementById('agenda-fecha-titulo');
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    if (agendaVistaActual === 'semanal') {
        const { fechaInicio, fechaFin } = obtenerRangoFechas();
        const inicio = new Date(fechaInicio + 'T00:00:00');
        const fin = new Date(fechaFin + 'T00:00:00');

        if (inicio.getMonth() === fin.getMonth()) {
            titulo.textContent = `${inicio.getDate()} - ${fin.getDate()} ${meses[inicio.getMonth()]} ${inicio.getFullYear()}`;
        } else {
            titulo.textContent = `${inicio.getDate()} ${meses[inicio.getMonth()].substring(0, 3)} - ${fin.getDate()} ${meses[fin.getMonth()].substring(0, 3)} ${fin.getFullYear()}`;
        }
    } else {
        titulo.textContent = `${meses[agendaFechaActual.getMonth()]} ${agendaFechaActual.getFullYear()}`;
    }
}

// =============================================
// CAMBIAR VISTA AGENDA
// =============================================
function cambiarVistaAgenda(vista) {
    agendaVistaActual = vista;

    // Actualizar botones
    document.getElementById('btn-vista-semanal').classList.toggle('active', vista === 'semanal');
    document.getElementById('btn-vista-mensual').classList.toggle('active', vista === 'mensual');

    // Mostrar/ocultar contenedores
    document.getElementById('calendario-semanal').classList.toggle('hidden', vista !== 'semanal');
    document.getElementById('calendario-mensual').classList.toggle('hidden', vista !== 'mensual');

    cargarAgenda();
}

// =============================================
// NAVEGAR AGENDA
// =============================================
function navegarAgenda(direccion) {
    if (agendaVistaActual === 'semanal') {
        agendaFechaActual.setDate(agendaFechaActual.getDate() + (direccion * 7));
    } else {
        agendaFechaActual.setMonth(agendaFechaActual.getMonth() + direccion);
    }
    cargarAgenda();
}

function irAHoy() {
    agendaFechaActual = new Date();
    cargarAgenda();
}

// =============================================
// RENDERIZAR VISTA SEMANAL
// =============================================
function renderizarVistaSemanal() {
    const grid = document.getElementById('calendario-semanal-grid');
    const { fechaInicio } = obtenerRangoFechas();
    const inicioSemana = new Date(fechaInicio + 'T00:00:00');
    const hoy = new Date();
    const hoyStr = formatearFechaISO(hoy);

    const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const horas = [];
    for (let h = 8; h < 20; h++) {
        horas.push(`${h.toString().padStart(2, '0')}:00`);
        horas.push(`${h.toString().padStart(2, '0')}:30`);
    }

    // Obtener manicuristas a mostrar
    const manicuristas = agendaDatos.manicuristas || [];

    let html = '<div class="calendario-header">';
    html += '<div class="calendario-header-cell">Hora</div>';

    // Header con días
    for (let i = 0; i < 7; i++) {
        const fecha = new Date(inicioSemana);
        fecha.setDate(inicioSemana.getDate() + i);
        const fechaStr = formatearFechaISO(fecha);
        const esHoy = fechaStr === hoyStr ? 'es-hoy' : '';
        html += `<div class="calendario-header-cell ${esHoy}">
            ${diasSemana[i]} ${fecha.getDate()}
        </div>`;
    }
    html += '</div>';

    // Filas por hora
    horas.forEach(hora => {
        html += `<div class="calendario-hora">${hora}</div>`;

        for (let i = 0; i < 7; i++) {
            const fecha = new Date(inicioSemana);
            fecha.setDate(inicioSemana.getDate() + i);
            const fechaStr = formatearFechaISO(fecha);

            // Verificar si es pasado
            const esPasado = fechaStr < hoyStr || (fechaStr === hoyStr && hora <= `${hoy.getHours().toString().padStart(2, '0')}:${hoy.getMinutes().toString().padStart(2, '0')}`);
            const clasePasado = esPasado ? 'pasado' : '';

            // Buscar citas en este slot
            const citasEnSlot = agendaDatos.citas.filter(c => {
                const citaFecha = c.fecha.split('T')[0];
                const citaHora = c.hora_inicio.substring(0, 5);
                return citaFecha === fechaStr && citaHora === hora;
            });

            html += `<div class="calendario-celda ${clasePasado}" 
                        data-fecha="${fechaStr}" 
                        data-hora="${hora}"
                        onclick="clickCeldaCalendario('${fechaStr}', '${hora}')">`;

            if (citasEnSlot.length > 0) {
                citasEnSlot.forEach(cita => {
                    html += `
                        <div class="cita-slot estado-${cita.estado}" onclick="event.stopPropagation(); editarCita(${cita.id_cita})">
                            <div class="cita-hora">${cita.hora_inicio.substring(0, 5)}</div>
                            <div class="cita-cliente">${cita.nombre_cliente}</div>
                            <div class="cita-servicio">${cita.nombre_servicio}</div>
                        </div>
                    `;
                });
            } else if (!esPasado) {
                html += '<div class="slot-disponible">+</div>';
            }

            html += '</div>';
        }
    });

    grid.innerHTML = html;
}

// =============================================
// RENDERIZAR VISTA MENSUAL
// =============================================
function renderizarVistaMensual() {
    const grid = document.getElementById('calendario-mensual-grid');
    const year = agendaFechaActual.getFullYear();
    const month = agendaFechaActual.getMonth();
    const hoy = new Date();
    const hoyStr = formatearFechaISO(hoy);

    const primerDia = new Date(year, month, 1);
    const ultimoDia = new Date(year, month + 1, 0);
    const diasEnMes = ultimoDia.getDate();

    // Ajustar para que la semana empiece en lunes
    let inicioSemana = primerDia.getDay() - 1;
    if (inicioSemana < 0) inicioSemana = 6;

    const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    let html = '';

    // Headers
    diasSemana.forEach(dia => {
        html += `<div class="mes-header">${dia}</div>`;
    });

    // Días del mes anterior
    const mesAnterior = new Date(year, month, 0);
    for (let i = inicioSemana - 1; i >= 0; i--) {
        const dia = mesAnterior.getDate() - i;
        html += `<div class="mes-dia otro-mes"><div class="dia-numero">${dia}</div></div>`;
    }

    // Días del mes actual
    for (let dia = 1; dia <= diasEnMes; dia++) {
        const fechaStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;
        const esHoy = fechaStr === hoyStr ? 'es-hoy' : '';

        // Contar citas del día
        const citasDelDia = agendaDatos.citas.filter(c => c.fecha.split('T')[0] === fechaStr);
        const numCitas = citasDelDia.length;

        html += `
            <div class="mes-dia ${esHoy}" onclick="irADiaSemanal('${fechaStr}')">
                <div class="dia-numero">${dia}</div>
                ${numCitas > 0 ? `<span class="citas-badge">${numCitas} cita${numCitas > 1 ? 's' : ''}</span>` : ''}
            </div>
        `;
    }

    // Días del mes siguiente
    const totalCeldas = inicioSemana + diasEnMes;
    const celdasRestantes = totalCeldas % 7 === 0 ? 0 : 7 - (totalCeldas % 7);
    for (let i = 1; i <= celdasRestantes; i++) {
        html += `<div class="mes-dia otro-mes"><div class="dia-numero">${i}</div></div>`;
    }

    grid.innerHTML = html;
}

// =============================================
// CLICK EN CELDA DEL CALENDARIO
// =============================================
function clickCeldaCalendario(fecha, hora) {
    const hoy = new Date();
    const hoyStr = formatearFechaISO(hoy);
    const horaActual = `${hoy.getHours().toString().padStart(2, '0')}:${hoy.getMinutes().toString().padStart(2, '0')}`;

    // Verificar si es pasado
    if (fecha < hoyStr || (fecha === hoyStr && hora <= horaActual)) {
        return; // No hacer nada en slots pasados
    }

    // Abrir modal de nueva cita con datos pre-llenados
    crearCitaDesdeCalendario(fecha, hora);
}

// =============================================
// CREAR CITA DESDE CALENDARIO
// =============================================
async function crearCitaDesdeCalendario(fecha, hora) {
    await abrirModalNuevaCita();

    // Pre-llenar fecha
    document.getElementById('cita-fecha').value = fecha;

    // Si hay un filtro de manicurista activo, pre-llenarla
    const manicuristaFiltro = document.getElementById('agenda-filtro-manicurista').value;
    if (manicuristaFiltro) {
        document.getElementById('cita-manicurista').value = manicuristaFiltro;
    }

    // Cargar horarios y seleccionar el clickeado si está disponible
    await cargarHorariosDisponibles();

    const selectHora = document.getElementById('cita-hora');
    const opcionHora = Array.from(selectHora.options).find(opt => opt.value === hora);
    if (opcionHora) {
        selectHora.value = hora;
        document.getElementById('btn-guardar-cita').disabled = false;
    }
}

// =============================================
// IR A DÍA EN VISTA SEMANAL (desde mensual)
// =============================================
function irADiaSemanal(fechaStr) {
    agendaFechaActual = new Date(fechaStr + 'T00:00:00');
    cambiarVistaAgenda('semanal');
}

// =============================================
// HORARIOS - VARIABLES GLOBALES
// =============================================
let horariosManicuristaSeleccionada = '';
let horariosInicializados = false;

const DIAS_SEMANA = {
    1: 'Lunes',
    2: 'Martes',
    3: 'Miércoles',
    4: 'Jueves',
    5: 'Viernes',
    6: 'Sábado',
    7: 'Domingo'
};

const DIAS_CLASES = {
    1: 'lunes',
    2: 'martes',
    3: 'miercoles',
    4: 'jueves',
    5: 'viernes',
    6: 'sabado',
    7: 'domingo'
};

// =============================================
// INICIALIZAR HORARIOS
// =============================================
async function inicializarHorarios() {
    if (!horariosInicializados) {
        await cargarManicuristasHorarios();
        horariosInicializados = true;
    }
}

// =============================================
// CARGAR MANICURISTAS PARA SELECT
// =============================================
async function cargarManicuristasHorarios() {
    try {
        const response = await fetchConToken('/api/citas/helpers/manicuristas');
        const data = await response.json();

        const select = document.getElementById('horarios-manicurista');
        select.innerHTML = '<option value="">Seleccionar manicurista</option>' +
            data.manicuristas.map(m =>
                `<option value="${m.email}">${m.nombre_completo}</option>`
            ).join('');
    } catch (error) {
        console.error('Error cargando manicuristas:', error);
    }
}

// =============================================
// CARGAR HORARIOS Y EXCEPCIONES
// =============================================
async function cargarHorarios() {
    const email = document.getElementById('horarios-manicurista').value;
    horariosManicuristaSeleccionada = email;

    if (!email) {
        document.getElementById('horarios-body').innerHTML =
            '<tr><td colspan="5" class="text-center">Selecciona una manicurista</td></tr>';
        document.getElementById('excepciones-body').innerHTML =
            '<tr><td colspan="5" class="text-center">Selecciona una manicurista</td></tr>';
        return;
    }

    await Promise.all([cargarHorariosSemanales(email), cargarExcepciones(email)]);
}

async function cargarHorariosSemanales(email) {
    try {
        const response = await fetchConToken(`/api/horarios/${encodeURIComponent(email)}`);
        const data = await response.json();

        const tbody = document.getElementById('horarios-body');

        if (!data.success || data.horarios.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay horarios configurados</td></tr>';
            return;
        }

        tbody.innerHTML = data.horarios.map(h => `
            <tr>
                <td><span class="dia-badge ${DIAS_CLASES[h.dia_semana]}">${DIAS_SEMANA[h.dia_semana]}</span></td>
                <td>${h.hora_inicio.substring(0, 5)}</td>
                <td>${h.hora_fin.substring(0, 5)}</td>
                <td>
                    <div class="status-toggle">
                        <div class="toggle-switch ${h.activo ? 'active' : ''}" 
                             onclick="toggleHorarioActivo(${h.id}, ${!h.activo})"></div>
                        <span>${h.activo ? 'Activo' : 'Inactivo'}</span>
                    </div>
                </td>
                <td>
                    <button class="btn-icon" onclick="editarHorario(${h.id}, ${h.dia_semana}, '${h.hora_inicio}', '${h.hora_fin}')" title="Editar">
                        ✏️
                    </button>
                    <button class="btn-icon btn-danger" onclick="confirmarEliminarHorario(${h.id})" title="Eliminar">
                        🗑️
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error cargando horarios:', error);
    }
}

async function cargarExcepciones(email) {
    try {
        const response = await fetchConToken(`/api/horarios/excepciones/${encodeURIComponent(email)}`);
        const data = await response.json();

        const tbody = document.getElementById('excepciones-body');

        if (!data.success || data.excepciones.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay excepciones</td></tr>';
            return;
        }

        tbody.innerHTML = data.excepciones.map(e => {
            const fecha = new Date(e.fecha + 'T00:00:00');
            const fechaFormateada = fecha.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
            const horario = e.todo_el_dia ? '-' : `${e.hora_inicio?.substring(0, 5) || ''} - ${e.hora_fin?.substring(0, 5) || ''}`;

            return `
                <tr>
                    <td>${fechaFormateada}</td>
                    <td>${e.todo_el_dia ? 'Sí' : 'No'}</td>
                    <td>${horario}</td>
                    <td>${e.motivo || '-'}</td>
                    <td>
                        <button class="btn-icon btn-danger" onclick="confirmarEliminarExcepcion(${e.id})" title="Eliminar">
                            🗑️
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error('Error cargando excepciones:', error);
    }
}

// =============================================
// MODAL HORARIO
// =============================================
function abrirModalHorario() {
    if (!horariosManicuristaSeleccionada) {
        mostrarMensaje('warning', '⚠️', 'Atención', 'Primero selecciona una manicurista');
        return;
    }
    document.getElementById('modal-horario-titulo').textContent = 'Agregar Horario';
    document.getElementById('form-horario').reset();
    document.getElementById('horario-id').value = '';
    document.getElementById('modal-horario').classList.remove('hidden');
}

function editarHorario(id, dia, horaInicio, horaFin) {
    document.getElementById('modal-horario-titulo').textContent = 'Editar Horario';
    document.getElementById('horario-id').value = id;
    document.getElementById('horario-dia').value = dia;
    document.getElementById('horario-dia').disabled = true;
    document.getElementById('horario-inicio').value = horaInicio.substring(0, 5);
    document.getElementById('horario-fin').value = horaFin.substring(0, 5);
    document.getElementById('modal-horario').classList.remove('hidden');
}

function cerrarModalHorario() {
    document.getElementById('modal-horario').classList.add('hidden');
    document.getElementById('horario-dia').disabled = false;
}

async function guardarHorario() {
    const id = document.getElementById('horario-id').value;
    const dia = document.getElementById('horario-dia').value;
    const horaInicio = document.getElementById('horario-inicio').value;
    const horaFin = document.getElementById('horario-fin').value;

    if (!dia || !horaInicio || !horaFin) {
        mostrarMensaje('warning', '⚠️', 'Campos requeridos', 'Completa todos los campos');
        return;
    }

    try {
        const url = id ? `/api/horarios/${id}` : '/api/horarios';
        const method = id ? 'PUT' : 'POST';

        const body = id ?
            { hora_inicio: horaInicio + ':00', hora_fin: horaFin + ':00' } :
            { email_manicurista: horariosManicuristaSeleccionada, dia_semana: parseInt(dia), hora_inicio: horaInicio + ':00', hora_fin: horaFin + ':00' };

        const response = await fetchConToken(url, { method, body: JSON.stringify(body) });
        const data = await response.json();

        if (data.success) {
            cerrarModalHorario();
            mostrarMensaje('success', '✓', 'Éxito', data.message);
            cargarHorarios();
        } else {
            mostrarMensaje('error', '❌', 'Error', data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje('error', '❌', 'Error', 'No se pudo guardar el horario');
    }
}

async function toggleHorarioActivo(id, nuevoEstado) {
    try {
        const response = await fetchConToken(`/api/horarios/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ activo: nuevoEstado })
        });
        const data = await response.json();

        if (data.success) {
            cargarHorarios();
        } else {
            mostrarMensaje('error', '❌', 'Error', data.message);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function confirmarEliminarHorario(id) {
    accionPendiente = async () => {
        try {
            const response = await fetchConToken(`/api/horarios/${id}`, { method: 'DELETE' });
            const data = await response.json();

            if (data.success) {
                mostrarMensaje('success', '✓', 'Éxito', 'Horario eliminado');
                cargarHorarios();
            } else {
                mostrarMensaje('error', '❌', 'Error', data.message);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    document.getElementById('confirm-titulo').textContent = '¿Eliminar horario?';
    document.getElementById('confirm-mensaje').textContent = 'Esta acción no se puede deshacer.';
    document.getElementById('modal-confirmacion').classList.remove('hidden');
}

// =============================================
// MODAL EXCEPCIÓN
// =============================================
function abrirModalExcepcion() {
    if (!horariosManicuristaSeleccionada) {
        mostrarMensaje('warning', '⚠️', 'Atención', 'Primero selecciona una manicurista');
        return;
    }
    document.getElementById('form-excepcion').reset();
    document.getElementById('excepcion-todo-dia').checked = true;
    document.getElementById('excepcion-horas').classList.add('hidden');
    document.getElementById('modal-excepcion').classList.remove('hidden');
}

function cerrarModalExcepcion() {
    document.getElementById('modal-excepcion').classList.add('hidden');
}

function toggleHorasExcepcion() {
    const todoDia = document.getElementById('excepcion-todo-dia').checked;
    document.getElementById('excepcion-horas').classList.toggle('hidden', todoDia);
}

async function guardarExcepcion() {
    const fecha = document.getElementById('excepcion-fecha').value;
    const todoDia = document.getElementById('excepcion-todo-dia').checked;
    const horaInicio = document.getElementById('excepcion-inicio').value;
    const horaFin = document.getElementById('excepcion-fin').value;
    const motivo = document.getElementById('excepcion-motivo').value;

    if (!fecha) {
        mostrarMensaje('warning', '⚠️', 'Campo requerido', 'Selecciona una fecha');
        return;
    }

    try {
        const response = await fetchConToken('/api/horarios/excepciones', {
            method: 'POST',
            body: JSON.stringify({
                email_manicurista: horariosManicuristaSeleccionada,
                fecha,
                todo_el_dia: todoDia,
                hora_inicio: todoDia ? null : horaInicio + ':00',
                hora_fin: todoDia ? null : horaFin + ':00',
                motivo
            })
        });
        const data = await response.json();

        if (data.success) {
            cerrarModalExcepcion();
            mostrarMensaje('success', '✓', 'Éxito', data.message);
            cargarHorarios();
        } else {
            mostrarMensaje('error', '❌', 'Error', data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje('error', '❌', 'Error', 'No se pudo guardar la excepción');
    }
}

function confirmarEliminarExcepcion(id) {
    accionPendiente = async () => {
        try {
            const response = await fetchConToken(`/api/horarios/excepciones/${id}`, { method: 'DELETE' });
            const data = await response.json();

            if (data.success) {
                mostrarMensaje('success', '✓', 'Éxito', 'Excepción eliminada');
                cargarHorarios();
            } else {
                mostrarMensaje('error', '❌', 'Error', data.message);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    document.getElementById('confirm-titulo').textContent = '¿Eliminar excepción?';
    document.getElementById('confirm-mensaje').textContent = 'Esta acción no se puede deshacer.';
    document.getElementById('modal-confirmacion').classList.remove('hidden');
}