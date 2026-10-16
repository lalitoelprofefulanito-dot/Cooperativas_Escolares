# Cooperativa escolar · App web (fase 1)

Aplicación para llevar el registro de la cooperativa escolar a partir de la plantilla de Excel.
Tiene dos partes:

| Parte | Dónde vive | Qué contiene |
|---|---|---|
| Interfaz (`index.html`, `config.js`) | GitHub Pages | Solo código. **Ningún dato.** |
| Servidor (`apps-script/Codigo.gs`) | Google Apps Script, ligado a una hoja de Google Sheets en el Drive de la escuela | Todos los datos: ventas, precios, movimientos, usuarios y bitácora |

## Perfiles

| Perfil | Qué puede hacer |
|---|---|
| Administración | Datos del ciclo, calendario, productos, precios, conceptos y usuarios |
| Tesorería | Capturar y validar ventas de cualquier día de venta y registrar movimientos |
| Comité de Vigilancia | Consultar todo, revisar controles y marcar cada semana como revisada |
| Dirección | Consultar todo |
| Proveedor | **Solo** capturar las piezas vendidas de sus productos y el efectivo que entrega, en los días con venta abiertos según el calendario |

El proveedor ve únicamente la pantalla de captura. Puede capturar el día de hoy y los días de venta anteriores que fije la administración (2 por defecto). Los días sin venta (festivos, CTE, vacaciones) y los días futuros están bloqueados. Cuando Tesorería valida un día, el proveedor ya no puede modificarlo. Todo lo que hace cada persona queda en la bitácora.

## Instalación (una sola vez)

### 1. Hoja de cálculo y servidor
1. En Google Drive, con la cuenta de la escuela, cree una hoja de cálculo nueva: *Cooperativa 2026-2027*.
2. Menú **Extensiones › Apps Script**. Borre el contenido de `Código.gs` y pegue todo `apps-script/Codigo.gs`.
3. En **Configuración del proyecto** (engrane) active «Mostrar el archivo de manifiesto appsscript.json» y reemplace su contenido por `apps-script/appsscript.json`.
4. Guarde. Elija la función `instalar` y pulse **Ejecutar**. Autorice los permisos.
5. Abra **Registro de ejecución**: ahí aparece el **PIN del usuario `admin`**. Anótelo.
6. **Implementar › Nueva implementación › Aplicación web**:
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
7. Copie la URL que termina en `/exec`.

### 2. Interfaz en GitHub
1. Cree un repositorio nuevo, por ejemplo `cooperativa-escolar`.
2. Suba `index.html`, `config.js` y `README.md` (la carpeta `apps-script` es opcional, solo como respaldo del código).
3. Edite `config.js` y pegue la URL del paso 1.7.
4. **Settings › Pages › Branch: main / root › Save**. En un par de minutos la app queda en `https://SU-USUARIO.github.io/cooperativa-escolar/`.

### 3. Primer uso
1. Entre con `admin` y el PIN. Cámbielo en **Mi cuenta**.
2. **Ajustes**: capture los datos del ciclo, los periodos sin venta, los productos, sus precios y revise los conceptos contra la hoja CATÁLOGOS de la plantilla.
3. Cree los usuarios. Al proveedor asígnele el perfil **Proveedor** y marque sus productos; el sistema genera un PIN que debe entregarse en persona.

## Actualizar el servidor
Si cambia `Codigo.gs`: **Implementar › Administrar implementaciones › Editar (lápiz) › Versión: Nueva › Implementar**. La URL no cambia.

## Seguridad
- El repositorio puede ser público porque no contiene datos. La URL del servidor sí queda visible, pero sin usuario y PIN el servidor no entrega nada.
- Los PIN se guardan cifrados (SHA-256 con sal). Tras 5 intentos fallidos el usuario se bloquea 15 minutos. Las sesiones expiran a las 6 horas sin uso.
- Para no validar las propias cifras, la cuenta de Administración no debería ser la misma persona que captura en Tesorería.
- Respaldo: **Archivo › Descargar › Microsoft Excel** de la hoja de Google cuando se necesite.

## Pendiente para la fase 2
Compras de agua con costo por lote, actas y autorizaciones, libro de ingresos y egresos, cortes de caja e impresión de registro semanal, recibos con importe con letra y notas de remisión.
