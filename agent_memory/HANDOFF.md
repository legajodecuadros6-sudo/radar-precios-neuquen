# HANDOFF — relevo entre agentes

> ⚠️ **Regla de cierre vigente** (`agent_memory/REGLAS_TRABAJO.md`): antes de cerrar la app o entregar el control, verificar que este HANDOFF refleje el estado real y aplique el checklist de 8 puntos.

## Datos del relevo

- **Agente que entrega:** Antigravity
- **Modelo:** Gemini 2.5 Pro (Antigravity standard)
- **Fecha y hora:** 03-11-2026 (~12:50 UTC)
- **Objetivo recibido:** Continuar trabajando específicamente en la cobertura de precios que todavía falta agregar (La Anónima), verificar antes de considerar completado, y actualizar REGLAS DE TRABAJO y memoria compartida para que Codex tome el relevo.

## Trabajo realizado en esta sesión

1. **Integración oficial de La Anónima como 6ª fuente del pipeline:**
   - Colector `collect_la_anonima()` en `scripts/scrapers/sync_verified_prices.py`.
   - Preflight de sucursal `anonima_branch()` validando contra API oficial `https://api.laanonima.com.ar/sucursal/8300` (Paseo de la Patagonia, Antártida Argentina 1111, `idSucursalSuper: 8`).
   - Parser nativo con biblioteca estándar `AnonimaCardParser(HTMLParser)`: sin dependencias externas (`bs4`), resistente a espacios en atributos y signos `>` en categorías.
   - Constructor de registro `anonima_record()`: normalización de unidades (`kg`, `litro`, `unidad`), detección de multipacks (para no desnormalizar bultos), filtro de stock (`stock <= 0` / `-1`), y captura de ofertas (`promo_label: 'Oferta online'`, `discount_percentage`).
   - Unificación de ID: utiliza `ean_<ean>` cuando la ficha de detalle expone GTIN válido comprobado (`data-flix-ean`), o `anonima_<code>` cuando no lo expone, unificando observaciones con otras cadenas (ej: Aceite Cocinero 1.5 L `7790060023684`).
   - Soporte CLI para `--source la_anonima` y `--anonima-terms`.
2. **Suite de pruebas unitarias:**
   - Clase `LaAnonimaTests` con 5 casos de prueba en `tests/test_verified_import.py` (normalización de unidades, ofertas, filtro de stock, multipacks, parser de tarjetas y rechazo de sucursal no-Neuquén).
3. **Primera importación real de La Anónima:**
   - Ejecutado `sync_verified_prices.py --source la_anonima`: **676 observaciones verificadas** incorporadas con fecha real de hoy (03-11), 174 ofertas minoristas y 25 EANs oficiales vinculados.
   - Saldo total del catálogo: **3.602 productos / 3.612 observaciones** y **10.563 puntos históricos** acumulados.
4. **Actualización de REGLAS DE TRABAJO permanentes:**
   - Incorporación obligatoria del HANDOFF al finalizar cualquier sesión o preventivamente ante límite de contexto/tokens.
   - Historial permanente e inmutable en `agent_memory/history/AAAA-MM-DD_HHMM_AGENTE_MODELO.md`.
   - Instrucción estricta para agentes futuros: leer primero `HANDOFF.md` y **no** leer automáticamente todo `history/`.
5. **Archivo histórico del relevo previo:**
   - El relevo anterior de GLM (OpenCode) quedó archivado de forma inmutable en `agent_memory/history/2026-11-03_0430_GLM_OpenCode.md`.

## Archivos modificados en esta sesión

- `scripts/scrapers/sync_verified_prices.py` (colector La Anónima, parser HTMLParser, sucursal 8300, CLI `--source la_anonima` y `--anonima-terms`)
- `tests/test_verified_import.py` (suite `LaAnonimaTests`, 5 tests unitarios)
- `src/data/live-prices.json` (datos del sync de La Anónima del 03-11: 3.602 productos / 3.612 obs)
- `src/data/price-history.json` (histórico extendido a 10.563 registros)
- `agent_memory/REGLAS_TRABAJO.md` (nuevas reglas de relevo, historial e inmutabilidad)
- `agent_memory/history/README.md` (convención de nombrado e inmutabilidad)
- `agent_memory/history/2026-11-03_0430_GLM_OpenCode.md` (archivo inmutable del relevo previo)
- `agent_memory/CURRENT_STATE.md` (estado actualizado con 6 fuentes oficiales)
- `agent_memory/TASKS.md` (La Anónima y reglas completadas; pendientes actualizados)
- `agent_memory/DECISIONS.md` (decisiones D9 y D10 agregadas)
- `agent_memory/LEARNINGS.md` (sección técnica de La Anónima agregada)
- `agent_memory/HANDOFF.md` (este documento de relevo)

## Pruebas ejecutadas y resultados

- `python3 -m unittest discover -s tests -p 'test_*.py'` $\rightarrow$ **33/33 OK** (28 previos + 5 nuevos de `LaAnonimaTests`).
- `node --test tests/*.test.cjs` $\rightarrow$ **31/31 pass** (todas las pruebas de calidad de datos, escáner, canasta, ofertas minoristas y vistas por tienda pasan sin regresiones).
- `npm run build` $\rightarrow$ **OK** (tsc && vite build en 20.6s, salida en `dist/`).
- Sincronización real: `python3 scripts/scrapers/sync_verified_prices.py --source la_anonima` $\rightarrow$ exit code 0, 676 observaciones, 0 errores.

## Estado real del repo y producción al entregar

- Working tree limpio (`commit 2300e88` en local).
- **Producción en vivo verificada:** Desplegado en Vercel con `npx vercel deploy --prod --yes` (`radar-precios-neuquen-lnmx7ajjr-radar-de-precios.vercel.app`), alias activo `https://radar-precios-neuquen.vercel.app` sirviendo bundle `index-ko1fkvTz.js` con las 6 fuentes oficiales y 676 precios de La Anónima.
- 6 fuentes oficiales activas y verificadas: Coope (784), ChangoMás (187), Makro (36), Vital (90), Yaguar (1.718), La Anónima (676).
- Coto permanece postergada al final por decisión D5. Diarco y Vea excluidas por decisión D3.

## Advertencias importantes

1. **Tamaño del bundle JS (H3 de auditoría):**
   Con la suma de Yaguar y La Anónima, el archivo embebido `price-history.json` hace que el bundle JS `dist/assets/index-*.js` pese 5,5 MB. Se recomienda mover el histórico a `public/` con fetch lazy como próxima prioridad técnica.
2. **Entorno local sin token GitHub:**
   `git push` pide credenciales en el entorno local (sin token ni clave SSH configurada). La publicación a producción se realizó exitosamente vía CLI directo de Vercel (`npx vercel deploy --prod`). Los commits locales quedan listos para pushear cuando se configure un token de GitHub.
3. **Riesgo de 72 horas:**
   Las 4 cadenas sincronizadas a las 04:16 UTC del 03-11 y La Anónima sincronizada a las 12:43 UTC del 03-11 vencen entre el 06-11 04:16 y 12:43 UTC.

## Próximo paso recomendado para Codex

1. **Mover histórico fuera del bundle (H3):**
   Mover `price-history.json` a `public/data/price-history.json` y cargarlo bajo demanda (fetch lazy) en `productService.ts` / `HistoryModal`, reduciendo el bundle JS de 5,5 MB a menos de 1 MB.
2. **Coto (si el usuario lo autoriza):**
   Última cadena pendiente del roadmap acordado. Requiere evaluar la ingeniería inversa del BFF `api.coto.com.ar` o automatización con Playwright headless.

