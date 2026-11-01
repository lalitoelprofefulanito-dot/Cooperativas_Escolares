/* modulos/socios.js — SOCIOS: padrón (C7:O406), conteos (D3:M4) y columna Control (P). */
(function (Coop) {
  'use strict';
  const { ui, f: F, calculos: C, modelo: M } = Coop;
  const { campo, calc } = ui;

  ui.registrarRegla(/^socios\.lista\.\d+\.certificado$/, {
    validar: (v) => (typeof v === 'number' && (v < 0 || v > 50) ? { mensaje: 'El certificado debe estar entre $0.00 y $50.00 (validación de la celda en el Excel).' } : null),
  });

  const COLUMNAS = [
    ['nombre', 'Nombre completo (como firma)', 'texto', null, 'ancho-l'],
    ['tipo', 'Tipo', 'lista', ['Alumno', 'Maestro', 'Empleado']],
    ['grupo', 'Grupo o función', 'texto'],
    ['socio', '¿Socio?', 'lista', ['Sí', 'No']],
    ['nuevo', '¿Nuevo en este ciclo?', 'lista', ['Sí', 'No']],
    ['alta', 'Fecha de alta', 'fecha'],
    ['certificado', 'Certificado ($) (vacío = valor vigente)', 'moneda'],
    ['baja', 'Fecha de baja', 'fecha'],
    ['devuelto', 'Certificado devuelto', 'lista', ['Sí', 'No']],
    ['fechaDevolucion', 'Fecha de devolución', 'fecha'],
    ['tutor', 'Madre, padre o tutor(a) que firma', 'texto', null, 'ancho-l'],
    ['frEntregado', 'Fondo repartible entregado', 'lista', ['Sí', 'No']],
    ['observaciones', 'Observaciones', 'texto'],
  ];

  function render(exp) {
    const lista = exp.socios.lista;
    const n = Coop.app.filasVisibles('socios', lista, (s) => Object.values(s).every(F.vacio), 10);
    const filas = lista.slice(0, n).map((s, i) => `<tr><td class="num">${calc(`soc.${i}.no`)}</td>`
      + COLUMNAS.map(([k, e, tipo, opciones, clase]) => `<td>${campo({ ruta: `socios.lista.${i}.${k}`, tipo, opciones, etiqueta: `Renglón ${i + 1}: ${e}`, oculta: true, clase }, exp)}</td>`).join('')
      + `<td>${calc(`soc.${i}.control`)}</td></tr>`).join('');

    const usar = campo({
      ruta: 'socios.usarPadron', tipo: 'lista', opciones: ['Sí', 'No'], etiqueta: '¿Usar el padrón para el No. de socios?',
      ayuda: 'Sí = el número de socios sale de este padrón. No = se usa el número capturado en INGRESA DATOS.',
    }, exp);

    return `
      <p class="intro">Capture o corrija solo en las celdas amarillas. Capture a los alumnos socios y agregue a maestros y empleados socios. Con «¿Socio?» = Sí y sin fecha de baja, la persona cuenta como socio activo. «¿Nuevo en este ciclo?» = Sí la manda a la RELACIÓN DE NUEVOS SOCIOS. Una fecha de baja con «Certificado devuelto» = Sí la manda al COE-03. Cuando el padrón esté completo, cambie «¿Usar el padrón…?» a «Sí» para que todo el archivo use este conteo.</p>
      <section aria-labelledby="t-res" class="resumen-socios"><h2 id="t-res" class="vh">Resumen del padrón</h2>
        <dl class="cifras">
          <div><dt>Socios activos en el padrón</dt><dd>${calc('activos')}</dd></div>
          <div><dt>No. de socios que usa el archivo</dt><dd>${calc('numSocios')}</dd></div>
          <div><dt>Alumnos</dt><dd>${calc('alumnos')}</dd></div>
          <div><dt>Maestros y empleados</dt><dd>${calc('maestros')}</dd></div>
          <div><dt>Nuevos</dt><dd>${calc('nuevos')}</dd></div>
          <div><dt>Bajas con certificado devuelto</dt><dd>${calc('bajas')}</dd></div>
          <div><dt>Valor del certificado de aportación</dt><dd>${calc('certificado')}</dd></div>
        </dl>
        <div class="fila-dato">${usar}</div>
        <p>${calc('textoUso')}</p><p>${calc('textoControl')}</p><p>${calc('avisoCertificado', '', 'alerta')}</p>
      </section>
      <section aria-labelledby="t-pad"><h2 id="t-pad">Padrón (${M.CAPACIDAD.socios} renglones)</h2>
        <div class="tabla-desplazable"><table class="tabla padron"><thead><tr><th scope="col">No.</th>
        ${COLUMNAS.map((c) => `<th scope="col">${c[1]}</th>`).join('')}<th scope="col">Control</th></tr></thead><tbody>${filas}</tbody></table></div>
        ${Coop.app.botonAgregar('socios', n, lista.length)}</section>`;
  }

  function calculados(exp) {
    const s = C.socios(exp);
    const concepto = exp.catalogos.conceptos.find((x) => F.igual(x.concepto, 'APORTACIÓN DE SOCIO NUEVO'));
    const out = {
      activos: s.activos, alumnos: s.alumnos, maestros: s.maestrosEmpleados, nuevos: s.nuevos, bajas: s.bajasDevueltas,
      numSocios: F.entero(F.N(C.numSocios(exp))), // la celda muestra 0 aunque el control 2 lo trate como vacío
      certificado: F.moneda(s.valorCertificado),
      textoUso: s.textoUso, textoControl: { t: s.textoControl, c: s.conObservacion ? 'alerta' : 'bien' },
      avisoCertificado: concepto && F.vacio(concepto.importeRef)
        ? 'El valor del certificado es $0.00 porque el concepto «APORTACIÓN DE SOCIO NUEVO» no tiene importe de referencia en CATÁLOGOS. Captúrelo ahí.' : '',
    };
    s.filas.forEach((f, i) => {
      out[`soc.${i}.no`] = f.no;
      out[`soc.${i}.control`] = { t: f.control, c: f.control ? 'alerta' : '' };
    });
    return out;
  }

  Coop.modulos.registrar({ id: 'socios', titulo: 'Socios', hoja: 'SOCIOS', grupo: 'Captura', render, calculados });
})(globalThis.Coop = globalThis.Coop || {});
