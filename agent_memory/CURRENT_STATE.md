# ESTADO ACTUAL — Radar de Precios Neuquén

**Última actualización:** 03-11-2026 · **Verificado por:** GLM (OpenCode) — inspección de lectura directa
**Producción:** https://radar-precios-neuquen.vercel.app · **Repositorio:** github.com/legajodecuadros6-sudo/radar-precios-neuquen
**Regla:** este archivo solo contiene lo verificable contra código/datos/tests. Lo no verificado se marca explícitamente.
**Convención de cierre:** ver `REGLAS_TRABAJO.md` antes de finalizar cualquier sesión.

## Qué funciona (verificado)

- **Pipeline de datos trazable** (`scripts/scrapers/sync_verified_prices.py`, v1.1): Coope (823), ChangoMás (215), Makro (36), Vital (94) → 1.162 productos / 1.168 observaciones en `src/data/live-prices.json` (`last_attempt: 2026-11-01T19:44Z`). Nunca inventa precios; conservaciones atómicas; de-duplicación por (id, fecha, precio).
  **(03-11) Yaguar integrado como 5ª fuente**: 1.718 observaciones nuevas con fecha real 03-11 (~04:05 UTC), saldo total **2.880 productos / 2.886 observaciones** (Coope 823 · ChangoMás 215 · Makro 36 · Vital 94 · Yaguar 1.718). Estado `ok`, sin recortes. Colector en `collect_yaguar()` con validación de ciudad, moneda ARS, escala entera ARS (`currency_minor_unit:0`), stock, mínimos y múltiplos de compra documentados en `notes`. Sucursal: "Yaguar Neuquén · tienda online" (sin coordenadas inventadas). Tamaños: live-prices 3,8 MB · price-history 6,5 MB (agrava H3 bundle).
- **Workflow GHA** `.github/workflows/sync-prices.yml`: cron diaria 11:00 UTC (08:00 ART) + tests previos + commit automático de datos.
- **Lector de códigos de barras**: software verificado (suite propia 9/9 al 01-11; lookup por EAN funciona en producción; ver AUDITORIA_GLM_RADAR_PRECIOS.md §4).
- **UI por comercio / ofertas minoristas / productos pedidos**: commits `28d2673` y `4b71ce6` (vista por cadena, botón ofertas minoristas, accesos a Lay's/Manaos pomelo). Estado en vivo pendiente de re-verificación tras el último commit.
- **Exclusión Vea/Diarco**: commit `f424e45` "Retira Vea y Diarco de la cobertura pública" (decisión del usuario del 03-11, ya ejecutada en Git por otro agente).
- **Git == fuente de verdad de datos**: snapshot + histórico JSON versionados en el repo.

## Qué está parcialmente implementado

- **Yaguar**: colector de solo lectura `scripts/scrapers/probe_yaguar.py` (sin commitear) con salida en `data-staging/yaguar.json` y test `tests/test_yaguar_probe.py`. Cuarentena deliberada: pendiente confirmar impuestos y condiciones para consumidor final antes de publicar precios. Panel de cobertura ya anota ese estado (diff sin commit).
- **Promociones**: datos de Coope con condiciones completas existen en su API (ver LEARNINGS); la UI de ofertas y la importación de promos con condiciones verificadas NO están conectadas aún al modelo de datos.
- **Supabase**: conectado (3 tablas: 7 productos demo / 14 obs del 27-10 / 15 sucursales) pero aporte real ~nulo; sin ruta de escritura desde el importador. Decisión A/B (apagar o reconstruir) pendiente de usuario.

## Qué está roto o degradado (verificado)

- **Riesgo crítico de frescura**: todos los datos están sellados `2026-11-01T19:44Z`. La regla de 72 h (`priceIsUsable`, `src/utils/dataQuality.ts`) descarta observaciones vencidas; **a partir de ~04-11T19:44Z el catálogo visible quedaría vacío si no hay sync exitoso**. No se registró data nueva del 02 y 03-11 en el working tree (requiere mirar las corridas del cron en GHA).
- **Producción desalineada** (parcialmente): producción despliega desde Git; hay 3 archivos modificados sin commit (workflow, App.tsx, CoveragePanel) y 5 archivos nuevos sin commitear (AUDITORIA, INFORME, probe Yaguar, staging).
- **Historial embebido en el bundle** (`price-history.json` importado estáticamente en `productService.ts`): crece ~1,4 MB/día (H3 de la auditoría).
- **Sección Promociones**: el filtro por `discount_percentage` (campo inexistente en el modelo nuevo) quedó registrado como H2; con los commits `28d2673` este estado pudo haber cambiado — **re-verificar contra código antes de actuar**.

## Componentes principales

```
Fuentes activas: Coope API (local 124) · ChangoMás VTEX (3608) · Makro HTML (lista diaria) · Vital VTEX (retiro)
Pipeline: gather/validate/merge + atomic writes → src/data/{live-prices,price-history}.json → build Vite → Vercel
Frontend: App.tsx → SearchAutocomplete / ProductCard / ProductDetailModal / BarcodeScannerModal /
          SmartBasketDrawer + basketOptimizer / CoveragePanel / DealsRankingSection / BentoDealsGrid
Supabase: lectura paginada (mergeCloudData) con reglas estrictas de trazabilidad; hoy ~inerte
```

## Problemas conocidos (trazados en AUDITORIA_GLM_RADAR_PRECIOS.md)

H1–H21 con prioridad P0–P3 y estado de certeza. Resumen P0: H1 desalineación deploy/código (mitigada por commits 28d2673+), H2 ofertas vacías (re-verificar), H6 cobertura EAN 24,2% (238/984 al 01-11). Detalle completo en el documento de auditoría.

## Credenciales de publicación (verificado 03-11)

- **Vercel**: sesión del CLI válida — token en `~/.local/share/com.vercel.cli/auth.json` (usuario `legajodecuadros6-sudo`, equipo `radar-de-precios`, proyecto vinculado via `.vercel/project.json`). Publicación directa con `npx vercel deploy --prod` ya disponible.
- **GitHub**: sin token disponible (hosts.yml del gh CLI sin token; sin clave SSH para github.com). **Impide `git push`** → producción (Vercel auto-deploy desde GitHub) y repo no se sincronizan por esa vía hasta conseguir un token o instalarse credenciales.
