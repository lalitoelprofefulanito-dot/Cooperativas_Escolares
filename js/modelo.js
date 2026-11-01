/* modelo.js — Estructura de un expediente (un ciclo escolar), valores de la plantilla,
   normalización, migración de versiones y duplicado como base del siguiente ciclo.
   Cada arreglo tiene la misma capacidad que su rango en el Excel. Un dato vacío se guarda como ''. */
(function (Coop) {
  'use strict';

  const VERSION_ESQUEMA = 2;

  const CAPACIDAD = { periodos: 60, productos: 8, historial: 200, conceptos: 40, socios: 400, proveedores: 15 };
  const LUGAR_AGUA = 6; // índice 0-based: el agua ocupa el lugar 7 (CATÁLOGOS, renglón 12)

  const FUNCIONES_FIRMA = ['Presidencia', 'Tesorería', 'Comité de Vigilancia', 'Comisión de Educación Cooperativa', 'Vo. Bo. de la Dirección'];

  const FUENTE_SEP = 'Calendario SEP 2026-2027 (El Contribuyente, sep. 2026). Confirmar con el calendario oficial.';

  /* Valores que trae la plantilla «ARCHIVO SIN DATOS» del 01/11/2026 (celdas de captura con dato). */
  const PLANTILLA = {
    ciclo: {
      ciclo: '2026-2027', primerDia: '2026-08-31', ultimoDia: '2027-07-09', diasClase: 185, ciudad: 'Ciudad de México',
      cargos: ['Presidencia de la cooperativa', 'Tesorería de la cooperativa', 'Comité de Vigilancia',
        'Comisión de Educación Cooperativa', 'Directora del plantel'],
      periodos: [
        ['2026-09-16', '2026-09-16', 'Día de la Independencia'],
        ['2026-09-25', '2026-09-25', 'Sesión ordinaria de CTE'],
        ['2026-10-30', '2026-10-30', 'Sesión ordinaria de CTE'],
        ['2026-11-02', '2026-11-02', 'Día de Muertos'],
        ['2026-11-13', '2026-11-13', 'Registro de calificaciones'],
        ['2026-11-16', '2026-11-16', 'Aniversario de la Revolución'],
        ['2026-11-27', '2026-11-27', 'Sesión ordinaria de CTE'],
        ['2026-12-21', '2027-01-06', 'Vacaciones de invierno (regreso el 7 de enero)'],
        ['2027-01-29', '2027-01-29', 'Sesión ordinaria de CTE'],
        ['2027-02-01', '2027-02-01', 'Día de la Constitución'],
        ['2027-02-26', '2027-02-26', 'Sesión ordinaria de CTE'],
        ['2027-03-05', '2027-03-05', 'Registro de calificaciones'],
        ['2027-03-15', '2027-03-15', 'Natalicio de Benito Juárez'],
        ['2027-03-22', '2027-04-02', 'Vacaciones de Semana Santa'],
        ['2027-04-30', '2027-04-30', 'Sesión ordinaria de CTE'],
        ['2027-05-05', '2027-05-05', 'Batalla de Puebla'],
        ['2027-05-28', '2027-05-28', 'Sesión ordinaria de CTE'],
        ['2027-06-18', '2027-06-18', 'Registro de calificaciones'],
        ['2027-06-25', '2027-06-25', 'Sesión ordinaria de CTE'],
      ],
    },
    origenAlimentos: 'Historial de precios',
    conceptos: [
      ['APORTACIÓN DE SOCIO NUEVO', 'Incremento al capital social', '', '', 'Ingreso', 'Sin fecha fija', 'Certificados de aportación de socios nuevos', '(Tesorería)'],
      ['INTERESES BANCARIOS DEL MES', 'Intereses bancarios', '', 'Según estado de cuenta.', 'Ingreso', 'Mensual', 'Estado de cuenta de', 'Banco (estado de cuenta)'],
      ['PASAJES A DIRECCIÓN DE PRIMARIAS No. 1', 'Gasto con cargo al fondo social', '', '', '10 % de apoyo a la Dirección (sin acta)', 'Sin fecha fija', 'Entrega de estadística', '(Dirección)'],
      ['PASAJES A DGARH', 'Gasto con cargo al fondo social', '', '', '10 % de apoyo a la Dirección (sin acta)', 'Sin fecha fija', 'Entrega de documentación', '(Dirección)'],
      ['PASAJES A CGRH', 'Gasto con cargo al fondo social', '', '', '10 % de apoyo a la Dirección (sin acta)', 'Sin fecha fija', 'Trámite de plantilla de personal', '(Dirección)'],
      ['PASAJES AL ARCHIVO CENTRAL DE RECURSOS HUMANOS', 'Gasto con cargo al fondo social', '', '', '10 % de apoyo a la Dirección (sin acta)', 'Sin fecha fija', 'Trámite de expedientes', '(Dirección)'],
      ['PASAJES A COMISIÓN NACIONAL MIXTA DE ESCALAFÓN', 'Gasto con cargo al fondo social', '', '', '10 % de apoyo a la Dirección (sin acta)', 'Sin fecha fija', 'Entrega de documentación de escalafón', '(Dirección)'],
      ['PASAJES A ALCALDÍA', 'Gasto con cargo al fondo social', '', '', '10 % de apoyo a la Dirección (sin acta)', 'Sin fecha fija', 'Trámite ante la alcaldía', '(Dirección)'],
      ['BASURA', 'Gasto con cargo al fondo social', '', '', 'Requiere acta previa (autorización)', 'Semanal', 'Cooperación semanal para la recolección de basura', ''],
      ['FLETE / TRANSPORTE DE LIBROS', 'Gasto con cargo al fondo social', '', '', 'Requiere acta previa (autorización)', 'Sin fecha fija', 'Traslado de libros de texto', ''],
      ['PASAJES AL BANCO', 'Gasto de administración', '', '', 'Gasto de administración (sin acta)', 'Sin fecha fija', 'Depósito de utilidades', '(Tesorería)'],
      ['GASTOS DE ENVÍO DE AGUA', 'Gasto de administración', '', '', 'Gasto de administración (sin acta)', 'Sin fecha fija', 'Envío de agua purificada', ''],
      ['COPIAS Y PAPELERÍA', 'Gasto de administración', '', '', 'Gasto de administración (sin acta)', 'Sin fecha fija', '', '(Presidencia)'],
      ['APOYO A LA DIRECCIÓN (10 % DE LAS UTILIDADES SEMANALES)', 'Gasto con cargo al fondo social', '', 'Tope: 10 % de la utilidad de la semana; no acumulable; se informa en asamblea (Orientaciones 2025-2026, «Apoyo del 10 %»).', '10 % de apoyo a la Dirección (sin acta)', 'Sin fecha fija', '', '(Dirección)'],
      ['GASTO EMERGENTE HIDROSANITARIO, ELÉCTRICO O DE SEGURIDAD (FONDO SOCIAL 40 %)', 'Gasto con cargo al fondo social', '', 'Solo emergencias hidrosanitarias, eléctricas o de seguridad; se ejerce y después se levanta el acta de reconocimiento (Orientaciones 2025-2026, «Reconocimiento de gastos»). Ver CORTES: fondo social disponible.', 'Reconocimiento (acta posterior al gasto)', 'Sin fecha fija', '', ''],
      ['TRASLADO DE EXTINTORES (LLEVADA Y REGRESO)', 'Gasto con cargo al fondo social', '', 'Requiere acta (Orientaciones 2025-2026, «Autorización de gastos», 1.2.2). Un acta cubre la llevada y el regreso; imprímala en la hoja ACTA EXTINTORES.', 'Requiere acta previa (autorización)', 'Sin fecha fija', '', ''],
      ['TRANSPORTE A CONCURSOS U OLIMPIADA DEL CONOCIMIENTO INFANTIL', 'Gasto con cargo al fondo social', '', 'Requiere acta (Orientaciones 2025-2026, «Autorización de gastos», 1.2.2); no se cubre con el 10 %.', 'Requiere acta previa (autorización)', 'Sin fecha fija', '', ''],
      ['FOTOCOPIAS PARA LA DIRECCIÓN (SIN FOTOCOPIADORA)', 'Gasto con cargo al fondo social', '', 'Solo si la escuela no cuenta con fotocopiadora; se cubre con el 10 % de la semana (Orientaciones 2025-2026, «Apoyo del 10 %», inciso a).', '10 % de apoyo a la Dirección (sin acta)', 'Sin fecha fija', 'Fotocopias para la Dirección', '(Dirección)'],
      ['COMISIONES BANCARIAS', 'Gasto de administración', '', 'Según estado de cuenta. No requiere acta: se comprueba con el estado de cuenta.', 'Gasto de administración (sin acta)', 'Mensual', 'Comisión bancaria de', 'Banco (estado de cuenta)'],
      ['SELLOS, LIBRO CONTABLE, LIBRO DE ACTAS O CUADERNOS', 'Gasto de administración', '', 'No requiere acta de autorización (Orientaciones); solo recibo o nota.', 'Gasto de administración (sin acta)', 'Sin fecha fija', '', '(Tesorería)'],
      ['SERVICIO PROGRAMABLE (MANTENIMIENTO, REPARACIÓN O CONTRATACIÓN)', 'Gasto con cargo al fondo social', '', 'Requiere convocatoria extraordinaria y acta de autorización previa (Orientaciones).', 'Requiere acta previa (autorización)', 'Sin fecha fija', '', ''],
      ['ADQUISICIÓN DE BIENES PARA EL PLANTEL', 'Gasto con cargo al fondo social', '', 'Requiere acta de autorización previa y 3 cotizaciones (Orientaciones).', 'Requiere acta previa (autorización)', 'Sin fecha fija', '', ''],
      ['GASTO CON CARGO AL FONDO DE RESERVA', 'Gasto con cargo al fondo de reserva', '', 'Para mantener o incrementar las actividades de la cooperativa o atender pérdidas comprobadas (art. 48). Requiere acta previa.', 'Requiere acta previa (autorización)', 'Sin fecha fija', '', ''],
      ['ENTREGA DEL FONDO REPARTIBLE A LOS SOCIOS', 'Entrega del fondo repartible', '', 'Total entregado según el COE-02 (art. 49). El respaldo es el acta de distribución y el COE-02: no escriba número de acta en este renglón.', 'Gasto de administración (sin acta)', 'Sin fecha fija', 'Fondo repartible entregado a los socios (ver COE-02)', '(Tesorería)'],
      ['DEVOLUCIÓN DE CERTIFICADOS DE APORTACIÓN', 'Devolución de certificados de aportación', '', 'A socios que causan baja (art. 43). Total según el COE-03.', 'Gasto de administración (sin acta)', 'Sin fecha fija', 'Certificados devueltos a socios que causan baja (ver COE-03)', '(Tesorería)'],
    ],
  };

  const CAMPOS_PERIODO = ['desde', 'hasta', 'motivo', 'fuente'];
  const CAMPOS_PRODUCTO = ['nombre', 'origen', 'observacion'];
  const CAMPOS_HISTORIAL = ['producto', 'fecha', 'precio', 'costo', 'fuente'];
  const CAMPOS_CONCEPTO = ['concepto', 'clasificacion', 'importeRef', 'observacion', 'tratamiento', 'fechaSugerida', 'detalle', 'persona'];
  const CAMPOS_SOCIO = ['nombre', 'tipo', 'grupo', 'socio', 'nuevo', 'alta', 'certificado', 'baja', 'devuelto', 'fechaDevolucion', 'tutor', 'frEntregado', 'observaciones'];
  /* «fechaFirma» es un campo propuesto: null = usar la propuesta (fecha del acta de proveedores). */
  const CAMPOS_PROVEEDOR = ['nombre', 'productos', 'domicilio', 'rfc', 'telefono', 'ine', 'fechaFirma', 'vigencia', 'observaciones'];

  const renglon = (campos, valores = []) => Object.fromEntries(campos.map((c, i) => [c, valores[i] ?? '']));
  const tabla = (campos, n, filas = []) => Array.from({ length: n }, (_, i) => renglon(campos, filas[i]));

  function nuevoId() {
    if (globalThis.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'exp-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  /* Expediente vacío. Con «conPlantilla» trae los valores del formato 2026-2027; sin ella, el calendario va vacío. */
  function crearExpediente(conPlantilla = true) {
    const P = PLANTILLA;
    const productos = tabla(CAMPOS_PRODUCTO, CAPACIDAD.productos);
    for (let i = 0; i < LUGAR_AGUA; i++) productos[i].origen = P.origenAlimentos;
    const ahora = new Date().toISOString();
    const exp = {
      id: nuevoId(),
      versionEsquema: VERSION_ESQUEMA,
      creado: ahora,
      modificado: ahora,
      ciclo: {
        ciclo: conPlantilla ? P.ciclo.ciclo : '',
        primerDia: conPlantilla ? P.ciclo.primerDia : '',
        ultimoDia: conPlantilla ? P.ciclo.ultimoDia : '',
        escuela: '', cct: '', cooperativa: '', clave: '', registro: '', socios: '', efectivoAnterior: '',
        ciudad: conPlantilla ? P.ciclo.ciudad : '',
        diasClase: conPlantilla ? P.ciclo.diasClase : '',
        fotocopiadora: '',
        firmantes: FUNCIONES_FIRMA.map((_, i) => ({ nombre: '', cargo: P.ciclo.cargos[i], saliente: i === 4 ? null : '' })),
        proveedor: { nombre: '', domicilio: '', rfc: '', telefono: '' },
        periodos: tabla(CAMPOS_PERIODO, CAPACIDAD.periodos,
          conPlantilla ? P.ciclo.periodos.map((p) => [p[0], p[1], p[2], FUENTE_SEP]) : []),
      },
      catalogos: {
        productos,
        historial: tabla(CAMPOS_HISTORIAL, CAPACIDAD.historial),
        conceptos: tabla(CAMPOS_CONCEPTO, CAPACIDAD.conceptos, P.conceptos),
      },
      socios: { usarPadron: 'No', lista: tabla(CAMPOS_SOCIO, CAPACIDAD.socios) },
      proveedores: tabla(CAMPOS_PROVEEDOR, CAPACIDAD.proveedores).map((p) => ({ ...p, fechaFirma: null })),
    };
    /* El renglón del agua es fijo y no se captura (CATÁLOGOS, renglón 12). */
    exp.catalogos.productos[LUGAR_AGUA] = { nombre: 'AGUA', origen: 'Compras de agua', observacion: '' };
    return exp;
  }

  /* Completa lo que falte (renglones, campos) sin tocar lo capturado. Sirve al abrir, importar y migrar. */
  function normalizar(exp) {
    const base = crearExpediente(false);
    const fusionar = (campos, n, filas, extra) => Array.from({ length: n }, (_, i) => {
      const r = filas && filas[i] ? filas[i] : {};
      const o = renglon(campos, campos.map((c) => (r[c] === undefined ? undefined : r[c])));
      if (extra) extra(o, r);
      return o;
    });
    const c = exp.ciclo || {};
    const out = {
      ...base,
      id: exp.id || base.id,
      versionEsquema: VERSION_ESQUEMA,
      creado: exp.creado || base.creado,
      modificado: exp.modificado || base.modificado,
      ciclo: { ...base.ciclo, ...c },
      catalogos: {
        productos: fusionar(CAMPOS_PRODUCTO, CAPACIDAD.productos, exp.catalogos && exp.catalogos.productos),
        historial: fusionar(CAMPOS_HISTORIAL, CAPACIDAD.historial, exp.catalogos && exp.catalogos.historial),
        conceptos: fusionar(CAMPOS_CONCEPTO, CAPACIDAD.conceptos, exp.catalogos && exp.catalogos.conceptos),
      },
      socios: {
        usarPadron: exp.socios && exp.socios.usarPadron !== undefined ? exp.socios.usarPadron : 'No',
        lista: fusionar(CAMPOS_SOCIO, CAPACIDAD.socios, exp.socios && exp.socios.lista),
      },
      proveedores: fusionar(CAMPOS_PROVEEDOR, CAPACIDAD.proveedores, exp.proveedores,
        (o, r) => { o.fechaFirma = r.fechaFirma === undefined ? null : r.fechaFirma; }),
    };
    out.ciclo.firmantes = FUNCIONES_FIRMA.map((_, i) => {
      const f = (c.firmantes && c.firmantes[i]) || {};
      return {
        nombre: f.nombre ?? '',
        cargo: f.cargo ?? base.ciclo.firmantes[i].cargo,
        saliente: i === 4 ? (f.saliente === undefined ? null : f.saliente) : (f.saliente ?? ''),
      };
    });
    out.ciclo.proveedor = { ...base.ciclo.proveedor, ...(c.proveedor || {}) };
    out.ciclo.periodos = fusionar(CAMPOS_PERIODO, CAPACIDAD.periodos, c.periodos);
    out.catalogos.productos[LUGAR_AGUA] = { nombre: 'AGUA', origen: 'Compras de agua', observacion: '' };
    return out;
  }

  /* Migraciones: una función por versión anterior (de n a n+1). La versión 1 es la primera. */
  const MIGRACIONES = {
    /* 1 → 2 (01/11/2026): el fondo repartible entregado y los certificados devueltos dejan de clasificarse como
       gasto del fondo de reserva (Reglamento, arts. 43, 46 y 49; Guía de Actas de Cooperativa Escolar). */
    1: (exp) => {
      const nuevas = {
        'ENTREGA DEL FONDO REPARTIBLE A LOS SOCIOS': 'Entrega del fondo repartible',
        'DEVOLUCIÓN DE CERTIFICADOS DE APORTACIÓN': 'Devolución de certificados de aportación',
      };
      const conceptos = ((exp.catalogos && exp.catalogos.conceptos) || []).map((c) => {
        const clave = String(c.concepto || '').toUpperCase();
        return nuevas[clave] && c.clasificacion === 'Gasto con cargo al fondo de reserva' ? { ...c, clasificacion: nuevas[clave] } : c;
      });
      return { ...exp, versionEsquema: 2, catalogos: { ...exp.catalogos, conceptos } };
    },
  };

  function migrar(exp) {
    const v = Number(exp.versionEsquema) || 1;
    if (v > VERSION_ESQUEMA) {
      throw new Error(`El expediente «${(exp.ciclo && exp.ciclo.ciclo) || 'sin ciclo'}» se hizo con una versión más nueva de la app (esquema ${v}). Actualice la app para abrirlo.`);
    }
    let actual = exp;
    for (let n = v; n < VERSION_ESQUEMA; n++) actual = MIGRACIONES[n](actual);
    return normalizar(actual);
  }

  function siguienteCiclo(ciclo) {
    const m = /^(\d{4})-(\d{4})$/.exec(String(ciclo || '').trim());
    return m ? `${+m[1] + 1}-${+m[2] + 1}` : '';
  }

  /* Duplicado como base del siguiente ciclo. «que» indica qué bloques se copian (los elige la persona).
     Nunca se copian las fechas del ciclo, los días de clase, los periodos sin venta, el número de socios
     ni el efectivo anterior: son propios de cada ciclo. */
  function duplicarComoBase(origen, nombreCiclo, que) {
    const nuevo = crearExpediente(false);
    const o = JSON.parse(JSON.stringify(origen));
    nuevo.ciclo.ciclo = nombreCiclo;
    if (que.escuela) {
      for (const k of ['escuela', 'cct', 'cooperativa', 'clave', 'registro', 'ciudad', 'fotocopiadora']) nuevo.ciclo[k] = o.ciclo[k];
    }
    if (que.mesa) {
      nuevo.ciclo.firmantes = o.ciclo.firmantes.map((f, i) => (i === 4
        ? { nombre: f.nombre, cargo: f.cargo, saliente: null }
        : { nombre: '', cargo: f.cargo, saliente: f.nombre }));
    }
    if (que.proveedorAlimentos) nuevo.ciclo.proveedor = o.ciclo.proveedor;
    if (que.catalogos) nuevo.catalogos = o.catalogos;
    if (que.proveedores) nuevo.proveedores = o.proveedores.map((p) => ({ ...p, fechaFirma: null }));
    if (que.socios) nuevo.socios = o.socios;
    return normalizar(nuevo);
  }

  Coop.modelo = {
    VERSION_ESQUEMA, CAPACIDAD, LUGAR_AGUA, FUNCIONES_FIRMA, PLANTILLA,
    crearExpediente, normalizar, migrar, siguienteCiclo, duplicarComoBase,
  };
})(globalThis.Coop = globalThis.Coop || {});
