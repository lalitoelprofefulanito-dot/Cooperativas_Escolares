# Control de Cooperativas Escolares (app web)

Aplicación web que replica el libro de Excel «Control de Cooperativas Escolares CDMX»: misma captura, mismos cálculos, mismos controles y los mismos documentos impresos. Funciona sin servidor y sin instalar nada.

> **Estado: Fase 1 de 6 (versión 0.1.3).** Ya funcionan el acceso, los expedientes por ciclo, el guardado automático, los respaldos y las pantallas Ingresa datos, Catálogos, Socios y Proveedores, con un tablero parcial. Las demás pantallas aparecen en el menú en gris con la fase en que se construyen. La versión 0.1.1 (31/10/2026) igualó los valores de la plantilla con el Excel del 31/10/2026 y aceptó la coma decimal del teclado del teléfono. La versión 0.1.2 (01/11/2026) muestra el valor del certificado de aportación en el resumen de Socios, quita código sin uso y alinea la documentación con la *Guía de Actas de Cooperativa Escolar*. La versión 0.1.3 (01/11/2026) da clasificación propia al fondo repartible entregado y a los certificados devueltos, con la plantilla del 01/11/2026. Este README se completa en la Fase 6.

## Cómo abrirla

- **Versión de un solo archivo:** haga doble clic en `dist/cooperativa-escolar.html`. Se abre en su navegador (Chrome, Edge o Firefox actuales).
- **Versión GitHub Pages:** abra `index.html` o la dirección web donde se publique.

## Contraseña

La contraseña es **0000** para todas las escuelas. Es solo un candado de cortesía, **no una medida de seguridad**: no cifra ni protege los datos. No se puede cambiar desde la app, y si alguien la cambiara en el código nadie perdería su información.

## Dónde quedan los datos

- Los datos se guardan **solo en el navegador del equipo donde se capturan** (IndexedDB; si el navegador no lo permite, en el almacenamiento local). No se envían a internet.
- Otro navegador, otro equipo, una ventana privada o abrir el archivo desde otra carpeta **no ven** esos datos.
- Si se borran los datos del navegador, se pierde la información que no tenga respaldo.

## Respaldos

1. En la barra superior elija **Respaldos** (o use el aviso amarillo cuando aparezca).
2. **Exportar respaldo (.json)** descarga un archivo con todos los expedientes, con la fecha en el nombre (por ejemplo, `respaldo-cooperativa_2026-10-21_0815.json`). Guárdelo en una memoria USB o en la nube.
3. **Importar respaldo (.json)** muestra qué contiene y qué expedientes se reemplazarían antes de confirmar.
4. La app recuerda hacer un respaldo cuando pasan 7 días o más desde el último y hay cambios.

## Expedientes (un ciclo escolar cada uno)

Igual que en el Excel se trabaja un archivo por ciclo, en la app se trabaja un expediente por ciclo. En **Respaldos › Expedientes** puede crear uno nuevo (formato vacío 2026-2027), abrir, borrar o **duplicar como base del siguiente ciclo** eligiendo qué se copia (datos de la escuela, mesa directiva como Consejo saliente, proveedor de alimentos, catálogos, proveedores y, si lo desea, el padrón).

## Código de colores (el mismo del Excel)

- **Amarillo:** campo de captura.
- **Gris en cursiva:** valor propuesto; puede escribir encima y volver a él con ↺ «Restablecer propuesta».
- **Borde naranja:** el dato no cumple una regla del Excel, pero se guarda (el Excel tampoco lo impide).
- **Borde rojo:** el dato no se guardó (fecha o número que no se puede leer, o una regla que el Excel sí bloquea).
- **Verde / rojo:** estado de los controles.
- Texto sin cuadro: dato calculado (no se captura).

## Referencia normativa

**Regla (desde el 01/11/2026):** manda la guía `docs/Guia_de_Actas_de_Cooperativa_Escolar.pdf`, apegada al Reglamento de Cooperativas Escolares (DOF, 23/04/1982) y a las Orientaciones 2025-2026 de la AEFCM. Si el Excel no coincide con la guía, primero se corrige el Excel (`herramientas/`) y después la app, que sigue replicando el Excel corregido (`plantilla/`, versión del 01/11/2026). Así se refleja en cada fase:

| Tema de la guía | Dónde está en la app | Estado |
|---|---|---|
| ¿Qué gasto necesita acta? (autorización previa, reconocimiento posterior, sin acta, apoyo del 10 % a la Dirección) | Catálogos › Conceptos, columna «Tratamiento» | Fase 1: los 25 conceptos de la plantilla coinciden con la guía |
| Tres fondos distintos: social (art. 47), de reserva (art. 48) y repartible (art. 49); los certificados son capital social (arts. 41 y 43) | Catálogos › Clasificaciones: «Entrega del fondo repartible» (RP) y «Devolución de certificados de aportación» (DC) | Fase 1 en la app; en el Excel, CORTES ya no descuenta esos pagos del fondo de reserva |
| Certificado de aportación: un solo valor, máximo $50.00 (art. 43) | Socios: validación del certificado y valor en el resumen | Fase 1 |
| Socios: alumnos, maestros y empleados (art. 36) | Socios › Tipo | Fase 1 |
| Órganos de gobierno y firmantes (Consejo, Comité de Vigilancia, Comisión de Educación Cooperativa) | Ingresa datos › Mesa directiva | Fase 1 |
| Catálogo de las 30 actas, formas de redacción, convocatoria con 5 días hábiles, quórum de dos terceras partes (art. 26), mesa de debates (art. 25), observador de la Zona, fotografía | Captura actas, Imprimir acta, Convocatoria, Lista de asistencia, Catálogo de actas | Fase 3 (en el Excel ya funciona) |
| Quórum de las sesiones del Consejo (4, art. 29) y del Comité de Vigilancia (3, art. 32), voto de calidad | Captura actas y controles | Fase 3 |

## Estructura del repositorio

```
index.html                 Versión GitHub (scripts en archivos separados)
css/estilos.css
js/formato.js              Fechas, importes y redondeo igual al de Excel
js/modelo.js               Estructura del expediente, plantilla, migraciones, duplicado
js/calculos.js             Fórmulas del Excel en JavaScript (sin interfaz)
js/almacenamiento.js       IndexedDB / localStorage y respaldos
js/ui.js                   Campos, validaciones y datos calculados
js/modulos/                Una pantalla por hoja (tablero, ciclo, catálogos, socios, proveedores, expedientes)
js/app.js                  Acceso, navegación, guardado y respaldos
dist/cooperativa-escolar.html     Versión de un solo archivo (se arma con herramientas/empaquetar.py)
plantilla/                 Plantilla de Excel (versión del 01/11/2026, sin datos)
ejemplos/respaldo-ficticio.json   Dos expedientes con datos ficticios
docs/                      Guía de Actas de Cooperativa Escolar (PDF)
herramientas/empaquetar.py Arma el archivo único dist/cooperativa-escolar.html
herramientas/corregir_plantilla_2026-10-31.py  Produce la plantilla del 31/10/2026 a partir del libro del 21/10/2026
herramientas/corregir_plantilla_2026-11-01.py  Produce la plantilla del 01/11/2026 a partir de la del 31/10/2026
pruebas/                   Comparación contra el Excel (LibreOffice) y pruebas de la interfaz (Playwright)
```

## Pruebas

```bash
node pruebas/generar_ficticios.js                                    # rehace ejemplos/respaldo-ficticio.json
python3 herramientas/empaquetar.py                                   # arma dist/cooperativa-escolar.html
python3 pruebas/comparar_con_excel.py ejemplos/respaldo-ficticio.json salida/   # app contra Excel
python3 pruebas/interfaz.py file://$PWD/dist/cooperativa-escolar.html salida/descargas
```

Para fijar la fecha de «hoy» en una prueba manual, en la consola del navegador: `localStorage.setItem('coop.fechaReferencia', '2027-03-15')` (bórrela con `localStorage.removeItem('coop.fechaReferencia')`).

Todos los datos de ejemplo son ficticios. No se incluye información de ninguna escuela real.
