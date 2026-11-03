# HANDOFF — relevo entre agentes

> ⚠️ **Regla de cierre vigente** (`agent_memory/REGLAS_TRABAJO.md`): antes de cerrar la app o entregar el control, verificar que este HANDOFF refleje el estado real y aplique el checklist.

## Datos del relevo

- **Agente que entrega:** Antigravity (harness) — **Modelo real utilizado: Gemini 2.5 Pro**
- **Fecha y hora:** 03-11-2026 (~20:15 UTC / 17:15 ART)
- **Objetivo recibido:** Tomar relevo desde el HANDOFF previo, contrastar con código/Git/tests, resolver la optimización de rendimiento H3 (catálogo fuera del bundle JS) y publicar en producción Vercel con las 7 cadenas activas bajo autorización del usuario.

## Trabajo realizado en esta sesión

1. **Contraste de memoria vs realidad y rectificación de H3:**
   - Se auditó la causa del bundle de 13,1 MB. Se rectificó un error en la memoria anterior: `price-history.json` ya estaba fuera del bundle (procesado en prebuild a `history-summary.json` y cargado lazy).
   - Lo que inflaba el bundle a 13,1 MB era la importación estática de `src/data/live-prices.json` (13,6 MB en disco) en `productService.ts`, `supermarkets.ts` y `CoveragePanel.tsx`.
2. **Implementación de H3 (catálogo fuera del bundle JS):**
   - **Pipeline de pre-construcción** (`scripts/build-history.mjs`): copia automáticamente `src/data/live-prices.json` a `public/data/live-prices.json` con permisos de lectura `0644`. Además extrae `src/data/branches.json` (~1 KB) y `src/data/sources.json` (~1 KB).
   - **Desvío en Vite** (`vite.config.ts`): plugin `stub-live-prices-bundle` con `enforce: 'pre'` que intercepta `live-prices.json` en tiempo de bundle y lo redirige a `src/data/stub-live-prices.json` (~60 bytes).
   - **Carga lazy asíncrona** (`src/services/productService.ts`): `fetchLiveRadarData()` descarga `/data/live-prices.json` vía HTTP (comprimido nativamente en gzip a 764 KB por Vercel CDN), parsea los 10.740 productos en segundo plano en ~15 ms con `JSON.parse` y los almacena en caché. En Node/tests, `localData` sigue resolviendo el snapshot real del filesystem para no romper los contratos de testing.
   - **Desacoplamiento de componentes**: `src/data/supermarkets.ts` ahora consume `branches.json` (1 KB). `CoveragePanel.tsx` consume `sources.json` y props. `App.tsx` añade un skeleton/loading amigable mientras sincroniza el catálogo.
   - **Reducción de bundle y velocidad**:
     - Bundle JS cliente sin comprimir: de **13.136 kB a 1.508 kB** (**-88,5% / -11,6 MB**).
     - Bundle JS comprimido gzip: de **1.152 kB a 432 kB** (**-62,5%**).
     - Tiempo de compilación `npm run build`: de **33 - 55 s a 9,8 s** (**3x más rápido**).
3. **Publicación y verificación en producción (Vercel):**
   - Ejecutado `npx vercel deploy --prod --yes` con autorización explícita del usuario.
   - Nuevo deployment asignado al alias oficial: `https://radar-precios-neuquen.vercel.app` (Deployment ID: `radar-precios-neuquen-8n9b00xd7-radar-de-precios.vercel.app`).
   - Verificado en vivo que sirve el nuevo bundle liviano `index-R20ZPT5U.js`.
   - Verificado endpoint `/data/live-prices.json` con **HTTP 200 OK** y las 7 cadenas activas: **10.740 productos / 10.902 cotizaciones** (Coto 7.290, Yaguar 1.718, Coope 851, La Anónima 676, ChangoMás 233, Vital 98, Makro 36).

## Decisiones nuevas (registradas en DECISIONS.md)

- **D14**: Extracción de catálogo fuera del bundle JS (H3) mediante servicio estático en `public/data/`, carga lazy vía `fetch` e intercepción en Vite con `stub-live-prices.json`.

## Archivos modificados en esta sesión

- `.gitignore` (ignora `public/data/` como artefacto generado de build)
- `scripts/build-history.mjs` (copia a `public/data/` con chmod 0644 y extrae `branches.json` / `sources.json`)
- `src/data/branches.json` (nuevo, 4 sucursales activas, ~1 KB)
- `src/data/sources.json` (nuevo, estado de fuentes, ~1 KB)
- `src/data/stub-live-prices.json` (nuevo, stub liviano para bundling, ~60 bytes)
- `src/data/supermarkets.ts` (desacoplado a `branches.json`)
- `src/components/CoveragePanel.tsx` (desacoplado de `live-prices.json`)
- `src/services/productService.ts` (función `buildRadarData`, lazy fetch `/data/live-prices.json`, fallback y cache)
- `src/App.tsx` (loading state y propagación de `sources` a `CoveragePanel`)
- `vite.config.ts` (plugin `stub-live-prices-bundle` con `enforce: 'pre'`)
- `agent_memory/history/2026-11-03_2125_GLM_OpenCode.md` (relevo previo archivado)
- `agent_memory/CURRENT_STATE.md`, `TASKS.md`, `DECISIONS.md`, `LEARNINGS.md`, `HANDOFF.md`

## Commits realizados

- `255e857`: docs(memoria): sincronizar memoria con integracion de Coto y diagnostico verificado H3
- `e16b467`: feat(perf): optimizar H3 extrayendo live-prices.json fuera del bundle JS hacia carga lazy

## Pruebas ejecutadas y resultados

- `node --test tests/*.test.cjs` → **31/31 pass** (4.46s).
- `python3 -m unittest discover -s tests -p 'test_*.py'` → **37/37 OK** (0.095s).
- `npm run build` → **OK** (9.84s, bundle `index-R20ZPT5U.js` 1.508 kB / 432 kB gzip).
- `curl -sI https://radar-precios-neuquen.vercel.app/data/live-prices.json` → **HTTP/2 200 OK**.
- Inspección en vivo de datos servidos en producción: **10.740 productos / 10.902 cotizaciones en 7 cadenas** verificadas.

## Estado real del repo/producción al entregar

- **Producción:** 100% al día y sincronizada con el estado local de 7 cadenas y bundle optimizado (`index-R20ZPT5U.js`).
- **Git local:** Adelantada a `origin/main` (los commits locales avanzan en `main` local porque no hay credenciales de GitHub para `git push`).
- **Working tree:** Limpio tras el commit de la memoria.

## Advertencias importantes

1. **GitHub sin token en el entorno local**: Los cambios están commiteados en local y desplegados en Vercel por CLI, pero no pusheados a GitHub. Se requiere configurar un token o clave SSH para sincronizar el repositorio remoto.
2. **Frescura de datos**: Las 7 cadenas están sincronizadas con fecha de hoy (03-11). La ventana de 72 h vence el 06-11 04:16 UTC. Makro tiene vigencia de 7 días (Ley 3444 / D11).
3. **Anomalías de Coto mantenidas sin censura (D12)**: Precios como Smartwater $1 o electrodomésticos que matchean términos de alimentos se listan tal como los publica Coto en su buscador oficial.

## Próximo paso recomendado (para Codex u otro agente)

1. Sincronizar el repositorio remoto con `git push` una vez que el usuario provea token o SSH.
2. Abordar las promociones por cantidad de Cooperativa Obrera (`promo_condition`, ver D4 en `DECISIONS.md`).
3. Opcional: code-splitting adicional de librerías pesadas (`leaflet`, `recharts`, `html5-qrcode`) mediante `manualChunks` si se desea reducir el bundle JS por debajo de 500 kB sin comprimir.

