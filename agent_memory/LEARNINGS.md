# LEARNINGS — Radar de Precios (descubrimientos reutilizables)

Solo hechos comprobados con evidencia. Cada punto indica fecha de verificación.

## APIs y fuentes (sondas del 01-11-2026)

- **Coope** (`api.lacoopeencasa.coop/api/`): `buscar/articulos` exige `offset` y `pedido` (HTTP 400 sin ellos). Parám. correcto: `q=<term>&offset=0&pedido=25&id_local=124`. **No expone EAN** (solo `cod_interno`); `cod_interno` no es GTIN.
  Expone promociones estructuradas: `precio_promo`, `precio_unitario`, `cantidad_promo`, `descuento_porcentaje_promo`, `id_promocion`, `tipo_promo/_2`, `tipo_carga_promo_2`, `existe_promo`. Ejemplos del 01-11 (local 124): Coca 2250 con `descuento_porcentaje_promo=25` (promo 83094); Coca 1500 "2 × $3600" (`cantidad_promo=2`, tipo_promo=0). La semántica exacta de `tipo_promo` NO está documentada: decodificar caso por caso antes de confiar.
- **Yaguar** (`yaguar.com.ar`): tienda WooCommerce **activa por ciudad**. Cada ciudad tiene su REST propio: `yaguar.com.ar/<ciudad>/wp-json/wc/store/v1/products?search=…&per_page=N` (el JSON raíz del sitio y el de /neuquen/ **devuelven precios distintos** — usar SIEMPRE `/neuquen/wp-json/`). Verificación de ciudad: `GET /neuquen/wp-json/` → `name: "Supermercado Mayorista Yaguar - Neuquén"`, `gmt_offset:-3`. Precios en `prices.price` como string entero ARS (`currency_minor_unit:0`); validar `currency_code`, `price_range`, `add_to_cart.minimum/multiple_of`, `is_purchasable`, `is_in_stock`. Fichas: `permalink` con `/neuquen/producto/<slug>/`. `date_modified` llegó vacío → no confiar en fecha de vigencia de la fuente.
- **La Anónima** (`www.laanonima.com.ar`): **NO bloquea con 403** (versión anterior de un 403 quedó obsoleta). Búsqueda HTML: `GET /buscar/<término con %20>` → tarjetas `class="producto-item"` con atributos `data-codigo`, `data-nombre`, `data-marca`, `data-rutacategorias`, `data-precio`, `data-precio_anterior`, `data-precio_oferta`, href `/art_<código>/`. **OJO: atributos con espacios** (`data-marca = "Mana"`), parsear por regex `data-[\w-]+\s*=\s*"…"`. El **EAN está en la ficha de detalle** (`ean="7790040137844"` en galletitas Mana 408 g). Buscador de dos palabras parece OR/fuzzy (trae resultados parcos). Rutas no válidas devuelven soft-404 con HTML de 626 KB (no HTTP 404 real en todos los casos).
- **Vea** (`www.vea.com.ar`, VTEX): catálogo funciona (`/api/catalog_system/pub/products/search?ft=…` devuelve precios, vendedor "Vea Argentina"), pero la simulación con CP 8300 rechaza cualquier ítem ("no encontrado o no disponible") → **no entrega en Neuquén Capital**. `regions` responde errores según params (`ORD021.6` con country=ARG; `CHK0127 País inválido` con countryCode=ARG) — no fiar la conclusión de stock a `regions` sino a `/orderForms/simulation`.
- **Diarco**: tiendas solo en CGBA (27), Buenos Aires (11), Santa Cruz (4), Rìo Negro (2), Chubut (2), etc.; **en Neuquén provincia solo Cutral Có** → sin cobertura de Neuquén Capital. WordPress con sitemap; ofertas mayormente para otras localidades.
- **Coto**: `cotodigital3.com.ar` es SPA Angular; el REST ATG clásico (`/sitio/api/rest/model/atg/commerce/catalog/catalogproperties/product?searchstring=…`) redirige al portal coto.com.ar y devuelve el shell de la SPA (muerto). El servicio real es un **BFF** en `https://api.coto.com.ar/api/v1/ms-digital-sitio-bff-web/api/v1` con rutas en chunks lazy del bundle (`b findOrderFreeShip` etc. no son operativos por GET). Integrar requiere Playwright headless o ingeniería inversa de chunks.
- **ChangoMás VTEX** (SKU check 01-11): Manaos Pomelo Blanco 2,25 L = producto 244031 / SKU **246138** / EAN 7798113301024, state `price 0.0, stock 0` (sin stock); Manaos Cola 2,25 L (SKU 246141, EAN 7798113300010) con stock 100 a $2419. Stock cambia por sabor, no por producto.
- **Makro** (lista diaria): el importador exige headers exactos `codigo, producto, precio regular, precio sin impuestos nacionales` y fecha publicada ≤72 h. No expone EAN.

## Datos del catálogo (01-11-2026)

- **Lay's**: 18 fichas (9 Coope sin EAN + 9 con EAN `ean_*` de ChangoMás). **Lay's Clásicas 330 G ya está en el snapshot con EAN válido `7790310985588`** (id `ean_7790310985588`). **Manaos: 0 productos en el snapshot** (Coope no tiene marca; ChangoMás sin stock).
- EAN reales útiles probados: Coca-Cola 3 L = `7790895000997`, aceite Natura 900 ml = `7790272001005`, leche Serenísima = `7790742357007`.

## Reglas internas del proyecto (importantes al tocar datos)

- `priceIsUsable()` (`src/utils/dataQuality.ts`) exige: `is_verified`, `source_url` HTTPS fuera del propio sitio/supabase, `query_date` ≤72 h. El `filter` global en `App.tsx` descarta lo vencido → si el sync falla 3 días, el catálogo visible se vacía sin banner (H4). **Ventana vence ~04-11-2026T19:44Z con los datos al 01-11T19:44Z.**
- EAN validado con checksum en `valid_ean()` (permite 8/12/13/14). Nunca unir productos por similitud de nombre; `cod_interno` no es EAN.
- El colector vtex de ChangoMás (mas_record) cotiza con `orderForms/simulation` cantidad 1, vendedor `masonlineprod0023`, exigencias stock/impuestos/logística local (`Inv-Full-3608`).
- `merge_observations` conserva la última lectura por id de observación (id = producto@sucursal@canal); historial append-only por (id, fecha, precio).
- Bundle: catálogo + histórico embebidos en el JS (live-prices.json + price-history.json importados estáticamente). md5 del bundle desplegado == `dist/` al 01-11 → producción despliega desde Git, no desde el working tree.

## Entorno, credenciales y despliegue

- **Vercel**: sesión válida del CLI del usuario en `~/.local/share/com.vercel.cli/auth.json` (`legajodecuadros6-sudo`, team `radar-de-precios`); proyecto vinculado por `.vercel/project.json`. Verificado `npx -y vercel@latest whoami` el 03-11. Deploy directo: `npx vercel deploy --prod`.
- **GitHub**: NO hay token (gh CLID hosts.yml sin oauth_token; sin clave SSH; sin credenciales git). `git ls-remote` anónimo funciona (repo público) pero **push pide credenciales**. Necesario para sincronizar repo↔producción.
- `VERCEL_OIDC_TOKEN` en `.env.local` es un token de build-time, **no** sirve para deploy.
- Supabase: REST con anon key sirve para `SELECT`; la raíz OpenAPI exige clave secreta. `.env.local` con `VITE_SUPABASE_URL` + anon key. No existe ruta de escritura desde el pipeline.
- El historial de corridas de GHA no se puede inspeccionar sin token (la API de Actions requiere autenticación). Workflow del repo: `.github/workflows/sync-prices.yml` (cron 11:00 UTC).

**Errores propios recurrentes (evitar)**

- Filtrar nombres por subcadena suelta (`'lay'` matcheó ilolay/playadito) → usar límites de palabra (`\b…\b`).
- Parsear HTML asumiendo `attr="valor"` sin espacios: el HTML de La Anónima usa `attr = "valor"`.
- API WooCommerce devuelve BOM al inicio del JSON → usar `encoding='utf-8-sig'`.
- Inicializar acumuladores en tuplas grandes: `a,b,c,d={},{list}` compila — led a 40 min de depuración en `collect_yaguar` (los dict-initializers desparejos fallaron en silencio). Preferir líneas separadas.

## Regla de frescura (03-11-2026, sync completo real)

- **El sync exitoso de Makro NO refresca la fecha de las observaciones**: el importador sella cada obs con la **fecha de publicación de la lista diaria de Makro** (no con la fecha de la corrida). La lista fechada 10-31 05:01 UTC se vuelve invisible ~72 h después (03-11 05:01). Riesgo recurrente con Makro: depende de que Makro publique una lista nueva; el cron diario (11:00 UTC) la tomará si aparece.
- La regla de 72 h **no borra nada**: las observaciones vencidas permanecen en live-prices.json/price-history.json con su historial; se filtran en la vista (`priceIsUsable`) y regresan visibles en cuanto un sync exitoso trae fecha nueva.
- Efecto "bloque": si el cron de GHA falla 3 días seguidas, TODAS las cadenas se vencen juntas y el catálogo visible queda semi vaciado. La sync completa del 03-11 lo resolvió (fecha real 04:16 UTC, vence 06-11 04:16 UTC).

## Sondeo Yaguar (03-11-2026, integración real)

- `per_page` admite hasta **100** en la Store API (25/2 páginas recortaba); con `per_page=100, pages=3` los 25 términos de `TERMS` cierran sin tope (solo `galletitas` y `jabón` necesitaron >1 página).
- La API ocasionalmente devuelve variantes transitorias del payload; la respuesta de válida podía venir vacía al primer intento (03:54–03:57 UTC). El colector registra los errores internos en el mensaje de estado para diagnosticar.
- Precios del 03-11 verificados contra el snapshot: Manaos Pomelo 2,25 = $2.168 / Manaos Cola 2,25 = $2.168 / Lay's 330 g ≈ $6.999 — coherentes con tienda mayorista, con stock real.
- El workflow `.yml` había sido modificado por otro agente para correr `probe_yaguar.py` en CI (sin confirmar); el colector oficial ya no depende de ese paso.

## Integración La Anónima (03-11-2026, integración oficial)

- **API de sucursal oficial**: `GET https://api.laanonima.com.ar/sucursal/8300` devuelve JSON estructurado con `super.haySucursalSuper: true` y lista de sucursales que confirma `Neuquén Paseo de la Patagonia` (`idSucursalSuper: "8"`, `direccion: "Antártida Argentina 1111"`). Se usa como preflight check obligatorio.
- **Cookies de geolocalización**: enviar `Cookie: codigoPostal=8300; Id-Sucursal-Super=8; seleccionocp=1; idZonaPrecio=8` asegura que los precios cotizados correspondan a la sucursal de Neuquén Capital.
- **Cabeceras obligatorias**: exige User-Agent de navegador completo (`Mozilla/5.0...`); UAs de Python o incompletos son bloqueados con HTTP 403 por WAF.
- **Stock en tarjeta**: `data-stock="-1"` o `data-stock="0"` representa sin stock y se excluye del pipeline. Stock $> 0$ es producto disponible.
- **Descuentos minoristas**: los atributos `data-precio` (precio actual) y `data-precio_anterior` (precio regular) reflejan promociones oficiales. Cuando `data-precio_anterior > data-precio`, se calcula `discount_percentage` y se etiqueta con `promo_label: 'Oferta online'`, haciéndolo visible de inmediato en la sección de Ofertas Minoristas (`isRetailOffer`).
- **EAN y unificación entre cadenas**: fichas de detalle con integración Flixmedia exponen `data-flix-ean="779..."` (GTIN-13 validado por checksum). Si el EAN es válido, el ID del producto es `ean_<ean>`, lo que une automáticamente el producto con las demás cadenas que venden el mismo artículo (ej: Aceite Cocinero 1.5 L `7790060023684`). Si no expone EAN, se mantiene como `anonima_<code>` sin inventar códigos.
- **Parser estándar sin dependencias**: `HTMLParser` nativo de Python procesa los atributos con espacios (`data-marca = "..."`) y signos `>` en `data-rutacategorias` sin requerir `beautifulsoup4`, asegurando ejecución limpia en GitHub Actions.

## Optimización de Bundle y Rendimiento (03-11-2026, H3)

- **Vite JSON inlining**: Vite incluye por defecto cualquier archivo `.json` importado estáticamente directamente como código objeto en el bundle JS (`index-*.js`). Cuando el catálogo creció a 10.740 productos con Coto, `live-prices.json` (13,6 MB) infló el bundle cliente a 13,1 MB.
- **Intercepción limpia vía plugin con `enforce: 'pre'`**: Configurar un plugin de Vite con `enforce: 'pre'` y el hook `resolveId(source)` permite interceptar las importaciones de `live-prices.json` y resolverlas a `src/data/stub-live-prices.json` (~60 bytes) sin afectar las pruebas en Node (`load('src/services/productService.ts')`).
- **Desacoplamiento de metadatos**: `supermarkets.ts` solo necesita las sucursales (`branches`), no los 10.740 productos. Extraer `src/data/branches.json` (1 KB) y `src/data/sources.json` (1 KB) en el prebuild (`scripts/build-history.mjs`) elimina por completo el acoplamiento con el catálogo masivo.
- **Permisos de archivos copiados a `public/`**: Al usar `copyFile` en Node en entornos Linux sandbox, el archivo puede crearse con permisos restringidos (`0600`). Es mandatorio ejecutar `chmod(livePublicTarget, 0o644)` para asegurar que Vercel y los servidores web estáticos puedan leerlo sin errores 403/ENOENT.
- **Compresión HTTP**: `live-prices.json` pesa 13,6 MB sin comprimir, pero solo **764 KB** con compresión gzip en Vercel CDN. `JSON.parse` nativo en el navegador procesa los 10.740 productos en ~15 ms sin bloquear la interfaz.

## Factibilidad y arquitectura de Jumbo (03-11-2026, investigación empírica)

- **Sucursal física activa en Neuquén**: Portal Patagonia Shopping (Av. J.J. Lastra 2400, CP Q8300, lat `-38.9602105`, lon `-68.0927295`). Teléfono `0810-999-58626`. Activa tras el cierre de Vea Láinez en octubre 2026.
- **Plataforma**: VTEX IO (`account: jumboargentinaio`, `sc=32`).
- **Metadatos en MasterData NT**:
  - `GET /api/dataentities/NT/search?_fields=name,SellerName,storeid,geocoordinates,postalCode,city,state,street,number&_where=city=Neuquen` confirma:
    `storeid: "5216"`, `SellerName: "jumboargentinaj5216neuquen"`, `hasPickup: true`, `hasDelivery: true`.
- **Gotcha del buscador nacional vs precios locales**:
  - `GET /api/catalog_system/pub/products/search?ft=<término>` devuelve el catálogo completo con EANs oficiales (GTIN-13) y SKU IDs (`itemId`), pero cotizados con el vendedor base `"1"` (precios AMBA). Si se scrapea solo este endpoint, se introducen precios de Buenos Aires violando la trazabilidad local.
- **Gotcha de simulación sin contexto (error ORD027)**:
  - `POST /api/checkout/pub/orderForms/simulation` con `postalCode: 8300` o SKU arbitrario devuelve `ORD027: Ítem no encontrado o no disponible` debido a que Cencosud no enruta la logística regional por código postal genérico.
- **Protocolo exacto para obtener precios y stock de Neuquén Capital**:
  1. **Inicialización de sesión VTEX**: `POST https://www.jumbo.com.ar/api/sessions?sc=32` con payload:
     ```json
     {
       "public": {
         "buyselectMethod": {"value": "recogida"},
         "regionId": {"value": "U1cjanVtYm9hcmdlbnRpbmFqNTIxNm5ldXF1ZW4="},
         "selectedSeller": {"value": "jumboargentinaj5216neuquen"},
         "geoCoordinates": {"value": "-68.0927295000,-38.9602105000"}
       }
     }
     ```
     *(Nota: `regionId` es `btoa("SW#jumboargentinaj5216neuquen")`). Retorna cookies `vtex_session` y `vtex_segment`.*
  2. **Batch Simulation con seller local**: `POST https://www.jumbo.com.ar/api/checkout/pub/orderForms/simulation?sc=32` pasando las cookies de sesión y el array de SKUs:
     ```json
     {
       "items": [{"id": "<skuId>", "quantity": 1, "seller": "jumboargentinaj5216neuquen"}],
       "country": "ARG"
     }
     ```
     Retorna los precios locales reales en centavos (`price / 100`) y la disponibilidad exacta (`available` vs `withoutStock`). Soporta batching de múltiples SKUs por solicitud.
- **Comprobación empírica de precios y SLAs**:
  - Gaseosa Coca Cola 2.25 L (`EAN 7790895000997`, SKU `246613`): **$6.290 en Neuquén** vs $6.100 en AMBA.
  - Coca Cola Zero 2.25 L (`EAN 7790895067570`, SKU `18976`): **$6.290 en Neuquén** vs $6.100 en AMBA.
  - Coca Cola Sin Azúcar 1.75 L (SKU `269646`): `withoutStock` en Neuquén (filtro de stock local funcionando).
  - SLAs locales confirmados: `"Retiro en Tienda - Jumbo Neuquen Av. J.J. Lastra 2400"` y `"Envío a Domicilio"`.
- **Conclusión de factibilidad**: 100% factible, técnicamente limpio, con soporte de EANs y stock real local de Neuquén.



