/* ui.js — Campos de captura con el código de colores del Excel, lectura y validación de lo capturado,
   y actualización de los datos calculados sin volver a dibujar la pantalla. */
(function (Coop) {
  'use strict';
  const F = Coop.f;

  const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  /* ---------- Rutas dentro del expediente: «socios.lista.3.nombre» ---------- */
  function leerRuta(obj, ruta) {
    return ruta.split('.').reduce((o, k) => (o === undefined || o === null ? undefined : o[k]), obj);
  }
  function escribirRuta(obj, ruta, valor) {
    const partes = ruta.split('.');
    const ultimo = partes.pop();
    const destino = partes.reduce((o, k) => o[k], obj);
    destino[ultimo] = valor;
  }

  /* ---------- Reglas por campo ----------
     Cada módulo registra reglas con un patrón de ruta. Una regla puede tener:
     validar(valor, exp, ruta) → null | { mensaje, bloquea }   (bloquea = Excel rechaza el dato)
     propuesta(exp, ruta) → valor propuesto (campo con propuesta: null en el modelo = usar la propuesta) */
  const reglas = [];
  function registrarRegla(patron, regla) { reglas.push({ patron, ...regla }); }
  const reglaDe = (ruta) => reglas.find((r) => r.patron.test(ruta));

  const MENSAJE_TIPO = {
    fecha: 'Escriba una fecha válida (dd/mm/aaaa).',
    entero: 'Escriba un número entero.',
    decimal: 'Escriba un número.',
    moneda: 'Escriba un importe, por ejemplo 1,250.50.',
  };

  function aTexto(valor, tipo) {
    if (F.vacio(valor)) return '';
    if (tipo === 'fecha') return F.fecha(valor);
    if (tipo === 'moneda') return F.moneda(valor);
    return String(valor);
  }

  /* Lee lo escrito según el tipo. Devuelve { ok, valor } o { ok:false, mensaje }. */
  function leer(texto, tipo) {
    if (tipo === 'fecha') {
      const v = F.leerFecha(texto);
      return v === null ? { ok: false, mensaje: MENSAJE_TIPO.fecha } : { ok: true, valor: v };
    }
    if (tipo === 'entero' || tipo === 'decimal' || tipo === 'moneda') {
      const v = F.leerNumero(texto);
      if (v === null) return { ok: false, mensaje: MENSAJE_TIPO[tipo] };
      if (tipo === 'entero' && v !== '' && !Number.isInteger(v)) return { ok: false, mensaje: MENSAJE_TIPO.entero };
      return { ok: true, valor: v };
    }
    return { ok: true, valor: String(texto).replace(/\s+$/, '') };
  }

  let contador = 0;

  /* Dibuja un campo de captura (amarillo). def = { ruta, tipo, etiqueta, oculta, opciones, ancho, ayuda } */
  function campo(def, exp) {
    const id = 'c' + (++contador);
    const tipo = def.tipo || 'texto';
    const regla = reglaDe(def.ruta);
    const guardado = leerRuta(exp, def.ruta);
    const conPropuesta = regla && regla.propuesta;
    const usaPropuesta = conPropuesta && (guardado === null || guardado === undefined);
    const valor = usaPropuesta ? regla.propuesta(exp, def.ruta) : guardado;
    const etiqueta = def.oculta
      ? `<label class="vh" for="${id}">${esc(def.etiqueta)}</label>`
      : `<label for="${id}">${esc(def.etiqueta)}</label>`;
    const atributos = `id="${id}" data-ruta="${esc(def.ruta)}" data-tipo="${tipo}" aria-describedby="${id}-m"`
      + (def.ancho ? ` style="width:${def.ancho}"` : '');
    let control;
    if (tipo === 'lista') {
      const opciones = def.opciones.slice();
      const fuera = !F.vacio(valor) && !opciones.some((o) => o === valor);
      control = `<select ${atributos}><option value=""></option>`
        + opciones.map((o) => `<option${o === valor ? ' selected' : ''}>${esc(o)}</option>`).join('')
        + (fuera ? `<option selected value="${esc(valor)}">${esc(valor)} (no está en la lista)</option>` : '')
        + '</select>';
    } else {
      const lista = tipo === 'sugerencias' ? ` list="${id}-l"` : '';
      const modoTeclado = ['entero', 'decimal', 'moneda'].includes(tipo) ? ' inputmode="decimal"' : (tipo === 'fecha' ? ' inputmode="numeric" placeholder="dd/mm/aaaa"' : '');
      control = `<input type="text" ${atributos}${lista}${modoTeclado} value="${esc(aTexto(valor, tipo))}"`
        + `${usaPropuesta ? ' class="propuesto" title="Valor propuesto: puede escribir encima"' : ''} autocomplete="off">`;
      if (tipo === 'sugerencias') control += `<datalist id="${id}-l">${def.opciones.map((o) => `<option value="${esc(o)}">`).join('')}</datalist>`;
    }
    const restablecer = conPropuesta
      ? `<button type="button" class="restablecer" data-restablecer="${esc(def.ruta)}" title="Restablecer propuesta"`
        + ` aria-label="Restablecer la propuesta de ${esc(def.etiqueta)}"${usaPropuesta ? ' hidden' : ''}>↺</button>`
      : '';
    const ayuda = def.ayuda ? `<span class="ayuda">${esc(def.ayuda)}</span>` : '';
    return `<span class="campo${def.clase ? ' ' + def.clase : ''}">${etiqueta}<span class="control">${control}${restablecer}</span>`
      + `<span class="msg" id="${id}-m" role="status"></span>${ayuda}</span>`;
  }

  /* Dato calculado (solo lectura, sin cuadro). Se actualiza con refrescar() mediante su clave. */
  const calc = (clave, contenido = '', clase = '') => `<span class="calc ${clase}" data-calc="${esc(clave)}">${esc(contenido)}</span>`;
  /* Bloque calculado que se vuelve a dibujar completo (por ejemplo, el calendario). */
  const calcBloque = (clave, html = '') => `<div class="calc-bloque" data-calc="${esc(clave)}">${html}</div>`;

  function mostrarMensaje(el, texto, tipo) {
    const msg = document.getElementById(el.id + '-m');
    el.classList.toggle('aviso', tipo === 'aviso');
    el.classList.toggle('error', tipo === 'error');
    if (msg) { msg.textContent = texto || ''; msg.className = 'msg' + (tipo ? ' ' + tipo : ''); }
    if (texto) el.setAttribute('title', texto); else el.removeAttribute('title');
  }

  /* Vuelve a evaluar avisos y propuestas de todos los campos visibles. */
  function revisarCampos(raiz, exp) {
    raiz.querySelectorAll('[data-ruta]').forEach((el) => {
      const ruta = el.dataset.ruta;
      const regla = reglaDe(ruta);
      const guardado = leerRuta(exp, ruta);
      if (regla && regla.propuesta && (guardado === null || guardado === undefined) && document.activeElement !== el) {
        el.value = aTexto(regla.propuesta(exp, ruta), el.dataset.tipo);
        el.classList.add('propuesto');
      }
      const r = regla && regla.validar ? regla.validar(guardado, exp, ruta) : null;
      if (!el.classList.contains('error')) mostrarMensaje(el, r ? r.mensaje : '', r ? 'aviso' : '');
    });
  }

  function refrescarCalculados(raiz, valores) {
    raiz.querySelectorAll('[data-calc]').forEach((el) => {
      const v = valores[el.dataset.calc];
      if (v === undefined) return;
      const dato = typeof v === 'object' && v !== null ? v : { t: v };
      if (dato.h !== undefined) el.innerHTML = dato.h; else el.textContent = dato.t ?? '';
      el.className = (el.tagName === 'DIV' ? 'calc-bloque ' : 'calc ') + (dato.c || '');
    });
  }

  /* Atiende un cambio en un campo. Devuelve true si el expediente cambió. */
  function procesarCambio(el, exp) {
    const ruta = el.dataset.ruta;
    const tipo = el.dataset.tipo;
    const regla = reglaDe(ruta);
    const anterior = leerRuta(exp, ruta);
    const lectura = leer(el.value, tipo === 'lista' || tipo === 'sugerencias' ? 'texto' : tipo);
    /* Como en Excel, un dato rechazado no se guarda: el campo vuelve a mostrar lo que tenía. */
    const rechazar = (mensaje) => {
      const usaPropuesta = regla && regla.propuesta && (anterior === null || anterior === undefined);
      el.value = aTexto(usaPropuesta ? regla.propuesta(exp, ruta) : anterior, tipo === 'lista' ? 'texto' : tipo);
      mostrarMensaje(el, `«${texto}» no se guardó: ${mensaje}`, 'error');
      return false;
    };
    const texto = el.value;
    if (!lectura.ok) return rechazar(lectura.mensaje);
    const v = regla && regla.validar ? regla.validar(lectura.valor, exp, ruta) : null;
    if (v && v.bloquea) return rechazar(v.mensaje);
    el.classList.remove('propuesto', 'error');
    if (lectura.valor === anterior) { mostrarMensaje(el, v ? v.mensaje : '', v ? 'aviso' : ''); return false; }
    escribirRuta(exp, ruta, lectura.valor);
    if (tipo !== 'lista') el.value = aTexto(lectura.valor, tipo);
    const boton = el.parentElement.querySelector('[data-restablecer]');
    if (boton) boton.hidden = false;
    mostrarMensaje(el, v ? v.mensaje : '', v ? 'aviso' : '');
    return true;
  }

  function restablecer(boton, exp) {
    const ruta = boton.dataset.restablecer;
    escribirRuta(exp, ruta, null);
    const el = boton.parentElement.querySelector('[data-ruta]');
    el.classList.remove('error');
    el.value = aTexto(reglaDe(ruta).propuesta(exp, ruta), el.dataset.tipo);
    el.classList.add('propuesto');
    boton.hidden = true;
  }

  /* Ventana de diálogo accesible (<dialog>). botones = [{ texto, valor, clase }]. Devuelve el valor elegido. */
  function dialogo(titulo, cuerpoHtml, botones) {
    return new Promise((resolver) => {
      const d = document.createElement('dialog');
      d.className = 'dialogo';
      d.setAttribute('aria-labelledby', 'dlg-t');
      d.innerHTML = `<h2 id="dlg-t">${esc(titulo)}</h2><div class="dlg-cuerpo">${cuerpoHtml}</div>`
        + `<div class="dlg-botones">${botones.map((b, i) => `<button type="button" data-i="${i}" class="${b.clase || ''}">${esc(b.texto)}</button>`).join('')}</div>`;
      document.body.appendChild(d);
      d.addEventListener('click', (e) => {
        const b = e.target.closest('[data-i]');
        if (!b) return;
        const valor = botones[+b.dataset.i].valor;
        const datos = Object.fromEntries([...d.querySelectorAll('[name]')].map((x) => [x.name, x.type === 'checkbox' ? x.checked : x.value]));
        d.close(); d.remove();
        resolver({ valor, datos });
      });
      d.addEventListener('cancel', () => { d.remove(); resolver({ valor: null, datos: {} }); });
      d.showModal();
    });
  }

  function aviso(texto, tipo = 'info') {
    const zona = document.getElementById('avisos-flotantes');
    if (!zona) return;
    const el = document.createElement('div');
    el.className = 'flotante ' + tipo;
    el.setAttribute('role', 'status');
    el.textContent = texto;
    zona.appendChild(el);
    setTimeout(() => el.remove(), 6000);
  }

  /* Registro de módulos (pantallas). Cada módulo: { id, titulo, hoja, grupo, render(exp), calculados(exp), redibujarSi? } */
  const registro = new Map();
  Coop.modulos = {
    registrar: (m) => registro.set(m.id, m),
    obtener: (id) => registro.get(id),
  };

  Coop.ui = {
    esc, leerRuta, escribirRuta, registrarRegla, campo, calc, calcBloque, revisarCampos, refrescarCalculados,
    procesarCambio, restablecer, dialogo, aviso,
  };
})(globalThis.Coop = globalThis.Coop || {});
