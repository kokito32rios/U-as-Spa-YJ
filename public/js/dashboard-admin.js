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
        'dashboard': 'Panel de Control',
        'agendamiento': 'Gestión de Agendamiento',
        'agenda': 'Agenda - Calendario',
        'servicios': 'Gestión de Servicios',
        'usuarios': 'Gestión de Usuarios',
        'comisiones': 'Gestión de Comisiones',
        'horarios': 'Gestión de Horarios',
        'galeria': 'Gestión de Galería'
    };
    document.getElementById('section-title').textContent = titulos[seccion];

    // Toggle header "Nueva Cita" button visibility
    const headerActions = document.querySelector('.header-actions');
    if (headerActions) {
        headerActions.style.display = ['agendamiento', 'agenda'].includes(seccion) ? 'flex' : 'none';
    }

    // Cargar datos según sección
    if (seccion === 'agendamiento') {
        cargarCitas();
    } else if (seccion === 'agenda') {
        inicializarAgenda();
    } else if (seccion === 'horarios') {
        inicializarHorarios();
    } else if (seccion === 'servicios') {
        inicializarServicios();
    } else if (seccion === 'usuarios') {
        inicializarUsuarios();
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
let listaClientes = []; // Global variable

async function cargarClientes() {
    try {
        const response = await fetchConToken('/api/citas/helpers/clientes');
        const data = await response.json();

        listaClientes = data.clientes || []; // Guardar globalmente

        const dataList = document.getElementById('lista-clientes');
        dataList.innerHTML = listaClientes.map(c =>
            `<option value="${c.nombre_completo}"></option>`
        ).join('');

    } catch (error) {
        console.error('Error:', error);
    }
}

let listaManicuristas = [];

// =============================================
// CARGAR MANICURISTAS
// =============================================
async function cargarManicuristas() {
    try {
        const response = await fetchConToken('/api/citas/helpers/manicuristas');
        const data = await response.json();

        listaManicuristas = data.manicuristas || []; // Guardar globalmente

        const select = document.getElementById('cita-manicurista');
        const selectFiltro = document.getElementById('filtro-manicurista');

        const options = listaManicuristas.map(m =>
            `<option value="${m.email}">${m.nombre_completo}</option>`
        ).join('');

        if (select) select.innerHTML = '<option value="">Seleccionar manicurista</option>' + options;
        if (selectFiltro) selectFiltro.innerHTML = '<option value="">Todas</option>' + options;

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
                `<option value="${s.id_servicio}" data-duracion="${s.duracion_minutos}" data-precio="${s.precio}">${s.nombre}</option>`
            ).join('');

        // Event listener para actualizar duración y precio al cambiar servicio
        select.onchange = function () {
            const selected = this.options[this.selectedIndex];
            if (selected.value) {
                document.getElementById('cita-duracion').value = selected.dataset.duracion;
                document.getElementById('cita-precio').value = selected.dataset.precio;
            } else {
                document.getElementById('cita-duracion').value = '';
                document.getElementById('cita-precio').value = '';
            }
        };

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

    // Validación de campos obligatorios
    const manicuVal = document.getElementById('cita-manicurista').value;
    const servVal = document.getElementById('cita-servicio').value;
    if (!manicuVal || !servVal) {
        mostrarMensaje('warning', '⚠️', 'Faltan datos', 'Por favor selecciona manicurista y servicio');
        return;
    }

    // Validar estado para cancelación
    const estadoInput = document.getElementById('cita-estado');
    const esCancelacion = estadoInput && estadoInput.value === 'cancelada';

    // Resolver cliente desde el input de búsqueda
    // NOTA: El cliente ahora es opcional. Si no se encuentra, se envía null/vacío.
    const nombreCliente = document.getElementById('cita-cliente-search').value;
    const clienteEncontrado = listaClientes.find(c => c.nombre_completo === nombreCliente);

    // Si se escribió algo pero no coincide con la lista, advertir pero permitir (opcional)
    // O mejor: Si el usuario quiere guardar sin cliente, permitimos.
    // Solo mostramos alerta si escribió un nombre que NO existe, para evitar typos.
    // Pero el usuario dijo "es opcional".
    // Así que si está vacío, pasa. Si tiene texto pero no match, ¿qué hacemos? 
    // Asumiremos que si escribe algo y no está en la lista, es un "cliente no registrado" o error.
    // Pero como no podemos guardar "nombre" sin email en la BD actual (probablemente), 
    // solo permitiremos vacío o cliente válido.

    // Si se escribió algo pero no coincide con la lista, no bloqueamos.
    // Lo tratamos como "Cliente Invitado" y lo guardamos en las notas.

    let emailFinal = clienteEncontrado ? clienteEncontrado.email : null;
    let notasRaw = document.getElementById('cita-notas-cliente').value || '';
    let notasFinal = notasRaw;

    if (nombreCliente && !clienteEncontrado) {
        // Inyectar el nombre en las notas para que el backend lo recupere
        // Formato: [Cliente: Nombre] Nota original ...
        notasFinal = `[Cliente: ${nombreCliente}] ${notasRaw}`;
    }

    const datos = {
        email_cliente: emailFinal, // null si es invitado
        email_manicurista: document.getElementById('cita-manicurista').value,
        id_servicio: document.getElementById('cita-servicio').value,
        duracion: document.getElementById('cita-duracion').value,
        precio: document.getElementById('cita-precio').value,
        fecha: document.getElementById('cita-fecha').value,
        hora_inicio: hora + ':00',
        notas_cliente: notasFinal
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
            // Capturar datos para el resumen ANTES de cerrar/resetear
            const resumenCliente = nombreCliente || 'Anónimo';
            const resumenManicurista = document.getElementById('cita-manicurista').options[document.getElementById('cita-manicurista').selectedIndex].text;
            const resumenServicio = document.getElementById('cita-servicio').options[document.getElementById('cita-servicio').selectedIndex].text;
            const resumenFecha = document.getElementById('cita-fecha').value;
            const resumenHora = selectHora.value;
            const resumenDuracion = document.getElementById('cita-duracion').value;

            cerrarModalCita();

            const mensajeDetalle = `
                <div style="text-align: left; margin-top: 10px;">
                    <p><strong>Cliente:</strong> ${resumenCliente}</p>
                    <p><strong>Manicurista:</strong> ${resumenManicurista}</p>
                    <p><strong>Servicio:</strong> ${resumenServicio}</p>
                    <p><strong>Fecha:</strong> ${resumenFecha} - <strong>Hora:</strong> ${resumenHora}</p>
                    <p><strong>Duración:</strong> ${resumenDuracion} min</p>
                </div>
            `;

            mostrarMensaje('success', '✓', 'Cita Guardada', mensajeDetalle);
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
    textoElement.innerHTML = mensaje; // Usar innerHTML para permitir formato (negritas, saltos de línea)

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

        // Permitir fechas pasadas en edición
        document.getElementById('cita-fecha').removeAttribute('min');
        document.getElementById('cita-cliente-search').value = cita.nombre_cliente;
        document.getElementById('cita-cliente').value = cita.email_cliente;
        document.getElementById('cita-manicurista').value = cita.email_manicurista;
        document.getElementById('cita-servicio').value = cita.id_servicio;

        // Formatear fecha correctamente para input type="date" (YYYY-MM-DD)
        const fechaFormateada = cita.fecha.split('T')[0];
        document.getElementById('cita-fecha').value = fechaFormateada;

        const horaActual = cita.hora_inicio.substring(0, 5);

        // Calcular duración actual
        const inicioDate = new Date(`2000-01-01T${cita.hora_inicio}`);
        const finDate = new Date(`2000-01-01T${cita.hora_fin}`);
        const diffMs = finDate - inicioDate;
        const diffMins = Math.round(diffMs / 60000);
        document.getElementById('cita-duracion').value = diffMins;
        document.getElementById('cita-precio').value = cita.precio || ''; // Poblar precio si existe

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

    // Guardar valor actual para intentar preservarlo
    const horaPreseleccionada = selectHora.value;

    if (!manicurista || !fecha || !servicio) {
        // Si hay una hora preseleccionada (venida del calendario), mantenerla visible aunque deshabilitada
        if (horaPreseleccionada && selectHora.options.length > 0) {
            // No hacer nada, dejar la hora ahí para que el usuario sepa qué clickeó
        } else {
            selectHora.disabled = true;
            selectHora.innerHTML = '<option value="">Selecciona manicurista, servicio y fecha</option>';
            btnGuardar.disabled = true;
        }
        return;
    }

    try {
        const params = new URLSearchParams({
            manicurista,
            fecha,
            manicurista,
            fecha,
            id_servicio: servicio,
            duracion: document.getElementById('cita-duracion').value
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

            // Intentar re-seleccionar la hora si existe en los nuevos horarios
            if (horaPreseleccionada) {
                const existe = data.horarios.some(h => h.hora === horaPreseleccionada);
                if (existe) {
                    selectHora.value = horaPreseleccionada;
                    btnGuardar.disabled = false;
                }
            }

            // Habilitar botón guardar solo cuando se seleccione un horario
            selectHora.addEventListener('change', function () {
                btnGuardar.disabled = !this.value;
            });

            // Si no hay horario seleccionado, deshabilitar botón (si NO fue habilitado arriba)
            if (!selectHora.value) {
                btnGuardar.disabled = true;
            }
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
    document.getElementById('cita-duracion').addEventListener('change', cargarHorariosDisponibles);

    document.getElementById('cita-servicio').addEventListener('change', function () {
        const selectedOption = this.options[this.selectedIndex];
        const duracion = selectedOption.getAttribute('data-duracion');
        if (duracion) {
            document.getElementById('cita-duracion').value = duracion;
        }
        cargarHorariosDisponibles();
    });

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
    // Ajustar a zona horaria local para evitar problemas con toISOString (que es UTC)
    const offset = fecha.getTimezoneOffset() * 60000;
    const localDate = new Date(fecha.getTime() - offset);
    return localDate.toISOString().split('T')[0];
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

    // Generar Leyenda de Manicuristas
    let htmlLeyenda = '<div class="leyenda-manicuristas">';
    htmlLeyenda += '<span class="leyenda-titulo">Filtrar por Manicurista:</span>';

    // Usar la lista global si agendaDatos.manicuristas está vacío o incompleto, 
    // pero filtrar para mostrar solo las relevantes si se desea, o todas.
    // Usaremos la lista global para que siempre estén todas disponibles para filtrar.
    const listaParaLeyenda = listaManicuristas.length > 0 ? listaManicuristas : manicuristas;

    listaParaLeyenda.forEach(m => {
        htmlLeyenda += `
            <div class="manicurista-chip" 
                 onmouseenter="resaltarManicurista('${m.email}')" 
                 onmouseleave="restaurarVista()">
                 💅 ${m.nombre_completo || m.nombre}
            </div>
        `;
    });
    htmlLeyenda += '</div>';

    // Generar Leyenda de Estados
    const estados = [
        { id: 'pendiente', nombre: 'Pendiente', color: '#ffc107' },
        { id: 'confirmada', nombre: 'Confirmada', color: '#17a2b8' },
        { id: 'completada', nombre: 'Completada', color: '#28a745' },
        // { id: 'no_asistio', nombre: 'No Asistió', color: '#6c757d' }, // Opcional si se usa
        { id: 'cancelada', nombre: 'Cancelada', color: '#dc3545' }
    ];

    htmlLeyenda += '<div class="leyenda-estados">';
    htmlLeyenda += '<span class="leyenda-titulo">Estados:</span>';
    estados.forEach(e => {
        htmlLeyenda += `
            <div class="estado-chip">
                <span class="estado-color" style="background-color: ${e.color};"></span>
                ${e.nombre}
            </div>
        `;
    });
    htmlLeyenda += '</div>';

    // Contenedor principal de leyendas (flex column)
    htmlLeyenda = `<div class="leyendas-wrapper">${htmlLeyenda}</div>`;

    // Renderizar leyenda en su propio contenedor
    const contenedorLeyenda = document.getElementById('leyenda-manicuristas-container');
    if (contenedorLeyenda) {
        contenedorLeyenda.innerHTML = htmlLeyenda;
    }

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
            let citasEnSlot = agendaDatos.citas.filter(c => {
                const citaFecha = c.fecha.split('T')[0];
                const citaHora = c.hora_inicio.substring(0, 5);
                return citaFecha === fechaStr && citaHora === hora;
            });

            // FILTRO DE VISIBILIDAD: Ocultar canceladas FUTURAS para liberar espacio visual
            citasEnSlot = citasEnSlot.filter(c => {
                if (c.estado === 'cancelada' && !esPasado) return false;
                return true;
            });

            html += `<div class="calendario-celda ${clasePasado}" 
                        data-fecha="${fechaStr}" 
                        data-hora="${hora}"
                        onclick="clickCeldaCalendario('${fechaStr}', '${hora}')">`;

            if (citasEnSlot.length > 0) {
                citasEnSlot.forEach(cita => {
                    // Calcular duración en minutos
                    const inicio = new Date(`2000-01-01T${cita.hora_inicio}`);
                    const fin = new Date(`2000-01-01T${cita.hora_fin}`);
                    const duracionMin = (fin - inicio) / 60000;

                    // Calcular altura: (minutos / 30) * 60px - 4px (padding/bordes)
                    const slots = duracionMin / 30;
                    const height = (slots * 60) - 2;

                    // Detectar si es cita corta para ajustar estilos
                    const esCorta = duracionMin <= 45 ? 'cita-corta' : '';

                    html += `
                        <div class="cita-slot estado-${cita.estado} ${esCorta}" 
                             style="--slot-height: ${height}px; height: ${height}px; z-index: 10;"
                             data-email-manicurista="${cita.email_manicurista}"
                             onclick="event.stopPropagation(); editarCita(${cita.id_cita})">
                            <div class="cita-hora">${cita.hora_inicio.substring(0, 5)} - ${cita.hora_fin.substring(0, 5)}</div>
                            <div class="cita-cliente">${cita.nombre_cliente}</div>
                            <div class="cita-manicurista">💅 ${cita.nombre_manicurista}</div>
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

    // Si no hay manicurista seleccionada, cargarHorariosDisponibles habrá limpiado el select.
    // Debemos agregar la opción manualmente para que el usuario vea la hora que clickeó.
    if (selectHora.disabled || selectHora.options.length <= 1) {
        selectHora.disabled = false;
        // Limpiar y agregar opción
        selectHora.innerHTML = `<option value="${hora}">${hora}</option>`;
        selectHora.value = hora;

        // Importante: Habilitar botón si ya tenemos fecha y hora.
        // guardarCita validará el resto.
        document.getElementById('btn-guardar-cita').disabled = false;
    } else {
        // Si ya había horarios cargados (p.ej. filtro manicurista activo)
        const opcionHora = Array.from(selectHora.options).find(opt => opt.value === hora);
        if (opcionHora) {
            selectHora.value = hora;
            document.getElementById('btn-guardar-cita').disabled = false;
        } else {
            // Si el horario no está disponible para esa manicurista, al menos mostrarlo como opción (usuario decidirá si cambiar manicurista)
            const option = document.createElement('option');
            option.value = hora;
            option.textContent = hora;
            selectHora.appendChild(option);
            selectHora.value = hora;
        }
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
let listaHorariosActuales = []; // Store fetched schedules
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

        listaHorariosActuales = data.horarios || []; // Update global list

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
            // Manejar tanto string YYYY-MM-DD como objeto Date/ISO
            let fechaStr = e.fecha;
            if (typeof fechaStr === 'string' && fechaStr.includes('T')) {
                fechaStr = fechaStr.split('T')[0];
            }
            // Asegurar formato YYYY-MM-DD para evitar problemas de zona horaria con T00:00:00
            const fecha = new Date(fechaStr + 'T00:00:00');
            const fechaFormateada = fecha.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
            const horario = e.todo_el_dia ? '-' : `${e.hora_inicio?.substring(0, 5) || ''} - ${e.hora_fin?.substring(0, 5) || ''}`;

            return `
                <tr>
                    <td>${fechaFormateada}</td>
                    <td>${e.todo_el_dia ? 'Sí' : 'No'}</td>
                    <td>${horario}</td>
                    <td>${e.motivo || '-'}</td>
                    <td>
                        <button class="btn-icon" onclick="editarExcepcion(${e.id}, '${fechaStr}', ${e.todo_el_dia}, '${e.hora_inicio || ''}', '${e.hora_fin || ''}', '${e.motivo || ''}')" title="Editar">
                            ✏️
                        </button>
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

    // Filter available days
    const selectDia = document.getElementById('horario-dia');
    const diasOcupados = listaHorariosActuales.map(h => h.dia_semana); // Getting all days

    Array.from(selectDia.options).forEach(opt => {
        if (opt.value) {
            const dia = parseInt(opt.value);
            const count = diasOcupados.filter(d => d === dia).length;

            opt.disabled = false; // Always allow adding more shifts
            if (count > 0) {
                opt.textContent = `${DIAS_SEMANA[dia]} (${count} turno${count > 1 ? 's' : ''})`;
            } else {
                opt.textContent = DIAS_SEMANA[dia];
            }
        }
    });

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
    document.getElementById('excepcion-id').value = ''; // Clear ID for new
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

function editarExcepcion(id, fecha, todoDia, inicio, fin, motivo) {
    document.getElementById('excepcion-id').value = id;
    document.getElementById('excepcion-fecha').value = fecha;
    document.getElementById('excepcion-todo-dia').checked = todoDia;
    document.getElementById('excepcion-inicio').value = inicio ? inicio.substring(0, 5) : '';
    document.getElementById('excepcion-fin').value = fin ? fin.substring(0, 5) : '';
    document.getElementById('excepcion-motivo').value = motivo || '';

    toggleHorasExcepcion();
    document.getElementById('modal-excepcion').classList.remove('hidden');
}

async function guardarExcepcion() {
    const id = document.getElementById('excepcion-id').value;
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
        const url = id ? `/api/horarios/excepciones/${id}` : '/api/horarios/excepciones';
        const method = id ? 'PUT' : 'POST';

        const response = await fetchConToken(url, {
            method: method,
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

// =============================================
// HELPER: RESALTAR MANICURISTA
// =============================================
function resaltarManicurista(email) {
    const slots = document.querySelectorAll('.cita-slot');
    slots.forEach(slot => {
        if (slot.getAttribute('data-email-manicurista') !== email) {
            slot.classList.add('dimmed');
        } else {
            slot.classList.remove('dimmed');
            slot.classList.add('highlighted');
        }
    });
}

function restaurarVista() {
    const slots = document.querySelectorAll('.cita-slot');
    slots.forEach(slot => {
        slot.classList.remove('dimmed');
    });
}

// =============================================
// GESTIÓN DE SERVICIOS
// =============================================
async function inicializarServicios() {
    await cargarServiciosTabla();
}

async function cargarServiciosTabla() {
    const tbody = document.getElementById('servicios-body');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Cargando...</td></tr>';

    try {
        const response = await fetchConToken('/api/servicios?includeAll=true');

        const data = await response.json();

        if (!data.servicios || data.servicios.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay servicios registrados</td></tr>';
            return;
        }

        tbody.innerHTML = data.servicios.map(s => `
            <tr>
                <td><strong>${s.nombre}</strong></td>
                <td style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${s.descripcion || ''}">${s.descripcion || '-'}</td>
                <td>$${Number(s.precio).toLocaleString('es-CO')}</td>
                <td>${s.duracion_minutos} min</td>
                <td>
                    <span class="badge badge-${s.activo ? 'confirmada' : 'cancelada'}">
                        ${s.activo ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td class="table-actions">
                    <button class="btn-icon btn-edit" onclick="editarServicio(${s.id_servicio})" title="Editar">✏️</button>
                    ${s.activo
                ? `<button class="btn-icon btn-warning" onclick="confirmarToggleServicio(${s.id_servicio}, 0, '${s.nombre}')" title="Desactivar">🚫</button>`
                : `<button class="btn-icon" style="background:#d4edda;color:#155724;" onclick="confirmarToggleServicio(${s.id_servicio}, 1, '${s.nombre}')" title="Activar">✅</button>`
            }
                    <button class="btn-icon btn-delete" onclick="confirmarEliminarServicio(${s.id_servicio}, '${s.nombre}')" title="Eliminar">🗑️</button>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error al cargar servicios:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-red">Error al cargar datos</td></tr>';
    }
}

function abrirModalServicio() {
    document.getElementById('form-servicio').reset();
    document.getElementById('servicio-id').value = '';
    document.getElementById('modal-servicio-titulo').textContent = 'Nuevo Servicio';
    document.getElementById('modal-servicio').classList.remove('hidden');
}

function cerrarModalServicio() {
    document.getElementById('modal-servicio').classList.add('hidden');
}

async function guardarServicio() {
    const id = document.getElementById('servicio-id').value;
    const nombre = document.getElementById('servicio-nombre').value;
    const precio = document.getElementById('servicio-precio').value;
    const duracion = document.getElementById('servicio-duracion').value;
    const descripcion = document.getElementById('servicio-descripcion').value;

    if (!nombre || !precio || !duracion) {
        mostrarMensaje('error', '⚠️', 'Campos incompletos', 'Nombre, precio y duración son obligatorios');
        return;
    }

    const datos = { nombre, precio, duracion, descripcion };
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/servicios/${id}` : '/api/servicios';

    try {
        const response = await fetchConToken(url, {
            method: method,
            body: JSON.stringify(datos)
        });

        const result = await response.json();

        if (result.success) {
            mostrarMensaje('success', '✅', 'Éxito', result.message);
            cerrarModalServicio();
            cargarServiciosTabla();
        } else {
            throw new Error(result.message || 'Error al guardar');
        }

    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje('error', '❌', 'Error', error.message);
    }
}

async function editarServicio(id) {
    try {
        const response = await fetchConToken(`/api/servicios/${id}`);
        const data = await response.json();

        if (data.success) {
            const s = data.servicio;
            document.getElementById('servicio-id').value = s.id_servicio;
            document.getElementById('servicio-nombre').value = s.nombre;
            document.getElementById('servicio-precio').value = s.precio;
            document.getElementById('servicio-duracion').value = s.duracion_minutos;
            document.getElementById('servicio-descripcion').value = s.descripcion || '';

            document.getElementById('modal-servicio-titulo').textContent = 'Editar Servicio';
            document.getElementById('modal-servicio').classList.remove('hidden');
        }
    } catch (error) {
        console.error(error);
        mostrarMensaje('error', '❌', 'Error', 'No se pudo cargar el servicio');
    }
}

async function toggleEstadoServicio(id, nuevoEstado) {
    try {
        const response = await fetchConToken(`/api/servicios/${id}/estado`, {
            method: 'PATCH',
            body: JSON.stringify({ activo: nuevoEstado })
        });

        if (response.ok) {
            cargarServiciosTabla();
        } else {
            mostrarMensaje('error', '❌', 'Error', 'No se pudo cambiar el estado');
        }
    } catch (error) {
        console.error(error);
    }
}

// Confirmation modal for toggle
function confirmarToggleServicio(id, nuevoEstado, nombre) {
    const accion = nuevoEstado ? 'activar' : 'desactivar';
    const mensaje = nuevoEstado
        ? `¿Deseas activar "${nombre}"? Volverá a estar disponible para agendar citas.`
        : `¿Deseas desactivar "${nombre}"? No podrás usarlo para nuevas citas hasta que lo actives de nuevo.`;

    mostrarConfirmacion(
        nuevoEstado ? '✅' : '🚫',
        `${accion.charAt(0).toUpperCase() + accion.slice(1)} Servicio`,
        mensaje,
        () => toggleEstadoServicio(id, nuevoEstado)
    );
}

// Confirmation modal for delete
function confirmarEliminarServicio(id, nombre) {
    mostrarConfirmacion(
        '🗑️',
        'Eliminar Servicio',
        `¿Estás seguro de eliminar "${nombre}"? Esta acción NO se puede deshacer y se perderá el historial asociado.`,
        () => eliminarServicio(id),
        true // isDangerous
    );
}

async function eliminarServicio(id) {
    try {
        const response = await fetchConToken(`/api/servicios/${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            mostrarMensaje('success', '✅', 'Eliminado', result.message);
            cargarServiciosTabla();
        } else {
            mostrarMensaje('error', '❌', 'Error', result.message || 'No se pudo eliminar el servicio');
        }
    } catch (error) {
        console.error(error);
        mostrarMensaje('error', '❌', 'Error', 'Error al eliminar el servicio');
    }
}

// Generic confirmation modal helper
function mostrarConfirmacion(icon, titulo, mensaje, onConfirm, isDangerous = false) {
    // Remove existing modal to avoid DOM conflicts
    const existingModal = document.getElementById('modal-confirmacion');
    if (existingModal) {
        existingModal.remove();
    }

    // Create confirmation modal fresh
    const modal = document.createElement('div');
    modal.id = 'modal-confirmacion';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-box">
            <div class="modal-icon warning confirmacion-icon"></div>
            <h3 class="confirmacion-titulo"></h3>
            <p class="confirmacion-mensaje"></p>
            <div style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
                <button class="btn btn-secondary btn-cancelar">Cancelar</button>
                <button class="btn btn-primary btn-confirmar-accion">Confirmar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Setup content
    modal.querySelector('.confirmacion-icon').textContent = icon;
    modal.querySelector('.confirmacion-titulo').textContent = titulo;
    modal.querySelector('.confirmacion-mensaje').textContent = mensaje;

    // Setup actions
    modal.querySelector('.btn-cancelar').onclick = cerrarConfirmacion;

    const btnConfirmar = modal.querySelector('.btn-confirmar-accion');
    btnConfirmar.style.background = isDangerous ? '#c62828' : '';
    btnConfirmar.onclick = () => {
        cerrarConfirmacion();
        onConfirm();
    };

    modal.classList.remove('hidden');
}

function cerrarConfirmacion() {
    document.getElementById('modal-confirmacion')?.classList.add('hidden');
}

function cerrarSesion() {
    mostrarConfirmacion(
        '🚪',
        'Cerrar Sesión',
        '¿Estás seguro que deseas salir del sistema?',
        () => {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
        },
        false // Not dangerous
    );
}

// =============================================
// GESTIÓN DE USUARIOS
// =============================================
let usuariosList = [];

// Cargar roles dinámicamente
async function cargarRolesSelect() {
    try {
        const response = await fetchConToken('/api/usuarios/helpers/roles');
        const result = await response.json();
        const select = document.getElementById('usuario-rol');

        if (result.success && result.roles) {
            select.innerHTML = result.roles.map(r =>
                `<option value="${r.id_rol}">${r.nombre_rol.charAt(0).toUpperCase() + r.nombre_rol.slice(1)}</option>`
            ).join('');
        }
    } catch (error) {
        console.error('Error cargando roles:', error);
    }
}

function inicializarUsuarios() {
    cargarUsuariosTabla();
    cargarRolesSelect(); // Cargar roles al iniciar la sección
}

async function cargarUsuariosTabla() {
    const tbody = document.getElementById('usuarios-body');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Cargando...</td></tr>';

    try {
        const response = await fetchConToken('/api/usuarios');
        const result = await response.json();

        if (!result.success || !result.usuarios || result.usuarios.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay usuarios registrados</td></tr>';
            return;
        }

        usuariosList = result.usuarios;

        tbody.innerHTML = result.usuarios.map(u => {
            let badgeClass = 'badge-info';
            const rolLower = (u.rol || '').toLowerCase();

            if (rolLower.includes('admin')) badgeClass = 'badge-rol-admin';
            else if (rolLower.includes('manicurista')) badgeClass = 'badge-rol-manicurista';
            else badgeClass = 'badge-rol-cliente';

            return `
            <tr>
                <td><strong>${u.nombre}</strong></td>
                <td>${u.email}</td>
                <td><span class="badge ${badgeClass}">${u.rol || 'Cliente'}</span></td>
                <td>
                    <span class="badge badge-${u.activo ? 'confirmada' : 'cancelada'}">
                        ${u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td class="table-actions">
                    <button class="btn-icon btn-edit" onclick="editarUsuario('${u.email}')" title="Editar">✏️</button>
                    ${u.activo
                    ? `<button class="btn-icon btn-warning" onclick="confirmarToggleUsuario('${u.email}', 0, '${u.nombre}')" title="Desactivar">🚫</button>`
                    : `<button class="btn-icon" style="background:#d4edda;color:#155724;" onclick="confirmarToggleUsuario('${u.email}', 1, '${u.nombre}')" title="Activar">✅</button>`
                }
                    <button class="btn-icon btn-delete" onclick="confirmarEliminarUsuario('${u.email}', '${u.nombre}')" title="Eliminar">🗑️</button>
                </td>
            </tr>`;
        }).join('');

    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-red">Error al cargar usuarios</td></tr>';
    }
}

// Listeners de validación de contraseña en tiempo real
document.getElementById('usuario-password').addEventListener('input', validarCoincidenciaPasswords);
document.getElementById('usuario-password-confirm').addEventListener('input', validarCoincidenciaPasswords);

function validarCoincidenciaPasswords() {
    const p1 = document.getElementById('usuario-password').value;
    const p2 = document.getElementById('usuario-password-confirm').value;
    const msg = document.getElementById('password-match-msg');

    if (!p1 && !p2) {
        msg.textContent = '';
        msg.className = 'text-xs';
        return;
    }

    if (p2 && p1 === p2) {
        msg.textContent = 'Contraseñas coinciden';
        msg.className = 'text-xs text-success';
    } else if (p2) {
        msg.textContent = 'Contraseñas no coinciden';
        msg.className = 'text-xs text-danger';
    } else {
        msg.textContent = '';
    }
}

function abrirModalUsuario() {
    document.getElementById('form-usuario').reset();
    document.getElementById('usuario-id').value = '';
    document.getElementById('modal-usuario-titulo').textContent = 'Nuevo Usuario';
    document.getElementById('usuario-password-hint').classList.remove('hidden');
    document.getElementById('password-match-msg').textContent = ''; // Reset msg
    document.getElementById('modal-usuario').classList.remove('hidden');
}

function cerrarModalUsuario() {
    document.getElementById('modal-usuario').classList.add('hidden');
}

async function guardarUsuario() {
    const id = document.getElementById('usuario-id').value;
    const nombre = document.getElementById('usuario-nombre').value;
    const email = document.getElementById('usuario-email').value;
    const password = document.getElementById('usuario-password').value;
    const rol = document.getElementById('usuario-rol').value;

    if (!nombre || !email || !rol) {
        mostrarMensaje('error', '⚠️', 'Campos incompletos', 'Nombre, Email y Rol son obligatorios');
        return;
    }

    if (!id && !password) {
        mostrarMensaje('error', '⚠️', 'Contraseña requerida', 'Debes asignar una contraseña al crear un usuario');
        return;
    }

    // Validación estricta de contraseña (si se está enviando una)
    if (password) {
        if (password.length < 6) {
            mostrarMensaje('error', '⚠️', 'Contraseña insegura', 'La contraseña debe tener al menos 6 caracteres');
            return;
        }

        const confirmPassword = document.getElementById('usuario-password-confirm').value;
        if (password !== confirmPassword) {
            mostrarMensaje('error', '⚠️', 'No coinciden', 'Las contraseñas no coinciden');
            return;
        }
    }

    const datos = { nombre, email, rol, password }; // Password can be empty on update
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/ api / usuarios / ${id} ` : '/api/usuarios';

    try {
        const response = await fetchConToken(url, {
            method: method,
            body: JSON.stringify(datos)
        });

        const result = await response.json();

        if (result.success) {
            mostrarMensaje('success', '✅', 'Éxito', result.message);
            cerrarModalUsuario();
            cargarUsuariosTabla();
        } else {
            throw new Error(result.message || 'Error al guardar');
        }
    } catch (error) {
        console.error(error);
        mostrarMensaje('error', '❌', 'Error', error.message);
    }
}

function editarUsuario(id) {
    // id is email now
    const user = usuariosList.find(u => u.email === id);
    if (!user) return;

    document.getElementById('usuario-id').value = user.email; // Identify by email
    document.getElementById('usuario-nombre').value = user.nombre;
    document.getElementById('usuario-email').value = user.email;
    document.getElementById('usuario-rol').value = user.id_rol; // Use ID for select
    document.getElementById('usuario-password').value = '';
    document.getElementById('usuario-password-confirm').value = ''; // Clear confirm
    document.getElementById('password-match-msg').textContent = ''; // Clear msg
    document.getElementById('modal-usuario-titulo').textContent = 'Editar Usuario';

    document.getElementById('modal-usuario').classList.remove('hidden');
}

function confirmarToggleUsuario(id, nuevoEstado, nombre) {
    const accion = nuevoEstado ? 'activar' : 'desactivar';
    mostrarConfirmacion(
        nuevoEstado ? '✅' : '🚫',
        `${accion.charAt(0).toUpperCase() + accion.slice(1)} Usuario`,
        `¿Deseas ${accion} el acceso para "${nombre}" ? `,
        async () => {
            try {
                const response = await fetchConToken(`/api/usuarios/${id}/estado`, {
                    method: 'PATCH',
                    body: JSON.stringify({ activo: nuevoEstado })
                });
                if (response.ok) cargarUsuariosTabla();
            } catch (error) { console.error(error); }
        }
    );
}

function confirmarEliminarUsuario(id, nombre) {
    mostrarConfirmacion(
        '🗑️',
        'Eliminar Usuario',
        `¿Estás seguro de eliminar a "${nombre}"? Esta acción suele ser irreversible.`,
        async () => {
            try {
                const response = await fetchConToken(`/api/usuarios/${id}`, { method: 'DELETE' });
                const result = await response.json();
                if (result.success) {
                    mostrarMensaje('success', '✅', 'Eliminado', result.message);
                    cargarUsuariosTabla();
                } else {
                    mostrarMensaje('error', '❌', 'Error', result.message);
                }
            } catch (error) { console.error(error); }
        },
        true
    );
}