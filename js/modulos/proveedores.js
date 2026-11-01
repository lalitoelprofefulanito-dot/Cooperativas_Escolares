/* modulos/proveedores.js — PROVEEDORES: padrón de 15 proveedores (C7:L21) y estado de la carta compromiso (K). */
(function (Coop) {
  'use strict';
  const { ui, calculos: C } = Coop;
  const { campo, calc } = ui;

  ui.registrarRegla(/^proveedores\.0\.fechaFirma$/, { propuesta: (exp) => C.propuestaFirmaCarta(exp) });

  const celda = (i, k, etiqueta, exp, tipo = 'texto', opciones) => `<td>${campo({ ruta: `proveedores.${i}.${k}`, tipo, opciones, etiqueta: `Proveedor ${i + 1}: ${etiqueta}`, oculta: true }, exp)}</td>`;

  function render(exp) {
    const filas = exp.proveedores.map((p, i) => {
      const fijos = i === 0
        ? `<td>${calc('prov.0.nombre', '', 'gris')}</td>${celda(0, 'productos', 'productos que expende', exp)}`
          + `<td>${calc('prov.0.domicilio', '', 'gris')}</td><td>${calc('prov.0.rfc', '', 'gris')}</td><td>${calc('prov.0.telefono', '', 'gris')}</td>`
        : celda(i, 'nombre', 'nombre', exp) + celda(i, 'productos', 'productos que expende', exp)
          + celda(i, 'domicilio', 'domicilio', exp) + celda(i, 'rfc', 'RFC', exp) + celda(i, 'telefono', 'teléfono', exp);
      return `<tr><td class="num">${calc(`prov.${i}.no`)}</td>${fijos}`
        + celda(i, 'ine', 'copia de INE al reverso', exp, 'lista', ['Sí', 'No', 'No aplica'])
        + celda(i, 'fechaFirma', 'fecha de firma de la carta', exp, 'fecha')
        + celda(i, 'vigencia', 'vigente hasta', exp, 'fecha')
        + `<td>${calc(`prov.${i}.estado`)}</td>`
        + celda(i, 'observaciones', 'observaciones', exp) + '</tr>';
    }).join('');
    return `
      <p class="intro">El renglón 1 es el proveedor de alimentos de INGRESA DATOS (se cambia allá). Agregue al proveedor de agua y a cualquier otro. «Productos que expende» alimenta también el OFICIO DE PRODUCTOS.</p>
      <section aria-labelledby="t-prov"><h2 id="t-prov">Padrón de proveedores</h2>
        <div class="tabla-desplazable"><table class="tabla"><thead><tr><th scope="col">No.</th><th scope="col">Nombre del proveedor</th><th scope="col">Productos que expende</th>
        <th scope="col">Domicilio</th><th scope="col">RFC</th><th scope="col">Teléfono</th><th scope="col">Copia de INE al reverso («No aplica» = compra comercial)</th>
        <th scope="col">Fecha de firma de la carta</th><th scope="col">Vigente hasta (vacío = fin de ventas)</th><th scope="col">Estado</th><th scope="col">Observaciones</th></tr></thead>
        <tbody>${filas}</tbody></table></div>
        <p class="nota">Renglón 1 en gris: se captura en <a href="#/ciclo">INGRESA DATOS</a>. Fecha de firma: por omisión, la del acta de proveedores (puede escribir encima).</p></section>`;
  }

  function calculados(exp) {
    const out = {};
    C.proveedores(exp).forEach((p, i) => {
      out[`prov.${i}.no`] = p.no;
      out[`prov.${i}.estado`] = { t: p.estado, c: p.estado.startsWith('✔') ? 'bien' : (p.estado ? 'alerta' : '') };
      if (i === 0) ['nombre', 'domicilio', 'rfc', 'telefono'].forEach((k) => { out[`prov.0.${k}`] = { t: p[k], c: 'gris' }; });
    });
    return out;
  }

  Coop.modulos.registrar({ id: 'proveedores', titulo: 'Proveedores', hoja: 'PROVEEDORES', grupo: 'Captura', render, calculados });
})(globalThis.Coop = globalThis.Coop || {});
