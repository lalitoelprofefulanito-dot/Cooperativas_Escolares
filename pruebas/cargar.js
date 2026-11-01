/* Carga los scripts de cálculo de la app en Node (sin navegador) para las pruebas. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function cargarCoop(fechaReferencia) {
  const almacen = new Map();
  if (fechaReferencia) almacen.set('coop.fechaReferencia', fechaReferencia);
  const contexto = {
    console, Intl, Date, Math, JSON, Number, String, Array, Object, Map, Set,
    localStorage: { getItem: (k) => (almacen.has(k) ? almacen.get(k) : null) },
  };
  contexto.globalThis = contexto;
  vm.createContext(contexto);
  for (const f of ['formato.js', 'modelo.js', 'calculos.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), contexto, { filename: f });
  }
  return contexto.Coop;
}
module.exports = { cargarCoop };
