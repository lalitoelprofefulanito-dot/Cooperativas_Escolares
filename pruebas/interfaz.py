"""Pruebas de la interfaz en Chromium (Playwright). Uso:
python3 pruebas/interfaz.py URL_DE_LA_APP carpeta_para_descargas
La URL puede ser el archivo único (dist/cooperativa-escolar.html) o index.html de la versión GitHub."""
import asyncio, json, pathlib, sys
from playwright.async_api import async_playwright

URL = sys.argv[1]
DESCARGAS = pathlib.Path(sys.argv[2]); DESCARGAS.mkdir(parents=True, exist_ok=True)
FICTICIO = pathlib.Path(__file__).resolve().parent.parent / "ejemplos" / "respaldo-ficticio.json"
resultados = []


def revisar(nombre, condicion, detalle=""):
    resultados.append((nombre, bool(condicion), detalle))
    print(("OK   " if condicion else "FALLA") + f" {nombre} {detalle}")


async def escribir(pg, ruta, texto):
    sel = f'[data-ruta="{ruta}"]'
    await pg.fill(sel, texto)
    await pg.press(sel, "Tab")
    await pg.wait_for_timeout(250)


async def msg(pg, ruta):
    return await pg.evaluate(f'(() => {{ const el = document.querySelector(\'[data-ruta="{ruta}"]\'); return document.getElementById(el.id + "-m").textContent; }})()')


async def calc(pg, clave):
    return (await pg.text_content(f'[data-calc="{clave}"]')).strip()


async def principal(p, sin_indexeddb=False):
    nav = await p.chromium.launch()
    ctx = await nav.new_context(viewport={"width": 1280, "height": 900}, accept_downloads=True, locale="es-MX")
    if sin_indexeddb:
        await ctx.add_init_script("Object.defineProperty(window, 'indexedDB', { value: undefined });")
    pg = await ctx.new_page()
    errores = []
    pg.on("pageerror", lambda e: errores.append(str(e)))
    pg.on("console", lambda m: errores.append(m.text) if m.type == "error" else None)
    await pg.goto(URL)
    return nav, ctx, pg, errores


async def entrar(pg):
    await pg.fill("#clave", "0000"); await pg.click("button[type=submit]")
    await pg.wait_for_selector("#contenido h1")


async def pruebas():
    async with async_playwright() as p:
        nav, ctx, pg, errores = await principal(p)
        # Acceso
        await pg.fill("#clave", "1111"); await pg.click("button[type=submit]")
        revisar("Contraseña incorrecta rechazada", await pg.text_content("#error-clave") == "Contraseña incorrecta.")
        await entrar(pg)
        revisar("Entra con 0000", await pg.is_hidden("#acceso") and await pg.is_visible("#app"))
        revisar("Nota de candado de cortesía en el acceso", "no una medida de seguridad" in await pg.inner_text("#nota-clave"))

        # Datos del ciclo: guardado, aviso no bloqueante, error de tipo, calendario
        await pg.goto(URL + "#/ciclo"); await pg.wait_for_timeout(300)
        await escribir(pg, "ciclo.escuela", "Escuela de Prueba")
        revisar("Indicador «Guardado ✓»", "Guardado ✓" in await pg.text_content("#guardado"))
        await escribir(pg, "ciclo.primerDia", "1/9/2026")
        revisar("Primer día en martes: aviso del Excel sin bloquear", "debe ser un lunes" in await msg(pg, "ciclo.primerDia"))
        revisar("…y el dato sí se guardó", await pg.input_value('[data-ruta="ciclo.primerDia"]') == "01/09/2026")
        await escribir(pg, "ciclo.primerDia", "31/08/2026")
        revisar("Aviso desaparece al corregir", await msg(pg, "ciclo.primerDia") == "")
        await escribir(pg, "ciclo.ultimoDia", "31/02/2027")
        revisar("Fecha inexistente rechazada", "no se guardó" in await msg(pg, "ciclo.ultimoDia"))
        revisar("…y conserva el valor anterior", await pg.input_value('[data-ruta="ciclo.ultimoDia"]') == "09/07/2027")
        revisar("Calendario: 41 semanas y 185 días (plantilla del 31/10/2026)", "Días con venta: 185" in await pg.inner_text('[data-calc="calendario"]')
                and "Semanas de venta: 41" in await pg.inner_text('[data-calc="calendario"]'))
        await escribir(pg, "ciclo.periodos.20.desde", "05/10/2026"); await escribir(pg, "ciclo.periodos.20.hasta", "09/10/2026")
        await escribir(pg, "ciclo.periodos.20.motivo", "Semana de prueba sin venta")
        revisar("Periodo nuevo recalcula el calendario", "Días con venta: 180" in await pg.inner_text('[data-calc="calendario"]')
                and "Semanas de venta: 40" in await pg.inner_text('[data-calc="calendario"]'))
        await escribir(pg, "ciclo.periodos.21.desde", "10/10/2026"); await escribir(pg, "ciclo.periodos.21.hasta", "09/10/2026")
        revisar("Hasta anterior a Desde: aviso", "igual o posterior" in await msg(pg, "ciclo.periodos.21.hasta"))
        await escribir(pg, "ciclo.efectivoAnterior", "$1,234.5")
        revisar("Importe con formato $1,234.50", await pg.input_value('[data-ruta="ciclo.efectivoAnterior"]') == "$1,234.50")
        await escribir(pg, "ciclo.efectivoAnterior", "12,50")
        revisar("Coma decimal del teléfono: 12,50 se lee como $12.50", await pg.input_value('[data-ruta="ciclo.efectivoAnterior"]') == "$12.50")
        await escribir(pg, "ciclo.socios", "12.5")
        revisar("Entero con decimales rechazado", "no se guardó" in await msg(pg, "ciclo.socios"))

        # Campo propuesto (INGRESA DATOS E24)
        ruta = "ciclo.firmantes.4.saliente"
        revisar("Propuesta visible en gris", "propuesto" in (await pg.get_attribute(f'[data-ruta="{ruta}"]', "class") or ""))
        await escribir(pg, ruta, "Texto a mano")
        boton = pg.locator(f'[data-restablecer="{ruta}"]')
        revisar("Al escribir encima aparece «Restablecer propuesta»", await boton.is_visible())
        await boton.click(); await pg.wait_for_timeout(250)
        revisar("Restablecer vuelve a la propuesta", (await pg.input_value(f'[data-ruta="{ruta}"]')).startswith("Cambio de Consejo"))

        # Catálogos: lista dependiente, control del historial, duplicado y bloqueo de «Fecha sugerida»
        await pg.goto(URL + "#/catalogos"); await pg.wait_for_timeout(300)
        await escribir(pg, "catalogos.productos.0.nombre", "TORTA")
        await pg.wait_for_timeout(300)
        opciones = await pg.eval_on_selector('[data-ruta="catalogos.historial.0.producto"]', "s => [...s.options].map(o => o.value)")
        revisar("Historial ofrece el producto nuevo y el AGUA", "TORTA" in opciones and "AGUA" in opciones, str(opciones))
        await pg.select_option('[data-ruta="catalogos.historial.0.producto"]', "TORTA"); await pg.wait_for_timeout(250)
        revisar("Control del historial", await calc(pg, "hist.0") == "Falta fecha. Falta precio. Falta costo.")
        await escribir(pg, "catalogos.historial.0.fecha", "31/08/2026"); await escribir(pg, "catalogos.historial.0.precio", "18")
        await escribir(pg, "catalogos.historial.0.costo", "14")
        revisar("Historial completo sin control", await calc(pg, "hist.0") == "")
        await pg.select_option('[data-ruta="catalogos.historial.1.producto"]', "TORTA"); await pg.wait_for_timeout(200)
        await escribir(pg, "catalogos.historial.1.fecha", "31/08/2026")
        revisar("Aviso de precio duplicado en la misma fecha", "promedia" in await calc(pg, "hist.1"))
        await escribir(pg, "catalogos.productos.1.nombre", "torta")
        revisar("Producto repetido: aviso (sin distinguir mayúsculas)", "ya existe" in await msg(pg, "catalogos.productos.1.nombre"))
        clases = await pg.eval_on_selector('[data-ruta="catalogos.conceptos.23.clasificacion"]', "s => [s.value, ...[...s.options].map(o => o.value)]")
        revisar("Fondo repartible con clasificación propia (Reglamento, art. 49)", clases[0] == "Entrega del fondo repartible"
                and "Devolución de certificados de aportación" in clases, str(clases[:1]))

        # Socios
        await pg.goto(URL + "#/socios"); await pg.wait_for_timeout(300)
        await escribir(pg, "socios.lista.0.nombre", "Persona Ficticia")
        revisar("Control del socio", await calc(pg, "soc.0.control") == "Marque si es socio.")
        await pg.select_option('[data-ruta="socios.lista.0.socio"]', "Sí"); await pg.wait_for_timeout(250)
        revisar("Falta el tipo", await calc(pg, "soc.0.control") == "Falta el tipo.")
        await pg.select_option('[data-ruta="socios.lista.0.tipo"]', "Alumno"); await pg.wait_for_timeout(250)
        revisar("Conteo de activos", await calc(pg, "activos") == "1" and await calc(pg, "alumnos") == "1")
        await escribir(pg, "socios.lista.0.alta", "texto")
        revisar("Fecha inválida en socios rechazada", "no se guardó" in await msg(pg, "socios.lista.0.alta"))
        revisar("Aviso de certificado en $0", "$0.00" in await calc(pg, "avisoCertificado"))
        revisar("Valor del certificado visible en el resumen (art. 43)", await calc(pg, "certificado") == "$0.00")
        filas_antes = await pg.locator("table.padron tbody tr").count()
        await pg.click('[data-agregar="socios"]'); await pg.wait_for_timeout(250)
        revisar("Mostrar 10 renglones más", await pg.locator("table.padron tbody tr").count() >= filas_antes + 10)

        # Persistencia: recarga la página (la sesión sigue abierta en la pestaña)
        await pg.reload(); await pg.wait_for_selector("#contenido h1"); await pg.goto(URL + "#/socios"); await pg.wait_for_timeout(300)
        revisar("Los datos persisten al recargar", await pg.input_value('[data-ruta="socios.lista.0.nombre"]') == "Persona Ficticia")
        revisar("Recordatorio de respaldo visible", await pg.is_visible("#recordatorio"))

        # Respaldo: exportar
        async with pg.expect_download() as d:
            await pg.click('#recordatorio [data-global="exportar"]')
        descarga = await d.value
        archivo = DESCARGAS / descarga.suggested_filename
        await descarga.save_as(archivo)
        datos = json.loads(archivo.read_text(encoding="utf-8"))
        revisar("Respaldo .json con fecha en el nombre", descarga.suggested_filename.startswith("respaldo-cooperativa_2"), descarga.suggested_filename)
        revisar("Respaldo contiene lo capturado", datos["expedientes"][0]["socios"]["lista"][0]["nombre"] == "Persona Ficticia")
        revisar("Recordatorio se oculta tras el respaldo", await pg.is_hidden("#recordatorio"))

        # Importar el respaldo ficticio (2 expedientes)
        await pg.goto(URL + "#/expedientes"); await pg.wait_for_timeout(300)
        await pg.set_input_files('[data-accion-archivo="importar"]', str(FICTICIO)); await pg.wait_for_timeout(400)
        texto_dlg = await pg.inner_text("dialog")
        revisar("Resumen antes de importar", "30 socios" in texto_dlg and "Nuevo" in texto_dlg)
        await pg.click("dialog button:text-is(\"Importar\")"); await pg.wait_for_timeout(500)
        opciones = await pg.eval_on_selector("#selector-exp", "s => [...s.options].map(o => o.textContent)")
        revisar("Se importaron 2 expedientes", len(opciones) == 3, str(opciones))
        await pg.select_option("#selector-exp", "ficticio-B"); await pg.wait_for_timeout(300)
        await pg.goto(URL + "#/tablero"); await pg.wait_for_timeout(300)
        tabla = await pg.inner_text('[data-calc="controles"]')
        revisar("Tablero del expediente B con controles en REVISAR", tabla.count("REVISAR") == 4, tabla.replace("\n", " | ")[:300])

        # Duplicar como base del siguiente ciclo
        await pg.select_option("#selector-exp", "ficticio-A"); await pg.wait_for_timeout(200)
        await pg.goto(URL + "#/expedientes"); await pg.wait_for_timeout(300)
        await pg.click('[data-accion="duplicar"][data-id="ficticio-A"]'); await pg.wait_for_timeout(300)
        revisar("Ciclo sugerido 2027-2028", await pg.input_value("#dup-ciclo") == "2027-2028")
        await pg.click("dialog >> text=Crear expediente"); await pg.wait_for_timeout(500)
        await pg.goto(URL + "#/ciclo"); await pg.wait_for_timeout(300)
        revisar("Duplicado: nombres pasan a Consejo saliente", await pg.input_value('[data-ruta="ciclo.firmantes.0.saliente"]') == "Presidente Ficticio")
        revisar("Duplicado: fechas del ciclo vacías", await pg.input_value('[data-ruta="ciclo.primerDia"]') == "")
        revisar("Duplicado: conserva la escuela", (await pg.input_value('[data-ruta="ciclo.escuela"]')).startswith("Ficticia"))

        # Borrar
        await pg.goto(URL + "#/expedientes"); await pg.wait_for_timeout(300)
        n_antes = await pg.locator("#contenido table tbody tr").count()
        await pg.click('[data-accion="borrar"][data-id="ficticio-B"]'); await pg.wait_for_timeout(200)
        await pg.click("dialog >> text=Borrar definitivamente"); await pg.wait_for_timeout(400)
        revisar("Borrar expediente", await pg.locator("#contenido table tbody tr").count() == n_antes - 1)

        # Salir
        await pg.click("#salir")
        revisar("Salir regresa al acceso", await pg.is_visible("#acceso"))
        await entrar(pg)

        # Pantalla angosta (tableta vertical)
        await pg.set_viewport_size({"width": 768, "height": 1024}); await pg.goto(URL + "#/socios"); await pg.wait_for_timeout(300)
        ancho = await pg.evaluate("[document.documentElement.scrollWidth, window.innerWidth]")
        revisar("Sin desplazamiento horizontal de la página en 768 px", ancho[0] <= ancho[1], str(ancho))
        await pg.click("#boton-menu"); await pg.wait_for_timeout(300)
        revisar("Menú desplegable en pantalla angosta", await pg.is_visible('#menu a[data-id="catalogos"]'))
        await pg.screenshot(path=str(DESCARGAS / "tableta.png"))
        revisar("Sin errores de JavaScript", not errores, str(errores))
        await nav.close()

        # Respaldo con localStorage cuando IndexedDB no existe
        nav, ctx, pg, errores = await principal(p, sin_indexeddb=True)
        await entrar(pg)
        await pg.goto(URL + "#/ciclo"); await pg.wait_for_timeout(300)
        await escribir(pg, "ciclo.escuela", "Sin IndexedDB")
        await pg.reload(); await pg.wait_for_selector("#contenido h1"); await pg.goto(URL + "#/ciclo"); await pg.wait_for_timeout(300)
        revisar("Funciona con localStorage si falta IndexedDB", await pg.input_value('[data-ruta="ciclo.escuela"]') == "Sin IndexedDB")
        revisar("Sin errores de JavaScript (localStorage)", not errores, str(errores))
        await nav.close()

    fallas = [r for r in resultados if not r[1]]
    print(f"\n{len(resultados) - len(fallas)} de {len(resultados)} pruebas correctas")
    return 1 if fallas else 0


sys.exit(asyncio.run(pruebas()))
