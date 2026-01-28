// =============================================
// FUNCIONES PARA FILTROS AVANZADOS DE COMISIONES
// Agrega estas funciones ANTES de inicializarComisiones() en dashboard-admin.js
// =============================================

function cambiarTipoFiltroComision() {
    const tipo = document.getElementById('filtro-comision-tipo').value;

    // Ocultar todos los contenedores
    document.getElementById('filtro-mes-container').style.display = 'none';
    document.getElementById('filtro-semana-container').style.display = 'none';
    document.getElementById('filtro-rango-container').style.display = 'none';

    // Mostrar el contenedor correspondiente
    if (tipo === 'mes') {
        document.getElementById('filtro-mes-container').style.display = 'block';
    } else if (tipo === 'semana') {
        document.getElementById('filtro-semana-container').style.display = 'block';
        poblarSemanasComision();
    } else if (tipo === 'rango') {
        document.getElementById('filtro-rango-container').style.display = 'block';
        // Establecer fechas por defecto (semana actual)
        const hoy = new Date();
        const hace7Dias = new Date(hoy);
        hace7Dias.setDate(hace7Dias.getDate() - 7);
        document.getElementById('filtro-comision-desde').valueAsDate = hace7Dias;
        document.getElementById('filtro-comision-hasta').valueAsDate = hoy;
    }
}

function poblarSemanasComision() {
    const selectSemana = document.getElementById('filtro-comision-semana');
    const anio = document.getElementById('filtro-comision-anio').value || new Date().getFullYear();

    selectSemana.innerHTML = '';

    // Generar semanas del año (similar a la agenda)
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

        const option = document.createElement('option');
        option.value = `${desde}|${hasta}`;
        option.textContent = `Semana ${numSemana}: ${formatearFechaCorta(semanaActual)} - ${formatearFechaCorta(finSemana)}`;
        selectSemana.appendChild(option);

        semanaActual.setDate(semanaActual.getDate() + 7);
        numSemana++;
    }

    // Seleccionar la semana actual
    const hoy = new Date();
    const opciones = selectSemana.options;
    for (let i = 0; i < opciones.length; i++) {
        const [desde, hasta] = opciones[i].value.split('|');
        if (hoy >= new Date(desde) && hoy <= new Date(hasta)) {
            selectSemana.selectedIndex = i;
            break;
        }
    }
}

function formatearFechaCorta(fecha) {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${fecha.getDate()} ${meses[fecha.getMonth()]}`;
}

// =============================================
// REEMPLAZAR inicializarComisiones() EXISTENTE
// =============================================

function inicializarComisiones() {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // 1-12

    const selectAnio = document.getElementById('filtro-comision-anio');
    const selectMes = document.getElementById('filtro-comision-mes');

    // Poblar años si está vacío
    if (selectAnio && selectAnio.options.length === 0) {
        selectAnio.innerHTML = '';

        const opt1 = document.createElement('option');
        opt1.value = currentYear;
        opt1.textContent = currentYear;
        selectAnio.appendChild(opt1);

        const opt2 = document.createElement('option');
        opt2.value = currentYear + 1;
        opt2.textContent = currentYear + 1;
        selectAnio.appendChild(opt2);
    }

    if (selectAnio) {
        selectAnio.value = currentYear.toString();
    }

    if (selectMes) {
        selectMes.value = currentMonth.toString();
    }

    // Inicializar el tipo de filtro a "mes" por defecto
    cambiarTipoFiltroComision();

    cargarComisiones();
}

// =============================================
// REEMPLAZAR cargarComisiones() EXISTENTE  
// =============================================

async function cargarComisiones() {
    try {
        const tipo = document.getElementById('filtro-comision-tipo').value;
        const anio = document.getElementById('filtro-comision-anio').value;

        let query = `?tipo=${tipo}&anio=${anio}`;

        if (tipo === 'mes') {
            const mes = document.getElementById('filtro-comision-mes').value;
            if (mes) query += `&mes=${mes}`;
        } else if (tipo === 'semana') {
            const semanaValue = document.getElementById('filtro-comision-semana').value;
            if (semanaValue) {
                const [desde, hasta] = semanaValue.split('|');
                query += `&desde=${desde}&hasta=${hasta}`;
            }
        } else if (tipo === 'rango') {
            const desde = document.getElementById('filtro-comision-desde').value;
            const hasta = document.getElementById('filtro-comision-hasta').value;
            if (desde && hasta) {
                query += `&desde=${desde}&hasta=${hasta}`;
            }
        }

        const response = await fetchConToken(`/api/comisiones/resumen${query}`);
        const data = await response.json();

        const tbody = document.getElementById('comisiones-body');

        if (!data.success || data.resumen.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay datos de comisiones para el periodo seleccionado</td></tr>';
            return;
        }

        tbody.innerHTML = data.resumen.map(c => `
            <tr>
                <td>${c.nombre_completo}</td>
                <td>$${Number(c.total_ventas).toLocaleString()}</td>
                <td>
                    ${c.porcentaje}% 
                    <button class="btn-icon btn-sm" onclick="abrirModalConfigComision('${c.email}', '${c.nombre_completo}', ${c.porcentaje})">⚙️</button>
                </td>
                <td>$${Number(c.total_comision).toLocaleString()}</td>
                <td class="text-success">$${Number(c.total_pagado).toLocaleString()}</td>
                <td class="text-danger font-bold">$${Number(c.pendiente).toLocaleString()}</td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="verDetalleComisiones('${c.email}', '${c.nombre_completo}')">
                        Ver Detalle
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error al cargar comisiones:', error);
    }
}
