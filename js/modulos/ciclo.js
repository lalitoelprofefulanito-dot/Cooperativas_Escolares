/* modulos/ciclo.js — INGRESA DATOS: datos del ciclo, mesa directiva, proveedor de alimentos,
   periodos sin venta y calendario calculado (H6:X58). */
(function (Coop) {
  'use strict';
  const { ui, f: F, calculos: C } = Coop;
  const { esc, campo, calc, calcBloque } = ui;

  /* Validaciones del Excel. En esta hoja ninguna bloquea: Excel guarda el dato aunque no cumpla. */
  ui.registrarRegla(/^ciclo\.primerDia$/, {
    validar: (v) => (F.serialDeIso(v) !== null && F.partes(F.serialDeIso(v)).semana !== 1
      ? { mensaje: 'El primer día de ventas debe ser un lunes.' } : null),
  });
  ui.registrarRegla(/^ciclo\.ultimoDia$/, {
    validar: (v, exp) => {
      if (F.vacio(v)) return null;
      const ini = F.serialDeIso(exp.ciclo.primerDia);
      return F.serialDeIso(v) > (ini ?? 0) ? null : { mensaje: 'El último día de ventas debe ser posterior al primero.' };
    },
  });
  ui.registrarRegla(/^ciclo\.periodos\.\d+\.hasta$/, {
    validar: (v, exp, ruta) => {
      if (F.vacio(v)) return null;
      const i = +ruta.split('.')[2];
      const desde = F.serialDeIso(exp.ciclo.periodos[i].desde);
      return F.serialDeIso(v) >= (desde ?? 0) ? null
        : { mensaje: "La fecha 'Hasta' debe ser igual o posterior a 'Desde'. Para un solo día capture la misma fecha." };
    },
  });
  ui.registrarRegla(/^ciclo\.firmantes\.4\.saliente$/, { propuesta: (exp) => C.propuestaCambioConsejo(exp) });

  const DATOS = [
    ['ciclo', 'Ciclo escolar', 'texto', 'Texto, por ejemplo 2027-2028.'],
    ['primerDia', 'Primer día de ventas (debe ser lunes)', 'fecha', 'Primer día de clases del calendario oficial del ciclo (debe ser lunes).'],
    ['ultimoDia', 'Último día de ventas', 'fecha', 'Último día de clases del calendario oficial del ciclo.'],
    ['escuela', 'Escuela (nombre)', 'texto', ''],
    ['cct', 'CCT', 'texto', ''],
    ['cooperativa', 'Nombre de la cooperativa', 'texto', ''],
    ['clave', 'Clave de la cooperativa', 'texto', ''],
    ['registro', 'No. de registro', 'texto', ''],
    ['socios', 'No. de socios', 'entero', null],
    ['efectivoAnterior', 'Efectivo anterior (saldo con que inicia el ciclo)', 'moneda', 'Saldo final del ciclo anterior según arqueo y estado de cuenta.'],
    ['ciudad', 'Ciudad', 'texto', ''],
    ['diasClase', 'Días de clase oficiales del ciclo', 'entero', 'Dato de referencia del calendario SEP.'],
    ['fotocopiadora', '¿La escuela cuenta con fotocopiadora?', 'lista', 'Si es «Sí», las fotocopias de la Dirección no se cubren con el 10 % (Orientaciones 2025-2026, «Apoyo del 10 %», inciso a).'],
  ];

  const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];

  function tablaCalendario(exp) {
    const cal = C.calendario(exp);
    const filas = cal.semanas.map((s) => {
      if (s.lunes === null) return `<tr class="sin-semana"><td>${s.h}</td><td colspan="11"></td></tr>`;
      const dias = s.dias.map((d, k) => (d === 1
        ? '<td class="dia-venta" aria-label="con venta">✔</td>'
        : `<td class="dia-sin" title="${esc(s.motivos[k])}"><span class="vh">sin venta: </span>${esc(s.motivos[k])}</td>`)).join('');
      return `<tr><td>${s.h}</td><td>${F.fechaDeSerial(s.lunes)}</td><td>${F.fechaDeSerial(s.viernes)}</td>${dias}`
        + `<td class="num">${s.diasConVenta}</td><td class="num">${s.semanaVenta}</td><td>${esc(s.rotulo)}</td>`
        + `<td>${F.fechaDeSerial(s.ultimoDia === '' ? '' : s.ultimoDia)}</td></tr>`;
    }).join('');
    return `<div class="tabla-desplazable"><table class="tabla calendario"><caption class="vh">Calendario calculado</caption><thead><tr>`
      + '<th scope="col">Sem. cal.</th><th scope="col">Lunes</th><th scope="col">Viernes</th>'
      + DIAS.map((d) => `<th scope="col">${d}</th>`).join('')
      + '<th scope="col">Días con venta</th><th scope="col">Semana de venta No.</th><th scope="col">Rótulo de la semana</th><th scope="col">Último día con venta</th>'
      + `</tr></thead><tbody>${filas}</tbody></table></div><p class="totales">${esc(cal.resumen)}</p>`;
  }

  function render(exp) {
    const c = exp.ciclo;
    const datos = DATOS.map(([k, etiqueta, tipo, ayuda]) => {
      const def = { ruta: `ciclo.${k}`, tipo, etiqueta, ayuda: ayuda || '' };
      if (tipo === 'lista') def.opciones = ['Sí', 'No'];
      const extra = ayuda === null ? calc('textoSocios', '', 'nota') : '';
      return `<div class="fila-dato">${campo(def, exp)}${extra}</div>`;
    }).join('');

    const firmas = Coop.modelo.FUNCIONES_FIRMA.map((fun, i) => `<tr><th scope="row">${esc(fun)}</th>`
      + `<td>${campo({ ruta: `ciclo.firmantes.${i}.nombre`, etiqueta: `${fun}: nombre (como se firma)`, oculta: true }, exp)}</td>`
      + `<td>${campo({ ruta: `ciclo.firmantes.${i}.cargo`, etiqueta: `${fun}: cargo que aparece bajo la firma`, oculta: true }, exp)}</td>`
      + `<td>${campo({ ruta: `ciclo.firmantes.${i}.saliente`, etiqueta: i === 4 ? 'Consejo saliente: renglón de la Dirección (dato informativo)' : `${fun}: Consejo saliente`, oculta: true }, exp)}</td></tr>`).join('');

    const prov = [['nombre', 'Nombre del proveedor'], ['domicilio', 'Domicilio'], ['rfc', 'RFC'], ['telefono', 'Teléfono']]
      .map(([k, e]) => `<div class="fila-dato">${campo({ ruta: `ciclo.proveedor.${k}`, etiqueta: e, ayuda: '' }, exp)}</div>`).join('');

    const n = Coop.app.filasVisibles('periodos', c.periodos, (p) => F.vacio(p.desde) && F.vacio(p.hasta) && F.vacio(p.motivo) && F.vacio(p.fuente), 5);
    const periodos = c.periodos.slice(0, n).map((p, i) => `<tr><td class="num">${i + 1}</td>`
      + `<td>${campo({ ruta: `ciclo.periodos.${i}.desde`, tipo: 'fecha', etiqueta: `Periodo ${i + 1}: desde`, oculta: true }, exp)}</td>`
      + `<td>${campo({ ruta: `ciclo.periodos.${i}.hasta`, tipo: 'fecha', etiqueta: `Periodo ${i + 1}: hasta`, oculta: true }, exp)}</td>`
      + `<td>${campo({ ruta: `ciclo.periodos.${i}.motivo`, etiqueta: `Periodo ${i + 1}: motivo`, oculta: true }, exp)}</td>`
      + `<td>${campo({ ruta: `ciclo.periodos.${i}.fuente`, etiqueta: `Periodo ${i + 1}: fuente`, oculta: true }, exp)}</td></tr>`).join('');

    return `
      <p class="intro">Capture solo en las celdas amarillas. Todo lo demás (fechas de cada semana, rótulos, firmas, folios y controles) se recalcula a partir de esta pantalla.</p>
      <section aria-labelledby="t-datos"><h2 id="t-datos">Datos del ciclo</h2><div class="rejilla-datos">${datos}</div></section>
      <section aria-labelledby="t-mesa"><h2 id="t-mesa">Mesa directiva y firmas del ciclo</h2>
        <div class="tabla-desplazable"><table class="tabla"><thead><tr><th scope="col">Función</th><th scope="col">Nombre (como se firma)</th>
        <th scope="col">Cargo que aparece bajo la firma</th><th scope="col">Consejo saliente (firma lo fechado antes de la Ordinaria de renovación)</th></tr></thead>
        <tbody>${firmas}</tbody></table></div></section>
      <section aria-labelledby="t-prov"><h2 id="t-prov">Proveedor de alimentos (aparece en las notas de remisión)</h2><div class="rejilla-datos">${prov}</div></section>
      <section aria-labelledby="t-per"><h2 id="t-per">Periodos sin venta (festivos, CTE, registro de calificaciones, vacaciones)</h2>
        <p class="nota">Un solo día = misma fecha en Desde y Hasta. Capacidad: ${Coop.modelo.CAPACIDAD.periodos} renglones.</p>
        <div class="tabla-desplazable"><table class="tabla"><thead><tr><th scope="col">No.</th><th scope="col">Desde</th><th scope="col">Hasta</th><th scope="col">Motivo</th><th scope="col">Fuente</th></tr></thead>
        <tbody>${periodos}</tbody></table></div>${Coop.app.botonAgregar('periodos', n, c.periodos.length)}</section>
      <section aria-labelledby="t-cal"><h2 id="t-cal">Calendario calculado (no se captura)</h2>${calcBloque('calendario')}</section>`;
  }

  function calculados(exp) {
    return { textoSocios: C.textoSociosCiclo(exp), calendario: { h: tablaCalendario(exp) } };
  }

  Coop.modulos.registrar({ id: 'ciclo', titulo: 'Ingresa datos', hoja: 'INGRESA DATOS', grupo: 'Captura', render, calculados });
})(globalThis.Coop = globalThis.Coop || {});
