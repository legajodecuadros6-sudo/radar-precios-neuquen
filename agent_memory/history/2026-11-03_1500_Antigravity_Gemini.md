# HANDOFF — relevo entre agentes

> ⚠️ **Regla de cierre vigente** (`agent_memory/REGLAS_TRABAJO.md`): antes de cerrar la app o entregar el control, verificar que este HANDOFF refleje el estado real y aplique el checklist de 8 puntos.

## Datos del relevo

- **Agente que entrega:** Antigravity
- **Modelo:** Gemini 2.5 Pro (Antigravity standard)
- **Fecha y hora:** 03-11-2026 (~18:00 UTC / 15:00 ART)
- **Objetivo recibido:** Auditoría técnica de Radar de Precios sobre la desaparición de precios de Makro de la página, causa raíz, recorrido completo de datos, verificación de antecedente de 71 productos (28/08/2026), regla de conservación de precios y plan de reparación para Codex. En esta etapa: **sin modificar código, precios ni producción**.

## Trabajo realizado en esta sesión

1. **Auditoría forense completa del ciclo de vida del dato Makro:**
   - Inspección del recorrido: `https://makro.com.ar/canastabasicaneuquen/` $\rightarrow$ `scripts/scrapers/sync_verified_prices.py` $\rightarrow$ `src/data/live-prices.json` y `price-history.json` $\rightarrow$ `src/utils/dataQuality.ts` (`priceIsUsable`) $\rightarrow$ `src/App.tsx` / `catalogViews.ts` $\rightarrow$ `src/components/CoveragePanel.tsx` $\rightarrow$ Producción en Vercel.
2. **Determinación concluyente de causa raíz:**
   - Los precios de Makro **NO fueron eliminados ni sobrescritos**. Están intactos en `src/data/live-prices.json` (36 productos, 36 observaciones), `src/data/price-history.json` (36 registros históricos) y `public/history-summary.json` (36 productos en serie diaria).
   - Su desaparición de la pantalla es provocada por el filtro client-side `priceIsUsable(o)` (`dataQuality.ts:19` y `App.tsx:39`) que descarta toda cotización con más de 72 horas de antigüedad (`now - time > 72 * 3600 * 1000`).
   - La lista de Makro tiene `query_date: "2026-10-31T05:01:00-03:00"`. La ventana de 72 horas venció hoy **03-11-2026 a las 05:01 ART (08:01 UTC)**. A partir de ese momento, `priceIsUsable` evaluó en `false` para el 100% de las observaciones de Makro, volviéndolas invisibles en el catálogo, en los filtros y en el changuito.
3. **Comprobación del antecedente de 71 productos (28/08/2026):**
   - Se localizaron físicamente los archivos originales en `.user_uploaded/media_1792888206651.csv` y `.user_uploaded/media_1792888206663.txt`.
   - Contienen exactamente **71 filas de productos** con fecha `Viernes 28 De Agosto De 2026, 11:00 hs`.
   - Dichos 71 productos **nunca fueron importados al catálogo oficial** porque al crearse el importador trazable (31/10) tenían más de 64 días de antigüedad y violaban la regla de 72 horas.
   - Al cruzar los 71 códigos: 33 fueron re-importados en la lista del 31/10; 38 quedaron fuera (16 filtrados por regex de normalización de unidades/multipacks y 22 porque Makro no los incluyó en la lista del 31/10).
4. **Diseño de la Regla Permanente de Conservación de Precios:**
   - Propuesta de arquitectura con **Estado Tripartito de Cotizaciones**:
     1. *Vigente / Confirmado* ($\le 72$ h): participa en optimizador de changuito y cálculo de mejor precio.
     2. *Precio de Referencia / En Revisión* ($> 72$ h): visible en tarjeta y catálogo con badge *"Precio de referencia al 31/10 · Pendiente de actualización por Makro"*, excluido del cálculo de mejor precio para evitar inducción a error.
     3. *Histórico / Archivado*: serie temporal gráfica en modal de histórico (90 días).
5. **Auditoría general a otras cadenas:**
   - Se documentó el riesgo sistémico de "efecto bloque": si una fuente falla 3 días consecutivos en el cron, todos sus productos desaparecen simultáneamente de la web.
   - Makro es la más vulnerable por ser la única fuente dependiente de actualización manual por parte del supermercadista en una página estática (y no de una API de stock).
6. **Preservación inmutable del handoff previo:**
   - El relevo anterior quedó archivado en `agent_memory/history/2026-11-03_0955_Antigravity_Gemini.md`.

## Archivos examinados durante la auditoría

- `src/data/live-prices.json` (3.602 productos, 3.612 obs; 36 obs de Makro al 31-10 confirmadas intactas)
- `src/data/price-history.json` (10.563 registros históricos; 36 de Makro al 31-10 confirmados)
- `public/history-summary.json` (36 productos de Makro presentes en la serie diaria)
- `src/utils/dataQuality.ts` (función `priceIsUsable`, corte estricto `now - time <= 72 * 3600 * 1000`)
- `src/App.tsx` (líneas 39 y 62, filtro `priceIsUsable` al inicializar estado)
- `src/utils/catalogViews.ts` (línea 23, filtro `priceIsUsable` en vistas de catálogo y tiendas)
- `src/components/CoveragePanel.tsx` (líneas 8 a 22, alerta de cotizaciones vencidas y estado 'Sin precios verificados')
- `src/utils/priceAnalyzer.ts` (línea 27, exclusión de cotizaciones vencidas)
- `src/utils/basketOptimizer.ts` (línea 13, exclusión de cotizaciones vencidas)
- `scripts/scrapers/sync_verified_prices.py` (líneas 197-247, colector `parse_makro`, extracción de fecha HTML y excepción `ValueError` ante listas > 72 h)
- `tests/test_verified_import.py` (clase `MakroTests`, líneas 98-121)
- `docs/REVISION_AUDITORIA_GLM.md`, `docs/DATOS_Y_COBERTURA.md`, `docs/PENDIENTES_Y_COBERTURA.md`
- `.user_uploaded/media_1792888206651.csv` y `.user_uploaded/media_1792888206663.txt` (antecedente de los 71 productos de Makro al 28-08)

## Evidencias encontradas

1. `now - Date.parse("2026-10-31T05:01:00-03:00") = 81.68` horas ($> 72$ h) $\rightarrow$ `priceIsUsable` retorna `false`.
2. `CoveragePanel.tsx` muestra alerta: *"Hay 36 cotizaciones vencidas en 1 cadena(s)"* y recuadro gris *"Sin precios verificados"*.
3. Endpoint de Makro (`https://makro.com.ar/canastabasicaneuquen/`): responde `HTTP/1.1 200 OK` en HEAD, pero GET del cuerpo sufre timeout intermitente en la infraestructura de Makro (Apache + BunnyCDN / W3 Total Cache).
4. El importador `sync_verified_prices.py:213` bloquea la recolección si la fecha del HTML tiene $> 72$ h, provocando que la corrida diaria marque a Makro con error en vez de registrar su estado.

## Estado real del repo y producción

- **Repositorio:** Clean working tree. No se realizaron modificaciones de código ni de datos en esta auditoría.
- **Producción:** Despliegue en Vercel alineado con los datos locales (bundle `index-ko1fkvTz.js`).

## Próximo paso recomendado para Codex

1. **Revisar y ejecutar el plan de reparación de conservación de precios (Sección 7 del informe de auditoría):**
   - Migrar `priceIsUsable` a evaluación de 3 estados (`fresh`, `stale`, `invalid`).
   - Permitir que las cotizaciones `stale` se muestren en el catálogo y ficha de producto con badge de "Precio de referencia anterior" y fecha visible.
   - Mantener la exclusión de precios `stale` del optimizador de changuito y mejor precio garantizado.
   - En `sync_verified_prices.py`, manejar listas de Makro $> 72$ h sin abortar la ejecución, registrando la observación con estado `stale`.
   - Ajustar los tests correspondientes en `tests/test_verified_import.py` y `tests/data-quality.test.cjs`.
2. **Tarea H3 pendiente:** Mover `price-history.json` fuera del bundle JS principal a `public/data/`.


