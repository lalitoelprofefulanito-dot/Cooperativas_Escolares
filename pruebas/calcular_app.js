/* Calcula con la app los mismos datos que se comparan contra el Excel.
   Uso: node pruebas/calcular_app.js respaldo.json fecha-referencia(aaaa-mm-dd)  → JSON en la salida estándar */
const fs = require('fs');
const { cargarCoop } = require('./cargar');
const [archivo, fechaRef] = process.argv.slice(2);
const Coop = cargarCoop(fechaRef);
const C = Coop.calculos;
const F = Coop.f;
const respaldo = JSON.parse(fs.readFileSync(archivo, 'utf8'));

const resultado = respaldo.expedientes.map((crudo) => {
  const exp = Coop.modelo.migrar(crudo);
  const celdas = {};
  const poner = (hoja, celda, valor) => { celdas[`${hoja}!${celda}`] = valor; };
  /* INGRESA DATOS: calendario I6:X57, totales y D13 */
  const cal = C.calendario(exp);
  cal.semanas.forEach((s, k) => {
    const r = 6 + k;
    poner('INGRESA DATOS', `I${r}`, s.lunes ?? '');
    poner('INGRESA DATOS', `J${r}`, s.viernes ?? '');
    ['K', 'L', 'M', 'N', 'O'].forEach((col, d) => poner('INGRESA DATOS', `${col}${r}`, s.lunes === null ? '' : s.dias[d]));
    poner('INGRESA DATOS', `P${r}`, s.diasConVenta);
    poner('INGRESA DATOS', `Q${r}`, s.semanaVenta);
    poner('INGRESA DATOS', `R${r}`, s.rotulo);
    ['S', 'T', 'U', 'V', 'W'].forEach((col, d) => poner('INGRESA DATOS', `${col}${r}`, s.lunes === null ? '' : s.motivos[d]));
    poner('INGRESA DATOS', `X${r}`, s.ultimoDia);
  });
  poner('INGRESA DATOS', 'P58', cal.totalDias);
  poner('INGRESA DATOS', 'Q58', cal.totalSemanas);
  poner('INGRESA DATOS', 'R58', cal.resumen);
  poner('INGRESA DATOS', 'D13', C.textoSociosCiclo(exp));
  if (exp.ciclo.firmantes[4].saliente === null) poner('INGRESA DATOS', 'E24', C.propuestaCambioConsejo(exp));
  /* CATÁLOGOS G20:G219 */
  C.controlHistorial(exp).forEach((t, i) => poner('CATÁLOGOS', `G${20 + i}`, t));
  /* SOCIOS */
  const s = C.socios(exp);
  s.filas.forEach((f, i) => {
    const r = 7 + i;
    poner('SOCIOS', `B${r}`, f.no); poner('SOCIOS', `P${r}`, f.control); poner('SOCIOS', `Q${r}`, f.activo);
    poner('SOCIOS', `R${r}`, f.kAct); poner('SOCIOS', `S${r}`, f.nuevo); poner('SOCIOS', `T${r}`, f.kNuevo);
    poner('SOCIOS', `U${r}`, f.bajaDev); poner('SOCIOS', `V${r}`, f.kBaja); poner('SOCIOS', `W${r}`, f.cert);
  });
  poner('SOCIOS', 'D3', s.activos); poner('SOCIOS', 'J3', s.alumnos); poner('SOCIOS', 'L3', s.nuevos); poner('SOCIOS', 'M3', s.textoUso);
  poner('SOCIOS', 'D4', F.N(C.numSocios(exp))); poner('SOCIOS', 'H4', s.valorCertificado); poner('SOCIOS', 'J4', s.maestrosEmpleados);
  poner('SOCIOS', 'L4', s.bajasDevueltas); poner('SOCIOS', 'M4', s.textoControl);
  /* PROVEEDORES */
  C.proveedores(exp).forEach((p, i) => {
    const r = 7 + i;
    poner('PROVEEDORES', `B${r}`, p.no); poner('PROVEEDORES', `K${r}`, p.estado);
    if (i === 0) {
      poner('PROVEEDORES', 'C7', p.nombre); poner('PROVEEDORES', 'E7', p.domicilio); poner('PROVEEDORES', 'F7', p.rfc); poner('PROVEEDORES', 'G7', p.telefono);
      poner('PROVEEDORES', 'I7', p.fechaFirma === '' ? '' : F.serialDeIso(p.fechaFirma));
    }
  });
  /* Controles */
  const celda = { 1: ['RESUMEN Y CONTROLES', 5], 2: ['RESUMEN Y CONTROLES', 6], 5: ['RESUMEN Y CONTROLES', 9], 19: ['TABLERO', 24], 21: ['TABLERO', 26] };
  C.controles(exp).forEach((c) => {
    const [hoja, r] = celda[c.no];
    poner(hoja, `D${r}`, c.estado);
    poner(hoja, `E${r}`, c.detalle);
  });
  return { id: exp.id, celdas };
});
process.stdout.write(JSON.stringify(resultado));
