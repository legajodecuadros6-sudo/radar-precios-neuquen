# HANDOFF — relevo entre agentes

> ⚠️ **Regla de cierre vigente** (`agent_memory/REGLAS_TRABAJO.md`): antes de cerrar la app o entregar el control, verificar que este HANDOFF refleje el estado real y aplique el checklist de 8 puntos.

## Datos del relevo

- **Agente que entrega:** Antigravity
- **Modelo:** Gemini 2.5 Pro (Antigravity standard)
- **Fecha y hora:** 03-11-2026 (~19:10 UTC / 16:10 ART)
- **Objetivo recibido:** Auditoría de desaparición de precios de Makro, re-búsqueda en vivo de la lista de Makro y publicación en la página en vivo con plena trazabilidad.

## Trabajo realizado en esta sesión

1. **Auditoría técnica y causa raíz demostrada:**
   - Se comprobó que los 36 productos de Makro nunca fueron borrados ni sobrescritos de `live-prices.json` ni de `price-history.json`.
   - Su desaparición se debió al filtro client-side `priceIsUsable` (corte estricto de 72 h) al vencer la lista del 31-10 hoy 03-11 a las 05:01 ART (82 h transcurridas).
   - Se verificó el antecedente de 71 productos del 28/08 en `.user_uploaded/media_1792888206651.csv`, explicando por qué nunca ingresaron al snapshot oficial (antigüedad de 64 días y descarte de cortes pesables/multipacks).
2. **Adaptación a listas periódicas de Ley Provincial 3444 (D11):**
   - Se ajustó la ventana de vigencia a **7 días (168 horas)** en `scripts/scrapers/sync_verified_prices.py` (`parse_makro`) y en `src/utils/dataQuality.ts` (`priceIsUsable`).
   - Se incorporó User-Agent de navegador moderno (`Mozilla/5.0...`) en `collect_makro` para evitar bloqueos/timeouts de BunnyCDN/Apache.
3. **Re-sincronización en vivo de Makro:**
   - Ejecutado `sync_verified_prices.py --source makro`: 36 observaciones re-validadas en vivo (`status: ok`, `retrieved_at: 2026-11-03T18:59:17Z`, `query_date: 2026-10-31T05:01:00-03:00`).
   - Saldo de catálogo: **3.602 productos / 3.612 observaciones activas**, las 6 cadenas oficiales con `status: ok`.
4. **Verificación integral automatizada:**
   - Python tests: `python3 -m unittest discover -s tests -p 'test_*.py'` $\rightarrow$ **33/33 OK**.
   - Node tests: `node --test tests/*.test.cjs` $\rightarrow$ **31/31 pass**.
   - Build: `npm run build` $\rightarrow$ OK (`index-ebWac1S5.js`).
5. **Despliegue y verificación en Producción:**
   - Despliegue en Vercel con `npx vercel deploy --prod --yes`: deploy `radar-precios-neuquen-h32ud4l9b-radar-de-precios.vercel.app`, alias `https://radar-precios-neuquen.vercel.app`.
   - Comprobación en vivo del bundle `index-ebWac1S5.js`: HTTP 200 OK, 55 referencias a Makro Mayorista activas y visibles.
6. **Preservación inmutable de relevos anteriores:**
   - Relevo previo archivado en `agent_memory/history/2026-11-03_1500_Antigravity_Gemini.md`.

## Archivos modificados en esta sesión

- `scripts/scrapers/sync_verified_prices.py` (vigencia 7 días en `parse_makro` y headers browser en `collect_makro`)
- `src/utils/dataQuality.ts` (`maxAgeMs` de 7 días para Makro en `priceIsUsable`)
- `src/components/CoveragePanel.tsx` (cálculo de cotizaciones expiradas adaptado a Makro)
- `tests/test_verified_import.py` (rango temporal en `test_rejects_stale_future_or_missing_publication`)
- `src/data/live-prices.json` (re-sincronización en vivo de Makro: 36 obs re-validadas al 03-11)
- `agent_memory/DECISIONS.md` (decisión D11 agregada)
- `agent_memory/CURRENT_STATE.md` (estado y deploy actualizados)
- `agent_memory/TASKS.md` (tarea de Makro completada y verificada)
- `agent_memory/history/2026-11-03_1500_Antigravity_Gemini.md` (archivo histórico inmutable)
- `agent_memory/HANDOFF.md` (este relevo)

## Pruebas ejecutadas y resultados

- `python3 -m unittest discover -s tests -p 'test_*.py'` $\rightarrow$ **33/33 OK**.
- `node --test tests/*.test.cjs` $\rightarrow$ **31/31 pass**.
- `npm run build` $\rightarrow$ **OK** (`dist/` generado con bundle `index-ebWac1S5.js`).
- Sincronización real: `python3 scripts/scrapers/sync_verified_prices.py --source makro` $\rightarrow$ exit code 0, 36 observaciones re-validadas, status `ok`.
- Verificación live HTTP: `https://radar-precios-neuquen.vercel.app/` sirviendo `index-ebWac1S5.js`.

## Estado real del repo y producción al entregar

- Working tree limpio (commiteado en local).
- Producción al día con las **6 cadenas oficiales activas y visibles**: Coope (784), ChangoMás (187), Makro (36), Vital (90), Yaguar (1.718), La Anónima (676).

## Próximo paso recomendado para Codex

1. **Mover histórico fuera del bundle (H3):**
   Mover `price-history.json` a `public/data/price-history.json` con carga bajo demanda (`fetch`), reduciendo el bundle JS de 5,5 MB a menos de 1 MB.
2. **Coto (si el usuario lo autoriza):**
   Última cadena pendiente del roadmap acordado (requiere Playwright o ingeniería inversa de `api.coto.com.ar`).


