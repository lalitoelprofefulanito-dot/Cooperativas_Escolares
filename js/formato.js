/* formato.js — Fechas, importes y comparaciones con las mismas reglas que Excel.
   Las fechas se guardan como texto ISO (aaaa-mm-dd) y se calculan como número de serie de Excel
   (días desde el 30/12/1899), así no influye la zona horaria del equipo. */
(function (Coop) {
  'use strict';

  const DIA_MS = 86400000;
  const BASE = Date.UTC(1899, 11, 30);
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
    'septiembre', 'octubre', 'noviembre', 'diciembre'];

  const vacio = (v) => v === '' || v === null || v === undefined;

  /* ---------- Fechas ---------- */
  function serialDeIso(iso) {
    if (vacio(iso)) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) return null;
    return Math.round((Date.UTC(+m[1], +m[2] - 1, +m[3]) - BASE) / DIA_MS);
  }

  function isoDeSerial(n) {
    const d = new Date(BASE + n * DIA_MS);
    return d.toISOString().slice(0, 10);
  }

  function partes(serial) {
    const d = new Date(BASE + serial * DIA_MS);
    return { dia: d.getUTCDate(), mes: d.getUTCMonth() + 1, anio: d.getUTCFullYear(), semana: d.getUTCDay() };
  }

  /* Acepta dd/mm/aaaa, d/m/aaaa, dd/mm/aa y aaaa-mm-dd. Devuelve ISO o null si no es una fecha real. */
  function leerFecha(texto) {
    const t = String(texto).trim();
    if (t === '') return '';
    let d, m, a;
    let r = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(t);
    if (r) { d = +r[1]; m = +r[2]; a = +r[3]; if (r[3].length === 2) a += 2000; }
    else {
      r = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
      if (!r) return null;
      a = +r[1]; m = +r[2]; d = +r[3];
    }
    const f = new Date(Date.UTC(a, m - 1, d));
    if (f.getUTCFullYear() !== a || f.getUTCMonth() !== m - 1 || f.getUTCDate() !== d || a < 1900) return null;
    return f.toISOString().slice(0, 10);
  }

  function fecha(iso) {
    if (vacio(iso)) return '';
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso);
  }

  const fechaDeSerial = (n) => (n === null || n === '' ? '' : fecha(isoDeSerial(n)));

  function fechaEnLetra(serial) {
    const p = partes(serial);
    return `${p.dia} de ${MESES[p.mes - 1]} de ${p.anio}`;
  }

  /* Fecha de hoy en la Ciudad de México. Para pruebas puede fijarse una fecha de referencia
     con la preferencia «coop.fechaReferencia» (aaaa-mm-dd) en el almacenamiento local. */
  function hoySerial() {
    let ref = null;
    try { ref = globalThis.localStorage && localStorage.getItem('coop.fechaReferencia'); } catch (e) { ref = null; }
    if (ref && serialDeIso(ref) !== null) return serialDeIso(ref);
    const iso = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' })
      .format(new Date());
    return serialDeIso(iso);
  }

  /* ---------- Números e importes ---------- */
  /* ROUND de Excel: redondea a la mitad alejándose de cero y corrige el error binario con 15 dígitos. */
  function redondear(x, decimales) {
    if (!Number.isFinite(x)) return x;
    const f = Math.pow(10, decimales);
    const y = Number((Math.abs(x) * f).toPrecision(15));
    return (Math.sign(x) * Math.round(y)) / f;
  }

  /* Convierte a centavos enteros (con el redondeo de Excel) para sumar sin errores de punto flotante. */
  const centavos = (x) => Math.round(redondear(Number(x) || 0, 2) * 100);

  /* Lee un número escrito a mano o con el teclado del teléfono. El separador decimal puede ser punto o coma:
     · con punto y coma a la vez, el último que aparece es el decimal («1,234.50» y «1.234,50» valen 1234.5);
     · con solo comas, «1,250» o «12,345,678» (grupos exactos de tres cifras) son miles y «12,50» o «0,5» son decimales. */
  function leerNumero(texto) {
    let t = String(texto).trim().replace(/[$\s]/g, '');
    if (t === '') return '';
    const coma = t.lastIndexOf(',');
    const punto = t.lastIndexOf('.');
    if (coma >= 0 && punto >= 0) {
      t = coma > punto ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
    } else if (coma >= 0) {
      t = /^-?\d{1,3}(,\d{3})+$/.test(t) ? t.replace(/,/g, '') : t.replace(',', '.');
    }
    if (!/^-?(\d+\.?\d*|\.\d+)$/.test(t)) return null;
    return Number(t);
  }

  function miles(entero) {
    return String(entero).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /* Formato «$1,234.56» (negativos como -$1,234.56, igual que el formato de celda del Excel). */
  function moneda(x) {
    if (vacio(x) || !Number.isFinite(Number(x))) return vacio(x) ? '' : String(x);
    const c = centavos(Math.abs(Number(x)));
    const texto = `$${miles(Math.floor(c / 100))}.${String(c % 100).padStart(2, '0')}`;
    return Number(x) < 0 && c > 0 ? `-${texto}` : texto;
  }

  function entero(x) {
    if (vacio(x) || !Number.isFinite(Number(x))) return vacio(x) ? '' : String(x);
    const n = Math.round(Number(x));
    return (n < 0 ? '-' : '') + miles(Math.abs(n));
  }

  /* ---------- Texto con las reglas de Excel ---------- */
  /* «=» de Excel entre textos: no distingue mayúsculas, sí distingue acentos. */
  const igual = (a, b) => String(a ?? '').toUpperCase() === String(b ?? '').toUpperCase();
  /* COUNTIF(rango,"?*"): textos con al menos un carácter. */
  const tieneTexto = (v) => typeof v === 'string' && v.length > 0;
  /* N() de Excel: número o 0. */
  const N = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  /* TRIM de Excel: quita espacios de los extremos y deja uno solo entre palabras. */
  const recortar = (t) => String(t).replace(/ +/g, ' ').trim();

  Coop.f = {
    MESES, vacio, serialDeIso, isoDeSerial, partes, leerFecha, fecha, fechaDeSerial, fechaEnLetra, hoySerial,
    redondear, centavos, leerNumero, moneda, entero, igual, tieneTexto, N, recortar,
  };
})(globalThis.Coop = globalThis.Coop || {});
