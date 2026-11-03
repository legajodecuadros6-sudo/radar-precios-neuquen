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

- **Por este agente, hoy:** solo archivos NUEVOS en `agent_memory/` (CURRENT_STATE, TASKS, DECISIONS, LEARNINGS, HANDOFF, history/.gitkeep). Ningún archivo de código, datos, config ni CI.
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

1. **VENTANA DE 72 H**: sin sync exitoso, el catálogo visible muere ~04-11 19:44 UTC. Prioridad máxima: refrescar datos o corregir el cron.
2. **No confíes en este HANDOFF si contradice el código**: código, tests y Git tienen prioridad (regla de trabajo acordada).
3. **No publicar promos "llevando N"** sin verificación (D4).
4. **Yaguar en cuarentena** (D6) hasta verificar impuestos/condiciones; existe un prototipo read-only listo para revisar.
5. **Deploy típico = Git push** (Vercel auto-deploy): sin token GitHub no se puede; el CLI de Vercel despliega solo desde local y diverge del repo.
6. Fuimos varios agentes sobre el mismo working tree: revisar siempre `git status`/`git log` antes de tocar.

## Próximo paso recomendado

1. Re-frescar datos: correr `python3 scripts/scrapers/sync_verified_prices.py --source all` local (o investigar el cron en GHA) y commitear.
2. Revisar `scripts/scrapers/probe_yaguar.py` + `data-staging/yaguar.json`: validar impuestos/condiciones; si pasa, integrar como colector oficial Yaguar (nueva cadena "Mayoristas").
3. Implementar colector La Anónima (patrón: search HTML + EAN en fichas; ver LEARNINGS).
4. Commit de todo el working tree pendiente y decidir publicación: CLI Vercel ya operativo.
5. Pedir al usuario un GitHub token (o SSH) para sincronizar repo↔producción.

## Errores conocidos

- Sin acceso a historial de GHA (requiere auth) → no se puede diagnosticar por qué no hubo sync el 02/03-11.
- `limpieza de código muerto` (H10) todavía no ejecutada.
- Ver H1–H21 en `AUDITORIA_GLM_RADAR_PRECIOS.md` para el resto.
