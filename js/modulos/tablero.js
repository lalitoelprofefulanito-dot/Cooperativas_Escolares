/* modulos/tablero.js — Pantalla de inicio. En la Fase 1 muestra los controles cuyos datos ya se capturan
   en la app (RESUMEN Y CONTROLES 1, 2 y 5; TABLERO 19 y 21). El tablero completo llega en la Fase 4. */
(function (Coop) {
  'use strict';
  const { ui, f: F, calculos: C } = Coop;
  const { esc, calcBloque } = ui;

  const CLASE = { OK: 'bien', CORRECTO: 'bien', INFO: 'info', PENDIENTE: 'pendiente', 'PRÓXIMO': 'pendiente', REVISAR: 'mal' };

  function tabla(exp) {
    const filas = C.controles(exp).map((c) => {
      const destino = Coop.modulos.obtener(c.ruta);
      return `<tr><td class="num">${c.no}</td><td>${esc(c.nombre)}<span class="origen">${esc(c.origen)}</span></td>`
        + `<td><span class="estado ${CLASE[c.estado] || ''}">${esc(c.estado)}</span></td><td>${esc(c.detalle)}</td>`
        + `<td><a href="#/${c.ruta}">Corregir en ${esc(destino ? destino.titulo : c.ruta)}</a></td></tr>`;
    }).join('');
    return `<div class="tabla-desplazable"><table class="tabla"><thead><tr><th scope="col">No.</th><th scope="col">Control</th>`
      + `<th scope="col">Estado</th><th scope="col">Detalle</th><th scope="col">Dónde se corrige</th></tr></thead><tbody>${filas}</tbody></table></div>`;
  }

  function render(exp) {
    const c = exp.ciclo;
    const titulo = [c.cooperativa && `Cooperativa Escolar “${c.cooperativa}”`, c.escuela && `Escuela Primaria “${c.escuela}”`,
      c.cct && `CCT ${c.cct}`, c.ciclo && `Ciclo ${c.ciclo}`].filter(Boolean).join(' · ');
    return `
      <p class="intro">${esc(titulo || 'Capture los datos de la escuela en Ingresa datos.')}</p>
      <section aria-labelledby="t-ctl"><h2 id="t-ctl">Controles</h2>
        <p class="nota">Vista parcial: aquí aparecen los controles cuyos datos ya se capturan en la app. Los demás controles y el semáforo completo se agregan conforme se construyen sus módulos.</p>
        ${calcBloque('controles')}</section>
      <section aria-labelledby="t-hoy"><h2 id="t-hoy">Fecha de referencia</h2><p>${esc('Hoy: ' + F.fechaEnLetra(F.hoySerial()))}. Los controles que dependen de la fecha (por ejemplo, la vigencia de las cartas compromiso) usan este día.</p></section>`;
  }

  const calculados = (exp) => ({ controles: { h: tabla(exp) } });

  Coop.modulos.registrar({ id: 'tablero', titulo: 'Tablero', hoja: 'TABLERO', grupo: 'Control', render, calculados });
})(globalThis.Coop = globalThis.Coop || {});
