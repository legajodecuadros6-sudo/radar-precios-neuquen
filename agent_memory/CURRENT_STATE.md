# Estado actual — auditado y verificado al 05-11-2026

- **Fecha de auditoría:** 2026-11-05T22:30:00-03:00 (2026-11-06T01:30:00Z)
- **Agente / Modelo:** Antigravity / Gemini
- **Rama:** `main`

---

## Verificado localmente

1. **Nueve cadenas implementadas y activas:**
   - Cooperativa Obrera, ChangoMás, Makro, Vital, Yaguar, La Anónima, Coto, Jumbo y **Carrefour**.
   - Vea y Diarco excluidos de cobertura pública por decisión de producto.
2. **Volumen de datos verificado:**
   - Catálogo activo (`src/data/live-prices.json`): **11.531 productos** y **12.257 cotizaciones**.
   - Carrefour Neuquén: **499 cotizaciones verificadas** con stock y precio local en Neuquén (CP 8300).
   - Histórico consolidado (`src/data/price-history.json`): **41.224 cotizaciones conservadas sin pérdida**.
   - Resumen público (`public/history-summary.json`): 1.385.230 bytes.
3. **Sucursales Físicas en el Mapa Interactivo:**
   - Carrefour cuenta con dos hipermercados integrados con coordenadas exactas:
     - `carrefour_centro`: Av. Coronel Olascoaga 350 (`lat: -38.95876, lng: -68.05837`).
     - `carrefour_antartida`: Antártida Argentina 3600 (esq. Moritán, `lat: -38.94738, lng: -68.11002`).
4. **Calibración regional de colectores:**
   - **Carrefour:** API VTEX con simulación de lotes contra CP 8300 (`/api/checkout/pub/orderForms/simulation?RnbBehavior=0`). Solo admite `availability == 'available'` con SLA logístico en Neuquén (Drive 0053PUP o Envío a Domicilio).
   - **Coto:** Utiliza únicamente precio de lista regional explícito de la sucursal 185 Neuquén.
   - **Yaguar:** Catálogo oficial verificado de la sucursal Neuquén (Félix San Martín 1550). 1.777 cotizaciones activas.
   - **Jumbo:** Validación estricta de `jumbo_quote_is_local()` (seller Jumbo, unidad 1, multiplicador 1, tax 0, sin priceTags).
   - **ChangoMás:** Simulación local contra sucursal 3608 Perticone (CP 8300).
5. **Suite de pruebas:**
   - Python: **50 tests unitarios** aprobados (`python3 -m unittest discover -s tests -p 'test_*.py'`).
   - Node: **35 tests** aprobados (`node --test tests/*.test.cjs`).
   - TypeScript + Vite: `npm run build` sin errores de compilación ni de tipado (bundle cliente `index-DI9aTYXZ.js`).

---

## Estado de Producción en Vercel

- **URL de producción:** `https://radar-precios-neuquen.vercel.app` (Alias oficial).
- **Despliegue verificado en vivo:**
   - `GET /` → **HTTP 200**, bundle `index-DI9aTYXZ.js`.
   - `GET /data/live-prices.json` → **HTTP 200**, sirviendo 11.531 productos, 12.257 cotizaciones, 499 de Carrefour, y las 2 sucursales de Carrefour.

## Revisión 09-11-2026 — SYNC-003
Base 4242048: 11771 productos, 12599 cotizaciones, 68482 históricos. El run 42502238342 guardó 9076 precios pero acabó failure por 3 fuentes degradadas (La Anónima/Yaguar HTTP 403, Makro lista fuera de vigencia). Corrección local distingue parcial de fallo total, con avisos visibles. Publicación y validación Actions pendientes de aprobación.

## Estado verificado 2026-11-09T07:33:08.288434-03:00 — SYNC-003 publicado
Run 42600654726 SUCCESS, commit de datos b0f94b3. Catálogo: 11785 productos/12629 cotizaciones; histórico: 77547 (+9065), cero pérdidas de los 68482 anteriores. Vercel success y catálogo HTTP 200 idéntico al snapshot. Fuentes La Anónima/Yaguar 403 y Makro fuera de vigencia continúan degradadas.

## Estado verificado 2026-11-23T00:07:00-03:00 — SYNC-004 completado
- **Causa raíz diagnosticada:** `src/data/price-history.json` superó 101,8 MB el 12-11, provocando fallo de `git push` (GH001 > 100MB) en Actions durante 10 días y dejando la app sin precios utilizables (>72h).
- **Solución implementada:** Migración transparente a `src/data/price-history.json.gz` (3,9 MB). Soporte nativo en Python (`sync_verified_prices.py`) y Node (`build-history.mjs`). `.gitignore` y workflow `.github/workflows/sync-prices.yml` actualizados.
- **Sincronización completa ejecutada:**
  - 11.412 precios frescos recolectados y vigentes hoy en Neuquén.
  - Catálogo activo (`src/data/live-prices.json`): **12.530 productos** y **13.511 cotizaciones** (last_success 2026-11-23T02:51:03Z).
  - Precios usables en la app (`priceIsUsable`): **11.412 cotizaciones activas**: Coto (7.194), Yaguar (1.663), Cooperativa Obrera (795), La Anónima (646), Carrefour (489), Jumbo (339), ChangoMás (194), Vital (92).
  - Histórico acumulado: **125.333 cotizaciones conservadas sin pérdida**.
  - Resumen público (`public/history-summary.json`): 5.364.920 bytes.
- **Suite de pruebas:** 54 tests Python OK, 35 tests Node PASS, `npm run build` exitoso (`index-BAloxFBX.js`). Paridad de catálogo verificada.
- **Pendiente de publicación:** Commit y push de la solución y los nuevos catálogos a GitHub para disparo de deploy en Vercel.

