# ESTADO ACTUAL — Radar de Precios Neuquén

**Última actualización:** 03-11-2026 (~12:45 UTC) · **Verificado por:** Antigravity (Gemini 2.5 Pro) — inspección y ejecución directa
**Producción:** https://radar-precios-neuquen.vercel.app · **Repositorio:** github.com/legajodecuadros6-sudo/radar-precios-neuquen
**Regla:** este archivo solo contiene lo verificable contra código/datos/tests. Lo no verificado se marca explícitamente.
**Convención de cierre:** ver `REGLAS_TRABAJO.md` antes de finalizar cualquier sesión.

## Qué funciona (verificado)

- **Pipeline de datos trazable** (`scripts/scrapers/sync_verified_prices.py`): 6 fuentes oficiales conectadas.
  - Coope (784), ChangoMás (187), Makro (36), Vital (90), Yaguar (1.718), **La Anónima (676)**.
  - Saldo en `src/data/live-prices.json`: **3.602 productos / 3.612 observaciones** verificadas.
  - Saldo en `src/data/price-history.json`: **10.563 puntos históricos** acumulados sin pérdida de trazabilidad.
  - Nunca inventa precios; escrituras atómicas; de-duplicación por `(id, fecha, precio)`.
- **(03-11) La Anónima integrada como 6ª fuente oficial**:
  - Colector `collect_la_anonima()` en `scripts/scrapers/sync_verified_prices.py`.
  - Validación de sucursal mediante API oficial `https://api.laanonima.com.ar/sucursal/8300` (Paseo de la Patagonia, Antártida Argentina 1111, `idSucursalSuper: 8`).
  - Parser nativo en biblioteca estándar de Python `AnonimaCardParser(HTMLParser)` (0 dependencias externas, 100% compatible con CI).
  - Normalización de unidades (`kg`, `litro`, `unidad`), detección de multipacks para evitar desnormalización de bultos y descarte de productos sin stock (`stock <= 0` / `-1`).
  - Extracción de **174 ofertas minoristas activas** (`regular_price > current_price`) con cálculo de `discount_percentage` y `promo_label: 'Oferta online'`, directamente integradas con la sección de ofertas minoristas (`isRetailOffer`).
  - Extracción de **25 EANs oficiales** verificados mediante fichas de detalle con Flixmedia (`data-flix-ean`), vinculando productos idénticos entre cadenas (ej: Aceite Cocinero 1.5L `7790060023684`).
  - Suite de pruebas propia: clase `LaAnonimaTests` con 5 casos (total 33/33 tests unitarios Python OK).
- **Yaguar como 5ª fuente**: 1.718 observaciones de la tienda online Neuquén con mínimos/múltiplos documentados (escala entera ARS, stock validado).
- **Workflow GHA** `.github/workflows/sync-prices.yml`: cron diaria 11:00 UTC (08:00 ART) + tests previos + commit automático de datos.
- **Lector de códigos de barras**: software verificado (lookup por EAN funciona tanto para `ean_*` como para productos con atributo `ean`).
- **UI por comercio / ofertas minoristas / productos pedidos**: vista por cadena, filtro de ofertas minoristas y accesos directos activos.
- **Exclusión Vea/Diarco**: respetada según decisiones D3/D5.
- **Git == fuente de verdad de datos**: snapshot + histórico JSON versionados en el repo.

## Qué está parcialmente implementado

- **Promociones complejas**: datos de Coope con condiciones estructuradas existen en su API; condiciones avanzadas no mapeadas aún a la UI.
- **Supabase**: conectado pero inerte en escritura; decisión de usuario pendiente.

## Qué está roto o degradado (verificado)

- **Historial embebido en el bundle** (`price-history.json` importado estáticamente en `productService.ts`): bundle JS pesa ~5,5 MB (H3 de la auditoría; mover histórico a `public/` con fetch lazy es prioritario).
- **GitHub sin token en el entorno local**: el push pide credenciales, por lo que los commits locales avanzan sobre `main` local hasta configurar token o SSH.

## Componentes principales

```
Fuentes activas: Coope API (local 124) · ChangoMás VTEX (3608) · Makro HTML (lista diaria) · Vital VTEX (retiro) · Yaguar Store API · La Anónima HTML/API (Paseo de la Patagonia)
Pipeline: gather/validate/merge + atomic writes → src/data/{live-prices,price-history}.json → build Vite → Vercel
Frontend: App.tsx → SearchAutocomplete / ProductCard / ProductDetailModal / BarcodeScannerModal /
          SmartBasketDrawer + basketOptimizer / CoveragePanel / DealsRankingSection / BentoDealsGrid
Supabase: lectura paginada (mergeCloudData) con reglas estrictas de trazabilidad; hoy inerte
```

## Problemas conocidos (trazados en AUDITORIA_GLM_RADAR_PRECIOS.md)

H1–H21 con prioridad P0–P3 y estado de certeza. Resumen P0: H1 desalineación deploy/código (mitigada por commits 28d2673+), H2 ofertas vacías (re-verificar), H6 cobertura EAN 24,2% (238/984 al 01-11). Detalle completo en el documento de auditoría.

## Credenciales de publicación (verificado 03-11)

- **Vercel**: sesión del CLI válida — token en `~/.local/share/com.vercel.cli/auth.json` (usuario `legajodecuadros6-sudo`, equipo `radar-de-precios`, proyecto vinculado via `.vercel/project.json`). Publicación directa con `npx vercel deploy --prod` ya disponible.
- **GitHub**: sin token disponible (hosts.yml del gh CLI sin token; sin clave SSH para github.com). **Impide `git push`** → producción (Vercel auto-deploy desde GitHub) y repo no se sincronizan por esa vía hasta conseguir un token o instalarse credenciales.
