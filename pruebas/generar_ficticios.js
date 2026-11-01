/* Genera ejemplos/respaldo-ficticio.json: dos expedientes con datos FICTICIOS para comparar la app con el Excel.
   A = captura completa y coherente. B = errores deliberados para probar avisos y controles. */
const fs = require('fs');
const path = require('path');
const { cargarCoop } = require('./cargar');
const Coop = cargarCoop();
const M = Coop.modelo;

function base(nombre) {
  const e = M.crearExpediente(true);
  e.id = 'ficticio-' + nombre;
  e.creado = e.modificado = '2026-10-21T08:00:00.000Z';
  const c = e.ciclo;
  Object.assign(c, {
    escuela: 'Ficticia Los Ahuehuetes (DATOS DE PRUEBA)', cct: 'PRUEBA-0000', cooperativa: 'Cooperativa Ficticia Aurora',
    clave: 'CLAVE-PRUEBA-01', registro: 'REG-PRUEBA-01', socios: 120, efectivoAnterior: 1250.5, ciudad: 'Ciudad de México', fotocopiadora: 'No',
  });
  ['Presidente Ficticio', 'Tesorera Ficticia', 'Vigilante Ficticio', 'Educadora Ficticia', 'Directora Ficticia']
    .forEach((n, i) => { c.firmantes[i].nombre = n; });
  ['Presidenta Saliente Ficticia', 'Tesorero Saliente Ficticio', 'Vigilante Saliente Ficticia', 'Educador Saliente Ficticio']
    .forEach((n, i) => { c.firmantes[i].saliente = n; });
  c.proveedor = { nombre: 'Proveedor de Alimentos Ficticio', domicilio: 'Calle Inventada 123, Col. Prueba', rfc: 'XAXX010101000', telefono: '5500000000' };
  const prods = ['TORTA DE JAMÓN', 'FRUTA PICADA', 'SÁNDWICH', 'GELATINA', 'ELOTE EN VASO', 'BARRA DE GRANOLA'];
  prods.forEach((p, i) => { e.catalogos.productos[i].nombre = p; });
  e.catalogos.productos[7] = { nombre: 'PALOMITAS NATURALES', origen: 'Historial de precios', observacion: 'Producto 8 de prueba' };
  const h = [
    ['TORTA DE JAMÓN', '2026-08-31', 18, 14], ['FRUTA PICADA', '2026-08-31', 12, 9], ['SÁNDWICH', '2026-08-31', 15, 11.5],
    ['GELATINA', '2026-08-31', 8, 5.25], ['ELOTE EN VASO', '2026-08-31', 14, 10], ['BARRA DE GRANOLA', '2026-08-31', 10, 7.4],
    ['AGUA', '2026-08-31', 10, ''], ['PALOMITAS NATURALES', '2026-08-31', 9, 6],
    ['TORTA DE JAMÓN', '2026-11-30', 20, 15.5],
  ];
  h.forEach((r, i) => Object.assign(e.catalogos.historial[i], { producto: r[0], fecha: r[1], precio: r[2], costo: r[3], fuente: 'Acta de proveedores (ficticia)' }));
  e.catalogos.conceptos[0].importeRef = 5;
  e.catalogos.conceptos[8].importeRef = 20;
  e.catalogos.conceptos[9].importeRef = 300;
  e.catalogos.conceptos[9].persona = 'Transportista Ficticio';
  /* 30 socios: 26 alumnos, 3 maestros, 1 empleado. */
  for (let i = 0; i < 30; i++) {
    const tipo = i < 26 ? 'Alumno' : (i < 29 ? 'Maestro' : 'Empleado');
    Object.assign(e.socios.lista[i], {
      nombre: `Socio Ficticio ${String(i + 1).padStart(2, '0')}`, tipo, grupo: tipo === 'Alumno' ? `${1 + (i % 6)}°A` : (tipo === 'Maestro' ? 'Docente' : 'Intendencia'),
      socio: 'Sí', nuevo: i < 5 ? 'Sí' : 'No', alta: '2026-09-07', tutor: tipo === 'Alumno' ? `Tutor Ficticio ${String(i + 1).padStart(2, '0')}` : '',
    });
  }
  Object.assign(e.socios.lista[20], { baja: '2027-01-15', devuelto: 'Sí', fechaDevolucion: '2027-01-20' });
  Object.assign(e.socios.lista[21], { baja: '2027-02-10', devuelto: 'No' });
  e.socios.lista[3].certificado = 4;
  e.socios.usarPadron = 'Sí';
  /* Proveedores: alimentos (renglón 1), agua, compra comercial. */
  Object.assign(e.proveedores[0], { productos: 'Alimentos preparados', ine: 'Sí', fechaFirma: '2026-08-24', vigencia: '' });
  Object.assign(e.proveedores[1], { nombre: 'Agua Purificada Ficticia', productos: 'Agua purificada en botella', domicilio: 'Av. Supuesta 45', rfc: 'XAXX010101000', telefono: '5511111111', ine: 'Sí', fechaFirma: '2026-08-24', vigencia: '2027-07-09' });
  Object.assign(e.proveedores[2], { nombre: 'Abarrotes Ficticios', productos: 'Vasos y servilletas', ine: 'No aplica' });
  return e;
}

const A = base('A');
A.ciclo.ciclo = '2026-2027';

const B = base('B');
B.ciclo.ciclo = '2026-2027 (con errores de prueba)';
B.ciclo.socios = '';                                   // control 2: falta el No. de socios
B.socios.usarPadron = 'No';
B.ciclo.periodos[20] = { desde: '', hasta: '2026-10-14', motivo: 'Sin fecha Desde (prueba)', fuente: '' };
B.ciclo.periodos[21] = { desde: '2026-10-12', hasta: '2026-10-12', motivo: '', fuente: 'Periodo sin motivo (prueba)' };
B.catalogos.historial[9] = { producto: 'GELATINA', fecha: '2026-08-31', precio: 9, costo: 6, fuente: 'Duplicado de prueba' };
B.catalogos.historial[10] = { producto: 'SÁNDWICH', fecha: '', precio: 0, costo: '', fuente: '' };
B.catalogos.conceptos[0].importeRef = '';              // certificado = 0
B.socios.lista[5].tipo = '';                           // Falta el tipo
B.socios.lista[7].nombre = 'Socio Ficticio 07';        // nombre repetido
Object.assign(B.socios.lista[8], { devuelto: 'Sí', baja: '' }); // falta la fecha de baja
B.socios.lista[9].socio = '';                          // marque si es socio
B.socios.lista[10].socio = 'sí';                       // minúsculas: Excel no distingue
Object.assign(B.proveedores[1], { vigencia: '2026-09-30' });   // vencida
Object.assign(B.proveedores[3], { nombre: 'Proveedor Sin Carta Ficticio', ine: 'No' });
Object.assign(B.proveedores[4], { nombre: 'Proveedor Sin INE Ficticio', ine: 'No', fechaFirma: '2026-08-24' });
B.proveedores[0].fechaFirma = null;                    // propuesta: sin actas, vacía → sin carta

const salida = { app: 'control-cooperativas-escolares-cdmx', versionEsquema: M.VERSION_ESQUEMA, exportado: '2026-10-21T08:00:00.000Z', expedientes: [A, B] };
fs.writeFileSync(path.join(__dirname, '..', 'ejemplos', 'respaldo-ficticio.json'), JSON.stringify(salida));
console.log('ejemplos/respaldo-ficticio.json listo');
