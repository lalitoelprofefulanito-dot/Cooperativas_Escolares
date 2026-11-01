/* almacenamiento.js — Guarda los expedientes solo en este navegador (IndexedDB; si no está disponible,
   localStorage). Nada sale del equipo. También arma e interpreta los respaldos .json. */
(function (Coop) {
  'use strict';

  const BD = 'cooperativa-escolar';
  const VERSION_BD = 1;
  const PREFIJO_LS = 'coop.bd.';
  const ID_APP = 'control-cooperativas-escolares-cdmx';

  let bd = null;
  let modo = null; // 'indexeddb' | 'localstorage'

  function abrirIndexedDB() {
    return new Promise((resolver, rechazar) => {
      if (!globalThis.indexedDB) { rechazar(new Error('Sin IndexedDB')); return; }
      const sol = indexedDB.open(BD, VERSION_BD);
      sol.onupgradeneeded = () => {
        const db = sol.result;
        if (!db.objectStoreNames.contains('expedientes')) db.createObjectStore('expedientes', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
      };
      sol.onsuccess = () => resolver(sol.result);
      sol.onerror = () => rechazar(sol.error);
      sol.onblocked = () => rechazar(new Error('La base de datos está bloqueada por otra pestaña.'));
    });
  }

  async function iniciar() {
    try {
      bd = await abrirIndexedDB();
      modo = 'indexeddb';
    } catch (e) {
      localStorage.setItem(PREFIJO_LS + 'prueba', '1');
      localStorage.removeItem(PREFIJO_LS + 'prueba');
      modo = 'localstorage';
    }
    return modo;
  }

  function operacion(almacen, tipo, fn) {
    return new Promise((resolver, rechazar) => {
      const tx = bd.transaction(almacen, tipo);
      const sol = fn(tx.objectStore(almacen));
      tx.oncomplete = () => resolver(sol ? sol.result : undefined);
      tx.onerror = () => rechazar(tx.error);
      tx.onabort = () => rechazar(tx.error || new Error('Operación cancelada'));
    });
  }

  const lsLeer = (k) => { const v = localStorage.getItem(PREFIJO_LS + k); return v === null ? undefined : JSON.parse(v); };
  const lsEscribir = (k, v) => localStorage.setItem(PREFIJO_LS + k, JSON.stringify(v));

  async function listar() {
    if (modo === 'indexeddb') return operacion('expedientes', 'readonly', (s) => s.getAll());
    return (lsLeer('indice') || []).map((id) => lsLeer('exp.' + id)).filter(Boolean);
  }

  async function leer(id) {
    if (modo === 'indexeddb') return operacion('expedientes', 'readonly', (s) => s.get(id));
    return lsLeer('exp.' + id);
  }

  async function guardar(exp) {
    if (modo === 'indexeddb') return operacion('expedientes', 'readwrite', (s) => s.put(exp));
    const indice = lsLeer('indice') || [];
    if (!indice.includes(exp.id)) { indice.push(exp.id); lsEscribir('indice', indice); }
    lsEscribir('exp.' + exp.id, exp);
    return undefined;
  }

  async function borrar(id) {
    if (modo === 'indexeddb') return operacion('expedientes', 'readwrite', (s) => s.delete(id));
    lsEscribir('indice', (lsLeer('indice') || []).filter((x) => x !== id));
    localStorage.removeItem(PREFIJO_LS + 'exp.' + id);
    return undefined;
  }

  async function leerMeta(clave) {
    if (modo === 'indexeddb') return operacion('meta', 'readonly', (s) => s.get(clave));
    return lsLeer('meta.' + clave);
  }

  async function guardarMeta(clave, valor) {
    if (modo === 'indexeddb') return operacion('meta', 'readwrite', (s) => s.put(valor, clave));
    lsEscribir('meta.' + clave, valor);
    return undefined;
  }

  /* ---------- Respaldos ---------- */

  function armarRespaldo(expedientes) {
    return {
      app: ID_APP,
      versionEsquema: Coop.modelo.VERSION_ESQUEMA,
      exportado: new Date().toISOString(),
      expedientes,
    };
  }

  /* Revisa un respaldo y devuelve sus expedientes ya migrados a la versión actual (lanza un error claro si no sirve). */
  function interpretarRespaldo(texto) {
    let datos;
    try { datos = JSON.parse(texto); } catch (e) { throw new Error('El archivo no es un respaldo válido: no se pudo leer como JSON.'); }
    if (!datos || datos.app !== ID_APP || !Array.isArray(datos.expedientes)) {
      throw new Error('El archivo no es un respaldo de esta app (Control de Cooperativas Escolares).');
    }
    return { exportado: datos.exportado || '', expedientes: datos.expedientes.map((e) => Coop.modelo.migrar(e)) };
  }

  function nombreRespaldo(fecha = new Date()) {
    const p = (n) => String(n).padStart(2, '0');
    return `respaldo-cooperativa_${fecha.getFullYear()}-${p(fecha.getMonth() + 1)}-${p(fecha.getDate())}_${p(fecha.getHours())}${p(fecha.getMinutes())}.json`;
  }

  Coop.almacen = {
    iniciar, listar, leer, guardar, borrar, leerMeta, guardarMeta,
    armarRespaldo, interpretarRespaldo, nombreRespaldo,
    modo: () => modo,
  };
})(globalThis.Coop = globalThis.Coop || {});
