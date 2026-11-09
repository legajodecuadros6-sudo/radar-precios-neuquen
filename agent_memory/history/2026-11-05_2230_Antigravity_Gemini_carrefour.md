# HANDOFF — FEAT-CARREFOUR-NEUQUEN (Integración y Despliegue de Carrefour Neuquén)

- **Agente / Herramienta:** Antigravity
- **Modelo:** Gemini
- **Fecha y Hora:** 2026-11-05T22:30:00-03:00 (2026-11-06T01:30:00Z)
- **ID Tarea:** FEAT-CARREFOUR-NEUQUEN
- **Estado:** COMPLETADO

---

## 1. Resumen Ejecutivo

A solicitud del usuario (*"en neuquen tambien esta carrefour puedes analizar la sucursal en neuquen agregarlo en el mapa scrapear sus precios colocarlos en los filtros y subirlos a versel"*), se completó la integración integral de **Carrefour** en Radar de Precios Neuquén:

1. **Sucursales Físicas en Neuquén Capital incorporadas:**
   - **Carrefour Hipermercado Neuquén Centro (`carrefour_centro`):** Av. Coronel Olascoaga 350 (`lat: -38.95876, lng: -68.05837`). Horario: Lun a Dom 8:00 a 22:00 hs.
   - **Carrefour Hipermercado Neuquén Antártida (`carrefour_antartida`):** Antártida Argentina 3600 (esq. Moritán, `lat: -38.94738, lng: -68.11002`). Formato Hiper con servicio de retiro vehicular Drive (`0053PUP`).
   - Ambas sucursales agregadas a `src/data/supermarkets.ts` y `src/data/branches.json` con su logo SVG oficial (diamante y C azul/roja) y estilos distintivos.

2. **Frontend, Tipos y Filtros:**
   - `SupermarketId` ampliado con `'carrefour'` en `src/types/index.ts`.
   - `CHAIN_NAMES` y `ACTIVE_CHAIN_NAMES` actualizados en `src/utils/dataQuality.ts`, totalizando **9 cadenas activas**.
   - Guard de calidad regional en `priceIsUsable()`: validación estricta de URL oficial HTTPS de `carrefour.com.ar` y frescura <= 72 hs.
   - Panel de cobertura (`CoveragePanel.tsx`) actualizado con descripción de las sucursales Centro y Antártida para Neuquén (CP 8300).

3. **Colector Regionalizado por API VTEX (CP 8300):**
   - Implementado en `scripts/scrapers/collect_carrefour.py` e integrado en `scripts/scrapers/sync_verified_prices.py`.
   - Búsqueda en catálogo VTEX (`/api/catalog_system/pub/products/search`).
   - Simulación en lotes por API oficial (`/api/checkout/pub/orderForms/simulation?RnbBehavior=0`) con `postalCode: '8300'` y `country: 'ARG'`.
   - Filtrado estricto: solo productos con `availability == 'available'` y SLA de Neuquén (Drive 0053PUP o Envío a Domicilio). Se excluyen automáticamente productos sin entrega local.
   - Detección de ofertas transparentes (Regla D4): cálculo de descuento porcentual y asignación de `promo_label: 'Oferta Carrefour'`.
   - Filtro de alcance: exclusión de electrodomésticos, bazar, herramientas e indumentaria.

4. **Resultados de Datos:**
   - **499 precios verificados** de Carrefour Neuquén incorporados.
   - Catálogo ampliado a **11.531 productos** y **12.257 cotizaciones**.
   - Histórico conservado y ampliado a **41.224 registros**.

5. **Validación y Despliegue:**
   - Tests Python: **50/50 tests OK** (incluyendo nueva suite `test_carrefour_collector.py`).
   - Tests Node: **35/35 tests PASS** (actualizado a 9 cadenas activas en `tests/data-quality.test.cjs`).
   - Compilación: `npm run build` exitosa (bundle cliente `dist/assets/index-DI9aTYXZ.js`).
   - Despliegue en producción Vercel: Activo en `https://radar-precios-neuquen.vercel.app` (HTTP 200).
   - Comprobación en vivo de `/data/live-prices.json`: 499 observaciones de Carrefour y sucursales `carrefour_centro` y `carrefour_antartida` verificadas.
