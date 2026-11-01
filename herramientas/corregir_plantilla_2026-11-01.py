"""Corrige el libro «Control de Cooperativas Escolares CDMX» del 31/10/2026 (SHA-256 8581bd39…8806db4)
y produce la versión del 01/11/2026. Edita directamente el XML del .xlsx para no perder imágenes,
gráfica, notas ni protección. Uso:

    python3 corregir_plantilla_2026-11-01.py ORIGEN_31-10.xlsx DESTINO_01-11.xlsx

Regla vigente desde el 01/11/2026: cuando el Excel y la Guía de Actas de Cooperativa Escolar (apegada al
Reglamento de Cooperativas Escolares y a las Orientaciones de la AEFCM) no coinciden, manda la Guía.

Correcciones:
  X-6  Fondos (Reglamento, arts. 41, 43 y 46 a 49). El fondo repartible entregado y los certificados devueltos
       tienen clasificación propia («Entrega del fondo repartible», folio RP; «Devolución de certificados de
       aportación», folio DC). Siguen en la columna del libro oficial «Gastos con cargo al fondo de reserva,
       certificados devueltos y fondo repartible», pero ya no reducen el saldo del fondo de reserva en CORTES.
  X-7  Quórum: la nota de CAPTURA ACTAS L13 decía «al menos 30 %»; ahora cita el art. 26 (dos terceras partes).
  X-8  Citas por apartado en lugar de página (CORTES B34 y B35, RESUMEN Y CONTROLES E17, notas de CATÁLOGOS N5
       y CAPTURA ACTAS V13) y lista de prefijos de folio en INSTRUCCIONES C15.
"""
import hashlib, html, re, sys, zipfile

ORIGEN, DESTINO = sys.argv[1], sys.argv[2]
SHA_ORIGEN = "8581bd390df105c52a6c0513afafdce5953bcadc3d0afefb12ddf908e8806db4"
if hashlib.sha256(open(ORIGEN, "rb").read()).hexdigest() != SHA_ORIGEN:
    raise SystemExit("El origen no es el libro del 31/10/2026 (SHA-256 distinto).")

z = zipfile.ZipFile(ORIGEN)
contenido = {n: z.read(n) for n in z.namelist()}
cambios = []

# ---------- utilidades (las mismas del script del 31/10) ----------
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
    m = re.search(r'<c r="%s"(?: [^>]*)?><f(?: [^>/]*)?>(.*?)</f>' % ref, xml, re.S)  # admite <f ca="1">
    if not m:
        raise SystemExit(f"No se encontró la fórmula de {ref}")
    return m, html.unescape(m.group(1))

def cambiar_formula(hoja, ref, viejo, nuevo, motivo):
    xml = leer(hoja)
    m, f = formula(xml, ref)
    if f.count(viejo) != 1:
        raise SystemExit(f"{hoja}!{ref}: se esperaba una aparición de {viejo[:70]!r} y hay {f.count(viejo)}")
    xml = xml[:m.start(1)] + esc(f.replace(viejo, nuevo)) + xml[m.end(1):]
    escribir(hoja, xml)
    cambios.append((f"{hoja}!{ref}", motivo))

def poner_formula(hoja, ref, viejo_exacto, nueva, motivo):
    xml = leer(hoja)
    m, f = formula(xml, ref)
    if f != viejo_exacto:
        raise SystemExit(f"{hoja}!{ref}: fórmula inesperada {f!r}")
    escribir(hoja, xml[:m.start(1)] + esc(nueva) + xml[m.end(1):])
    cambios.append((f"{hoja}!{ref}", motivo))

def poner_texto(hoja, ref, texto, motivo, estilo=None):
    """Sustituye el contenido de una celda por un texto (cadena en línea). Si la celda no existe, la crea al final
    de su renglón (solo para columnas posteriores a las existentes)."""
    xml = leer(hoja)
    m = re.search(r'<c r="%s"((?: [^>]*?)?)(?:/>|>.*?</c>)' % ref, xml, re.S)
    if m:
        attrs = re.sub(r' t="[^"]*"', "", m.group(1))
        if estilo is not None:
            attrs = re.sub(r' s="\d+"', "", attrs) + f' s="{estilo}"'
        nuevo = f'<c r="{ref}"{attrs} t="inlineStr"><is><t xml:space="preserve">{esc(texto)}</t></is></c>'
        xml = xml[:m.start()] + nuevo + xml[m.end():]
    else:
        fila = int(re.search(r"\d+", ref).group(0))
        mf = re.search(r'(<row r="%d"[^>]*>)(.*?)(</row>)' % fila, xml, re.S)
        if not mf:
            raise SystemExit(f"No existe el renglón {fila} en {hoja}")
        nuevo = f'<c r="{ref}" s="{estilo}" t="inlineStr"><is><t xml:space="preserve">{esc(texto)}</t></is></c>'
        xml = xml[:mf.end(2)] + nuevo + xml[mf.end(2):]
    escribir(hoja, xml)
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

def sustituir_en_nota(archivo, viejo, nuevo, motivo):
    t = contenido[archivo].decode("utf-8")
    v, n = esc(viejo), esc(nuevo)
    if t.count(v) != 1:
        raise SystemExit(f"{archivo}: no se encontró una sola vez {viejo!r}")
    contenido[archivo] = t.replace(v, n).encode("utf-8")
    cambios.append((archivo, motivo))

# ---------- X-6: clasificaciones propias del fondo repartible y de los certificados ----------
RESERVA = "Gasto con cargo al fondo de reserva"
REPARTIBLE = "Entrega del fondo repartible"
CERTIFICADOS = "Devolución de certificados de aportación"
H = "CATÁLOGOS"

for fila, (clase, prefijo) in ((55, (REPARTIBLE, "RP")), (56, (CERTIFICADOS, "DC"))):
    poner_texto(H, f"I{fila}", clase, "X-6: clasificación nueva (Reglamento, arts. 43 y 49)", estilo=117)
    poner_texto(H, f"J{fila}", "EGRESO", "X-6: tipo de la clasificación nueva", estilo=116)
    poner_texto(H, f"K{fila}", prefijo, "X-6: prefijo de folio de la clasificación nueva", estilo=116)

for ref, concepto, clase in (("29", "ENTREGA DEL FONDO REPARTIBLE A LOS SOCIOS", REPARTIBLE),
                             ("30", "DEVOLUCIÓN DE CERTIFICADOS DE APORTACIÓN", CERTIFICADOS)):
    if texto_actual(H, f"I{ref}") != concepto or texto_actual(H, f"J{ref}") != RESERVA:
        raise SystemExit(f"CATÁLOGOS fila {ref}: no es el concepto esperado")
    poner_texto(H, f"J{ref}", clase, f"X-6: {concepto} con clasificación propia")

wb = contenido["xl/workbook.xml"].decode("utf-8")
for nombre, col in (("CAT_Clases", "I"), ("CAT_ClaseTipo", "J"), ("CAT_ClasePref", "K")):
    viejo = f'<definedName name="{nombre}">CATÁLOGOS!${col}$50:${col}$54</definedName>'
    if wb.count(viejo) != 1:
        raise SystemExit(f"Nombre {nombre}: definición inesperada")
    wb = wb.replace(viejo, f'<definedName name="{nombre}">CATÁLOGOS!${col}$50:${col}$56</definedName>')
if 'name="MOV_Clase"' in wb:
    raise SystemExit("El nombre MOV_Clase ya existe")
wb = wb.replace("</definedNames>", "<definedName name=\"MOV_Clase\">'REGISTRO DE GASTOS'!$L$6:$L$405</definedName></definedNames>", 1)
contenido["xl/workbook.xml"] = wb.encode("utf-8")
cambios.append(("Libro", "X-6: CAT_Clases, CAT_ClaseTipo y CAT_ClasePref hasta la fila 56; nombre nuevo MOV_Clase"))

# La columna oficial del libro sigue reuniendo las tres clasificaciones.
xml = leer("AUX_LIBRO")
patron = r'IF\(\'REGISTRO DE GASTOS\'!\$L\$(\d+)="%s",' % RESERVA
def columna_oficial(m):
    r = m.group(1)
    l = f"'REGISTRO DE GASTOS'!$L${r}"
    return (f'IF(OR({l}="{RESERVA}",{l}="{REPARTIBLE}",{l}="{esc(CERTIFICADOS)}"),')
xml, n = re.subn(patron, columna_oficial, xml)
if n != 400:
    raise SystemExit(f"AUX_LIBRO: se esperaban 400 fórmulas en la columna I y hay {n}")
escribir("AUX_LIBRO", xml)
cambios.append(("AUX_LIBRO!I93:I492", "X-6: la columna oficial suma fondo de reserva, fondo repartible entregado y certificados devueltos"))

# CORTES: el saldo del fondo de reserva solo se reduce con gastos del fondo de reserva (art. 48).
for col, criterio_fecha in (("C", '"<="&C$5'), ("D", '">="&D$6,MOV_Fecha,"<="&D$5'), ("E", '">="&E$6,MOV_Fecha,"<="&E$5')):
    poner_formula("CORTES", f"{col}29", f'IF({col}21="","",N({col}12))',
                  f'IF({col}21="","",SUMIFS(MOV_Importe,MOV_VaLibro,1,MOV_Clase,"{RESERVA}",MOV_Fecha,{criterio_fecha}))',
                  "X-6: gastos del fondo de reserva sin fondo repartible ni certificados (Reglamento, arts. 46 a 49)")
sustituir_en("CORTES", "B29", "Gastos con cargo al fondo de reserva del periodo",
             "Gastos con cargo al fondo de reserva del periodo (sin fondo repartible entregado ni certificados devueltos)",
             "X-6: rótulo")

# ---------- X-7: quórum en la nota de CAPTURA ACTAS ----------
sustituir_en_nota("xl/comments3.xml", "Quórum legal: al menos 30 % de los socios (Orientaciones, p. 3).",
                  "Quórum legal: en primera convocatoria, al menos las dos terceras partes de los socios; si no se reúnen, "
                  "la Asamblea se celebra en segunda convocatoria con los que asistan (Reglamento, art. 26).",
                  "X-7: CAPTURA ACTAS L13, quórum del art. 26")
sustituir_en_nota("xl/comments3.xml", "socios representantes: cinco por cada cincuenta o fracción mayor de veinticinco.",
                  "socios representantes: cinco por cada cincuenta o fracción mayor de veinticinco (Reglamento, art. 22).",
                  "X-7: CAPTURA ACTAS L13, fundamento de los representantes")

# ---------- X-8: citas por apartado y prefijos de folio ----------
sustituir_en_nota("xl/comments3.xml", "Las Orientaciones (p. 17) piden", "Las Orientaciones 2025-2026 piden",
                  "X-8: CAPTURA ACTAS V13, cita sin página")
for viejo, nuevo in (
        ("servicios programables y fletes (Orientaciones, p. 6-7).",
         "servicios programables, fletes de libros, traslado de extintores, transporte a concursos, adquisición de bienes "
         "y gastos con cargo a los fondos social o de reserva (Orientaciones 2025-2026, «Autorización de gastos»)."),
        ("eléctricos o de seguridad (p. 7).", "eléctricos o de seguridad (Orientaciones 2025-2026, «Reconocimiento de gastos»)."),
        ("tope semanal (p. 13).", "tope del 10 % de la utilidad de la semana (Orientaciones 2025-2026, «Apoyo del 10 %»)."),
        ("sello, cuadernos (p. 17).", "sello, cuadernos (Orientaciones 2025-2026); solo recibo.")):
    sustituir_en_nota("xl/comments1.xml", viejo, nuevo, "X-8: CATÁLOGOS N5, cita por apartado")

sustituir_en("CORTES", "B34", "(p. 14)", "(Orientaciones 2025-2026)", "X-8: cita sin página")
sustituir_en("CORTES", "B35", "Fondo repartible (p. 12):", "Fondo repartible (Reglamento, arts. 46 y 49):", "X-8: cita por artículo")
sustituir_en("CORTES", "B35", "(pp. 7, 12, 13 y 17).",
             "(Reglamento, art. 47; Orientaciones 2025-2026, «Reconocimiento de gastos» y «Apoyo del 10 %»). "
             "El fondo de reserva solo se reduce con gastos clasificados «Gasto con cargo al fondo de reserva» (art. 48): "
             "el fondo repartible entregado y los certificados devueltos aparecen en la misma columna del libro, pero no lo reducen.",
             "X-6/X-8: cita por apartado y aclaración del fondo de reserva")
cambiar_formula("RESUMEN Y CONTROLES", "E17", "validación del Consejo, p. 16)", "validación del Consejo; Orientaciones 2025-2026)",
                "X-8: cita sin página")
sustituir_en("INSTRUCCIONES", "C15",
             "AC (capital social), IB (intereses), FR (fondo de reserva), FS (fondo social) y GA (gastos de administración).",
             "AC (capital social), IB (intereses), FR (fondo de reserva), RP (fondo repartible entregado), "
             "DC (certificados de aportación devueltos), FS (fondo social) y GA (gastos de administración).",
             "X-6: prefijos de folio")

if 'fullCalcOnLoad="1"' not in contenido["xl/workbook.xml"].decode("utf-8"):
    raise SystemExit("El libro no recalcula al abrir")

with zipfile.ZipFile(DESTINO, "w", zipfile.ZIP_DEFLATED) as salida:
    for info in z.infolist():
        salida.writestr(info, contenido[info.filename], compress_type=zipfile.ZIP_DEFLATED)

for donde, motivo in cambios:
    print(f"- {donde}: {motivo}")
print(f"Total: {len(cambios)} cambios")
