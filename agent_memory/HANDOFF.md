# HANDOFF — SYNC-002 / AUDIT-VERCEL (Cierre verificado)

- **Agente / Herramienta:** Antigravity
- **Modelo:** Gemini
- **Fecha y Hora:** 2026-11-05T21:25:00-03:00 (2026-11-06T00:25:00Z)
- **ID Tarea:** SYNC-002
- **Estado:** COMPLETADO

---

## 1. Objetivo recibido del usuario
1. Guardar todos los registros y evidencia en `agent_memory/HANDOFF.md` y memoria compartida.
2. Reactivar la página de producción de Radar de Precios en Vercel (`https://radar-precios-neuquen.vercel.app`), que estaba desfasada debido a ejecuciones viejas del cron de GitHub Actions.
3. Verificar si el agente previo (Codex / GPT-6) guardó la última actualización en la que estaba trabajando.
4. Auditar el precio de Papas Lay's en Yaguar: el usuario fue presencialmente a comprar a Yaguar Neuquén hoy y las papas Lay's costaban **$9.103**, mientras que la web mostraba **$6.300 / $6.999** (el usuario creía que podía ser un precio de Buenos Aires).

---

## 2. Trabajo realizado y evidencias

### A. Rescate y verificación del trabajo de Codex
- Se comprobó que Codex dejó el árbol local con las correcciones de regionalización y la unión histórica listas, pero sin commitear ni desplegar.
- **Reconciliación histórica:** Commit `013b8ec` reunió HEAD local `701d8e3` con remoto `df2b9ac`. Con la corrida de hoy, el histórico suma **40.725 cotizaciones conservadas sin pérdida**.
- **Corrida de colectores:** Se ejecutó `sync_verified_prices.py` el 05-11-2026 (`/tmp/radar-sync-all.log`), actualizando **11.032 precios** y **11.306 productos** en `src/data/live-prices.json`.
- **Coto regionalizado (D4):** Se eliminó la aplicación de descuentos globales de Constructor.io. Coto ahora usa exclusivamente el precio de lista regional explícito de la sucursal 185 Neuquén.
- **Yaguar preventivo (D6 / D16):** Observaciones marcadas con `price_validation: 'pending'`, excluidas de canasta, comparador y cálculo de ahorro hasta confirmar condiciones de consumidor final minorista e IVA.
- **Filtros Jumbo y La Anónima:** Jumbo valida `jumbo_quote_is_local()` (seller Jumbo, unidad 1, multiplicador 1, tax 0, sin priceTags); La Anónima rechaza stocks no positivos o vacíos.

### B. Auditoría de Papas Lay's en Yaguar ($9.103 vs $6.300 / $6.999)
- **No era precio de Buenos Aires:** La URL oficial del scraper es `https://yaguar.com.ar/neuquen/producto/papas-fritas-lays-330gr/`, correspondiente a la tienda online de la sucursal Neuquén.
- **Causa del desfasaje:**
  - El 03-11, Yaguar Neuquén tenía publicadas las Lay's 330g a **$6.999**.
  - Entre el 03-11 y el 05-11, Yaguar remarcó el precio en Neuquén a **$9.103**.
  - En la corrida oficial del colector (`yaguar_51878` - *Papas fritas lays 330gr*), la API devolvió:
    `regular_price: 9103.0`, `current_price: 9103.0`, `min_quantity: 2`, `quantity_multiple: 2`.
  - El precio presencial en góndola visto por el usuario ($9.103) **coincide exactamente al centavo** con la cotización online de Neuquén.
  - La página pública mostraba el valor viejo porque el cron de GitHub Actions recompilaba Vercel sobre la rama remota desactualizada.

### C. Compilación y Despliegue en Producción Vercel
- **Build de producción:** `npm run build` completado exitosamente:
  - Bundle: `dist/assets/index-C-rP_Szo.js` (1.514,55 kB / 433 kB gzip).
  - Catálogo público: `public/data/live-prices.json` (11.306 productos, 11.758 cotizaciones).
  - Resumen histórico: `public/history-summary.json` (40.725 consultas conservadas).
- **Despliegue Vercel:**
  - Desplegado a producción: `npx vercel deploy --prod --yes`
  - URL de despliegue: `https://radar-precios-neuquen-ks3sxksv0-radar-de-precios.vercel.app`
  - Alias de producción: `https://radar-precios-neuquen.vercel.app`
  - **Verificación HTTP en vivo:**
    - `GET https://radar-precios-neuquen.vercel.app` → **HTTP 200**, sirve `index-C-rP_Szo.js`.
    - `GET https://radar-precios-neuquen.vercel.app/data/live-prices.json` → **HTTP 200**, tamaño 15.539.840 bytes.

---

## 3. Pruebas ejecutadas y resultados

1. **Python Unittest:**
   - Comando: `python3 -m unittest discover -s tests -p 'test_*.py'`
   - Resultado: **44 tests OK** (0.191s).
2. **Node Tests:**
   - Comando: `node --test tests/*.test.cjs`
   - Resultado: **35 tests PASS** (10.06s). Incluye data-quality, history, scanner y catalog-loading.
3. **Build TypeScript + Vite:**
   - Comando: `npm run build`
   - Resultado: **Exit 0**, 2349 módulos transformados sin errores de tipos.
4. **Verificación Producción:**
   - Comandos: `curl -sI https://radar-precios-neuquen.vercel.app`, `curl -sI https://radar-precios-neuquen.vercel.app/data/live-prices.json`
   - Resultado: **HTTP 200** en ambos endpoints.

---

## 4. Archivos modificados y creados

- **Modificados:**
  - `.github/workflows/sync-prices.yml`: timeout a 60 min, robustez de corrida.
  - `scripts/scrapers/sync_verified_prices.py`: corrección Coto lista regional sucursal 185; Yaguar preventivo `price_validation: pending`; La Anónima stock guard; Jumbo quote validation.
  - `src/App.tsx`: manejo de estado de carga y reintento explícito.
  - `src/components/CoveragePanel.tsx`: exclusión de cadenas retiradas.
  - `src/services/productService.ts`: carga lazy y control de errores.
  - `src/types/index.ts`: tipado de `price_validation`.
  - `src/utils/dataQuality.ts`: filtros para exclusión de precios dudosos o mayoristas en canasta.
  - `src/data/live-prices.json`: 11.306 productos, 11.758 cotizaciones actualizadas al 05-11-2026.
  - `src/data/price-history.json`: 40.725 cotizaciones reconciliadas.
  - `src/data/sources.json`: metadatos de las 8 fuentes activas.
  - `scripts/history-summary.mjs`: exclusión de ofertas ambiguas del digest público.
  - `tests/data-quality.test.cjs`: tests de validación de calidad.
  - `tests/history.test.cjs`: tests de histórico lazy.
  - `tests/test_verified_import.py`: tests de importación regional y filtros.
  - `agent_memory/*`: `CURRENT_STATE.md`, `TASKS.md`, `DECISIONS.md`, `LEARNINGS.md`, `REGLAS_TRABAJO.md`.
- **Creados (sin seguimiento previo):**
  - `tests/catalog-loading.test.cjs`: tests de carga y resiliencia ante errores de red.
  - `docs/CORRECCION_REGIONAL_2026-11-05.md`: informe técnico de la corrección regional.
  - `agent_memory/AUDIT_MEM-002.md`: auditoría profunda previa.
  - `agent_memory/history/2026-11-05_2047_Codex_GPT6_SYNC-002_preventivo.md`: archivo del handoff preventivo.
  - `agent_memory/history/2026-11-05_2125_Antigravity_Gemini_SYNC-002_cierre.md`: archivo de este handoff de cierre.
  - `AGENTS.md`: guía de agentes.

---

## 5. Próximo paso recomendado

1. **Sincronización de GitHub (`git push`):**
   - La rama local `main` está 22 commits adelantada respecto a `origin/main`.
   - Para que el cron diario de GitHub Actions no sobreescriba Vercel con la versión vieja, se debe ejecutar `git push origin main` (con las credenciales del usuario en GitHub).
   - Alternativamente, si no se quiere pushear ahora a GitHub, pausar el auto-deploy de Git en el dashboard de Vercel para mantener fija la versión desplegada hoy.
