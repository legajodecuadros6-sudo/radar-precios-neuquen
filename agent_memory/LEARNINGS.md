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
