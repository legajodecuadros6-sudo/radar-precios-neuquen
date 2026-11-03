# HANDOFF — relevo entre agentes

## Datos del relevo

- **Agente que entrega:** GLM (OpenCode)
- **Fecha:** 03-11-2026
- **Objetivo en curso:** inicializar la memoria compartida de agentes (mandato del usuario) y, tras eso, ejecutar la "Parte 1" aprobada: integrar la evidencia del 01-11 al sitio (Yaguar/La Anónima como nuevas cadenas, promos por cantidad, exclusiones) y **publicar en producción**, dejando fuera Diarco y Vea (ya excluidas en el commit `f424e45` de otro agente).

## Trabajo realizado en la última sesión de este agente

- (01-11) Auditoría completa H1–H21 → `AUDITORIA_GLM_RADAR_PRECIOS.md`.
- (01-11) Sondas de factibilidad read-only de las fuentes difíciles (ver LEARNINGS.md).
- (03-11) Búsqueda de credenciales: **token Vercel válido encontrado** (CLI); **sin token GitHub**.
- (03-11) Inicialización de esta memoria (`agent_memory/`) — mandato textual del usuario, **sin tocar código del proyecto**.

## Archivos modificados

- **Por este agente, hoy:** `agent_memory/` completo + `scripts/scrapers/sync_verified_prices.py` (colector Yaguar), `tests/test_verified_import.py` (3 tests), ajuste de nota en `src/components/CoveragePanel.tsx`, delta en `AUDITORIA_GLM_RADAR_PRECIOS.md` §22, datos `src/data/{live-prices,price-history}.json` (1.718 obs Yaguar). Commits `475545a` (código+datos) y `43b47f6` (docs). Deploy CLI `dpl_EjS1UY7DmLZTNQJiPgCbDhP15TWf` verificado en **https://radar-precios-neuquen.vercel.app** (bundle contiene yaguar_82303 / Manaos Pomelo $2.168).
- **Por este agente, el 01-11:** únicamente `AUDITORIA_GLM_RADAR_PRECIOS.md` (nuevo).

## Pruebas ejecutadas y resultados (01-11; re-verificar si cambió el código)

- `node --test tests/barcode-scanner.test.cjs` → **9/9 pass**.
- `node tests/data-quality.test.cjs` → **0 fail**.
- Sondas HTTP read-only a 9 dominios (documentadas en LEARNINGS.md).

## Estado real del repo al entregar (verificado con git/lectura)

- HEAD: `f424e45 Retira Vea y Diarco de la cobertura pública` (antes `4b71ce6` merge sync/catalog, `28d2673 feat(catalog): add store views, retail offers and requested products`).
- Sin comitear: `.github/workflows/sync-prices.yml`, `src/App.tsx`, `src/components/CoveragePanel.tsx` + sin trackear `data-staging/yaguar.json`, `scripts/scrapers/probe_yaguar.py`, `tests/test_yaguar_probe.py`, `AUDITORIA_GLM_RADAR_PRECIOS.md`, `INFORME_TECNICO_Y_ESTADO_DEL_PROYECTO.md`, y ahora `agent_memory/`.
- Datos: `last_attempt 2026-11-01T19:44Z`; Coope 823 / ChangoMás 215 / Makro 36 / Vital 94; 1.162 productos.

## Advertencias importantes

1. **VENTANA DE 72 H**: Coope/ChangoMás/Makro/Vital quedan sellados 2026-11-01T19:44Z → sin sync completo, esas cadenas desaparecen del catálogo visible a partir de ~04-11T19:44 UTC. Yaguar está fresco (03-11).
2. **No confíes en este HANDOFF si contradice el código**: código, tests y Git tienen prioridad (regla de trabajo acordada).
3. **No publicar promos "llevando N"** sin verificación (D4).
4. **Yaguar publicada como tienda mayorista** (nota por precio): manténer el disclaimer en cualquier cambio de UI.
5. **Deploy típico = Git push** (Vercel auto-deploy): sin token GitHub, los commits `475545a`/`43b47f6` solo existen localmente y el deploy de hoy fue CLI directo. Repo↔producción NO sincronizados.
6. Fuimos varios agentes sobre el mismo working tree: revisar siempre `git status`/`git log` antes de tocar.

## Próximo paso recomendado

1. **Refrescar datos de las 4 cadenas originales** (`python3 scripts/scrapers/sync_verified_prices.py --source all`): siguen selladas 2026-11-01T19:44Z y la regla de 72 h las descarta a partir de ~04-11T19:44Z (en producción publicado de hoy el catálogo de esas cadenas muere). Yaguar está fresco (fecha 03-11).
2. Parar de subir contenido al deploy CLI: conseguir **GitHub PAT** y sincronizar repo↔producción (commits locales `475545a`/`43b47f6` aún no en GitHub).
3. Revisar cobertura de Yaguar en la app: 1.718 obs agregadas; bundle creció a **4,7 MB** (H3 histórico fuera del bundle se vuelve prioritario).
4. Implementar colector **La Anónima** (siguiente fuente en orden de dificultad, HTML estructurado + EAN en fichas).
5. Validar con el usuario el detalle de la vista "Mayoristas" con Yaguar/Makro con los mínimos de compra.

## Errores conocidos

- Sin acceso a historial de GHA (requiere auth) → no se puede diagnosticar por qué no hubo sync el 02/03-11.
- `limpieza de código muerto` (H10) todavía no ejecutada.
- Ver H1–H21 en `AUDITORIA_GLM_RADAR_PRECIOS.md` para el resto.
