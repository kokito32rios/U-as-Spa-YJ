// =============================================
// DASHBOARD MANICURISTA - LOGIC (CALENDAR VERSION)
// =============================================

// Variables Globales Agenda
let agendaFechaActual = new Date();
let agendaVistaActual = 'semanal'; // semanal | mensual
let agendaDatos = { citas: [], manicuristas: [], horarios_trabajo: [], excepciones: [] };
let agendaInicializada = false;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Verificar Token
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    // 2. Cargar Info Usuario
    cargarInfoUsuario();

    // 3. Listeners
    setupListeners();

    // 4. Inicializar Agenda (esperando a usuario)
    // Se llama desde cargarInfoUsuario una vez tenemos el email
});

// =============================================
// SETUP LISTENERS UI
// =============================================
function setupListeners() {
    const menuToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('sidebar-open');
            sidebar.classList.toggle('active');
            backdrop.classList.toggle('active');
        });
    }

    if (backdrop) {
        backdrop.addEventListener('click', () => {
            cerrarSidebarMobile();
        });
    }
}

function cerrarSidebarMobile() {
    const sidebar = document.querySelector('.sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) {
        sidebar.classList.remove('sidebar-open');
        sidebar.classList.remove('active');
    }
    if (backdrop) backdrop.classList.remove('active');
}

window.cambiarSeccion = function (seccionId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.remove('active');
    });

    // Show target section
    const target = document.getElementById(`seccion-${seccionId}`);
    if (target) target.classList.add('active');

    // Update Sidebar
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('href') === `#${seccionId}`) {
            item.classList.add('active');
        }
    });

    const titulos = {
        'agenda': 'Mi Agenda',
        'comisiones': 'Mis Comisiones',
        'cuadre': 'Mi Cuadre Diario',
        'perfil': 'Mi Perfil'
    };
    const headerTitle = document.getElementById('section-title');
    if (headerTitle) headerTitle.textContent = titulos[seccionId] || 'Dashboard';

    cerrarSidebarMobile(); // Close on mobile navigation

    // Si entramos a agenda y no se ha cargado (switch tab), recargar si es necesario
    if (seccionId === 'agenda' && window.usuarioEmail) {
        cargarAgenda();
    }
}

// =============================================
// INFO USUARIO & LOGOUT
// =============================================
function cargarInfoUsuario() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userWelcome = document.getElementById('user-welcome');
        const profileName = document.getElementById('perfil-nombre');
        const profileEmail = document.getElementById('perfil-email');
        const nombreCompleto = `${payload.nombre} ${payload.apellido}`;

        if (userWelcome) userWelcome.textContent = `Hola, ${payload.nombre}`;
        if (profileName) profileName.textContent = nombreCompleto;
        if (profileEmail) profileEmail.textContent = payload.email;

        window.usuarioEmail = payload.email;
        window.usuarioNombre = nombreCompleto;

        // Poblar el "filtro" de manicurista con el usuario actual (solo visual)
        const selectFiltro = document.getElementById('agenda-filtro-manicurista');
        if (selectFiltro) {
            selectFiltro.innerHTML = `<option value="${payload.email}">${nombreCompleto}</option>`;
            selectFiltro.value = payload.email;
        }

        // Una vez tenemos usuario, cargamos la agenda
        inicializarAgenda();

    } catch (e) {
        console.error('Error al decodificar token:', e);
        cerrarSesion();
    }
}

window.cerrarSesion = function () {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
}

// =============================================
// AGENDA LOGIC (Full Calendar Port)
// =============================================
async function inicializarAgenda() {
    if (!agendaInicializada) {
        agendaInicializada = true;
    }
    await cargarAgenda();
}

window.cargarAgenda = async function () {
    const loader = document.getElementById('agenda-loader');
    const gridSemanal = document.getElementById('calendario-semanal-grid');

    if (loader) loader.classList.remove('hidden');
    if (gridSemanal) gridSemanal.classList.add('hidden');

    try {
        const { fechaInicio, fechaFin } = obtenerRangoFechas();
        const token = localStorage.getItem('token');

        // endpoint con filtro de manicurista forzado al usuario actual
        const params = new URLSearchParams({
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin,
            manicurista: window.usuarioEmail
        });

        const response = await fetch(`/api/citas/helpers/agenda?${params}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.success) {
            agendaDatos = data;
            actualizarTituloFecha();

            if (agendaVistaActual === 'semanal') {
                renderizarVistaSemanal();
            } else {
                renderizarVistaMensual();
            }
        } else {
            console.error('Error loading agenda data:', data);
        }

        if (loader) loader.classList.add('hidden');
        if (gridSemanal) gridSemanal.classList.remove('hidden');

    } catch (error) {
        console.error('Error cargando agenda:', error);
        if (loader) loader.classList.add('hidden');
    }
}

// ---------------------------------------------
// Vistas y Navegación
// ---------------------------------------------
window.cambiarVistaAgenda = function (vista) {
    agendaVistaActual = vista;
    document.getElementById('btn-vista-semanal').classList.toggle('active', vista === 'semanal');
    document.getElementById('btn-vista-mensual').classList.toggle('active', vista === 'mensual');
    document.getElementById('calendario-semanal').classList.toggle('hidden', vista !== 'semanal');
    document.getElementById('calendario-mensual').classList.toggle('hidden', vista !== 'mensual');
    cargarAgenda();
}

window.navegarAgenda = function (direccion) {
    if (agendaVistaActual === 'semanal') {
        agendaFechaActual.setDate(agendaFechaActual.getDate() + (direccion * 7));
    } else {
        agendaFechaActual.setMonth(agendaFechaActual.getMonth() + direccion);
    }
    cargarAgenda();
}

window.irAHoy = function () {
    agendaFechaActual = new Date();
    cargarAgenda();
}

// ---------------------------------------------
// Helpers de Fecha
// ---------------------------------------------
function obtenerRangoFechas() {
    const fecha = new Date(agendaFechaActual);
    if (agendaVistaActual === 'semanal') {
        const dia = fecha.getDay();
        const diff = fecha.getDate() - dia + (dia === 0 ? -6 : 1); // Ajustar al lunes
        const lunes = new Date(fecha.setDate(diff));
        const domingo = new Date(lunes);
        domingo.setDate(lunes.getDate() + 6);
        return {
            fechaInicio: formatearFechaISO(lunes),
            fechaFin: formatearFechaISO(domingo)
        };
    } else {
        const primerDia = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
        const ultimoDia = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);
        return {
            fechaInicio: formatearFechaISO(primerDia),
            fechaFin: formatearFechaISO(ultimoDia)
        };
    }
}

function formatearFechaISO(fecha) {
    const offset = fecha.getTimezoneOffset() * 60000;
    const localDate = new Date(fecha.getTime() - offset);
    return localDate.toISOString().split('T')[0];
}

function actualizarTituloFecha() {
    const titulo = document.getElementById('agenda-fecha-titulo');
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

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

// ---------------------------------------------
// Renderizado
// ---------------------------------------------
function renderizarVistaSemanal() {
    const grid = document.getElementById('calendario-semanal-grid');
    const { fechaInicio } = obtenerRangoFechas();
    const inicioSemana = new Date(fechaInicio + 'T00:00:00');
    const hoyStr = formatearFechaISO(new Date());

    const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const horas = [];
    for (let h = 8; h < 20; h++) {
        horas.push(`${h.toString().padStart(2, '0')}:00`);
        horas.push(`${h.toString().padStart(2, '0')}:30`);
    }

    // A. Renderizar Leyenda (Solo la manicurista actual)
    // Aunque solo sea una, la mostramos para mantener el estilo
    const leyendaContainer = document.getElementById('leyenda-manicuristas-container');
    if (leyendaContainer) {
        const color = '#e91e63'; // Color fijo para "mi"
        leyendaContainer.innerHTML = `
            <div class="leyenda-manicuristas">
                <span class="leyenda-titulo">Manicurista:</span>
                <div class="manicurista-chip" style="border-left: 5px solid ${color};">
                    💅 ${window.usuarioNombre || 'Yo'}
                </div>
            </div>
            <div class="leyendas-wrapper">
                 <div class="leyenda-estados">
                    <span class="leyenda-titulo">Estados:</span>
                    <div class="estado-chip"><span class="estado-color" style="background-color: #ffc107;"></span>Pendiente</div>
                    <div class="estado-chip"><span class="estado-color" style="background-color: #17a2b8;"></span>Confirmada</div>
                    <div class="estado-chip"><span class="estado-color" style="background-color: #28a745;"></span>Completada</div>
                 </div>
            </div>
        `;
    }

    // B. Renderizar Grid
    let html = '<div class="calendario-header"><div class="calendario-header-cell">Hora</div>';
    for (let i = 0; i < 7; i++) {
        const fecha = new Date(inicioSemana);
        fecha.setDate(inicioSemana.getDate() + i);
        const fStr = formatearFechaISO(fecha);
        const esHoy = fStr === hoyStr ? 'es-hoy' : '';
        html += `<div class="calendario-header-cell ${esHoy}">${diasSemana[i]} ${fecha.getDate()}</div>`;
    }
    html += '</div>';

    horas.forEach(hora => {
        html += `<div class="calendario-hora">${hora}</div>`;
        for (let i = 0; i < 7; i++) {
            const fecha = new Date(inicioSemana);
            fecha.setDate(inicioSemana.getDate() + i);
            const fechaStr = formatearFechaISO(fecha);

            // Filtrar mis citas
            const citasEnSlot = agendaDatos.citas.filter(c =>
                c.fecha.split('T')[0] === fechaStr &&
                c.hora_inicio.substring(0, 5) === hora
            );

            html += `<div class="calendario-celda" style="position:relative; min-height:40px;">`;

            citasEnSlot.forEach((cita, index) => {
                // Convert 'HH:MM:SS' to duration roughly
                // Simplified visually for now
                const color = '#e91e63';
                html += `
                    <div class="cita-slot estado-${cita.estado}" 
                         style="border-left: 4px solid ${color}; background:rgba(233,30,99, 0.1); padding:2px; font-size:0.8rem; margin-bottom:2px; border-radius:4px; cursor:pointer;"
                         title="${cita.nombre_servicio} - ${cita.nombre_cliente}">
                        <strong>${cita.hora_inicio.substring(0, 5)}</strong> ${cita.nombre_servicio}<br>
                        <small>👤 ${cita.nombre_cliente}</small>
                    </div>
                 `;
            });

            html += `</div>`;
        }
    });

    grid.innerHTML = html;
}

function renderizarVistaMensual() {
    const grid = document.getElementById('calendario-mensual-grid');
    const year = agendaFechaActual.getFullYear();
    const month = agendaFechaActual.getMonth();
    const hoyStr = formatearFechaISO(new Date());

    const primerDia = new Date(year, month, 1);
    const ultimoDia = new Date(year, month + 1, 0);
    let inicioSemana = primerDia.getDay() - 1;
    if (inicioSemana < 0) inicioSemana = 6;

    const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    let html = '';

    diasSemana.forEach(d => html += `<div class="mes-header">${d}</div>`);

    // Dias vacios
    for (let i = 0; i < inicioSemana; i++) {
        html += `<div class="mes-dia otro-mes"></div>`;
    }

    for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
        const fechaStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;
        const esHoy = fechaStr === hoyStr ? 'es-hoy' : '';
        const citasDia = agendaDatos.citas.filter(c => c.fecha.split('T')[0] === fechaStr);

        html += `
            <div class="mes-dia ${esHoy}" onclick="irADiaSemanal('${fechaStr}')">
                <div class="dia-numero">${dia}</div>
                ${citasDia.length > 0 ? `<span class="citas-badge">${citasDia.length} citas</span>` : ''}
            </div>
        `;
    }
    grid.innerHTML = html;
}

window.irADiaSemanal = function (fechaStr) {
    agendaFechaActual = new Date(fechaStr + 'T00:00:00');
    cambiarVistaAgenda('semanal');
}

// =============================================
// PLACEHOLDERS (Non-Agenda) - UPDATE: IMPLEMENTADO
// =============================================

// =============================================
// SECCIÓN MI CUADRE (REPORTES)
// =============================================

// Variable global para controlar inicialización
let cuadreInicializado = false;

window.inicializarCuadre = function () {
    if (cuadreInicializado) return;

    // 0. Establecer fecha de HOY por defecto en el input
    const inputFecha = document.getElementById('cuadre-fecha');
    if (inputFecha) {
        inputFecha.valueAsDate = new Date();
    }

    // 1. Poblar Años
    const selectAnio = document.getElementById('filtro-cuadre-anio');
    if (selectAnio) {
        const currentYear = new Date().getFullYear();
        selectAnio.innerHTML = '';
        for (let i = currentYear - 3; i <= currentYear + 1; i++) {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = i;
            if (i === currentYear) opt.selected = true;
            selectAnio.appendChild(opt);
        }

        // Listener para actualizar semanas si cambia el año
        selectAnio.addEventListener('change', () => {
            if (document.getElementById('filtro-cuadre-tipo').value === 'semana') {
                poblarSemanasCuadre();
            }
        });
    }

    // 2. Mes por defecto
    const selectMes = document.getElementById('filtro-cuadre-mes');
    if (selectMes) selectMes.value = new Date().getMonth() + 1;

    // 3. Inicializar vista de filtros
    cambiarTipoFiltroCuadre();

    cuadreInicializado = true;
}

// ... (Funciones de filtro se mantienen igual, simplificadas aquí por el reemplazo) ...
window.cambiarTipoFiltroCuadre = function () {
    const tipo = document.getElementById('filtro-cuadre-tipo').value;
    document.getElementById('filtro-cuadre-mes-container').style.display = 'none';
    document.getElementById('filtro-cuadre-semana-container').style.display = 'none';
    document.getElementById('filtro-cuadre-rango-container').style.display = 'none';

    if (tipo === 'mes') {
        document.getElementById('filtro-cuadre-mes-container').style.display = 'flex';
    } else if (tipo === 'semana') {
        document.getElementById('filtro-cuadre-semana-container').style.display = 'block';
        poblarSemanasCuadre();
    } else if (tipo === 'rango') {
        document.getElementById('filtro-cuadre-rango-container').style.display = 'flex';
        // Fechas default
        if (!document.getElementById('filtro-cuadre-desde').value) {
            const hoy = new Date();
            const hace7 = new Date(); hace7.setDate(hace7.getDate() - 7);
            document.getElementById('filtro-cuadre-desde').valueAsDate = hace7;
            document.getElementById('filtro-cuadre-hasta').valueAsDate = hoy;
        }
    }
}

window.poblarSemanasCuadre = function () {
    // ... (Misma lógica, no cambia) ...
    const selectSemana = document.getElementById('filtro-cuadre-semana');
    const anio = document.getElementById('filtro-cuadre-anio').value || new Date().getFullYear();
    selectSemana.innerHTML = '';
    const primerDia = new Date(anio, 0, 1);
    const ultimoDia = new Date(anio, 11, 31);
    let semanaActual = new Date(primerDia);
    const diaSemana = semanaActual.getDay();
    const diff = diaSemana === 0 ? -6 : 1 - diaSemana;
    semanaActual.setDate(semanaActual.getDate() + diff);

    let numSemana = 1;
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    while (semanaActual <= ultimoDia) {
        const finSemana = new Date(semanaActual);
        finSemana.setDate(finSemana.getDate() + 6);
        const desde = semanaActual.toISOString().split('T')[0];
        const hasta = finSemana.toISOString().split('T')[0];
        const displayDesde = `${semanaActual.getDate()} ${meses[semanaActual.getMonth()]}`;
        const displayHasta = `${finSemana.getDate()} ${meses[finSemana.getMonth()]}`;
        const option = document.createElement('option');
        option.value = `${desde}|${hasta}`;
        option.textContent = `Semana ${numSemana}: ${displayDesde} - ${displayHasta}`;
        const hoy = new Date();
        if (hoy >= semanaActual && hoy <= finSemana) option.selected = true;
        selectSemana.appendChild(option);
        semanaActual.setDate(semanaActual.getDate() + 7);
        numSemana++;
    }
}

// === CREAR / EDITAR ===
window.abrirModalRegistro = function () {
    // Limpiar y preparar para nuevo registro
    document.getElementById('cuadre-id').value = '';
    document.getElementById('cuadre-desc').value = '';
    document.getElementById('cuadre-valor').value = '';

    // Fecha hoy por defecto
    document.getElementById('cuadre-fecha').valueAsDate = new Date();

    // UI Defaults
    document.getElementById('modal-registro-titulo').textContent = '📝 Nuevo Registro';
    const btnSubmit = document.getElementById('btn-cuadre-submit');
    if (btnSubmit) btnSubmit.innerHTML = '<span>💾</span> Guardar';

    document.getElementById('modal-registro').style.display = 'flex';
}

window.cerrarModalRegistro = function () {
    document.getElementById('modal-registro').style.display = 'none';
}

window.registrarCuadre = async function (e) {
    e.preventDefault();

    const idInput = document.getElementById('cuadre-id');
    const descInput = document.getElementById('cuadre-desc');
    const valorInput = document.getElementById('cuadre-valor');
    const fechaInput = document.getElementById('cuadre-fecha');

    // Obtener botón usando ID si es posible, o búsqueda
    const btnSubmit = document.getElementById('btn-cuadre-submit') || e.target.querySelector('button[type="submit"]');

    const id = idInput.value;
    const descripcion = descInput.value.trim();
    const valor = parseFloat(valorInput.value);
    const fecha = fechaInput.value; // YYYY-MM-DD

    if (!descripcion || isNaN(valor) || valor <= 0 || !fecha) {
        mostrarModal('Por favor completa todos los campos correctamente.', 'error');
        return;
    }

    try {
        btnSubmit.disabled = true;
        const originalText = btnSubmit.innerHTML;
        btnSubmit.textContent = id ? 'Actualizando...' : 'Guardando...';

        const token = localStorage.getItem('token');
        let url = '/api/reportes';
        let method = 'POST';

        if (id) {
            url += `/${id}`;
            method = 'PUT';
        }

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ descripcion, valor, fecha })
        });

        const data = await response.json();

        if (data.success) {
            cerrarModalRegistro();
            mostrarModal(id ? 'Registro actualizado correctamente' : 'Registro guardado exitosamente', 'success');
            cargarReportes(); // Recargar tabla
        } else {
            mostrarModal('Error: ' + data.message, 'error');
        }

    } catch (error) {
        console.error('Error:', error);
        mostrarModal('Error de conexión.', 'error');
    } finally {
        btnSubmit.disabled = false;
        if (btnSubmit.textContent.includes('...')) {
            // Restaurar texto básico si hubo error o al finalizar
            btnSubmit.innerHTML = id ? '<span>💾</span> Actualizar' : '<span>💾</span> Guardar';
        }
    }
}

window.editarReporte = function (id, descripcion, valor, fecha) {
    // 1. Abrir Modal
    document.getElementById('modal-registro').style.display = 'flex';

    // 2. Rellenar datos
    document.getElementById('cuadre-id').value = id;
    document.getElementById('cuadre-desc').value = descripcion;
    document.getElementById('cuadre-valor').value = valor;

    if (fecha) {
        const dateObj = new Date(fecha);
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        document.getElementById('cuadre-fecha').value = `${yyyy}-${mm}-${dd}`;
    }

    // 3. Cambiar títulos y botones
    document.getElementById('modal-registro-titulo').textContent = '✏️ Editar Registro';
    const btnSubmit = document.getElementById('btn-cuadre-submit');
    if (btnSubmit) btnSubmit.innerHTML = '<span>🔄</span> Actualizar';
}

window.cancelarEdicion = function () {
    // Legacy placeholder si algo lo llama, pero ahora usamos cerrarModalRegistro
    cerrarModalRegistro();
}

window.cargarReportes = async function () {
    const tbody = document.getElementById('cuadre-tbody');
    const totalDiaEl = document.getElementById('cuadre-total-dia');
    const totalGananciaEl = document.getElementById('cuadre-total-ganancia');

    if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-center">Cargando...</td></tr>';

    // Obtener filtros
    const tipo = document.getElementById('filtro-cuadre-tipo').value;
    const anio = document.getElementById('filtro-cuadre-anio').value;
    const mes = document.getElementById('filtro-cuadre-mes').value;

    let url = `/api/reportes?tipo=${tipo}&anio=${anio}`;
    // ... Agregar lógica de params (igual a anterior) ...
    if (tipo === 'mes') {
        url += `&mes=${mes}`;
    } else if (tipo === 'semana') {
        const semanaVal = document.getElementById('filtro-cuadre-semana').value;
        if (semanaVal) {
            const [desde, hasta] = semanaVal.split('|');
            url += `&desde=${desde}&hasta=${hasta}`;
        }
    } else if (tipo === 'rango') {
        const desde = document.getElementById('filtro-cuadre-desde').value;
        const hasta = document.getElementById('filtro-cuadre-hasta').value;
        if (desde && hasta) url += `&desde=${desde}&hasta=${hasta}`;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await response.json();

        if (data.success) {
            if (data.reportes.length === 0) {
                if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No hay registros para este filtro</td></tr>';
                if (totalDiaEl) totalDiaEl.textContent = formatCurrency(0);
                if (totalGananciaEl) totalGananciaEl.textContent = formatCurrency(0);
                return;
            }

            if (tbody) {
                tbody.innerHTML = data.reportes.map(r => {
                    // Pasar datos seguros a la función editar
                    // Escapar strings es buena práctica
                    const descSafe = r.descripcion.replace(/'/g, "\\'");

                    // Ajuste de fecha para visualizar y para editar
                    // OJO: La fecha de BD viene en UTC o local dependiendo driver.
                    // Para display usamos toLocaleDateString
                    // Para editar enviamos r.fecha tal cual (ISO string)

                    const fechaObj = new Date(r.fecha);
                    // Importante: al crear fecha con string YYYY-MM-DD javascript asume UTC.
                    // Usamos getUTCDate para mostrar la fecha correcta almacenada
                    // O simplemente split
                    const fechaVisual = r.fecha.split('T')[0];

                    return `
                        <tr>
                            <td>${fechaVisual}</td>
                            <td>${r.descripcion}</td>
                            <td class="font-bold text-dark">${formatCurrency(r.valor_reportado)}</td>
                            <td><span class="badge badge-info">${r.porcentaje_aplicado || '?'}%</span></td>
                            <td class="font-bold text-success">${formatCurrency(r.ganancia_estimada)}</td>
                            <td>
                                <button class="btn-sm btn-warning" style="margin-right:5px;" 
                                    onclick="editarReporte(${r.id_reporte}, '${descSafe}', ${r.valor_reportado}, '${r.fecha}')" 
                                    title="Editar">✏️</button>
                                <button class="btn-sm btn-danger" onclick="eliminarReporte(${r.id_reporte})" title="Eliminar">🗑️</button>
                            </td>
                        </tr>
                    `;
                }).join('');
            }

            if (totalDiaEl) totalDiaEl.textContent = formatCurrency(data.totalReportado);
            if (totalGananciaEl) totalGananciaEl.textContent = formatCurrency(data.totalGanancia);

        } else {
            if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-center text-red">Error al cargar datos</td></tr>';
        }

    } catch (error) {
        console.error('Error:', error);
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-center text-red">Error de conexión</td></tr>';
    }
}

// Eliminar Reporte (Con confirmación SweetAlert2)
window.eliminarReporte = function (id) {
    Swal.fire({
        title: '¿Estás segura?',
        text: "No podrás revertir esta acción",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`/api/reportes/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                const data = await response.json();

                if (data.success) {
                    Swal.fire(
                        '¡Eliminado!',
                        'El registro ha sido eliminado.',
                        'success'
                    );
                    cargarReportes();
                } else {
                    mostrarModal('Error: ' + data.message, 'error');
                }

            } catch (error) {
                console.error('Error:', error);
                mostrarModal('Error al eliminar registro.', 'error');
            }
        }
    });
}

// Helpers Modal (Usando SweetAlert2)
window.mostrarModal = function (mensaje, tipo) {
    // Mapear tipos de SWAL
    // success, error, warning, info, question
    let swalIcon = tipo;
    if (tipo === 'error') swalIcon = 'error';
    if (tipo === 'success') swalIcon = 'success';

    Swal.fire({
        title: tipo === 'success' ? '¡Éxito!' : 'Atención',
        text: mensaje,
        icon: swalIcon,
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#e91e63' // Color primario aprox
    });
}

window.cerrarModal = function () {
    // Swal se cierra solo o con clic
    Swal.close();
}

window.cambiarPassword = function (e) { e.preventDefault(); alert('Pendiente'); }

// =============================================
// SECCIÓN COMISIONES
// =============================================
let comisionChart = null; // Si usáramos Chart.js, por ahora solo texto

window.inicializarComisiones = function () {
    // 1. Poblar Años (3 años atrás y 1 adelante)
    const selectAnio = document.getElementById('filtro-comision-anio');
    if (selectAnio) {
        const currentYear = new Date().getFullYear();
        selectAnio.innerHTML = '';
        for (let i = currentYear - 3; i <= currentYear + 1; i++) {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = i;
            if (i === currentYear) opt.selected = true;
            selectAnio.appendChild(opt);
        }
    }

    // 2. Establecer Mes Actual por defecto
    const selectMes = document.getElementById('filtro-comision-mes');
    if (selectMes) {
        selectMes.value = new Date().getMonth() + 1;
    }

    // 3. Listeners para cambios
    const tipoFiltro = document.getElementById('filtro-comision-tipo');
    if (tipoFiltro) {
        tipoFiltro.addEventListener('change', cambiarTipoFiltroComision);
    }

    const selectSemanaAnio = document.getElementById('filtro-comision-anio');
    if (selectSemanaAnio) {
        selectSemanaAnio.addEventListener('change', () => {
            if (document.getElementById('filtro-comision-tipo').value === 'semana') {
                poblarSemanasComision();
            }
        });
    }

    // 4. Inicializar vista
    cambiarTipoFiltroComision();
    cargarComisiones();
}

window.cambiarTipoFiltroComision = function () {
    const tipo = document.getElementById('filtro-comision-tipo').value;

    // Ocultar todos los contenedores
    document.getElementById('filtro-mes-container').style.display = 'none';
    document.getElementById('filtro-semana-container').style.display = 'none';
    document.getElementById('filtro-rango-container').style.display = 'none';

    // Mostrar el contenedor correspondiente
    if (tipo === 'mes') {
        document.getElementById('filtro-mes-container').style.display = 'flex';
    } else if (tipo === 'semana') {
        document.getElementById('filtro-semana-container').style.display = 'block';
        poblarSemanasComision();
    } else if (tipo === 'rango') {
        document.getElementById('filtro-rango-container').style.display = 'flex';
        // Establecer fechas por defecto (semana actual) si están vacías
        if (!document.getElementById('filtro-comision-desde').value) {
            const hoy = new Date();
            const hace7Dias = new Date(hoy);
            hace7Dias.setDate(hace7Dias.getDate() - 7);
            document.getElementById('filtro-comision-desde').valueAsDate = hace7Dias;
            document.getElementById('filtro-comision-hasta').valueAsDate = hoy;
        }
    }
}

window.poblarSemanasComision = function () {
    const selectSemana = document.getElementById('filtro-comision-semana');
    const anio = document.getElementById('filtro-comision-anio').value || new Date().getFullYear();

    selectSemana.innerHTML = '';

    // Generar semanas del año
    const primerDia = new Date(anio, 0, 1);
    const ultimoDia = new Date(anio, 11, 31);

    let semanaActual = new Date(primerDia);
    // Ajustar al lunes de esa semana
    const diaSemana = semanaActual.getDay();
    const diff = diaSemana === 0 ? -6 : 1 - diaSemana;
    semanaActual.setDate(semanaActual.getDate() + diff);

    let numSemana = 1;

    while (semanaActual <= ultimoDia) {
        const finSemana = new Date(semanaActual);
        finSemana.setDate(finSemana.getDate() + 6);

        const desde = semanaActual.toISOString().split('T')[0];
        const hasta = finSemana.toISOString().split('T')[0];

        // Formatear display
        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const displayDesde = `${semanaActual.getDate()} ${meses[semanaActual.getMonth()]}`;
        const displayHasta = `${finSemana.getDate()} ${meses[finSemana.getMonth()]}`;

        const option = document.createElement('option');
        option.value = `${desde}|${hasta}`;
        option.textContent = `Semana ${numSemana}: ${displayDesde} - ${displayHasta}`;
        selectSemana.appendChild(option);

        semanaActual.setDate(semanaActual.getDate() + 7);
        numSemana++;
    }

    // Seleccionar la semana actual si estamos en el año actual
    const hoy = new Date();
    if (parseInt(anio) === hoy.getFullYear()) {
        const opciones = selectSemana.options;
        for (let i = 0; i < opciones.length; i++) {
            const [desde, hasta] = opciones[i].value.split('|');
            if (hoy >= new Date(desde) && hoy <= new Date(hasta)) {
                selectSemana.selectedIndex = i;
                break;
            }
        }
    }
}

window.cargarComisiones = async function () {
    const tbody = document.getElementById('comis-tbody');
    const totalMes = document.getElementById('comis-total-mes');
    const metricLabel = document.querySelector('.metric-comisiones .metric-label');

    // Determinar Fechas según Filtro
    const tipo = document.getElementById('filtro-comision-tipo').value;
    let fechaInicio, fechaFin;
    let labelPeriodo = "Periodo Seleccionado";

    if (tipo === 'mes') {
        const mes = document.getElementById('filtro-comision-mes').value;
        const anio = document.getElementById('filtro-comision-anio').value;
        const primerDia = new Date(anio, mes - 1, 1);
        const ultimoDia = new Date(anio, mes, 0); // Ultimo dia del mes

        fechaInicio = formatearFechaISO(primerDia);
        fechaFin = formatearFechaISO(ultimoDia);

        const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        labelPeriodo = `Ganancias (${mesesNombres[mes - 1]} ${anio})`;

    } else if (tipo === 'semana') {
        const valorSemana = document.getElementById('filtro-comision-semana').value;
        if (valorSemana) {
            [fechaInicio, fechaFin] = valorSemana.split('|');
            labelPeriodo = "Ganancias (Semana Seleccionada)";
        } else {
            // Fallback si no hay semanas
            const hoy = new Date();
            fechaInicio = formatearFechaISO(hoy);
            fechaFin = formatearFechaISO(hoy);
        }

    } else if (tipo === 'rango') {
        fechaInicio = document.getElementById('filtro-comision-desde').value;
        fechaFin = document.getElementById('filtro-comision-hasta').value;
        labelPeriodo = "Ganancias (Rango Personalizado)";
    }

    if (metricLabel) metricLabel.textContent = labelPeriodo;

    if (!fechaInicio || !fechaFin) {
        alert("Por favor selecciona un rango de fechas válido");
        return;
    }

    if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="text-center">Cargando...</td></tr>';

    try {
        const token = localStorage.getItem('token');
        const params = new URLSearchParams({ fecha_inicio: fechaInicio, fecha_fin: fechaFin });

        const response = await fetch(`/api/citas/helpers/mis-comisiones?${params}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (data.success) {
            if (data.comisiones.length === 0) {
                if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay comisiones en este periodo</td></tr>';
                if (totalMes) totalMes.textContent = formatCurrency(0);
                return;
            }

            if (tbody) {
                tbody.innerHTML = data.comisiones.map(c => {
                    const porcentaje = c.valor_servicio > 0 ? Math.round((c.ganancia / c.valor_servicio) * 100) : 0;
                    return `
                        <tr>
                            <td>${c.fecha.split('T')[0]}</td>
                            <td>${c.nombre_servicio}</td>
                            <td>${formatCurrency(c.valor_servicio)}</td>
                            <td>${porcentaje}%</td>
                            <td class="text-success font-bold">${formatCurrency(c.ganancia)}</td>
                        </tr>
                    `;
                }).join('');
            }

            if (totalMes) totalMes.textContent = formatCurrency(data.total);

        } else {
            console.error('Error:', data.message);
            if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="text-center text-red">Error al cargar datos</td></tr>';
        }

    } catch (error) {
        console.error('Error:', error);
        if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="text-center text-red">Error de conexión</td></tr>';
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(amount);
}

// Hook into cambiarSeccion to load data
const originalCambiarSeccion = window.cambiarSeccion;
window.cambiarSeccion = function (seccion) {
    originalCambiarSeccion(seccion);
    if (seccion === 'comisiones') {
        // Inicializar si no se ha hecho (podemos comprobar si el select de año tiene opciones)
        const anioSelect = document.getElementById('filtro-comision-anio');
        if (anioSelect && anioSelect.options.length === 0) {
            inicializarComisiones();
        } else {
            // Si ya está inicializado, solo recargar data
            cargarComisiones();
        }
    }
}
