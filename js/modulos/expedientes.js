/* modulos/expedientes.js — Expedientes (un ciclo escolar cada uno) y respaldos. */
(function (Coop) {
  'use strict';
  const { ui, modelo: M } = Coop;
  const { esc } = ui;

  const fechaHora = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    const p = (n) => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
  };

  const nombre = (e) => `${e.ciclo.ciclo || '(sin ciclo)'}${e.ciclo.escuela ? ' · ' + e.ciclo.escuela : ''}`;

  function render(exp) {
    const lista = Coop.app.expedientes().slice().sort((a, b) => String(b.modificado).localeCompare(String(a.modificado)));
    const filas = lista.map((e) => `<tr${e.id === exp.id ? ' class="actual"' : ''}><td>${esc(nombre(e))}${e.id === exp.id ? ' <span class="estado bien">abierto</span>' : ''}</td>`
      + `<td>${fechaHora(e.modificado)}</td><td class="acciones">`
      + (e.id === exp.id ? '' : `<button type="button" data-accion="abrir" data-id="${e.id}">Abrir</button>`)
      + `<button type="button" data-accion="duplicar" data-id="${e.id}">Duplicar como base del siguiente ciclo</button>`
      + `<button type="button" class="peligro" data-accion="borrar" data-id="${e.id}">Borrar</button></td></tr>`).join('');
    return `
      <p class="intro">Cada ciclo escolar se trabaja en su propio expediente, igual que en el Excel se trabaja un archivo por ciclo. No capture dos ciclos en el mismo expediente.</p>
      <section aria-labelledby="t-exp"><h2 id="t-exp">Expedientes guardados en este navegador</h2>
        <div class="tabla-desplazable"><table class="tabla"><thead><tr><th scope="col">Ciclo y escuela</th><th scope="col">Última modificación</th><th scope="col">Acciones</th></tr></thead>
        <tbody>${filas}</tbody></table></div>
        <p><button type="button" data-accion="nuevo">Nuevo expediente (formato vacío 2026-2027)</button></p></section>
      <section aria-labelledby="t-resp"><h2 id="t-resp">Respaldos</h2>
        <p class="alerta-fija">Si borra los datos del navegador o cambia de equipo, perderá la información si no tiene respaldo.</p>
        <p>Los datos se guardan solo en este navegador y en este equipo; no se envían a internet. Abra siempre la app desde el mismo archivo y la misma carpeta (o la misma dirección web): otro navegador, otra carpeta u otro equipo no ven estos datos. Guarde el respaldo en una memoria USB o en la nube al menos una vez por semana.</p>
        <p>Último respaldo: <strong>${esc(Coop.app.ultimoRespaldo() ? fechaHora(Coop.app.ultimoRespaldo()) : 'nunca')}</strong> · Almacenamiento: ${esc(Coop.almacen.modo() === 'indexeddb' ? 'IndexedDB' : 'localStorage')}</p>
        <p><button type="button" data-accion="exportar">Exportar respaldo (.json) de todos los expedientes</button>
        <label class="boton-archivo">Importar respaldo (.json)<input type="file" accept=".json,application/json" data-accion-archivo="importar"></label></p></section>`;
  }

  async function duplicar({ id }) {
    const origen = Coop.app.expedientes().find((e) => e.id === id);
    const sugerido = M.siguienteCiclo(origen.ciclo.ciclo);
    const casilla = (n, t, marcada = true) => `<label class="casilla"><input type="checkbox" name="${n}"${marcada ? ' checked' : ''}> ${esc(t)}</label>`;
    const r = await ui.dialogo('Duplicar como base del siguiente ciclo',
      `<p>Se crea un expediente nuevo a partir de «${esc(nombre(origen))}». Nunca se copian las fechas del ciclo, los días de clase, los periodos sin venta, el número de socios ni el efectivo anterior: se capturan para el ciclo nuevo.</p>
       <p><label for="dup-ciclo">Ciclo escolar del nuevo expediente</label><br><input id="dup-ciclo" name="ciclo" value="${esc(sugerido)}" autocomplete="off"></p>
       <fieldset><legend>Qué se copia</legend>
       ${casilla('escuela', 'Datos de la escuela (escuela, CCT, cooperativa, clave, registro, ciudad y fotocopiadora)')}
       ${casilla('mesa', 'Mesa directiva: los nombres de este ciclo pasan a la columna «Consejo saliente» y se conserva la Dirección')}
       ${casilla('proveedorAlimentos', 'Proveedor de alimentos')}
       ${casilla('catalogos', 'Catálogos (productos, historial de precios y conceptos)')}
       ${casilla('proveedores', 'Proveedores (sin fecha de firma de carta)')}
       ${casilla('socios', 'Padrón de socios (revise después altas, bajas y «¿Nuevo en este ciclo?»)', false)}
       </fieldset>`,
      [{ texto: 'Cancelar', valor: false }, { texto: 'Crear expediente', valor: true, clase: 'principal' }]);
    if (!r.valor) return;
    const nuevo = M.duplicarComoBase(origen, r.datos.ciclo.trim(), r.datos);
    await Coop.app.agregarExpediente(nuevo);
    ui.aviso(`Se creó el expediente ${nuevo.ciclo.ciclo || '(sin ciclo)'}. Capture sus fechas en Ingresa datos.`, 'bien');
  }

  async function borrar({ id }) {
    const e = Coop.app.expedientes().find((x) => x.id === id);
    const r = await ui.dialogo('Borrar expediente',
      `<p>Se borrará <strong>${esc(nombre(e))}</strong> de este navegador. Esta acción no se puede deshacer.</p><p>Si no tiene un respaldo reciente, cancele y exporte uno primero.</p>`,
      [{ texto: 'Cancelar', valor: false, clase: 'principal' }, { texto: 'Borrar definitivamente', valor: true, clase: 'peligro' }]);
    if (r.valor) await Coop.app.borrarExpediente(id);
  }

  Coop.modulos.registrar({
    id: 'expedientes', titulo: 'Expedientes y respaldos', grupo: 'Expediente', render,
    calculados: () => ({}),
    acciones: {
      abrir: ({ id }) => Coop.app.abrirExpediente(id),
      nuevo: () => Coop.app.agregarExpediente(M.crearExpediente(true)),
      duplicar, borrar,
      exportar: () => Coop.app.exportarRespaldo(),
      importar: (archivo) => Coop.app.importarRespaldo(archivo),
    },
  });
})(globalThis.Coop = globalThis.Coop || {});
