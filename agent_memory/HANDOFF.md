# HANDOFF — relevo entre agentes

## Datos del relevo

- **Agente que entrega:** GLM (OpenCode)
- **Fecha:** 03-11-2026 (~04:30 UTC)
- **Objetivo en curso:** en orden de dificultad acordado con el usuario → **Yaguar (CERRADA ✅) → La Anónima → Coto (la más difícil, al final)**.

## Trabajo realizado en la última sesión de este agente

1. **Yaguar integrada como 5ª fuente oficial** del pipeline: colector `collect_yaguar()` en `scripts/scrapers/sync_verified_prices.py` (valida ciudad `/neuquen/`, ARS escala entera, stock, mínimos/múltiplos documentados por precio; sucursal "Yaguar Neuquén · tienda online" sin coordenadas inventadas; posicionada como mayorista, igual que Makro). 3 tests nuevos (`YaguarTests`).
2. **Primera importación real Yaguar: 1.718 observaciones** (2.880 productos / 2.886 obs totales), estado `ok`, sin recortes (`per_page=100, pages=3`).
3. **Sync completo `--source all` ejecutado el 03-11 04:16 UTC**: Coope 784, ChangoMás 187, Vital 90 refrescados con fecha real de hoy → riesgo de 72 h de las 4 cadenas originales resuelto (vencen 06-11 04:16 UTC). Makro NO se renovó: su lista sigue fechada 10-31 05:01 UTC (vence hoy 05:01; se oculta hasta que Makro publique lista nueva — comportamiento honesto, no bug).
4. **Commits + deploy en producción (autorizados por el usuario por CLI)**: `475545a` (feat Yaguar), `43b47f6` (docs+memoria), `ace4eaa` (sync completo), `14fdf49` (memoria). Deploy Vercel CLI READY, alias **https://radar-precios-neuquen.vercel.app**; bundle verificado: `yaguar_82303` (Manaos Pomelo 2,25 L = $2.168) presente.

## Archivos modificados (por este agente, 03-11)

- `scripts/scrapers/sync_verified_prices.py` (colector Yaguar + `--source` yaguar)
- `tests/test_verified_import.py` (clase `YaguarTests`, 3 casos)
- `src/data/live-prices.json` / `price-history.json` (datos del sync 03-11)
- `src/components/CoveragePanel.tsx` (nota de Yaguar actualizada al estado integrado)
- `src/App.tsx` (accesos rápidos, cambio ya existente en disco de otro agente, conservado)
- `AUDITORIA_GLM_RADAR_PRECIOS.md` (§22 delta 03-11)
- `agent_memory/*` (esta memoria)
- Historial de probe conservado: `scripts/scrapers/probe_yaguar.py` + `tests/test_yaguar_probe.py` + `data-staging/yaguar.json` (ya no se usa en CI; el paso se quitó del workflow).

## Pruebas ejecutadas y resultados (03-11, después de los cambios)

- `python3 -m unittest discover -s tests -p 'test_*.py'` → **28/28 OK**.
- `node --test tests/*.test.cjs` → **31/31 pass** (nota: un test .cjs ejecuta el sync en directorio temporal e imprime un JSON "Fuente caída" — es parte del test, no toca los datos reales).
- `npm run build` → OK (45 s).
- Verificación de producción: GET `assets/index-*.js` con `yaguar` ×15.045 y obs sin falta de trazabilidad (`is_verified` + `source_url` oficial en el 100%).

## Estado real del repo al entregar (verificado con git)

- HEAD: `14fdf49 docs(memoria)...` con previos `ace4eaa`, `43b47f6`, `475545a`, `f424e45`. **Working tree limpio.**
- Workflow `.github/workflows/sync-prices.yml` en su estado original (cron 11:00 UTC; sin paso de probe).
- Producción = working tree de hoy (deploy CLI). **GitHub no sincronizado** (sin token).

## Advertencias importantes

1. **Riesgo recurrente de 72 h**: los datos de 4 cadenas vencen **06-11 ~04:16 UTC**. El sync diario debe correr (cron GHA 11:00 UTC no está confirmado que funcione; históricamente falló el 02/03-11). Si falla, sincronizar local. La regla **no borra datos** — solo los oculta de la vista (`priceIsUsable`).
2. **Makro**: la fecha de su dato es la de la **lista publicada**, no la de la corrida. Lista vieja → obs vencidas por diseño hasta que Makro publique una nueva.
3. **No confíes en este HANDOFF si contradice el código**: código, tests y Git tienen prioridad (regla de trabajo acordada).
4. **No publicar promos "llevando N"** sin verificación (D4).
5. **Yaguar publicada como tienda mayorista** (disclaimer en nota de cada precio): mantenerlo en cualquier cambio de UI.
6. **GitHub sin token**: el push falla; commits locales `475545a…14fdf49` aún no en el remoto. Vercel CLI del usuario sí autenticado (deploy directo disponible). Consecuencia: deploy CLI diverge del repo hasta sincronizar.
7. Fuimos varios agentes sobre el mismo working tree: revisar siempre `git status`/`git log` antes de tocar.

## Próximo paso recomendado

1. **La Anónima** (siguiente fuente en dificultad; factibilidad probada el 01-11: HTML `data-precio` + EAN en ficha de detalle; ver LEARNINGS.md) — colector diseño similar a Yaguar.
2. Verificar por qué el cron de GHA no corrió el 02/03-11 (requiere token GitHub o revisar en la web de GHA con el usuario).
3. Coto al final (DES6): requiere Playwright o ingeniería inversa del BFF. No iniciar sin mandato nuevo del usuario.
4. Bundle ya pesa 4,7 MB con 1.718 obs nuevas de Yaguar y crece por día → mover histórico fuera del bundle (H3) se vuelve prioritario antes de agregar más cadenas.
5. Cobertura EAN: Yaguar no expone EAN en la Store API (skus internos). La Anónima es la vía realista de EAN (fichas).

## Errores conocidos

- Sin acceso a API de GHA (historial de corridas) sin token.
- `limpieza de código muerto` (H10) todavía no ejecutada.
- Ver H1–H21 en `AUDITORIA_GLM_RADAR_PRECIOS.md` para el resto.
