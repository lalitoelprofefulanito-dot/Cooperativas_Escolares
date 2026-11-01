/* app.js — Acceso, expedientes, navegación, guardado automático y respaldos. */
(function (Coop) {
  'use strict';
  const { ui, almacen, modelo: M } = Coop;
  const { esc } = ui;

  const CLAVE = '0000'; // candado de cortesía: no cifra ni protege los datos
  const PREF_ACTUAL = 'coop.expedienteActual';
  const DIAS_RECORDATORIO = 7;

  /* Menú agrupado como las pestañas del Excel. «fase» indica cuándo se construye lo que aún no existe. */
  const MENU = [
    ['Control', [['tablero', 'Tablero'], ['resumen', 'Resumen y controles', 4], ['cumplimiento', 'Cumplimiento', 4]]],
    ['Captura', [['ciclo', 'Ingresa datos'], ['catalogos', 'Catálogos'], ['socios', 'Socios'], ['proveedores', 'Proveedores'],
      ['semanal', 'Registro semanal', 2], ['agua', 'Notas de agua', 2], ['gastos', 'Registro de gastos', 2], ['actas', 'Captura actas', 3]]],
    ['Actas', [['imprimirActa', 'Imprimir acta', 3], ['datosActas', 'Datos propios de cada acta', 3], ['ficha', 'Ficha del acta ordinaria', 3],
      ['convocatoria', 'Convocatoria', 3], ['asistencia', 'Lista de asistencia', 3], ['nuevosSocios', 'Relación de nuevos socios', 3], ['carta', 'Carta compromiso', 3]]],
    ['Contabilidad', [['libro', 'Libro contable', 2], ['ingresosEgresos', 'Ingresos y egresos', 2], ['recibos', 'Recibos', 2],
      ['remision', 'Notas de remisión', 2], ['cortes', 'Cortes', 4], ['informe', 'Informe contable', 4]]],
    ['Documentos', [['coe02', 'COE-02 Fondo repartible', 4], ['coe03', 'COE-03 Certificados devueltos', 4], ['coe04', 'COE-04 Concentrado', 4],
      ['oficio', 'Oficio de productos', 4], ['inventario', 'Inventario de bienes', 4], ['traspaso', 'Traspaso al siguiente ciclo', 4]]],
    ['Consulta', [['catalogoActas', 'Catálogo de actas', 3]]],
    ['Expediente', [['expedientes', 'Expedientes y respaldos']]],
  ];

  const estado = { expedientes: [], exp: null, vista: {}, actual: 'tablero', ultimoRespaldo: null };
  const $ = (s) => document.querySelector(s);

  /* ---------- Acceso ---------- */
  function mostrarAcceso() {
    document.body.className = 'en-acceso';
    $('#app').hidden = true;
    $('#acceso').hidden = false;
    const campo = $('#clave');
    campo.value = '';
    campo.focus();
  }

  async function entrar() {
    document.body.className = '';
    $('#acceso').hidden = true;
    $('#app').hidden = false;
    try {
      await almacen.iniciar();
    } catch (e) {
      $('#contenido').innerHTML = `<p class="alerta-fija">Este navegador no permite guardar datos (${esc(e.message)}). Use una ventana normal (no privada) de Chrome, Edge o Firefox.</p>`;
      return;
    }
    const guardados = await almacen.listar();
    estado.expedientes = [];
    for (const g of guardados) {
      try { estado.expedientes.push(M.migrar(g)); } catch (e) { ui.aviso(e.message, 'mal'); }
    }
    if (estado.expedientes.length === 0) {
      const nuevo = M.crearExpediente(true);
      await almacen.guardar(nuevo);
      estado.expedientes.push(nuevo);
    }
    let preferido = null;
    try { preferido = localStorage.getItem(PREF_ACTUAL); } catch (e) { preferido = null; }
    estado.exp = estado.expedientes.find((e) => e.id === preferido)
      || estado.expedientes.slice().sort((a, b) => String(b.modificado).localeCompare(String(a.modificado)))[0];
    estado.ultimoRespaldo = (await almacen.leerMeta('ultimoRespaldo')) || null;
    dibujarMenu();
    dibujarSelector();
    revisarRecordatorio();
    irA(location.hash.replace(/^#\/?/, '') || 'tablero');
  }

  /* ---------- Menú y selector de expediente ---------- */
  function dibujarMenu() {
    $('#menu').innerHTML = MENU.map(([grupo, items]) => `<div class="grupo"><h2>${esc(grupo)}</h2><ul>`
      + items.map(([id, titulo, fase]) => (Coop.modulos.obtener(id)
        ? `<li><a href="#/${id}" data-id="${id}">${esc(titulo)}</a></li>`
        : `<li><span class="pendiente-fase" title="Se construye en la Fase ${fase}">${esc(titulo)} <small>Fase ${fase}</small></span></li>`)).join('')
      + '</ul></div>').join('');
  }

  function dibujarSelector() {
    const sel = $('#selector-exp');
    sel.innerHTML = estado.expedientes.map((e) => `<option value="${e.id}"${e.id === estado.exp.id ? ' selected' : ''}>`
      + `${esc(e.ciclo.ciclo || '(sin ciclo)')}${e.ciclo.escuela ? ' · ' + esc(e.ciclo.escuela) : ''}</option>`).join('');
  }

  /* ---------- Pantallas ---------- */
  function irA(id) {
    if (!Coop.modulos.obtener(id)) id = 'tablero';
    if (location.hash !== '#/' + id) { location.hash = '#/' + id; return; }
    estado.actual = id;
    dibujarPantalla();
    window.scrollTo(0, 0);
    $('#contenido').focus({ preventScroll: true });
  }

  function dibujarPantalla() {
    const m = Coop.modulos.obtener(estado.actual);
    document.querySelectorAll('#menu a').forEach((a) => a.toggleAttribute('aria-current', a.dataset.id === m.id));
    document.title = `${m.titulo} · Control de Cooperativas Escolares`;
    const hoja = m.hoja ? `<span class="hoja-excel">Hoja del Excel: ${esc(m.hoja)}</span>` : '';
    $('#contenido').innerHTML = `<h1>${esc(m.titulo)}</h1>${hoja}${m.render(estado.exp)}`;
    refrescar();
  }

  function refrescar() {
    const m = Coop.modulos.obtener(estado.actual);
    const raiz = $('#contenido');
    ui.refrescarCalculados(raiz, m.calculados(estado.exp));
    ui.revisarCampos(raiz, estado.exp);
  }

  /* Vuelve a dibujar la pantalla conservando el campo con el foco y la posición. */
  function redibujar() {
    const activo = document.activeElement;
    const ruta = activo && activo.dataset ? activo.dataset.ruta : null;
    const pos = activo && typeof activo.selectionStart === 'number' ? activo.selectionStart : null;
    const y = window.scrollY;
    dibujarPantalla();
    window.scrollTo(0, y);
    if (ruta) {
      const el = document.querySelector(`#contenido [data-ruta="${CSS.escape(ruta)}"]`);
      if (el) { el.focus({ preventScroll: true }); if (pos !== null && el.setSelectionRange) el.setSelectionRange(pos, pos); }
    }
  }

  /* Cuántos renglones de una tabla se muestran: los capturados más «extra» vacíos, más los que se pidan. */
  function filasVisibles(clave, lista, esVacio, extra) {
    let ultimo = -1;
    lista.forEach((r, i) => { if (!esVacio(r)) ultimo = i; });
    const base = Math.max(ultimo + 1 + extra, 10) + (estado.vista[clave] || 0);
    return Math.min(base, lista.length);
  }

  const botonAgregar = (clave, n, total) => (n < total
    ? `<p><button type="button" data-agregar="${clave}">Mostrar 10 renglones más</button> <span class="nota">(${n} de ${total})</span></p>`
    : `<p class="nota">Se muestran los ${total} renglones disponibles.</p>`);

  /* ---------- Guardado ---------- */
  async function guardar() {
    const ind = $('#guardado');
    estado.exp.modificado = new Date().toISOString();
    ind.textContent = 'Guardando…';
    ind.className = 'guardando';
    try {
      await almacen.guardar(estado.exp);
      const h = new Date();
      ind.textContent = `Guardado ✓ ${String(h.getHours()).padStart(2, '0')}:${String(h.getMinutes()).padStart(2, '0')}`;
      ind.className = 'guardado';
      revisarRecordatorio();
    } catch (e) {
      ind.textContent = 'No se pudo guardar';
      ind.className = 'error';
      ui.aviso(`No se pudo guardar: ${e.message}. Exporte un respaldo ahora.`, 'mal');
    }
  }

  async function cambiarExpediente(exp) {
    estado.exp = exp;
    try { localStorage.setItem(PREF_ACTUAL, exp.id); } catch (e) { /* preferencia opcional */ }
    estado.vista = {};
    dibujarSelector();
    dibujarPantalla();
  }

  /* ---------- Respaldos ---------- */
  function revisarRecordatorio() {
    const banda = $('#recordatorio');
    const ultimo = estado.ultimoRespaldo ? new Date(estado.ultimoRespaldo) : null;
    const cambiosDespues = estado.expedientes.some((e) => !ultimo || new Date(e.modificado) > ultimo);
    const dias = ultimo ? Math.floor((Date.now() - ultimo.getTime()) / 86400000) : null;
    const toca = cambiosDespues && (dias === null || dias >= DIAS_RECORDATORIO)
      && estado.expedientes.some((e) => e.modificado !== e.creado);
    banda.hidden = !toca;
    if (toca) {
      banda.innerHTML = `<span>${dias === null ? 'Todavía no ha hecho ningún respaldo.' : `Han pasado ${dias} días desde su último respaldo.`}`
        + ' Si borra los datos del navegador o cambia de equipo, perderá la información si no tiene respaldo.</span>'
        + ' <button type="button" data-global="exportar">Hacer respaldo ahora</button>';
    }
  }

  async function exportarRespaldo() {
    await almacen.guardar(estado.exp);
    const datos = almacen.armarRespaldo(await almacen.listar());
    const blob = new Blob([JSON.stringify(datos, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = almacen.nombreRespaldo();
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    estado.ultimoRespaldo = new Date().toISOString();
    await almacen.guardarMeta('ultimoRespaldo', estado.ultimoRespaldo);
    revisarRecordatorio();
    ui.aviso(`Respaldo descargado: ${a.download}. Guárdelo fuera de este equipo.`, 'bien');
    if (estado.actual === 'expedientes') dibujarPantalla();
  }

  async function importarRespaldo(archivo) {
    let paquete;
    try {
      paquete = almacen.interpretarRespaldo(await archivo.text());
    } catch (e) {
      await ui.dialogo('No se pudo importar', `<p>${esc(e.message)}</p>`, [{ texto: 'Entendido', valor: true, clase: 'principal' }]);
      return;
    }
    const filas = paquete.expedientes.map((e) => {
      const existe = estado.expedientes.find((x) => x.id === e.id);
      return `<li><strong>${esc(e.ciclo.ciclo || '(sin ciclo)')}${e.ciclo.escuela ? ' · ' + esc(e.ciclo.escuela) : ''}</strong> — `
        + `${e.socios.lista.filter((s) => s.nombre !== '').length} socios en el padrón, `
        + `${e.catalogos.historial.filter((h) => h.producto !== '').length} precios en el historial. `
        + (existe ? '<span class="estado mal">Reemplaza al expediente que ya existe en este navegador</span>' : '<span class="estado bien">Nuevo</span>')
        + '</li>';
    }).join('');
    const r = await ui.dialogo('Importar respaldo',
      `<p>Respaldo exportado el ${esc(paquete.exportado ? new Date(paquete.exportado).toLocaleString('es-MX') : '(fecha desconocida)')}. Contiene:</p><ul>${filas}</ul>`
      + '<p>Los expedientes marcados en rojo se sobrescribirán con la versión del respaldo. Los demás expedientes de este navegador no cambian.</p>',
      [{ texto: 'Cancelar', valor: false }, { texto: 'Importar', valor: true, clase: 'principal' }]);
    if (!r.valor) return;
    for (const e of paquete.expedientes) {
      await almacen.guardar(e);
      const i = estado.expedientes.findIndex((x) => x.id === e.id);
      if (i >= 0) estado.expedientes[i] = e; else estado.expedientes.push(e);
    }
    const actual = estado.expedientes.find((x) => x.id === estado.exp.id) || paquete.expedientes[0];
    await cambiarExpediente(actual);
    ui.aviso(`Se importaron ${paquete.expedientes.length} expediente(s).`, 'bien');
  }

  /* ---------- Expedientes ---------- */
  async function agregarExpediente(exp) {
    await almacen.guardar(exp);
    estado.expedientes.push(exp);
    await cambiarExpediente(exp);
  }

  async function borrarExpediente(id) {
    await almacen.borrar(id);
    estado.expedientes = estado.expedientes.filter((e) => e.id !== id);
    if (estado.expedientes.length === 0) {
      const nuevo = M.crearExpediente(true);
      await almacen.guardar(nuevo);
      estado.expedientes.push(nuevo);
    }
    const siguiente = estado.exp.id === id ? estado.expedientes[0] : estado.exp;
    await cambiarExpediente(siguiente);
    ui.aviso('Expediente borrado.', 'info');
  }

  /* ---------- Eventos ---------- */
  function cerrarMenu() {
    document.body.classList.remove('menu-abierto');
    $('#boton-menu').setAttribute('aria-expanded', 'false');
  }

  function conectar() {
    $('#form-acceso').addEventListener('submit', (e) => {
      e.preventDefault();
      if ($('#clave').value === CLAVE) {
        sessionStorage.setItem('coop.sesion', 'abierta');
        $('#error-clave').textContent = '';
        entrar();
      } else {
        $('#error-clave').textContent = 'Contraseña incorrecta.';
        $('#clave').select();
      }
    });
    $('#salir').addEventListener('click', () => { sessionStorage.removeItem('coop.sesion'); mostrarAcceso(); });
    $('#selector-exp').addEventListener('change', (e) => cambiarExpediente(estado.expedientes.find((x) => x.id === e.target.value)));
    $('#boton-menu').addEventListener('click', () => {
      const abierto = document.body.classList.toggle('menu-abierto');
      $('#boton-menu').setAttribute('aria-expanded', String(abierto));
    });
    $('#menu').addEventListener('click', (e) => { if (e.target.closest('a')) cerrarMenu(); });
    window.addEventListener('hashchange', () => irA(location.hash.replace(/^#\/?/, '')));

    const contenido = $('#contenido');
    contenido.addEventListener('change', async (e) => {
      const el = e.target;
      if (el.dataset.accionArchivo) {
        const m = Coop.modulos.obtener(estado.actual);
        if (el.files[0]) await m.acciones[el.dataset.accionArchivo](el.files[0]);
        el.value = '';
        return;
      }
      if (!el.dataset.ruta) return;
      if (!ui.procesarCambio(el, estado.exp)) return;
      await guardar();
      const m = Coop.modulos.obtener(estado.actual);
      if (m.redibujarSi && m.redibujarSi.test(el.dataset.ruta)) setTimeout(redibujar, 0);
      else refrescar();
      if (el.dataset.ruta === 'ciclo.ciclo' || el.dataset.ruta === 'ciclo.escuela') dibujarSelector();
    });
    contenido.addEventListener('click', async (e) => {
      const r = e.target.closest('[data-restablecer]');
      if (r) { ui.restablecer(r, estado.exp); await guardar(); refrescar(); return; }
      const ag = e.target.closest('[data-agregar]');
      if (ag) { estado.vista[ag.dataset.agregar] = (estado.vista[ag.dataset.agregar] || 0) + 10; redibujar(); return; }
      const ac = e.target.closest('[data-accion]');
      if (ac) await Coop.modulos.obtener(estado.actual).acciones[ac.dataset.accion](ac.dataset);
    });
    document.addEventListener('click', (e) => {
      const g = e.target.closest('[data-global]');
      if (g && g.dataset.global === 'exportar') exportarRespaldo();
      if (document.body.classList.contains('menu-abierto') && !e.target.closest('#menu, #boton-menu')) cerrarMenu();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('menu-abierto')) cerrarMenu(); });
  }

  Coop.app = {
    filasVisibles, botonAgregar, exportarRespaldo, importarRespaldo, agregarExpediente, borrarExpediente,
    abrirExpediente: (id) => cambiarExpediente(estado.expedientes.find((e) => e.id === id)),
    expedientes: () => estado.expedientes,
    ultimoRespaldo: () => estado.ultimoRespaldo,
  };

  document.addEventListener('DOMContentLoaded', () => {
    conectar();
    if (sessionStorage.getItem('coop.sesion') === 'abierta') entrar(); else mostrarAcceso();
  });
})(globalThis.Coop = globalThis.Coop || {});
