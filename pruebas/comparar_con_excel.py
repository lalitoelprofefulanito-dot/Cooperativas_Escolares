"""Compara la app contra el Excel con los mismos datos ficticios.
1) Escribe las celdas de captura de cada expediente del respaldo en una copia de la plantilla.
2) LibreOffice (sin pantalla) recalcula el libro completo.
3) La app calcula lo mismo en Node (pruebas/calcular_app.js).
4) Se comparan celda por celda y se escribe un informe en Markdown.
Uso: python3 pruebas/comparar_con_excel.py ejemplos/respaldo-ficticio.json salida/  (requiere LibreOffice, Node y openpyxl)"""
import datetime as dt, json, pathlib, subprocess, sys, warnings
import openpyxl

warnings.filterwarnings("ignore")
RAIZ = pathlib.Path(__file__).resolve().parent.parent
PLANTILLA = RAIZ / "plantilla" / "Control_de_Cooperativas_Escolares_CDMX.xlsx"
RESPALDO = pathlib.Path(sys.argv[1])
SALIDA = pathlib.Path(sys.argv[2]); SALIDA.mkdir(parents=True, exist_ok=True)
HOY = dt.date.today().isoformat()
BASE = dt.date(1899, 12, 30)


def valor_excel(v, fecha=False):
    if v == "" or v is None:
        return None
    if fecha:
        return dt.datetime.fromisoformat(v)
    return v


def escribir(ws, celda, v, fecha=False):
    ws[celda].value = valor_excel(v, fecha)


def llenar(libro, e):
    """Celdas de captura de la Fase 1 (INGRESA DATOS, CATÁLOGOS, SOCIOS, PROVEEDORES)."""
    ws = libro["INGRESA DATOS"]; c = e["ciclo"]
    for celda, k, fecha in [("C5", "ciclo", 0), ("C6", "primerDia", 1), ("C7", "ultimoDia", 1), ("C8", "escuela", 0), ("C9", "cct", 0),
                            ("C10", "cooperativa", 0), ("C11", "clave", 0), ("C12", "registro", 0), ("C13", "socios", 0),
                            ("C14", "efectivoAnterior", 0), ("C15", "ciudad", 0), ("C16", "diasClase", 0), ("C17", "fotocopiadora", 0)]:
        escribir(ws, celda, c[k], fecha)
    for i, f in enumerate(c["firmantes"]):
        escribir(ws, f"C{20 + i}", f["nombre"]); escribir(ws, f"D{20 + i}", f["cargo"])
        if f["saliente"] is not None:
            escribir(ws, f"E{20 + i}", f["saliente"])
    for celda, k in [("C27", "nombre"), ("C28", "domicilio"), ("C29", "rfc"), ("C30", "telefono")]:
        escribir(ws, celda, c["proveedor"][k])
    for i, p in enumerate(c["periodos"]):
        r = 34 + i
        escribir(ws, f"B{r}", p["desde"], True); escribir(ws, f"C{r}", p["hasta"], True)
        escribir(ws, f"D{r}", p["motivo"]); escribir(ws, f"E{r}", p["fuente"])
    ws = libro["CATÁLOGOS"]; cat = e["catalogos"]
    for i, p in enumerate(cat["productos"]):
        if i == 6:
            continue
        r = 6 + i if i < 6 else 13
        escribir(ws, f"C{r}", p["nombre"]); escribir(ws, f"D{r}", p["origen"]); escribir(ws, f"E{r}", p["observacion"])
    for i, h in enumerate(cat["historial"]):
        r = 20 + i
        escribir(ws, f"B{r}", h["producto"]); escribir(ws, f"C{r}", h["fecha"], True); escribir(ws, f"D{r}", h["precio"])
        escribir(ws, f"E{r}", h["costo"]); escribir(ws, f"F{r}", h["fuente"])
    for i, k in enumerate(cat["conceptos"]):
        r = 6 + i
        for col, campo in zip("IJKLNOPQ", ["concepto", "clasificacion", "importeRef", "observacion", "tratamiento", "fechaSugerida", "detalle", "persona"]):
            escribir(ws, f"{col}{r}", k[campo])
    ws = libro["SOCIOS"]
    escribir(ws, "H3", e["socios"]["usarPadron"])
    columnas = list(zip("CDEFGHIJKLMNO", ["nombre", "tipo", "grupo", "socio", "nuevo", "alta", "certificado", "baja", "devuelto",
                                          "fechaDevolucion", "tutor", "frEntregado", "observaciones"]))
    for i, s in enumerate(e["socios"]["lista"]):
        for col, campo in columnas:
            escribir(ws, f"{col}{7 + i}", s[campo], campo in ("alta", "baja", "fechaDevolucion"))
    ws = libro["PROVEEDORES"]
    for i, p in enumerate(e["proveedores"]):
        r = 7 + i
        if i > 0:
            for col, campo in zip("CEFG", ["nombre", "domicilio", "rfc", "telefono"]):
                escribir(ws, f"{col}{r}", p[campo])
        escribir(ws, f"D{r}", p["productos"]); escribir(ws, f"H{r}", p["ine"]); escribir(ws, f"J{r}", p["vigencia"], True)
        escribir(ws, f"L{r}", p["observaciones"])
        if p["fechaFirma"] is not None:
            escribir(ws, f"I{r}", p["fechaFirma"], True)


def recalcular(origen, destino):
    """Abre el libro en LibreOffice, recalcula todo y lo guarda como .xlsx con los valores."""
    perfil = SALIDA / "perfil-lo"
    macro = SALIDA / "recalcular_uno.py"
    macro.write_text(f'''
import uno, time, subprocess
from com.sun.star.beans import PropertyValue
p = subprocess.Popen(["soffice", "--headless", "--norestore", "-env:UserInstallation=file://{perfil}",
                      "--accept=socket,host=127.0.0.1,port=2083;urp;"])
ctx = None
for _ in range(60):
    try:
        local = uno.getComponentContext()
        res = local.ServiceManager.createInstanceWithContext("com.sun.star.bridge.UnoUrlResolver", local)
        ctx = res.resolve("uno:socket,host=127.0.0.1,port=2083;urp;StarOffice.ComponentContext"); break
    except Exception:
        time.sleep(1)
smgr = ctx.ServiceManager
desk = smgr.createInstanceWithContext("com.sun.star.frame.Desktop", ctx)
def pv(n, v):
    x = PropertyValue(); x.Name = n; x.Value = v; return x
doc = desk.loadComponentFromURL(uno.systemPathToFileUrl("{origen}"), "_blank", 0, (pv("Hidden", True),))
doc.calculateAll()
doc.storeToURL(uno.systemPathToFileUrl("{destino}"), (pv("FilterName", "Calc MS Excel 2007 XML"),))
doc.close(True)
try:
    desk.terminate()
except Exception:
    pass
p.wait(timeout=30)
''')
    subprocess.run(["python3", str(macro)], check=True, timeout=600)


def normalizar(v):
    if isinstance(v, dt.datetime):
        return (v.date() - BASE).days
    if isinstance(v, float) and v.is_integer():
        return int(v)
    return "" if v is None else v


def main():
    respaldo = json.loads(RESPALDO.read_text(encoding="utf-8"))
    app = json.loads(subprocess.run(["node", str(RAIZ / "pruebas" / "calcular_app.js"), str(RESPALDO), HOY],
                                    check=True, capture_output=True, text=True).stdout)
    informe = [f"# Comparación app contra Excel — Fase 1", "",
               f"Fecha de referencia («hoy»): {HOY}. Excel recalculado por LibreOffice a partir de la plantilla corregida.", ""]
    total_dif = 0
    for e, calc in zip(respaldo["expedientes"], app):
        libro = openpyxl.load_workbook(PLANTILLA)
        llenar(libro, e)
        entrada = SALIDA / f"{e['id']}_captura.xlsx"; recalculado = SALIDA / f"{e['id']}_recalculado.xlsx"
        libro.save(entrada)
        recalcular(entrada, recalculado)
        valores = openpyxl.load_workbook(recalculado, data_only=True)
        difs = []
        por_hoja = {}
        for clave, esperado_app in calc["celdas"].items():
            hoja, celda = clave.split("!")
            excel = normalizar(valores[hoja][celda].value)
            appv = normalizar(esperado_app)
            if isinstance(excel, (int, float)) and isinstance(appv, (int, float)):
                igual = abs(excel - appv) < 1e-9
            else:
                igual = str(excel) == str(appv)
            por_hoja.setdefault(hoja, [0, 0]); por_hoja[hoja][0] += 1
            if not igual:
                por_hoja[hoja][1] += 1
                difs.append((clave, excel, appv))
        total_dif += len(difs)
        informe += [f"## Expediente {e['id']} · {e['ciclo']['ciclo']}", "", "| Hoja | Celdas comparadas | Diferencias |", "|---|---:|---:|"]
        informe += [f"| {h} | {n} | {d} |" for h, (n, d) in por_hoja.items()]
        informe.append("")
        if difs:
            informe += ["| Celda | Excel | App |", "|---|---|---|"] + [f"| {c} | {x!r} | {y!r} |" for c, x, y in difs[:200]]
            informe.append("")
    informe.append(f"**Total de diferencias: {total_dif}**")
    (SALIDA / "comparacion.md").write_text("\n".join(informe), encoding="utf-8")
    print("\n".join(informe))
    return 1 if total_dif else 0


if __name__ == "__main__":
    sys.exit(main())
