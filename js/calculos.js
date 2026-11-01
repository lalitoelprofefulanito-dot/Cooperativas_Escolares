/* calculos.js — Réplica en JavaScript de las fórmulas del Excel, sin interfaz.
   Cada función indica la hoja y el rango que reproduce. Todas reciben el expediente y no lo modifican. */
(function (Coop) {
  'use strict';
  const F = Coop.f;
  const { vacio, igual, tieneTexto, N, recortar } = F;
  const MESES_MAY = F.MESES.map((m) => m.toUpperCase());

  const serial = (iso) => F.serialDeIso(iso);
  const esFecha = (iso) => serial(iso) !== null;
  const textoDe = (v) => (vacio(v) ? '' : String(v));

  /* ---------- INGRESA DATOS ---------- */

  /* Calendario H6:X57 (52 semanas). Un día cuenta como «con venta» si está entre el primer y el último
     día de ventas y no cae en ningún periodo sin venta (Desde ≤ día ≤ Hasta). */
  function calendario(exp) {
    const c = exp.ciclo;
    const ini = N(serial(c.primerDia));
    const fin = N(serial(c.ultimoDia));
    const periodos = c.periodos.map((p) => ({ desde: serial(p.desde), hasta: serial(p.hasta), motivo: p.motivo }));
    /* COUNTIFS solo cuenta renglones con Desde y Hasta numéricos. */
    const enPeriodo = (d) => periodos.some((p) => p.desde !== null && p.hasta !== null && p.desde <= d && p.hasta >= d);
    /* MATCH matricial: una celda vacía en Desde vale 0 (cumple «<= día»); vacía en Hasta no cumple. */
    const motivoDe = (d) => {
      const p = periodos.find((q) => N(q.desde) <= d && q.hasta !== null && q.hasta >= d);
      return p ? textoDe(p.motivo) : 'SIN VENTA';
    };
    const semanas = [];
    let numVenta = 0;
    for (let h = 1; h <= 52; h++) {
      const s = { h, lunes: null, viernes: null, dias: [], motivos: [], diasConVenta: '', semanaVenta: '', rotulo: '', ultimoDia: '' };
      if (ini !== 0 && fin !== 0 && ini + 7 * (h - 1) <= fin) {
        s.lunes = ini + 7 * (h - 1);
        s.viernes = s.lunes + 4;
        for (let k = 0; k < 5; k++) {
          const d = s.lunes + k;
          const fuera = d < ini || d > fin;
          const estado = fuera || enPeriodo(d) ? 0 : 1;
          s.dias.push(estado);
          s.motivos.push(estado === 1 ? '' : (fuera ? 'FUERA DEL PERIODO DE VENTAS' : motivoDe(d)));
        }
        s.diasConVenta = s.dias.reduce((a, b) => a + b, 0);
        if (s.diasConVenta > 0) {
          numVenta += 1;
          s.semanaVenta = numVenta;
          s.ultimoDia = s.lunes + s.dias.lastIndexOf(1);
        }
        s.rotulo = rotuloSemana(s.lunes, s.viernes);
      }
      semanas.push(s);
    }
    const totalDias = semanas.reduce((a, s) => a + N(s.diasConVenta), 0);
    const totalSemanas = numVenta;
    return {
      semanas, totalDias, totalSemanas,
      resumen: `Días con venta: ${totalDias} | Días oficiales de clase: ${textoDe(c.diasClase)} | Semanas de venta: ${totalSemanas}`,
    };
  }

  /* INGRESA DATOS R6: «SEMANA DEL 31 DE AGOSTO AL 4 DE SEPTIEMBRE DE 2026». */
  function rotuloSemana(lunes, viernes) {
    const a = F.partes(lunes);
    const b = F.partes(viernes);
    return `SEMANA DEL ${a.dia}${a.mes === b.mes ? '' : ' DE ' + MESES_MAY[a.mes - 1]}${a.anio === b.anio ? '' : ' DE ' + a.anio}`
      + ` AL ${b.dia} DE ${MESES_MAY[b.mes - 1]} DE ${b.anio}`;
  }

  /* Nombre definido FechaRenov: fecha de la primera Asamblea Ordinaria registrada en CAPTURA ACTAS.
     Las actas se capturan a partir de la Fase 3; mientras el expediente no tenga actas vale 0. */
  function fechaRenovacion(exp) {
    const fechas = (exp.actas || []).filter((a) => igual(String(a.tipo || '').slice(0, 9), 'ORDINARIA') && esFecha(a.fecha))
      .map((a) => serial(a.fecha));
    return fechas.length ? Math.min(...fechas) : 0;
  }

  /* INGRESA DATOS E24 (campo propuesto). */
  function propuestaCambioConsejo(exp) {
    const f = fechaRenovacion(exp);
    return f > 0 ? `Cambio de Consejo: ${F.fechaEnLetra(f)}` : 'Cambio de Consejo: al capturar la Ordinaria en CAPTURA ACTAS';
  }

  /* ---------- SOCIOS ---------- */

  /* Valor del certificado (SOCIOS H4 = ACTA ORDINARIA H9): importe de referencia del concepto
     «APORTACIÓN DE SOCIO NUEVO»; si el concepto no existe, 5; si existe sin importe, 0. */
  function valorCertificado(exp) {
    const c = exp.catalogos.conceptos.find((x) => igual(x.concepto, 'APORTACIÓN DE SOCIO NUEVO'));
    if (!c) return 5;
    if (typeof c.importeRef === 'string' && c.importeRef !== '') return 5; // texto + 0 da error y el IFERROR devuelve 5
    return N(c.importeRef);
  }

  /* SOCIOS B7:W406 y D3:M4. */
  function socios(exp) {
    const lista = exp.socios.lista;
    const nombres = lista.map((s) => String(s.nombre).toUpperCase());
    const vc = valorCertificado(exp);
    let kAct = 0, kNuevo = 0, kBaja = 0;
    const filas = lista.map((s, i) => {
      if (vacio(s.nombre)) return { no: '', control: '', activo: 0, nuevo: 0, bajaDev: 0, kAct: '', kNuevo: '', kBaja: '', cert: '' };
      const repetido = nombres.filter((n) => n === nombres[i]).length > 1;
      const control = recortar((vacio(s.socio) ? 'Marque si es socio. ' : '')
        + (igual(s.socio, 'Sí') && vacio(s.tipo) ? 'Falta el tipo. ' : '')
        + (igual(s.devuelto, 'Sí') && !esFecha(s.baja) ? 'Falta la fecha de baja. ' : '')
        + (repetido ? 'Nombre repetido. ' : ''));
      const activo = igual(s.socio, 'Sí') && vacio(s.baja) ? 1 : 0;
      const nuevo = igual(s.socio, 'Sí') && igual(s.nuevo, 'Sí') ? 1 : 0;
      const bajaDev = esFecha(s.baja) && igual(s.devuelto, 'Sí') ? 1 : 0;
      return {
        no: i + 1, control, activo, nuevo, bajaDev,
        kAct: activo ? ++kAct : '', kNuevo: nuevo ? ++kNuevo : '', kBaja: bajaDev ? ++kBaja : '',
        cert: N(s.certificado) > 0 ? s.certificado : vc,
      };
    });
    const activos = kAct;
    const alumnos = lista.filter((s, i) => igual(s.tipo, 'Alumno') && filas[i].activo === 1).length;
    const conObservacion = filas.filter((f) => tieneTexto(f.control)).length;
    const usar = igual(exp.socios.usarPadron, 'Sí');
    return {
      filas, activos, alumnos, maestrosEmpleados: activos - alumnos, nuevos: kNuevo, bajasDevueltas: kBaja,
      conObservacion, valorCertificado: vc,
      textoUso: usar ? `✔ El archivo usa el padrón: ${activos} socios.`
        : `El archivo usa el número de INGRESA DATOS (${textoDe(exp.ciclo.socios)}). Padrón: ${activos} activos.`,
      textoControl: conObservacion === 0 ? '✔ Padrón sin observaciones' : `⚠ Renglones con observación: ${conObservacion} (columna Control)`,
    };
  }

  /* Nombre definido NumSocios: el padrón si SOCIOS H3 = «Sí»; si no, INGRESA DATOS C13 ('' si está vacío). */
  function numSocios(exp) {
    if (igual(exp.socios.usarPadron, 'Sí')) return socios(exp).activos;
    return exp.ciclo.socios;
  }

  /* INGRESA DATOS D13. */
  function textoSociosCiclo(exp) {
    const s = socios(exp);
    return `Socios inscritos en el ciclo. Padrón (hoja SOCIOS): ${s.activos}`
      + (igual(exp.socios.usarPadron, 'Sí') ? ' · EN USO: el padrón manda sobre este número.' : ' · en uso: este número.');
  }

  /* ---------- CATÁLOGOS ---------- */

  /* Control G20:G219 del historial de precios. */
  function controlHistorial(exp) {
    const prods = exp.catalogos.productos;
    return exp.catalogos.historial.map((h) => {
      if (vacio(h.producto) && vacio(h.fecha) && vacio(h.precio)) return '';
      const p = prods.find((x) => !vacio(x.nombre) && igual(x.nombre, h.producto));
      const origen = p ? p.origen : '';
      return recortar((vacio(h.producto) ? 'Falta producto. ' : '')
        + (!esFecha(h.fecha) ? 'Falta fecha. ' : '')
        + (N(h.precio) <= 0 ? 'Falta precio. ' : '')
        + (N(h.costo) <= 0 && origen === 'Historial de precios' ? 'Falta costo. ' : ''));
    });
  }

  /* Aviso de la app (decisión de la Fase 1, pregunta 8): el Excel promedia dos precios del mismo producto
     con la misma fecha de vigencia. No cambia ningún cálculo; solo avisa. */
  function historialDuplicado(exp) {
    const h = exp.catalogos.historial;
    return h.map((r, i) => !vacio(r.producto) && esFecha(r.fecha)
      && h.some((q, j) => j !== i && igual(q.producto, r.producto) && q.fecha === r.fecha));
  }

  /* ---------- PROVEEDORES ---------- */

  /* PROVEEDORES I7 (campo propuesto): fecha del acta de proveedores que elige CARTA COMPROMISO
     (H3; vacío = la última de ese tipo). Las actas llegan en la Fase 3: sin actas, la propuesta va vacía. */
  function propuestaFirmaCarta(exp) {
    const actas = exp.actas || [];
    const tipo = 'PROVEEDORES · Selección de proveedores y precios de venta';
    const elegida = exp.cartaCompromiso && !vacio(exp.cartaCompromiso.acta) ? N(exp.cartaCompromiso.acta)
      : actas.reduce((m, a, i) => (a.tipo === tipo ? i + 1 : m), 0);
    const acta = elegida > 0 ? actas[elegida - 1] : null;
    return acta && esFecha(acta.fecha) ? acta.fecha : '';
  }

  /* Valor efectivo de un campo propuesto: lo capturado o, si no hay, la propuesta. */
  const efectivo = (capturado, propuesta) => (capturado === null || capturado === undefined ? propuesta : capturado);

  /* PROVEEDORES B7:K21. El renglón 1 sale del proveedor de alimentos de INGRESA DATOS. */
  function proveedores(exp, hoy = F.hoySerial()) {
    const fin = serial(exp.ciclo.ultimoDia);
    return exp.proveedores.map((p, i) => {
      const nombre = i === 0 ? textoDe(exp.ciclo.proveedor.nombre) : textoDe(p.nombre);
      const datos = i === 0
        ? { domicilio: textoDe(exp.ciclo.proveedor.domicilio), rfc: textoDe(exp.ciclo.proveedor.rfc), telefono: textoDe(exp.ciclo.proveedor.telefono) }
        : { domicilio: p.domicilio, rfc: p.rfc, telefono: p.telefono };
      const fechaFirma = i === 0 ? efectivo(p.fechaFirma, propuestaFirmaCarta(exp)) : (p.fechaFirma ?? '');
      let estado = '';
      if (nombre !== '') {
        if (igual(p.ine, 'No aplica')) estado = '✔ Compra comercial: no requiere carta compromiso';
        else if (!esFecha(fechaFirma)) estado = '✖ Sin carta compromiso firmada';
        else if (!igual(p.ine, 'Sí')) estado = '⚠ Falta copia de INE al reverso';
        else {
          const vence = esFecha(p.vigencia) ? serial(p.vigencia) : N(fin);
          estado = vence < hoy ? '✖ Vencida' : '✔ Vigente';
        }
      }
      return { no: nombre === '' ? '' : i + 1, nombre, ...datos, fechaFirma, estado };
    });
  }

  /* ---------- Controles (RESUMEN Y CONTROLES y TABLERO) disponibles en esta fase ---------- */

  function controles(exp, hoy = F.hoySerial()) {
    const c = exp.ciclo;
    const cal = calendario(exp);
    const ns = numSocios(exp);
    const firmas = c.firmantes.map((f) => f.nombre);
    const ctl2 = [c.ciclo, c.clave, c.registro, ns, c.efectivoAnterior, ...firmas].some(vacio);
    const histInc = controlHistorial(exp).filter(tieneTexto).length;
    const s = socios(exp);
    const prov = proveedores(exp, hoy);
    const provPend = prov.filter((p) => p.estado.startsWith('✖') || p.estado.startsWith('⚠')).length;
    const conNombre = prov.filter((p) => tieneTexto(p.nombre)).length;
    const vigentes = prov.filter((p) => p.estado.startsWith('✔')).length;
    const soc19 = s.conObservacion > 0 ? 'REVISAR'
      : (igual(exp.socios.usarPadron, 'Sí') ? 'OK' : (s.activos === N(c.socios) ? 'OK' : 'PENDIENTE'));
    return [
      { no: 1, origen: 'RESUMEN Y CONTROLES', nombre: 'Bloques suficientes para el calendario',
        estado: cal.totalSemanas <= 45 ? 'OK' : 'REVISAR', ruta: 'ciclo',
        detalle: `Semanas de venta programadas: ${cal.totalSemanas} de 45 bloques disponibles en el REGISTRO SEMANAL.` },
      { no: 2, origen: 'RESUMEN Y CONTROLES', nombre: 'Datos del ciclo y firmantes completos',
        estado: ctl2 ? 'REVISAR' : 'OK', ruta: 'ciclo',
        detalle: 'Revise en INGRESA DATOS: clave, número de registro, socios, efectivo anterior y firmantes.' },
      { no: 5, origen: 'RESUMEN Y CONTROLES', nombre: 'Historial de precios completo',
        estado: histInc === 0 ? 'OK' : 'REVISAR', ruta: 'catalogos',
        detalle: `Renglones incompletos en el historial de precios: ${histInc}.` },
      { no: 19, origen: 'TABLERO', nombre: 'Padrón de socios', estado: soc19, ruta: 'socios',
        detalle: `Padrón: ${s.activos} activos · INGRESA DATOS: ${textoDe(c.socios)} · en uso: `
          + `${igual(exp.socios.usarPadron, 'Sí') ? 'el padrón' : 'INGRESA DATOS'} · renglones con observación: ${s.conObservacion}` },
      { no: 21, origen: 'TABLERO', nombre: 'Proveedores con carta compromiso vigente',
        estado: provPend > 0 ? 'REVISAR' : 'OK', ruta: 'proveedores',
        detalle: `Proveedores: ${conNombre} · vigentes: ${vigentes} · con pendiente: ${provPend}` },
    ];
  }

  Coop.calculos = {
    calendario, rotuloSemana, fechaRenovacion, propuestaCambioConsejo,
    valorCertificado, socios, numSocios, textoSociosCiclo,
    controlHistorial, historialDuplicado, propuestaFirmaCarta, efectivo, proveedores, controles,
  };
})(globalThis.Coop = globalThis.Coop || {});
