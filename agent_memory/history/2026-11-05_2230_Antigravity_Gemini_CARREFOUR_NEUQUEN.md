# Registro de Sesión — FEAT-CARREFOUR-NEUQUEN

- **Fecha:** 2026-11-05T22:30:00-03:00 (2026-11-06T01:30:00Z)
- **Agente:** Antigravity (Gemini)
- **Tarea:** Incorporar Carrefour Neuquén (análisis sucursales, mapa, colector regional VTEX, filtros y deploy a Vercel)

---

## 1. Sucursales Físicas en Neuquén Capital
- **Sucursal 157 — Carrefour Hipermercado Neuquén Centro (`carrefour_centro`):**
  - Dirección: Avenida Coronel Olascoaga 350, Neuquén Capital (CP 8300).
  - Coordenadas oficiales: `lat: -38.95876, lng: -68.05837`.
  - Horario: Lun a Dom 8:00 a 22:00 hs.
- **Sucursal 53 — Carrefour Hipermercado Neuquén Antártida (`carrefour_antartida`):**
  - Dirección: Antártida Argentina 3600 (esq. Moritán), Neuquén Capital (CP 8300).
  - Coordenadas oficiales: `lat: -38.94738, lng: -68.11002`.
  - Servicio: Hipermercado con retiro Drive vehicular (`carrefourar0157_0053PUP`).

## 2. Implementación Técnica
- `src/types/index.ts`: Añadido `'carrefour'` a `SupermarketId`.
- `src/utils/dataQuality.ts`: Incorporado `carrefour: 'Carrefour'` en `CHAIN_NAMES` (9 cadenas activas) y guard regional en `priceIsUsable()`.
- `src/data/supermarkets.ts`: Añadidas ambas sucursales con logo SVG distintivo y badges corporativos.
- `src/components/CoveragePanel.tsx`: Texto descriptivo de sucursales Centro y Antártida para Neuquén (CP 8300).
- `scripts/scrapers/collect_carrefour.py`: Colector VTEX con simulación de carrito contra CP 8300 (`/api/checkout/pub/orderForms/simulation?RnbBehavior=0`).
- `scripts/scrapers/sync_verified_prices.py`: Integrado colector Carrefour y CLI `--source carrefour`.

## 3. Pruebas y Verificación
- Python: 50 tests OK (incluyendo 6 en `test_carrefour_collector.py`).
- Node: 35 tests PASS (actualizado `tests/data-quality.test.cjs` para 9 cadenas).
- Build: `npm run build` exitoso (bundle `dist/assets/index-DI9aTYXZ.js`).

## 4. Despliegue en Producción Vercel
- Alias de producción: `https://radar-precios-neuquen.vercel.app` (HTTP 200).
- Catálogo público: 11.531 productos, 12.257 cotizaciones (499 verificadas de Carrefour Neuquén).
