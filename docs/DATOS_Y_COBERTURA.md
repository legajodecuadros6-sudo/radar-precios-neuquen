# Datos y cobertura — 30 de octubre de 2026

## Diagnóstico comprobado

- Supabase devolvió 7 productos, 14 observaciones y 0 filas de historial. Sus observaciones databan del 27 de octubre. No incluyen fuente verificable.
- El consolidado anterior tenía 67 registros: 17 de Cooperativa, 16 de VTEX y 34 valores fijos de Makro/Yaguar. El script etiquetaba estos valores fijos con la fecha de cada ejecución.
- La búsqueda anterior tomaba el primer resultado sin comparar EAN o presentación. Por ejemplo, buscar aceite Natura puede devolver una mezcla, otra capacidad o un aerosol.
- La consulta SEPA usada por el proyecto devolvió HTTP 403. El portal oficial enlaza datasets minoristas y mayoristas; no se verificó acceso operativo a esos datasets desde este entorno.
- Los códigos de producto de Supabase (prod-001, etc.) no coincidían con los identificadores locales. Se descartaban productos nuevos, se mezclaban sucursales y se mostraba un historial de ejemplo.

## Cambios

- Nuevo importador `scripts/scrapers/sync_verified_prices.py`, sin alterar el script antiguo ni borrar su información. La tarea programada usa exclusivamente el importador nuevo.
- 688 artículos/precios importados de La Coope en Casa, sucursal 124. La API `/api/locales` confirmó Neuquén, CP 8300, Sucursal del Oeste, Dr. Luis Ramón 3952 y coordenadas. Solo se incorpora el precio base; no se infieren promociones por precio anterior.
- El código interno de La Coope no se convierte en EAN. Los artículos sin EAN están disponibles por nombre, pero no se pueden vincular al lector ni a otra cadena hasta obtener una identificación documentada.
- Registros con fecha, URL, sucursal y canal; historial de consultas real en `src/data/price-history.json`. No se borran consultas anteriores. El historial de ejemplo se conserva en el archivo antiguo pero no se presenta al público.
- Los precios anteriores sin trazabilidad se conservan en el código, pero se excluyen de comparaciones. No se modificaron ni borraron tablas de Supabase.
- Los precios de más de 72 horas, futuros, sin fuente o sin sucursal no participan en las comparaciones. Si falla una fuente se conserva el dato anterior con su fecha original.
- La canasta distingue sucursal y canal; exige cantidades mínimas, informa faltantes y no calcula ahorros entre canastas incompletas. No aplica condiciones bancarias o de asociación automáticamente.
- El catálogo incorpora productos nuevos de Supabase con paginación y mantiene los registros originales de nube separados si hay contradicciones. Precios de nube necesitan metadatos explícitos de fuente y verificación para entrar a comparaciones.
- Búsqueda por varias palabras sin acentos, filtro de cadena, carga incremental de tarjetas, fechas visibles y panel de cobertura de las nueve cadenas. Una sucursal en el mapa no equivale a precios conectados.

## Actualización

GitHub Actions consulta diariamente a las 08:00 de Argentina y también mediante `workflow_dispatch`. Si no obtiene precios, registra el error, conserva los anteriores y termina como fallo visible. No necesita claves privadas de Supabase.

Los datos actuales e historial se guardan en Git y se publican mediante Vercel. La base Supabase no recibe aún estas importaciones; se evita afirmar que hay sincronización de escritura cuando no existe.

## Incorporar otra cadena mediante CSV

Usar `scripts/imports/precios-template.csv`. Todas las columnas son obligatorias salvo `image_url`, `category` y `conditions`. No completar datos desconocidos con estimaciones.

- `supermarket_id`: coto, la_anonima, changomas, vea, cooperativa_obrera, yaguar, vital, diarco o makro.
- `ean`: código completo con dígito verificador válido; no usar código interno de la tienda.
- `branch_id`: identificador estable de la sucursal; `branch_name`, `branch_address` y `city` describen la sucursal real de Neuquén Capital.
- `price`: precio por unidad, con impuestos incluidos. `price_basis` debe ser `unit`; `tax_included`, `true`.
- `min_quantity`: cantidad mínima para acceder al precio (por ejemplo, 6 para un bulto de seis). No ingresar el total del bulto como precio unitario.
- `unit_measure`: kg, litro o unidad. `net_content_number`: cantidad normalizada (500 g = 0.5 kg; 900 ml = 0.9 litro).
- `observed_at`: fecha con zona horaria de la fuente o relevamiento, por ejemplo formato `AAAA-MM-DDTHH:MM:SS-03:00`; no cambiar la fecha a hoy para una lista vieja.
- `source_url`: URL HTTPS que permite comprobar el precio. `channel`: online o store.
- `conditions`: condiciones adicionales. Si no pueden evaluarse, el precio no entra automáticamente en la canasta.

Ejecutar desde el proyecto:

```sh
python3 scripts/scrapers/sync_verified_prices.py --csv /ruta/lista-revisada.csv
python3 -m unittest discover -s tests -p 'test_*.py'
node tests/data-quality.test.cjs
npm run build
```

Revisar el diff de datos, confirmar los archivos de `src/data/` y publicar. La importación rechaza archivos incompletos o con errores antes de modificar el snapshot. Una segunda importación más antigua no reemplaza precios más nuevos.

## Pendientes explícitos

- Conectar fuentes comprobables de Coto, La Anónima, ChangoMás, Vea y los cuatro mayoristas. No se afirma cobertura efectiva de esas ocho cadenas.
- Obtener EAN de la fuente para los artículos de La Coope; no usar similitud de nombres para fusionarlos.
- Verificar las demás direcciones heredadas del mapa con fuentes oficiales.
- Incorporar almacenamiento escalable en Supabase cuando se migre el esquema de trazabilidad y haya acceso de escritura de backend. No exponer una clave de servicio en el frontend.
- Más de una cadena con precios comparables será necesaria para ofrecer ahorros entre comercios; con una fuente solo se muestra su precio.


## Ampliación del 31 de octubre de 2026 — ChangoMás

- Fuente nueva: catálogo público de MâsOnline para identidad/EAN y cotización individual `POST /api/checkout/pub/orderForms/simulation` para precio y stock. La simulación no crea pedidos ni usa datos de clientes.
- Vendedor `masonlineprod0023`, CP 8300, sucursal 3608. Antes de cada importación se confirma el punto activo `masonlineprod0023_WM-3608` en la API pública de retiro: Neuquén, Eugenio Perticone 1255. Cada cotización debe indicar depósito `Inv-Full-3608` y muelle `Muelle-Full-3608`.
- No se usan los precios del vendedor genérico `1`. Se descartan cotizaciones sin stock, con vendedor o depósito distinto, con cargos impositivos adicionales, descuentos de carrito, unidades pesables y kits.
- Cada producto se cotiza individualmente, cantidad 1, sin cuenta, cupón o tarjeta. Se muestra el precio cotizado sin inferir descuentos a partir de precios de lista. El subtotal de canasta no incluye envío ni mínimos de compra de la tienda.
- Los EAN se validan y los productos se identifican como `ean_<código>`. El catálogo oficial desplaza registros de ejemplo con el mismo EAN para que el lector no abra una ficha antigua sin precios. La Coope sigue separada hasta disponer de EAN oficial.
- El proceso diario consulta ambas fuentes independientemente. Un fallo no impide guardar la otra fuente; se conserva la fecha anterior y el proceso señala el fallo. Para actualizar solo ChangoMás: `python3 scripts/scrapers/sync_verified_prices.py --source changomas`.
- Consulta exploratoria: La Anónima respondió HTTP 403. Vea publica el vendedor de Neuquén Láinez, pero las primeras cotizaciones probadas no devolvieron artículos disponibles; no se importaron precios genéricos como si fueran locales.
- Continúan pendientes Coto, La Anónima, Vea, Yaguar, Vital, Diarco y Makro. La existencia de sucursales en el mapa no indica cobertura de precios.
