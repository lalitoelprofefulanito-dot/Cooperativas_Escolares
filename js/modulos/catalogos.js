/* modulos/catalogos.js — CATÁLOGOS: productos (8 lugares, el agua en el 7), historial de precios
   (B20:G219), conceptos de movimiento (I6:Q45), clasificaciones fijas y leyenda de recordatorio. */
(function (Coop) {
  'use strict';
  const { ui, f: F, calculos: C, modelo: M } = Coop;
  const { esc, campo, calc } = ui;

  const CLASES = [
    ['Incremento al capital social', 'INGRESO', 'AC'],
    ['Intereses bancarios', 'INGRESO', 'IB'],
    ['Gasto con cargo al fondo de reserva', 'EGRESO', 'FR'],
    ['Gasto con cargo al fondo social', 'EGRESO', 'FS'],
    ['Gasto de administración', 'EGRESO', 'GA'],
    ['Entrega del fondo repartible', 'EGRESO', 'RP'],
    ['Devolución de certificados de aportación', 'EGRESO', 'DC'],
  ];
  const TRATAMIENTOS = ['Requiere acta previa (autorización)', 'Reconocimiento (acta posterior al gasto)',
    '10 % de apoyo a la Dirección (sin acta)', 'Gasto de administración (sin acta)', 'Ingreso'];
  const PERIODICIDAD = ['Semanal', 'Mensual', 'Sin fecha fija'];
  const PERSONAS = ['(Presidencia)', '(Tesorería)', '(Dirección)', '(Comité de Vigilancia)', '(Educación Cooperativa)'];
  const LEYENDA = 'Selecciona esta celda una vez y borra la información para que escribas el dato que le corresponde';
  const MENSAJE_EXCEL = 'Este valor no coincide con las restricciones de validación de datos definidas para esta celda.';

  const nombresProductos = (exp) => exp.catalogos.productos.map((p) => p.nombre).filter((n) => !F.vacio(n));
  const fueraDeLista = (v, lista) => !F.vacio(v) && !lista.some((o) => F.igual(o, v));

  /* Validaciones del Excel. Solo «Fecha sugerida» bloquea; las demás muestran su mensaje como aviso. */
  ui.registrarRegla(/^catalogos\.productos\.\d+\.nombre$/, {
    validar: (v, exp, ruta) => {
      if (F.vacio(v)) return null;
      const i = +ruta.split('.')[2];
      const repetido = exp.catalogos.productos.some((p, j) => j !== i && F.igual(p.nombre, v));
      return repetido ? { mensaje: 'Ese producto ya existe en la lista.' } : null;
    },
  });
  ui.registrarRegla(/^catalogos\.productos\.\d+\.origen$/, {
    validar: (v) => (fueraDeLista(v, ['Historial de precios']) ? { mensaje: 'Elija una opción de la lista.' } : null),
  });
  ui.registrarRegla(/^catalogos\.historial\.\d+\.producto$/, {
    validar: (v, exp) => (fueraDeLista(v, nombresProductos(exp)) ? { mensaje: 'Elija un producto del catálogo.' } : null),
  });
  ui.registrarRegla(/^catalogos\.historial\.\d+\.(precio|costo)$/, {
    validar: (v) => (typeof v === 'number' && v < 0 ? { mensaje: 'Capture un importe válido.' } : null),
  });
  ui.registrarRegla(/^catalogos\.conceptos\.\d+\.concepto$/, {
    validar: (v, exp, ruta) => {
      if (F.vacio(v)) return null;
      const i = +ruta.split('.')[2];
      return exp.catalogos.conceptos.some((c, j) => j !== i && F.igual(c.concepto, v)) ? { mensaje: 'Ese concepto ya existe.' } : null;
    },
  });
  ui.registrarRegla(/^catalogos\.conceptos\.\d+\.clasificacion$/, {
    validar: (v) => (fueraDeLista(v, CLASES.map((c) => c[0])) ? { mensaje: 'Elija una clasificación de la lista.' } : null),
  });
  ui.registrarRegla(/^catalogos\.conceptos\.\d+\.fechaSugerida$/, {
    validar: (v) => (fueraDeLista(v, PERIODICIDAD) ? { mensaje: MENSAJE_EXCEL, bloquea: true } : null),
  });

  function render(exp) {
    const cat = exp.catalogos;
    const productos = cat.productos.map((p, i) => {
      if (i === M.LUGAR_AGUA) {
        return `<tr class="fijo"><td class="num">${i + 1}</td><td>AGUA</td><td>Compras de agua</td><td class="nota">Lugar reservado para el agua, inmediatamente después del último alimento: se vende por lote. El costo y las botellas salen de NOTAS DE AGUA y se asientan en la semana en que se termina cada lote; ese renglón recibe número de nota solo cuando el lote está terminado.</td></tr>`;
      }
      return `<tr><td class="num">${i + 1}</td>`
        + `<td>${campo({ ruta: `catalogos.productos.${i}.nombre`, etiqueta: `Producto ${i + 1}: nombre`, oculta: true }, exp)}</td>`
        + `<td>${campo({ ruta: `catalogos.productos.${i}.origen`, tipo: 'lista', opciones: ['Historial de precios'], etiqueta: `Producto ${i + 1}: origen del costo`, oculta: true }, exp)}</td>`
        + `<td>${campo({ ruta: `catalogos.productos.${i}.observacion`, etiqueta: `Producto ${i + 1}: observación`, oculta: true }, exp)}</td></tr>`;
    }).join('');

    const prods = nombresProductos(exp);
    const nh = Coop.app.filasVisibles('historial', cat.historial, (h) => ['producto', 'fecha', 'precio', 'costo', 'fuente'].every((k) => F.vacio(h[k])), 10);
    const historial = cat.historial.slice(0, nh).map((h, i) => `<tr><td class="num">${i + 1}</td>`
      + `<td>${campo({ ruta: `catalogos.historial.${i}.producto`, tipo: 'lista', opciones: prods, etiqueta: `Precio ${i + 1}: producto`, oculta: true }, exp)}</td>`
      + `<td>${campo({ ruta: `catalogos.historial.${i}.fecha`, tipo: 'fecha', etiqueta: `Precio ${i + 1}: vigente desde`, oculta: true }, exp)}</td>`
      + `<td>${campo({ ruta: `catalogos.historial.${i}.precio`, tipo: 'moneda', etiqueta: `Precio ${i + 1}: precio de venta`, oculta: true }, exp)}</td>`
      + `<td>${campo({ ruta: `catalogos.historial.${i}.costo`, tipo: 'moneda', etiqueta: `Precio ${i + 1}: costo unitario`, oculta: true }, exp)}</td>`
      + `<td>${campo({ ruta: `catalogos.historial.${i}.fuente`, etiqueta: `Precio ${i + 1}: fuente u observación`, oculta: true }, exp)}</td>`
      + `<td>${calc(`hist.${i}`)}</td></tr>`).join('');

    const nc = Coop.app.filasVisibles('conceptos', cat.conceptos, (c) => Object.values(c).every(F.vacio), 3);
    const conceptos = cat.conceptos.slice(0, nc).map((c, i) => {
      const r = `catalogos.conceptos.${i}`;
      const e = `Concepto ${i + 1}`;
      return `<tr><td class="num">${i + 1}</td>`
        + `<td>${campo({ ruta: `${r}.concepto`, etiqueta: `${e}: nombre`, oculta: true, clase: 'ancho-l' }, exp)}</td>`
        + `<td>${campo({ ruta: `${r}.clasificacion`, tipo: 'lista', opciones: CLASES.map((x) => x[0]), etiqueta: `${e}: clasificación`, oculta: true }, exp)}</td>`
        + `<td>${campo({ ruta: `${r}.importeRef`, tipo: 'moneda', etiqueta: `${e}: importe de referencia`, oculta: true }, exp)}</td>`
        + `<td>${campo({ ruta: `${r}.observacion`, etiqueta: `${e}: observación`, oculta: true, clase: 'ancho-l' }, exp)}</td>`
        + `<td>${campo({ ruta: `${r}.tratamiento`, tipo: 'lista', opciones: TRATAMIENTOS, etiqueta: `${e}: tratamiento`, oculta: true }, exp)}</td>`
        + `<td>${campo({ ruta: `${r}.fechaSugerida`, tipo: 'lista', opciones: PERIODICIDAD, etiqueta: `${e}: fecha sugerida`, oculta: true }, exp)}</td>`
        + `<td>${campo({ ruta: `${r}.detalle`, etiqueta: `${e}: detalle predeterminado`, oculta: true }, exp)}</td>`
        + `<td>${campo({ ruta: `${r}.persona`, tipo: 'sugerencias', opciones: PERSONAS, etiqueta: `${e}: persona predeterminada`, oculta: true }, exp)}</td></tr>`;
    }).join('');

    const clases = CLASES.map((c) => `<tr><td>${esc(c[0])}</td><td>${c[1]}</td><td>${c[2]}</td></tr>`).join('');

    return `
      <p class="intro">Los precios nunca se sobrescriben: cuando cambien, agregue un renglón nuevo con su fecha de vigencia. Así cada semana conserva el precio que tenía y el registro sigue siendo auditable.</p>
      <section aria-labelledby="t-prod"><h2 id="t-prod">1. Productos</h2>
        <p class="nota">8 lugares, uno por renglón del registro semanal, en el orden en que aparecerán en él; el agua ocupa el lugar 7, después de los alimentos.</p>
        <div class="tabla-desplazable"><table class="tabla"><thead><tr><th scope="col">No.</th><th scope="col">Producto</th><th scope="col">Origen del costo</th><th scope="col">Observación</th></tr></thead>
        <tbody>${productos}</tbody></table></div></section>
      <section aria-labelledby="t-hist"><h2 id="t-hist">2. Historial de precios (precio de venta y costo unitario por fecha de vigencia)</h2>
        <div class="tabla-desplazable"><table class="tabla"><thead><tr><th scope="col">No.</th><th scope="col">Producto</th><th scope="col">Vigente desde</th><th scope="col">Precio de venta</th>
        <th scope="col">Costo unitario</th><th scope="col">Fuente / observación</th><th scope="col">Control</th></tr></thead><tbody>${historial}</tbody></table></div>
        ${Coop.app.botonAgregar('historial', nh, cat.historial.length)}</section>
      <section aria-labelledby="t-conc"><h2 id="t-conc">3. Conceptos de movimiento (ingresos y gastos que no son ventas)</h2>
        <p class="nota">«Persona»: escriba un nombre o uno de los cargos entre paréntesis; los cargos se cambian solos cada ciclo con los firmantes de INGRESA DATOS. «Fecha sugerida»: Semanal propone el último día con venta de la semana siguiente al pago anterior del mismo concepto; Mensual propone el último día del mes siguiente.</p>
        <div class="tabla-desplazable"><table class="tabla"><thead><tr><th scope="col">No.</th><th scope="col">Concepto</th><th scope="col">Clasificación</th><th scope="col">Importe de referencia</th>
        <th scope="col">Observación</th><th scope="col">Tratamiento (acta / 10 % / administración)</th><th scope="col">Fecha sugerida en REGISTRO DE GASTOS</th>
        <th scope="col">Detalle predeterminado</th><th scope="col">Persona que recibe o entrega (predeterminada)</th></tr></thead><tbody>${conceptos}</tbody></table></div>
        ${Coop.app.botonAgregar('conceptos', nc, cat.conceptos.length)}</section>
      <section aria-labelledby="t-clas"><h2 id="t-clas">4. Clasificaciones del libro (fijas)</h2>
        <table class="tabla compacta"><thead><tr><th scope="col">Clasificación</th><th scope="col">Tipo</th><th scope="col">Prefijo de folio</th></tr></thead><tbody>${clases}</tbody></table></section>
      <section aria-labelledby="t-ley"><h2 id="t-ley">5. Leyenda de recordatorio del REGISTRO DE GASTOS (no se modifica)</h2>
        <p class="leyenda">${esc(LEYENDA)}</p></section>`;
  }

  function calculados(exp) {
    const ctl = C.controlHistorial(exp);
    const dup = C.historialDuplicado(exp);
    const out = {};
    ctl.forEach((t, i) => {
      const aviso = dup[i] ? 'Hay otro precio de este producto con la misma fecha: el Excel promedia ambos. ' : '';
      const texto = (t + (t && aviso ? ' ' : '') + aviso).trim();
      out[`hist.${i}`] = { t: texto, c: texto ? 'alerta' : '' };
    });
    return out;
  }

  Coop.modulos.registrar({
    id: 'catalogos', titulo: 'Catálogos', hoja: 'CATÁLOGOS', grupo: 'Captura', render, calculados,
    redibujarSi: /^catalogos\.productos\.\d+\.nombre$/,
  });
})(globalThis.Coop = globalThis.Coop || {});
