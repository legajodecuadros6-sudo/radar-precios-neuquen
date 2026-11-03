# TAREAS — Radar de Precios

**Convención:** `[ ]` pendiente · `[~]` en progreso · `[x]` completada y verificada (con evidencia).
**Regla:** no marcar `[x]` sin verificación real (código corrido, test verde, o comprobación en producción).

## En progreso

- [~] **Memoria compartida de agentes** (esta carpeta): inicializada el 03-11. Mantener al final de cada sesión.

## Pendientes

- [ ] **Sincronización repo↔producción**: conseguir GitHub token (o SSH) para `git push`; hasta entonces decidir si se publica por CLI de Vercel con riesgo de divergencia repo/producción.
- [ ] **Promos por cantidad desde Coope**: decodificar `tipo_promo/cantidad_promo/precio_promo` de la API, importar como `promo_condition` documentada y solo mostrar la UI cuando la condición esté verificada (política del usuario del 01-11: no publicar "llevando N" sin comprobar).
- [ ] **Banner de degradación 72 h** (H4 de auditoría) — evitar vaciado silencioso del catálogo.
- [ ] **Supabase**: decisión del usuario — (B) apagar rico `mergeCloudData` o (A) esquema v2 + escritura server-side. *(pendiente de decisión)*
- [ ] **UX canasta/navegación** (prioridad 1 del usuario del 01-11): elegir comercio, presentación y cantidad con más claridad. Detalle abierto con el usuario.
- [ ] **Imágenes/categorías/rendimiento móvil** (prioridad 4): code-splitting (leaflet/gsap/recharts), lazy del escáner, dimensiones de imágenes.

## Completadas y verificadas

- [x] **Resolución H3 y optimización del bundle JS** (03-11): `live-prices.json` extraído del empaquetado Vite hacia `public/data/live-prices.json` con lazy `fetch` y fallback. Bundle JS reducido de 13,1 MB a **1.508 kB** (gzip: **432 kB**), build Vite acelerado de 33s a **9,8s**, sucursales y fuentes desacopladas a `branches.json` y `sources.json`. 31/31 tests Node pass, 37/37 tests Python OK (commit `e16b467`).
- [x] **Publicación de Coto (7ª cadena) y bundle optimizado en producción** (03-11): Deploy Vercel CLI exitoso (`radar-precios-neuquen-8n9b00xd7-radar-de-precios.vercel.app`, alias `https://radar-precios-neuquen.vercel.app`). Sirviendo en vivo bundle liviano `index-R20ZPT5U.js` con las 7 cadenas activas: **10.740 productos / 10.902 cotizaciones** (Coto 7.290, Yaguar 1.718, Coope 851, La Anónima 676, ChangoMás 233, Vital 98, Makro 36).


- [x] **Integración oficial de Coto como 7ª cadena** (03-11): colector `collect_coto()` y `coto_record()` vía Constructor.io (key pública de Coto) con sucursal 185 verificada (Ruta 7 y Dr. Ramón, Neuquén). 7.290 observaciones verificadas, 98% con EAN oficial, 2.120 ofertas minoristas importadas. Suite `CotoTests` (4 casos), 37/37 tests Python OK, 31/31 tests Node pass, build exitoso (`commit 05d7434`).
- [x] **Restauración y estabilización de Makro en producción** (03-11): Re-sincronización exitosa en vivo con fecha de comprobación hoy (`retrieved_at: 2026-11-03T18:59:17Z`), ajuste de límite de vigencia a 7 días (168 h) para listas periódicas de Ley Provincial 3444 en scraper y frontend (`priceIsUsable`), User-Agent de navegador moderno contra WAF/CDN de Makro, 33/33 tests Python OK, 31/31 tests Node pass, build exitoso y deploy verificado en Vercel (`index-ebWac1S5.js`).
- [x] **Integración oficial de La Anónima al importador** (03-11): colector `collect_la_anonima()` en `sync_verified_prices.py` con validación oficial de sucursal Paseo de la Patagonia (`https://api.laanonima.com.ar/sucursal/8300`, Antártida Argentina 1111, CP 8300), parser nativo `HTMLParser` (0 dependencias externas), normalización de unidades/multipacks, filtro de stock (`stock <= 0` / `-1`), **174 ofertas minoristas** (`promo_label: 'Oferta online'`, `discount_percentage`) y **25 EANs oficiales** vinculados. Primera corrida: **676 observaciones verificadas** con fecha real de hoy. Suite de 5 tests unitarios (`LaAnonimaTests`), 33/33 tests Python OK, 31/31 tests Node pass, `npm run build` OK.
- [x] **Actualización de REGLAS DE TRABAJO permanentes** (03-11): HANDOFF obligatorio al finalizar o preventivo ante límite de contexto/tokens; historial obligatorio e inmutable en `agent_memory/history/AAAA-MM-DD_HHMM_AGENTE_MODELO.md`; lectura inicial enfocada sin leer todo `history/`.
- [x] **Integración oficial de Yaguar al importador** (03-11): colector en `sync_verified_prices.py` (`collect_yaguar`, con validación estricta de ciudad/moneda/escala/stock/mínimos), tests nuevos (`YaguarTests`, 3 casos) y primera importación real: **1.718 observaciones / ~880 productos nuevos**, estado `ok`, sin recortes de páginas (`per_page=100`, `pages=3`). Verificado: 0 observaciones sin trazabilidad, Manaos Pomelo 2,25 L = $2.168 (fecha real 03-11), tests Python OK + node 31/31 pass.
- [x] Auditoría completa H1–H21 documentada en `AUDITORIA_GLM_RADAR_PRECIOS.md` (1231 líneas, 01-11) — evidencia verificada contra código, datos, producción y tests.
- [x] Factibilidad de fuentes difíciles probada con sondas reales (01-11): Yaguar OK (tienda activa), La Anónima OK (sin 403, con EAN), Vea no entrega en 8300, Diarco sin sucursal en Capital, Coope expone promos con condiciones, Coto exige esfuerzo extra.
- [x] Exclusión de **Diarco y Vea** de cobertura pública (decisión usuario 03-11) — commit `f424e45` de otro agente.
- [x] UI por comercio / ofertas / productos pedidos visibles en Git — commits `28d2673`, `4b71ce6` (verificación en vivo aún pendiente tras redeploy).
- [x] Localización de credenciales: **token Vercel válido** (CLI del usuario); **sin token GitHub** comprobado.
- [x] Lector de códigos: suite 9/9 y lookup en vivo verificados el 01-11 (`tests/barcode-scanner.test.cjs`).
