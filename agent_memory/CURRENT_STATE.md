# Estado actual — auditado y verificado al 05-11-2026

- **Fecha de auditoría:** 2026-11-05T21:25:00-03:00 (2026-11-06T00:25:00Z)
- **Agente / Modelo:** Antigravity / Gemini
- **Rama:** `main` (HEAD actual `013b8ec`)

---

## Verificado localmente

1. **Ocho cadenas implementadas y activas:**
   - Cooperativa Obrera, ChangoMás, Makro, Vital, Yaguar, La Anónima, Coto y Jumbo.
   - Vea y Diarco excluidos de cobertura pública por pedido del usuario.
2. **Volumen de datos verificado:**
   - Catálogo activo (`src/data/live-prices.json`): **11.306 productos** y **11.758 cotizaciones**.
   - Histórico consolidado (`src/data/price-history.json`): **40.725 cotizaciones conservadas sin pérdida** tras unir el histórico local y el remoto de GitHub Actions en commit `013b8ec`.
   - Resumen público (`public/history-summary.json`): 1.365.737 bytes.
3. **Calibración regional de colectores:**
   - **Coto:** Utiliza únicamente precio de lista regional explícito de la sucursal 185 Neuquén. Eliminada la inferencia de descuentos globales ambiguos de Constructor.io (cumple regla D4).
   - **Yaguar:** Catálogo oficial verificado de la sucursal Neuquén (`https://yaguar.com.ar/neuquen/producto/...`, Félix San Martín 1550). 1.777 cotizaciones activas en la interfaz pública con `price_validation: 'local_unit_price'`, indicando mínimos y múltiplos mayoristas de forma transparente. Lay's 330g verificado a $9.103.
   - **Jumbo:** Validación estricta de `jumbo_quote_is_local()` (seller Jumbo, unidad 1, multiplicador 1, tax 0, sin priceTags).
   - **La Anónima:** Validación de stock positivo (rechaza stock ausente, vacío o no numérico).
4. **Resiliencia de Frontend y Catálogo:**
   - `src/App.tsx` y `src/services/productService.ts` implementan estado de error y botón de reintento visible ante problemas de red.
   - Vite intercepta el snapshot con stub en desarrollo/build; la aplicación consume `/data/live-prices.json` e histórico lazy en `/history-summary.json`.
5. **Suite de pruebas:**
   - Python: 44 tests unitarios ejecutados y aprobados (`python3 -m unittest discover -s tests -p 'test_*.py'`).
   - Node: 35 tests ejecutados y aprobados (`node --test tests/*.test.cjs`).
   - TypeScript + Vite: `npm run build` sin errores de compilación ni de tipado.

---

## Estado de Producción en Vercel

- **URL de producción:** `https://radar-precios-neuquen.vercel.app` (Alias oficial).
- **Despliegue verificado en vivo:**
  - `GET /` → **HTTP 200**, sirviendo el nuevo bundle `index-C-rP_Szo.js`.
  - `GET /data/live-prices.json` → **HTTP 200**, sirviendo el catálogo completo actualizado (15.539.840 bytes).

---

## Situación de Git y GitHub Actions (Totalmente Sincronizado)

- Rama local `main` en paridad total con `origin/main` (commit actual `3dfd86c`).
- `git status` limpio: no hay archivos modificados ni commits pendientes de push.
- La causa raíz del desfasaje (versión vieja en GitHub sobreescribiendo Vercel) quedó eliminada al pushear todos los commits a `origin/main`.
- El próximo cron diario de GitHub Actions ejecutará los scrapers sobre la versión actualizada sin degradar Vercel.
