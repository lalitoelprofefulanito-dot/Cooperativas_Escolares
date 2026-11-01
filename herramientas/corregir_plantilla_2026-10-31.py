"""Corrige el libro «Control de Cooperativas Escolares CDMX» del 21/10/2026 (SHA-256 ad0efe17…5c835)
y produce la versión del 31/10/2026. Edita directamente el XML del .xlsx para no perder imágenes,
gráfica, notas ni protección. Uso:

    python3 corregir_plantilla_2026-10-31.py ORIGEN_21-10.xlsx DESTINO_31-10.xlsx

Correcciones (claves de M0_Auditoria_App_Movil.md v2):
  X-1  E-2 aviso del agua (REGISTRO SEMANAL P31, 45 bloques) · E-3 selectores H3 del 1 al 40 · E-6 notas de CATÁLOGOS
  X-2  Quórum del art. 26 del Reglamento: CAPTURA ACTAS AC (convocatoria 1.ª/2.ª) y AD (quórum, se calcula),
       control U, 13 textos de instalación, CONVOCATORIA y LISTA DE ASISTENCIA
  X-3  Reconocimiento de gastos: tipo de emergencia (AE) y motivo de la urgencia (AF)
  X-4  CATÁLOGO DE ACTAS: fundamentos y carácter cotejados con el DOF, numeración 1–30, criterios 8 y 9
  X-5  Citas por apartado en lugar de página; representantes solo con más de 200 alumnos (art. 22)
"""
import hashlib, html, re, sys, zipfile

ORIGEN, DESTINO = sys.argv[1], sys.argv[2]
SHA_ORIGEN = "ad0efe172a758bf42e0a3fb6c31b5687868687ed3939741f1161784f4285c835"
if hashlib.sha256(open(ORIGEN, "rb").read()).hexdigest() != SHA_ORIGEN:
    raise SystemExit("El origen no es el libro del 21/10/2026 (SHA-256 distinto).")

z = zipfile.ZipFile(ORIGEN)
contenido = {n: z.read(n) for n in z.namelist()}
cambios = []

# ---------- utilidades ----------
wb = contenido["xl/workbook.xml"].decode("utf-8")
_rid = {re.search(r'name="([^"]*)"', s).group(1): re.search(r'r:id="rId(\d+)"', s).group(1)
        for s in re.findall(r"<sheet [^>]*/>", wb)}
RUTA = {nombre: f"xl/worksheets/sheet{n}.xml" for nombre, n in _rid.items()}

def leer(hoja):
    return contenido[RUTA[hoja]].decode("utf-8")

def escribir(hoja, texto):
    contenido[RUTA[hoja]] = texto.encode("utf-8")

def esc(t):
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def formula(xml, ref):
    m = re.search(r'<c r="%s"(?: [^>]*)?><f>(.*?)</f>' % ref, xml, re.S)
    if not m:
        raise SystemExit(f"No se encontró la fórmula de {ref}")
    return m, html.unescape(m.group(1))

def cambiar_formula(hoja, ref, viejo, nuevo, motivo, veces=1):
    xml = leer(hoja)
    m, f = formula(xml, ref)
    n = f.count(viejo)
    if n != veces:
        raise SystemExit(f"{hoja}!{ref}: se esperaban {veces} apariciones de {viejo[:70]!r} y hay {n}")
    f2 = f.replace(viejo, nuevo)
    xml = xml[:m.start(1)] + esc(f2) + xml[m.end(1):]
    escribir(hoja, xml)
    cambios.append((f"{hoja}!{ref}", motivo))

def poner_texto(hoja, ref, texto, motivo):
    """Sustituye el contenido de una celda por un texto (cadena en línea), conservando su estilo."""
    xml = leer(hoja)
    m = re.search(r'<c r="%s"((?: [^>]*?)?)(?:/>|>.*?</c>)' % ref, xml, re.S)
    if not m:
        raise SystemExit(f"No se encontró la celda {hoja}!{ref}")
    attrs = re.sub(r' t="[^"]*"', "", m.group(1))
    nuevo = f'<c r="{ref}"{attrs} t="inlineStr"><is><t xml:space="preserve">{esc(texto)}</t></is></c>'
    escribir(hoja, xml[:m.start()] + nuevo + xml[m.end():])
    cambios.append((f"{hoja}!{ref}", motivo))

def texto_actual(hoja, ref):
    xml = leer(hoja)
    m = re.search(r'<c r="%s"(?: [^>]*?)?>(.*?)</c>' % ref, xml, re.S)
    cuerpo = m.group(1)
    if "<is>" in cuerpo:
        return html.unescape("".join(re.findall(r"<t[^>]*>(.*?)</t>", cuerpo, re.S)))
    idx = int(re.search(r"<v>(\d+)</v>", cuerpo).group(1))
    sst = contenido["xl/sharedStrings.xml"].decode("utf-8")
    si = re.findall(r"<si>(.*?)</si>", sst, re.S)[idx]
    return html.unescape("".join(re.findall(r"<t[^>]*>(.*?)</t>", si, re.S)))

def sustituir_en(hoja, ref, viejo, nuevo, motivo):
    t = texto_actual(hoja, ref)
    if t.count(viejo) != 1:
        raise SystemExit(f"{hoja}!{ref}: no se encontró una sola vez {viejo!r}")
    poner_texto(hoja, ref, t.replace(viejo, nuevo), motivo)

# ---------- X-1: E-2, E-3, E-6 ----------
def corregir_agua(xml):
    def arreglar(m):
        celda, fila = m.group(0), int(m.group(1))
        p4, p3, a, b = fila - 4, fila - 3, fila - 6, fila - 5   # producto 8 → agua (renglón 7)
        for col in ("E", "K", "F"):
            celda = re.sub(rf"(?<![A-Z$]){col}{p4}(?!\d)", f"{col}{a}", celda)
        return re.sub(rf"(?<![A-Z$])D{p3}(?!\d)", f"D{b}", celda)
    filas = "|".join(str(31 + 41 * k) for k in range(45))
    nuevo, n = re.subn(r'<c r="P(%s)" [^>]*><f>[^<]*</f>(?:<v/>)?</c>' % filas, arreglar, xml)
    if n != 45:
        raise SystemExit(f"E-2: se esperaban 45 celdas y hay {n}")
    return nuevo

escribir("REGISTRO SEMANAL", corregir_agua(leer("REGISTRO SEMANAL")))
cambios.append(("REGISTRO SEMANAL!P31 (×45)", "E-2: el aviso lee el renglón del agua"))

for hoja in ("ACTA EXTINTORES", "ACTA CARGO VACANTE", "ACTA AUTORIZACIÓN", "ACTA RECONOCIMIENTO"):
    xml = leer(hoja)
    patron = r'(sqref="H3"[^>]*><formula1>)2(</formula1><formula2>40</formula2>)'
    xml, n = re.subn(patron, r"\g<1>1\g<2>", xml)
    if n != 1:
        raise SystemExit(f"E-3: {hoja} sin la validación esperada")
    escribir(hoja, xml)
    cambios.append((f"{hoja}!H3", "E-3: acepta actas del 1 al 40"))

c = contenido["xl/comments1.xml"].decode("utf-8")
for viejo, nuevo in (("cada concepto en MOVIMIENTOS y en el recibo", "cada concepto en el REGISTRO DE GASTOS y en el recibo"),
                     ("con los firmantes de CICLO Y FECHAS:", "con los firmantes de INGRESA DATOS:")):
    if c.count(viejo) != 1:
        raise SystemExit(f"E-6: no se encontró {viejo!r}")
    c = c.replace(viejo, nuevo)
contenido["xl/comments1.xml"] = c.encode("utf-8")
cambios.append(("CATÁLOGOS N5 y Q5 (notas)", "E-6: nombres de hoja vigentes"))

# ---------- X-2 y X-3: columnas nuevas en CAPTURA ACTAS ----------
NO_ASAMBLEA = 'OR(C{r}="",LEFT(C{r},11)="PROVEEDORES",LEFT(C{r},6)="SESIÓN",LEFT(C{r},7)="ENTREGA",LEFT(C{r},6)="HECHOS")'
MIN = "ROUNDUP(2*M{r}/3,0)"

def f_quorum(r):
    na, mn = NO_ASAMBLEA.format(r=r), MIN.format(r=r)
    return (f'IF({na},"",IF(AC{r}="2.ª","2.ª convocatoria: con los socios que concurran",'
            f'IF(OR(N(L{r})=0,N(M{r})=0),"",IF(L{r}>={mn},"✔ "&L{r}&" presentes; mínimo "&{mn},'
            f'"✖ Sin quórum: mínimo "&{mn}&" (2/3)"))))')

def f_control_extra(r):
    return (f'IF(LEFT(AD{r},1)="✖","Sin quórum en primera convocatoria: se requieren al menos "&{MIN.format(r=r)}'
            f'&" socios presentes (dos terceras partes, Reglamento, art. 26). Si se celebró en segunda convocatoria, '
            f'márquelo en la columna AC. ","")'
            f'&IF(AND(C{r}="EXTRAORDINARIA · Reconocimiento de gastos",OR(AE{r}="",AF{r}="")),'
            f'"Reconocimiento: capture el tipo de emergencia y el motivo de la urgencia (columnas AE y AF). ","")'
            f'&IF(AND($J$7="Sí",N($J$5)<=200,AD{r}<>""),"Socios representantes: el art. 22 del Reglamento solo los '
            f'admite cuando hay más de 200 alumnos. ","")&')

xml = leer("CAPTURA ACTAS")
encabezados = {
    "AC": "Convocatoria (1.ª o 2.ª; vacío = 1.ª)",
    "AD": "Quórum: dos terceras partes de los socios en 1.ª convocatoria (Reglamento, art. 26; se calcula)",
    "AE": "Reconocimiento de gastos: tipo de emergencia",
    "AF": "Reconocimiento de gastos: motivo de la urgencia que impidió convocar",
}
def agregar_a_fila(xml, fila, celdas):
    m = re.search(r'<row r="%d"[^>]*>.*?</row>' % fila, xml, re.S)
    fila_xml = re.sub(r'spans="\d+:\d+"', 'spans="2:32"', m.group(0))
    fila_xml = fila_xml[:-len("</row>")] + celdas + "</row>"
    return xml[:m.start()] + fila_xml + xml[m.end():]

xml = agregar_a_fila(xml, 13, "".join(
    f'<c r="{col}13" s="169" t="inlineStr"><is><t>{esc(t)}</t></is></c>' for col, t in encabezados.items()))
for r in range(14, 54):
    celdas = (f'<c r="AC{r}" s="34"/>'
              f'<c r="AD{r}" s="39" t="str"><f>{esc(f_quorum(r))}</f></c>'
              f'<c r="AE{r}" s="34"/>'
              f'<c r="AF{r}" s="32"/>')
    xml = agregar_a_fila(xml, r, celdas)
    m, f = formula(xml, f"U{r}")
    if f.count("TRIM(") < 1 or not f.startswith(f'IF(AND(C{r}="",D{r}=""),"",TRIM('):
        raise SystemExit(f"U{r}: estructura inesperada")
    f2 = f.replace("TRIM(", "TRIM(" + f_control_extra(r), 1)
    xml = xml[:m.start(1)] + esc(f2) + xml[m.end(1):]
cambios.append(("CAPTURA ACTAS AC13:AF53", "X-2/X-3: convocatoria, quórum (art. 26), tipo de emergencia y motivo de la urgencia"))
cambios.append(("CAPTURA ACTAS U14:U53", "X-2/X-3/X-5: avisos de quórum, de reconocimiento y de representantes (art. 22)"))

# Columnas visibles y anchos: AA:AB siguen ocultas; AC:AF visibles; el resto, oculto.
viejo_cols = '<col min="28" max="16384" width="9.140625" style="89" hidden="1"/>'
if xml.count(viejo_cols) != 1:
    raise SystemExit("CAPTURA ACTAS: no se encontró la definición de columnas esperada")
xml = xml.replace(viejo_cols,
    '<col min="28" max="28" width="9.140625" style="89" hidden="1" customWidth="1"/>'
    '<col min="29" max="29" width="13" style="89" customWidth="1"/>'
    '<col min="30" max="30" width="22" style="89" customWidth="1"/>'
    '<col min="31" max="31" width="16" style="89" customWidth="1"/>'
    '<col min="32" max="32" width="34" style="89" customWidth="1"/>'
    '<col min="33" max="16384" width="9.140625" style="89" hidden="1"/>')

# Validaciones de lista para AC y AE
m = re.search(r'<dataValidations count="(\d+)">', xml)
xml = xml.replace(m.group(0), f'<dataValidations count="{int(m.group(1)) + 2}">', 1)
nuevas_dv = ('<dataValidation type="list" allowBlank="1" showErrorMessage="1" errorTitle="Convocatoria" '
             'error="Elija 1.ª o 2.ª (Reglamento, art. 26)." sqref="AC14:AC53"><formula1>"1.ª,2.ª"</formula1></dataValidation>'
             '<dataValidation type="list" allowBlank="1" showErrorMessage="1" errorTitle="Tipo de emergencia" '
             'error="Solo emergencias hidrosanitarias, eléctricas o de seguridad (Orientaciones 2025-2026, «Reconocimiento de gastos»)." '
             'sqref="AE14:AE53"><formula1>"hidrosanitario,eléctrico,de seguridad"</formula1></dataValidation>')
xml = xml.replace("</dataValidations>", nuevas_dv + "</dataValidations>", 1)
escribir("CAPTURA ACTAS", xml)

# Nombres definidos nuevos
nombres = {"ACT_Convoc": "$AC$14:$AC$53", "ACT_Quorum": "$AD$14:$AD$53",
           "ACT_Emerg": "$AE$14:$AE$53", "ACT_Urgencia": "$AF$14:$AF$53"}
wb = contenido["xl/workbook.xml"].decode("utf-8")
for n in nombres:
    if f'name="{n}"' in wb:
        raise SystemExit(f"El nombre {n} ya existe")
wb = wb.replace("</definedNames>", "".join(
    f"<definedName name=\"{n}\">'CAPTURA ACTAS'!{rng}</definedName>" for n, rng in nombres.items()) + "</definedNames>", 1)
contenido["xl/workbook.xml"] = wb.encode("utf-8")
cambios.append(("Libro", "Nombres ACT_Convoc, ACT_Quorum, ACT_Emerg y ACT_Urgencia"))

# ---------- X-2: textos de instalación de la asamblea ----------
def q(ref):
    return f'LEFT(IFERROR(INDEX(ACT_Quorum,{ref})&"",""),1)'

SIN = "______ [SIN QUÓRUM: en primera convocatoria se requieren las dos terceras partes de los socios; celebre la asamblea en segunda convocatoria]"
def variante(ref, con, segunda, original):
    sin = SIN + ("," if original.endswith(",") else "")
    return (f'"&IF({q(ref)}="2","{segunda}",IF({q(ref)}="✖","{sin}",'
            f'IF({q(ref)}="✔","{con}","{original}")))&"')

A = ("comprobándose el quórum legal requerido",
     "comprobándose el quórum legal de las dos terceras partes de los socios (Reglamento, art. 26)",
     "en segunda convocatoria, con los socios que concurrieron (Reglamento, art. 26)")
B = ("comprobado el quórum legal requerido",
     "comprobado el quórum legal de las dos terceras partes de los socios (Reglamento, art. 26)",
     "celebrada la asamblea en segunda convocatoria con los socios que concurrieron (Reglamento, art. 26)")
C = ("Comprobado el quórum legal requerido",
     "Comprobado el quórum legal de las dos terceras partes de los socios (Reglamento, art. 26)",
     "Celebrada la Asamblea en segunda convocatoria con los socios que concurrieron (Reglamento, art. 26)")
D = ("comprobado el quórum legal,",
     "comprobado el quórum legal de las dos terceras partes de los socios (Reglamento, art. 26),",
     "celebrada la Asamblea en segunda convocatoria con los socios que concurrieron (Reglamento, art. 26),")

objetivos = [
    ("ACTA ORDINARIA", "B8", C, "$Q$1"), ("ACTA EXTINTORES", "B8", A, "$Q$1"), ("ACTA CARGO VACANTE", "B8", C, "$Q$1"),
    ("ACTA INFORMATIVA", "B8", B, "$Q$1"), ("ACTA OTROS ACUERDOS", "B8", B, "$Q$1"), ("ACTA FONDO REPARTIBLE", "B8", B, "$Q$1"),
    ("ACTA AUTORIZACIÓN", "B8", A, "$Q$1"), ("ACTA RECONOCIMIENTO", "B8", D, "$Q$1"),
    ("IMPRIMIR ACTA", "B12", A, "$Q$5"), ("IMPRIMIR ACTA", "B71", D, "$Q$64"), ("IMPRIMIR ACTA", "B218", B, "$Q$211"),
    ("IMPRIMIR ACTA", "B264", C, "$Q$257"), ("IMPRIMIR ACTA", "B308", A, "$Q$301"), ("IMPRIMIR ACTA", "B441", B, "$Q$434"),
    ("IMPRIMIR ACTA", "B487", B, "$Q$480"), ("IMPRIMIR ACTA", "B609", C, "$Q$602"),
]
for hoja, ref, (orig, con, seg), acta in objetivos:
    _, f = formula(leer(hoja), ref)
    if f"INDEX(ACT_Obs,{acta})" not in f:
        raise SystemExit(f"{hoja}!{ref}: no usa el acta {acta}")
    cambiar_formula(hoja, ref, orig, variante(acta, con, seg, orig), "X-2: quórum del art. 26 en el texto de instalación")

# ---------- X-3: tipo de emergencia y motivo de la urgencia ----------
VIEJO_REC = "de carácter hidrosanitario, eléctrico o de seguridad, conforme a lo siguiente:\""
def nuevo_rec(ref):
    return ('de carácter "&IF(IFERROR(INDEX(ACT_Emerg,' + ref + ')&"","")="","__________ (hidrosanitario, eléctrico o de seguridad)",'
            'INDEX(ACT_Emerg,' + ref + '))&". La urgencia que impidió convocar con anticipación fue la siguiente: "&'
            'IF(IFERROR(INDEX(ACT_Urgencia,' + ref + ')&"","")="","______________________________",INDEX(ACT_Urgencia,' + ref + '))'
            '&". El gasto se aplicó conforme a lo siguiente:"')
cambiar_formula("ACTA RECONOCIMIENTO", "B12", VIEJO_REC, nuevo_rec("$Q$1"), "X-3: tipo de emergencia y motivo de la urgencia")
cambiar_formula("IMPRIMIR ACTA", "B75", VIEJO_REC, nuevo_rec("$Q$64"), "X-3: tipo de emergencia y motivo de la urgencia")

# ---------- X-2: CONVOCATORIA y LISTA DE ASISTENCIA ----------
cambiar_formula("CONVOCATORIA", "B2", '"CONVOCATORIA A ASAMBLEA GENERAL "&UPPER($Q$20)',
    '"CONVOCATORIA A ASAMBLEA GENERAL "&UPPER($Q$20)&IF(IFERROR(INDEX(ACT_Convoc,$Q$1)&"","")="2.ª"," · SEGUNDA CONVOCATORIA"," · PRIMERA CONVOCATORIA")',
    "X-2: primera o segunda convocatoria en el título")
cambiar_formula("CONVOCATORIA", "B21", '"Se invita a todos los socios a participar con puntualidad."',
    'IF(IFERROR(INDEX(ACT_Convoc,$Q$1)&"","")="2.ª","Por tratarse de una segunda convocatoria, la Asamblea se celebrará con los socios que asistan (Reglamento, art. 26).",'
    '"Para que la Asamblea quede legalmente instalada se requiere la asistencia de al menos las dos terceras partes de los socios"'
    '&IF(N(IFERROR(INDEX(ACT_Base,$Q$1),0))>0," ("&ROUNDUP(2*INDEX(ACT_Base,$Q$1)/3,0)&" de "&INDEX(ACT_Base,$Q$1)&")","")'
    '&". Si no se reúne ese número, se convocará por segunda vez y la Asamblea se celebrará con los socios que asistan (Reglamento, art. 26).")'
    '&" Se invita a todos los socios a participar con puntualidad."',
    "X-2: quórum y segunda convocatoria (art. 26)")
cambiar_formula("LISTA DE ASISTENCIA", "B4", '&" · Total de asistentes: ________"',
    '&IF(N(IFERROR(INDEX(ACT_Base,$Q$1),0))=0,""," · Mínimo para el quórum en primera convocatoria (dos terceras partes, art. 26): "'
    '&ROUNDUP(2*INDEX(ACT_Base,$Q$1)/3,0))&IF(IFERROR(INDEX(ACT_Convoc,$Q$1)&"","")="2.ª"," · Segunda convocatoria","")'
    '&" · Total de asistentes: ________"',
    "X-2: mínimo para el quórum")

# ---------- X-4: CATÁLOGO DE ACTAS ----------
H = "CATÁLOGO DE ACTAS"
sustituir_en(H, "B2", "No significa que existan 28 formatos oficiales",
             "Reúne 30 actas posibles: 28 identificadas en la normativa y 2 operativas de la Zona Escolar. No significa que existan 30 formatos oficiales",
             "X-4: 30 actas")
for ref, texto in {
    "E7": "Arts. 23, 24, 27 y 35; formato de las Orientaciones 2025-2026",
    "F7": "Obligatoria: mínimo dos por ciclo, en el primer y en el último mes (art. 24) + formato de las Orientaciones",
    "E8": "Art. 47; Orientaciones 2025-2026",
    "E9": "Arts. 23, fr. X y XII, y 48; Orientaciones 2025-2026",
    "E14": "Arts. 23, fr. IV, y 28, fr. XV",
    "E15": "Arts. 23, fr. VI, y 28, fr. VI",
    "E16": "Arts. 23, fr. VII, 43 y 51",
    "E22": "Arts. 28 y 29",
    "F22": "OBLIGATORIA: acta de cada sesión",
    "E23": "Arts. 31 y 32",
    "E24": "Arts. 24, 31 y 32 (puede convocar a Asamblea si el Consejo omite hacerlo)",
    "F24": "OBLIGATORIA: acta de cada sesión",
    "E25": "Arts. 33 y 34",
    "E26": "Art. 21, inciso e); acuerdo de la Asamblea que la crea",
    "E30": "Arts. 28, fr. VIII, y 35",
    "E31": "Art. 28, fr. VIII",
    "B64": ("8. Asambleas Generales Ordinarias: como mínimo dos por ciclo, una en el primer mes y otra en el último del año "
            "escolar (Reglamento, art. 24). La primera admite a los socios nuevos, elige a los órganos de gobierno y control "
            "(sin reelección en el mismo cargo, art. 35) y recibe la entrega del Consejo saliente; después se hace el cambio de "
            "firmas en el banco (art. 52). La de fin de ciclo se registra como «ASAMBLEA GENERAL · Otros acuerdos», carácter "
            "Ordinaria, asunto «Aprobación de los informes contables y de actividades»."),
    "B65": ("9. Quórum y socios en el acta: la Asamblea queda instalada en primera convocatoria con al menos las dos terceras "
            "partes de los socios o de sus representantes; si no se reúnen, se convoca por segunda vez y se celebra con los que "
            "asistan; el empate lo decide el voto de calidad de quien preside (Reglamento, art. 26). En CAPTURA ACTAS se anotan "
            "los socios presentes (L) y la convocatoria (AC); M calcula los socios de ese día (antes de la Ordinaria no cuentan "
            "los nuevos; para un acta del ciclo anterior, columna X) y AD, el quórum."),
}.items():
    poner_texto(H, ref, texto, "X-4: cotejo con el Reglamento (DOF, 23/04/1982)")

for ref, numero in (("B34", 29), ("B35", 30)):
    xml = leer(H)
    m = re.search(r'<c r="%s"((?: [^>]*?)?)(?:/>|>.*?</c>)' % ref, xml, re.S)
    attrs = re.sub(r' t="[^"]*"', "", m.group(1))
    escribir(H, xml[:m.start()] + f'<c r="{ref}"{attrs}><v>{numero}</v></c>' + xml[m.end():])
    cambios.append((f"{H}!{ref}", "X-4: numeración 29 y 30"))

# ---------- X-5: citas por apartado ----------
sustituir_en("INGRESA DATOS", "D17", "(Orientaciones, p. 13)", "(Orientaciones 2025-2026, «Apoyo del 10 %», inciso a)", "X-5: cita por apartado")
sustituir_en("CORTES", "B33", "(Orientaciones, p. 14)", "(Orientaciones 2025-2026)", "X-5: cita sin página")
sustituir_en("ACTA CARGO VACANTE", "G17", "(Orientaciones, pp. 5 y 18)", "(Orientaciones 2025-2026; firmas mancomunadas, Reglamento, art. 52)", "X-5: cita por apartado")
sustituir_en("ACTA RECONOCIMIENTO", "G8", "(Orientaciones, p. 7).",
             "(Orientaciones 2025-2026, «Reconocimiento de gastos»). Capture en CAPTURA ACTAS, columnas AE y AF, el tipo de emergencia y el motivo de la urgencia.",
             "X-3/X-5: cita por apartado y aviso de captura")
sustituir_en("INSTRUCCIONES", "C18", "4) Imprima la hoja ACTA …",
             "4) Quórum (Reglamento, art. 26): en primera convocatoria se requieren las dos terceras partes de los socios; si no se "
             "reúnen, se convoca por segunda vez y la Asamblea se celebra con los que asistan. Marque la convocatoria en CAPTURA ACTAS, "
             "columna AC; la columna AD muestra el quórum y el acta lo redacta sola. En el reconocimiento de gastos capture el tipo de "
             "emergencia y el motivo de la urgencia (columnas AE y AF).\n5) Imprima la hoja ACTA …",
             "X-2: instrucción del quórum")

# El libro ya recalcula al abrir (fullCalcOnLoad del 21/10); se comprueba.
if 'fullCalcOnLoad="1"' not in contenido["xl/workbook.xml"].decode("utf-8"):
    raise SystemExit("El libro no recalcula al abrir")

with zipfile.ZipFile(DESTINO, "w", zipfile.ZIP_DEFLATED) as salida:
    for info in z.infolist():
        salida.writestr(info, contenido[info.filename], compress_type=zipfile.ZIP_DEFLATED)

for donde, motivo in cambios:
    print(f"- {donde}: {motivo}")
print(f"Total: {len(cambios)} cambios")
