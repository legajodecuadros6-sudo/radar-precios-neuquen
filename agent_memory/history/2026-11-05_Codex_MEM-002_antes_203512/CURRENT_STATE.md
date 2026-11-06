# ESTADO ACTUAL — Radar de Precios Neuquén

**Última actualización:** 03-11-2026 (~21:45 ART / 00:45 UTC 04-11) · **Verificado por:** Antigravity (Gemini 2.5 Pro) — contraste empírico de código, tests, bundle y producción Vercel
**Producción:** https://radar-precios-neuquen.vercel.app (Deploy vigente `radar-precios-neuquen-azvy443s6-radar-de-precios.vercel.app` sirviendo 8 cadenas con bundle liviano `index-DXx-QxSU.js`) · **Repositorio:** github.com/legajodecuadros6-sudo/radar-precios-neuquen
**Regla:** este archivo solo contiene lo verificable contra código/datos/tests. Lo no verificado se marca explícitamente.
**Convención de cierre:** ver `REGLAS_TRABAJO.md` antes de finalizar cualquier sesión.

## Qué funciona (verificado)

- **Producción Vercel con las 8 cadenas oficiales activas y verificadas en vivo**:
  - Total: **10.862 productos / 11.250 cotizaciones** verificadas servidas desde `https://radar-precios-neuquen.vercel.app/data/live-prices.json`.
  - Coto (7.290), Yaguar (1.718), Coope (851), La Anónima (676), Jumbo (348), ChangoMás (233), Vital (98), Makro (36).
  - Trazabilidad 100% verificada a fichas y URLs oficiales de cada comercio.
- **Jumbo integrado como 8ª fuente oficial**:
  - Colector `collect_jumbo()` y `jumbo_record()` vía VTEX search + sesión regional en `POST /api/sessions?sc=32` con `regionId: U1cjanVtYm9hcmdlbnRpbmFqNTIxNm5ldXF1ZW4=` (`selectedSeller: jumboargentinaj5216neuquen`).
  - Batch simulation en `POST /api/checkout/pub/orderForms/simulation?sc=32` para extraer precios locales diferenciados (ej: Coca 2.25L $6.290 vs $6.100 AMBA) y stock local verificado (`available` vs `withoutStock`).
  - **348 observaciones verificadas** con fecha de hoy, EANs vinculados a catálogo cruzado y ofertas minoristas calculadas (`promo_label: 'Oferta Jumbo'`).
  - Sucursal física en el mapa y filtros: **Jumbo Hipermercado Portal Patagonia** (Juan Julián Lastra 2400, coordenadas `-38.96021, -68.09273`), con logo verde y badges.
  - Suite de 3 pruebas dedicadas `JumboTests` (total 40/40 tests Python OK, 31/31 tests Node pass).
- **Optimización de bundle H3 y carga lazy resuelta**:
  - `src/data/live-prices.json` (14,7 MB) extraído del empaquetado Vite cliente mediante plugin de intercepción (`stub-live-prices-bundle`).
  - Catálogo servido estáticamente en `/data/live-prices.json` con compresión gzip nativa y parseo `JSON.parse` asíncrono (~15 ms).
  - Bundle JavaScript cliente reducido a **1.512 kB** (gzip: **433 kB**), build Vite acelerado y sucursales desacopladas a `branches.json`.
- **Pipeline de datos trazable** (`scripts/scrapers/sync_verified_prices.py`): 8 fuentes oficiales conectadas.
  - Saldo en `src/data/price-history.json`: **25.491 puntos históricos** acumulados sin pérdida de trazabilidad.
  - Nunca inventa precios; escrituras atómicas; de-duplicación por `(id, fecha, precio)`.
- **Coto integrado como 7ª fuente oficial**:
  - Colector `collect_coto()` y `coto_record()` vía Constructor.io (`ac.cnstrc.com/search/...`) con key pública del portal oficial.
  - Validación de sucursal única en Neuquén: **sucursal 185** ("NEUQUEN", HIPER, Ruta Prov. Nº 7 y Dr. Ramón; coords OSM −38.9411580, −68.0631931). Unificada en `src/data/supermarkets.ts` con ID `coto_185` (Coto Hipermercado Alto Comahue), eliminando el marcador duplicado legacy en el mapa.
  - **98% de cobertura EAN** (`product_main_ean` con checksum validado) habilitando comparación directa entre cadenas.
  - 2.120 ofertas minoristas importadas con descuento numérico; promociones sin importe numérico descartadas (D4).
  - Precios publicados tal como los lista el comercio con link a ficha canónica (D12).
  - Suite de 4 pruebas dedicadas `CotoTests` (total 37/37 tests unitarios Python OK).
- **Restauración y estabilización de Makro**:
  - Re-sincronización exitosa contra `https://makro.com.ar/canastabasicaneuquen/` (`status: ok`, `retrieved_at: 2026-11-03T18:59:17Z`, `query_date: 2026-10-31T05:01:00-03:00`).
  - Ventana de vigencia adaptada a **7 días (168 horas)** en scraper y frontend (`priceIsUsable`), correspondiente al ciclo periódico semanal de la Canasta Básica bajo Ley Provincial 3444 (D11).
  - Publicado y verificado en vivo en producción Vercel. Makro visible en la sección Mayoristas y en su vista de tienda.
- **La Anónima integrada como 6ª fuente oficial**:
  - Colector `collect_la_anonima()` en `scripts/scrapers/sync_verified_prices.py`.
  - Validación de sucursal mediante API oficial `https://api.laanonima.com.ar/sucursal/8300` (Paseo de la Patagonia, Antártida Argentina 1111, `idSucursalSuper: 8`).
  - Parser nativo en biblioteca estándar de Python `AnonimaCardParser(HTMLParser)` (0 dependencias externas, 100% compatible con CI).
  - Normalización de unidades (`kg`, `litro`, `unidad`), detección de multipacks para evitar desnormalización de bultos y descarte de productos sin stock (`stock <= 0` / `-1`).
  - Extracción de **174 ofertas minoristas activas** (`regular_price > current_price`) con cálculo de `discount_percentage` y `promo_label: 'Oferta online'`, directamente integradas con la sección de ofertas minoristas (`isRetailOffer`).
  - Extracción de **25 EANs oficiales** verificados mediante fichas de detalle con Flixmedia (`data-flix-ean`), vinculando productos idénticos entre cadenas (ej: Aceite Cocinero 1.5L `7790060023684`).
  - Suite de pruebas propia: clase `LaAnonimaTests` con 5 casos (total 33/33 tests unitarios Python OK).
- **Yaguar como 5ª fuente**: 1.718 observaciones de la tienda online Neuquén con mínimos/múltiplos documentados (escala entera ARS, stock validado).
- **Workflow GHA** `.github/workflows/sync-prices.yml`: cron diaria 11:00 UTC (08:00 ART) + tests previos + commit automático de datos.
- **Lector de códigos de barras**: software verificado (lookup por EAN funciona tanto para `ean_*` como para productos con atributo `ean`).
- **UI por comercio / ofertas minoristas / productos pedidos**: vista por cadena, filtro de ofertas minoristas y accesos directos activos.
- **Exclusión Vea/Diarco**: respetada según decisiones D3/D5.
- **Git == fuente de verdad de datos**: snapshot + histórico JSON versionados en el repo.

## Qué está parcialmente implementado

- **Promociones complejas**: datos de Coope con condiciones estructuradas existen en su API; condiciones avanzadas no mapeadas aún a la UI.
- **Supabase**: conectado pero inerte en escritura; decisión de usuario pendiente.

## Qué está roto o degradado (verificado)

- **GitHub sin token en el entorno local**: el push pide credenciales, por lo que los commits locales avanzan sobre `main` local hasta configurar token o SSH.

## Componentes principales

```
Fuentes activas: Coope API (local 124) · ChangoMás VTEX (3608) · Makro HTML (lista diaria) · Vital VTEX (retiro) · Yaguar Store API · La Anónima HTML/API (Paseo de la Patagonia)
Pipeline: gather/validate/merge + atomic writes → src/data/{live-prices,price-history}.json → build Vite → Vercel
Frontend: App.tsx → SearchAutocomplete / ProductCard / ProductDetailModal / BarcodeScannerModal /
          SmartBasketDrawer + basketOptimizer / CoveragePanel / DealsRankingSection / BentoDealsGrid
Supabase: lectura paginada (mergeCloudData) con reglas estrictas de trazabilidad; hoy inerte
```

## Problemas conocidos (trazados en AUDITORIA_GLM_RADAR_PRECIOS.md)

H1–H21 con prioridad P0–P3 y estado de certeza. Resumen P0: H1 desalineación deploy/código (mitigada por commits 28d2673+), H2 ofertas vacías (re-verificar), H6 cobertura EAN 24,2% (238/984 al 01-11). Detalle completo en el documento de auditoría.

## Credenciales de publicación (verificado 03-11)

- **Vercel**: sesión del CLI válida — token en `~/.local/share/com.vercel.cli/auth.json` (usuario `legajodecuadros6-sudo`, equipo `radar-de-precios`, proyecto vinculado via `.vercel/project.json`). Publicación directa con `npx vercel deploy --prod` ya disponible.
- **GitHub**: sin token disponible (hosts.yml del gh CLI sin token; sin clave SSH para github.com). **Impide `git push`** → producción (Vercel auto-deploy desde GitHub) y repo no se sincronizan por esa vía hasta conseguir un token o instalarse credenciales.
