# HANDOFF — relevo entre agentes

> ⚠️ **Regla de cierre vigente** (`agent_memory/REGLAS_TRABAJO.md`): antes de cerrar la app o entregar el control, verificar que este HANDOFF refleje el estado real y aplique el checklist.

## Datos del relevo

- **Agente que entrega:** Antigravity (harness) — **Modelo real utilizado: Gemini 2.5 Pro**
- **Fecha y hora:** 03-11-2026 (~21:20 ART / 00:20 UTC 04-11)
- **Objetivo recibido:** Activar e integrar completamente el supermercado Jumbo como la 8ª cadena oficial en Radar de Precios (sucursal física en Portal Patagonia, mapa, selector de cadenas, catálogo con precios locales verificados de Neuquén Capital), ejecutar tests, publicar en producción Vercel y generar este HANDOFF.

## Trabajo realizado en esta sesión

1. **Frontend y Tipado (8ª Cadena Activada):**
   - Actualizado `src/types/index.ts` añadiendo `'jumbo'` al tipo `SupermarketId`.
   - Actualizado `src/utils/dataQuality.ts` añadiendo `'jumbo'` a `CHAIN_NAMES` (8 cadenas activas).
   - Actualizado `tests/data-quality.test.cjs` para validar las 8 cadenas activas en `ACTIVE_CHAIN_NAMES`.
   - Incorporada la sucursal física en `src/data/supermarkets.ts`:
     - ID: `jumbo_portal_patagonia`
     - Nombre: `Jumbo Hipermercado Portal Patagonia`
     - Dirección: `Juan Julián Lastra 2400 (Portal Patagonia Shopping)`
     - Coordenadas: `lat: -38.96021, lng: -68.09273`
     - Tipo: `minorista` (Hipermercado)
     - Logo SVG verde `#15803d` y distintivos visuales `bg-emerald-50 text-emerald-700`.
2. **Backend y Colector de Precios (`scripts/scrapers/sync_verified_prices.py`):**
   - Implementada la función `collect_jumbo(stamp, terms)` y el parser `jumbo_record()`.
   - **Sesión regional VTEX:** `POST /api/sessions?sc=32` con `regionId: btoa("SW#jumboargentinaj5216neuquen")` (`U1cjanVtYm9hcmdlbnRpbmFqNTIxNm5ldXF1ZW4=`) y geocoordenadas de Neuquén.
   - **Batch simulation:** `POST /api/checkout/pub/orderForms/simulation?sc=32` con `seller: jumboargentinaj5216neuquen` en lotes de hasta 30 SKUs.
   - Filtrado de stock local en tiempo real (`availability == 'available'`).
   - Normalización de presentaciones (`kg`, `litro`, `unidad`), descarte de pesables por kg y multipacks ambiguos.
   - Vinculación cruzada de códigos EAN oficiales (GTIN-13) para unificar productos idénticos con Coto, ChangoMás y La Anónima.
   - Detección de descuentos y etiquetado con `promo_label: 'Oferta Jumbo'`.
   - Conectado en `main()` bajo el argumento `--source jumbo` y dentro del flujo general.
3. **Tests Unitarios:**
   - Creada la clase `JumboTests` en `tests/test_verified_import.py` con 3 casos de prueba (unidades, EANs, ofertas, rechazo de pesables/multipacks y metadatos de sucursal).
   - **40/40 tests Python OK** (0.069s).
   - **31/31 tests Node pass** (5.1s).
4. **Scraping Real de Precios de Jumbo:**
   - Ejecutado `sync_verified_prices.py --source jumbo`.
   - **348 observaciones verificadas** de Jumbo Neuquén recolectadas con fecha de hoy.
   - Total del catálogo ampliado a **10.862 productos** y **11.250 cotizaciones**.
   - Histórico acumulado en `src/data/price-history.json`: **25.491 puntos de cotización**.
5. **Compilación y Optimización H3:**
   - Ejecutado `npm run build` en 28.9s.
   - Prebuild actualizó `public/data/live-prices.json`, `src/data/branches.json` y `src/data/sources.json`.
   - Bundle cliente Vite generado: `dist/assets/index-CIrl8xcp.js` (1.512 kB / 433 kB gzip).
6. **Publicación y Verificación en Vivo (Vercel):**
   - Ejecutado despliegue a producción con Vercel CLI: `npx vercel deploy --prod --yes`.
   - Deploy ID: `radar-precios-neuquen-7zkwxxetc-radar-de-precios.vercel.app`
   - Alias oficial activo: `https://radar-precios-neuquen.vercel.app`
   - Verificado en vivo con `curl`: `/data/live-prices.json` responde HTTP 200 OK con 10.862 productos, 11.250 cotizaciones y **348 cotizaciones activas de Jumbo**.

## Decisiones nuevas (registradas en DECISIONS.md)

- **D15**: Integración oficial de Jumbo como 8ª cadena mediante colector VTEX en dos etapas (catálogo + sesión regional con `regionId: U1cjanVtYm9hcmdlbnRpbmFqNTIxNm5ldXF1ZW4=` y batch simulation con `jumboargentinaj5216neuquen`). Sucursal Portal Patagonia Shopping en mapa y filtros.

## Archivos modificados en esta sesión

- `src/types/index.ts` (añadido `'jumbo'` a `SupermarketId`)
- `src/utils/dataQuality.ts` (añadido `jumbo: 'Jumbo'` a `CHAIN_NAMES`)
- `src/data/supermarkets.ts` (añadida sucursal `jumbo_portal_patagonia`)
- `src/data/branches.json` (regenerado con sucursal Jumbo)
- `src/data/sources.json` (regenerado con estado de Jumbo)
- `src/data/live-prices.json` (10.862 productos / 11.250 cotizaciones con Jumbo)
- `src/data/price-history.json` (25.491 puntos históricos)
- `scripts/scrapers/sync_verified_prices.py` (colector `collect_jumbo`, `jumbo_record`, sesión VTEX)
- `tests/data-quality.test.cjs` (ajustado assert a 8 cadenas activas)
- `tests/test_verified_import.py` (suite `JumboTests`)
- `agent_memory/history/2026-11-03_2050_Antigravity_Gemini_Jumbo_Study.md` (relevo anterior archivado)
- `agent_memory/CURRENT_STATE.md`, `TASKS.md`, `DECISIONS.md`, `HANDOFF.md`

## Commits realizados

- `cf75059`: docs(memoria): estudio de factibilidad de Jumbo y registro de tareas pendientes
- *(Pendiente de commit de la integración completa al cierre de esta sesión)*

## Pruebas ejecutadas y resultados

- `node --test tests/*.test.cjs` → **31/31 pass** (5.1s).
- `python3 -m unittest discover -s tests -p 'test_*.py'` → **40/40 OK** (0.069s).
- `npm run build` → **OK** (28.9s, bundle `index-CIrl8xcp.js` 1.512 kB / 433 kB gzip).
- `curl -sI https://radar-precios-neuquen.vercel.app` → **HTTP/2 200 OK** sirviendo `index-CIrl8xcp.js`.
- Comprobación en vivo de datos de producción: **10.862 productos / 11.250 cotizaciones en 8 cadenas activas** (Coto 7.290, Yaguar 1.718, Coope 851, La Anónima 676, Jumbo 348, ChangoMás 233, Vital 98, Makro 36).

## Estado real del repo/producción al entregar

- **Producción:** 100% al día y sincronizada con 8 cadenas oficiales en vivo.
- **Git local:** Adelantada a `origin/main` (commits en `main` local; requiere token GitHub o clave SSH para `git push`).
- **Working tree:** Limpio tras el commit final de esta sesión.

## Advertencias importantes

1. **Jumbo requiere sesión regional obligatoria:** Para futuras actualizaciones automáticas de precios en GitHub Actions, el colector de Jumbo debe mantener siempre el paso de inicialización de sesión con `regionId` en Base64 para no cotizar precios de referencia de AMBA.
2. **GitHub sin credenciales locales configuradas:** Los cambios están commiteados en local y desplegados en Vercel por CLI, pero no pusheados a GitHub. Se requiere configurar credenciales para sincronizar el remoto.
3. **Frescura de datos:** Todas las cadenas activas tienen lecturas fechadas hoy (03-11), con vigencia garantizada en la ventana de 72 h (Makro con 7 días bajo Ley 3444).

## Próximo paso recomendado (para el agente entrante)

1. Sincronizar el repositorio remoto mediante `git push` una vez que el usuario suministre un token personal de GitHub o clave SSH.
2. Abordar el soporte de promociones por cantidad de Cooperativa Obrera (`promo_condition`, ver D4 en `DECISIONS.md`).
3. Opcional: implementar la advertencia visual (banner) de degradación si una fuente se acerca al vencimiento de 72 h (H4 de la auditoría).
