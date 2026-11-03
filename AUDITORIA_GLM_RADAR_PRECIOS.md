# AUDITORÍA INDEPENDIENTE — RADAR DE PRECIOS NEUQUÉN

**Archivo de relevo técnico para segunda auditoría (Codex).**
**Auditor:** GLM (OpenCode) · **Fecha:** 1 de noviembre de 2026 (órdenes de trabajo del 30–31/10)
**Proyecto auditado:** `/home/rodrigo/Escritorio/ANTIGRAVITY/radar-precios`
**Producción auditada:** https://radar-precios-neuquen.vercel.app

> **REGLA FUNDAMENTAL:** Este documento NO es una orden de implementación. Es un informe de
> auditoría y plan de reparación. Cada conclusión debe re-verificarse contra el código antes de
> tocar nada. Se distingue siempre entre BUG CONFIRMADO / PROBLEMA PROBABLE / HIPÓTESIS / MEJORA.
> No se modificó absolutamente ningún archivo del proyecto para elaborar este informe (la única
> escritura es este mismo documento).

---

## 0. CÓMO SE AUDITÓ (método y trazabilidad)

- Lectura completa de: `src/` (los 11 componentes, contexto, servicios, utils, datos), `scripts/scrapers/sync_verified_prices.py` (401 líneas), `scripts/supabase/schema.sql` y `sync_migration.sql`, workflow `.github/workflows/sync-prices.yml`, `tests/`, docs (`docs/DATOS_Y_COBERTURA.md`, `REVISION_LECTOR.md`) y README.
- Git: `git log`, `git diff`, `git ls-files` (solo lectura).
- BD海内外：consultas REST de solo lectura contra Supabase con la anon/publishable key presente en `.env.local` (ASCADE ejemplo: counts + columnas).
- Sitio en vivo: carga con navegador (consola limpia), interacción con el buscador, el escáner y la ficha de producto; pruebas reales de lookup por EAN.
- Bundle de producción: descargado y comparado byte a byte (md5) con `dist/` local.
- Tests del propio proyecto ejecutados: `node tests/data-quality.test.cjs` (0 fail) y `node --test tests/barcode-scanner.test.cjs` (**9/9 pass**).

**Verificación clave de ambiente (custodia de evidencia):**

| Evidencia | Valor |
|---|---|
| Bundle desplegado en Vercel | `assets/index-uV8uOiz7.js` · md5 `5c30233340d6de24a7682ce9b1ff0a5c` |
| Md5 de `dist/assets/index-uV8uOiz7.js` local | `5c30233340d6de24a7682ce9b1ff0a5c` (idénticos) |
| Texto `'Venta por bulto / con condiciones'` (añadido en cambios SIN comitear) | **AUSENTE** en dist y en producción |
| Trabajo sin comitear | 12 archivos modificados, ~14.300 líneas insertadas (incluye JSON de datos regenerados y tests) |
| Último commit | `f2ed034 feat(prices): verify ChangoMas Neuquen quotes and official barcodes` |
| Última sincronización de datos (`last_attempt`) | `2026-10-31T23:45:03Z` (en working tree) |

*(El bundle lleva el JSON embebido; los EANs únicos detectados en el bundle desplegado: 172. En el working tree: 238.)*

---

# 1. RESUMEN EJECUTIVO

**Qué es Radar de Precios hoy.** Una SPA React (Vite) para comparar precios de supermercados de Neuquén Capital (CP 8300), alimentada por un pipeline Python de importación **trazable** (precio con fuente HTTPS, sucursal confirmada y fecha real) que corre a diario por GitHub Actions, escribe JSON en el repo y Vercel lo despliega como sitio estático. Hay una base Supabase conectada, que hoy **aporta datos casi nulos** (dataset semilla demo).

**Estado global: MVP funcional con calidad de ingeniería por encima de lo habitual, pero NO listo para producción.** El pipeline de datos es lo más sólido del proyecto; la UI es cuidada; los tests del lector pasan 9/9. En cambio: la producción está **detrás del código real**, hay una funcionalidad central ("Promociones/Ofertas") **muerta en vivo** por incompatibilidad de modelo de datos, y la promesa del escáner está limitada por **cobertura de datos**, no por bugs de software.

- **Funciona correctamente:** importador trazable (`sync_verified_prices.py`) con validaciones fuertes (dígito verificador de EAN, confirmación de sucursal en Neuquén, atomic writes, de-duplicación por fecha), cron en GHA con commit automático de datos, merge de precios con reglas de frescura y fuente, lector de códigos de barras serializado (sin sesiones de cámara superpuestas) con tests, RLS de solo lectura en Supabase, `.env` correctamente gitignored, transparencia de fechas/fuentes en la UI.
- **Funciona parcialmente:** búsqueda (encuentra pero no rankea ni soporta fuzzy), ficha de producto (gráfico solo con ≥2 días de historial; el historial real nació el 30/10), canasta inteligente (limitada a las 4 cadenas conectadas y a precios unitarios), escáner (funciona sobre ~24% del catálogo con EAN y precio fresco), Supabase (se lee, no aporta).
- **Está roto de facto:** sección "Promociones / Ofertas TOP" (vacía permanentemente: filtra por un campo `discount_percentage` que ya no existe en el modelo de datos); deal-flags "oferta_real / suba_previa" (código inalcanzable); comparador de ofertas visto por el usuario en producción con textos desactualizados (deploy ≠ working tree).
- **Limitaciones de datos:** solo 4/9 cadenas conectadas (Coope 687 precios, Vital 87, Makro 36, ChangoMás 6 — Fuente Coope/ChangoMás/Vital/Makro "ok|partial"); Coto, La Anónima, Vea, Yaguar y Diarco sin fuente; **La Coope no expone EAN en su API pública** → 783 productos (76% del catálogo) **no escaneables por diseño**; historial de solo 2 días reales.
- **Problemas de arquitectura:** todo el catálogo + todo el histórico están **embebidos dentro del bundle JS** (3,59 MB / 551 KB gzip; crece ~1,4 MB/día por el histórico append-only); Supabase es una segunda fuente inerte con drift de esquema; degradación silenciosa si el cron falla >72 h (el catálogo completo pasa a "sin precios" sin ningún aviso prominente); dependencia de `priceIsUsable()` recalculada en cada comparación de orden (O(n×m)).
- **Riesgos actuales:** redeploys que no reflejan lo que se ve en la carpeta (riesgo de creer que algo está arreglado); crecimiento del bundle hasta inusabilidad; pérdida silenciosa de precios de nube en el merge; datos semilleados "reales" en SQL listos para contaminar producción si se ejecutan.
- **Corregir primero (top 3):** (1) commit/push del working tree con revisión, (2) reparar/cubrir "Promociones", (3) aclarar UX de "producto sin precio" y buscar-por-nombre tras "no está en catálogo".

---

# 2. ARQUITECTURA ACTUAL DETECTADA

```
FUENTES EXTERNAS (APIs oficiales, sin scraping de HTML salvo Makro)
  api.lacoopeencasa.coop (Coope suc. 124)          → 687 precios ✅
  masonline.com.ar (VTEX ChangoMás 3608)           → 6 precios   ✅
  tiendaonline.vital.com.ar (VTEX Vital, retiro)   → 87 precios  ✅
  makro.com.ar (HTML de lista de precios diaria)   → 36 precios  ✅
        │
        ▼
scripts/scrapers/sync_verified_prices.py   ← ÚNICO pipeline activo (cron GHA 11:00 UTC)
  · valida: EAN con checksum, precio>0, sucursal Neuquén CP 8300 confirmada en la API,
    fecha real de publicación, fuente HTTPS
  · nunca inventa precios; conserva datos anteriores si la fuente falla
  · escribe src/data/live-prices.json (snapshot) + src/data/price-history.json (append)
        │
        ▼
Git → Vercel (build Vite) → index-uV8uOiz7.js (JSON embebido DENTRO del JS)
        │
        ▼
CLIENTE React
  · fetchLiveRadarData() → intenta Supabase (3 tablas paginadas) → mergeCloudData()
  · usados en cada render: priceIsUsable() (72h, verified, fuente HTTPS, no propia)
  · App: catálogo/búsqueda → ProductCard / ProductDetailModal / BarcodeScannerModal
  · Canasta: SmartBasketDrawer + basketOptimizer (por sucursal, mín. de cantidad)
        │
        ▼ Supabase (PARALELO, hoy INERTE)
  products (7 filas semilla demo, imágenes Unsplash)
  price_observations (14 filas 27/10, sin columnas de trazabilidad)
  supermarkets (15 sucursales)
```

**Componentes reales activos:** lo anterior.
**Componentes antiguos/inertes/no utilizados (verificado):**

- `scripts/scrapers/sync_neuquen_prices.py` (orquestador viejo), `coto_scraper.py`, `la_anonima_scraper.py`, `sepa_api.py`, `vtex_changomas.py` (prototipo), `cooperativa_obrera_api.py`, `run_all_scrapers.py` (pipeline enterrado con rutas absolutas a una carpeta privada de un agente IA) → **ninguno es invocado por el workflow ni por tests actuales.**
- `scripts/scrapers/precios_consolidados_neuquen.json` → datos viejos con 34 "valores fijos de Makro/Yaguar" etiquetados con la fecha de ejecución (antipatrón ya documentado en `docs/DATOS_Y_COBERTURA.md`).
- `scripts/supabase/sync_migration.sql` → INSERTs con IDs (`prod_aceite_natura_900`…) que violarían la FK contra `products` (`prod-001…017`); **probablemente nunca se ejecutó**. Pendiente verificar en Supabase (ver §21).
- Dependencias sin usos: `clsx`, `tailwind-merge` (0 imports). `gsap` solo en el mapa.
- `INITIAL_PRICE_OBSERVATIONS` en `src/data/database.ts`: precios semilla históricos que **sobreviven en el bundle** pero se marcan `is_verified:false` y no se muestran (diseño deliberado: "retained but never treated as fresh evidence").

---

# 3. INVENTARIO COMPLETO DE HALLAZGOS

Formato por hallazgo: Prioridad, Estado de certeza, Problema, Evidencia, Ubicación, Causa raíz,
Consecuencia actual, Riesgo futuro, Solución recomendada, Implementación conceptual, Dependencias,
Riesgo de reparación, Prueba de validación, Dificultad.

---

## H1 — Producción desalineada del código: 12 archivos sin comitear

**Prioridad: P0** · **ESTADO: BUG CONFIRMADO (de entrega/proceso)**

**Problema.** El working tree contiene ~14.300 líneas insertadas sin commit (código + datos regenerados + tests), y Vercel despliega desde Git. La producción NO incluye esos cambios. Quien audita/expande el sitio en vivo no está viendo el código de la carpeta.

**Evidencia.**
- `git status --short`: 12 archivos `M` (entre ellos `productService.ts`, `priceAnalyzer.ts`, `ProductDetailModal.tsx`, `ProductCard.tsx`, `SearchAutocomplete.tsx`, `basketOptimizer.ts`, `sync_verified_prices.py`, `live-prices.json`, `price-history.json`, `data-quality.test.cjs`, `test_verified_import.py`, `types/index.ts`) + untracked `INFORME_TECNICO_Y_ESTADO_DEL_PROYECTO.md`.
- `git diff` introduce el string `'Venta por bulto / con condiciones'`; ese texto **no existe** en `dist/assets/index-uV8uOiz7.js` (grep = 0) ni en el bundle servido por Vercel.
- md5 del bundle desplegado == md5 de `dist/` local (`5c30233340d6de24a7682ce9b1ff0a5c`): producción = último commit, no = working tree.

**Ubicación.** Todo el repo; especialmente `src/components/ProductDetailModal.tsx`, `SearchAutocomplete.tsx`, `src/services/productService.ts`, `src/utils/priceAnalyzer.ts`.

**Causa raíz.** Trabajo iterativo (probablemente multi-agente) con mejoras terminadas pero no committeadas; Vercel integración continua contra Git.

**Consecuencia actual.** Textos/estados mejores solo existen localmente; el usuario de producción ve la versión vieja ("Precio por unidad en…" con estados ambiguos). Cualquier "fix" local se percibe como "ya funciona" sin estar desplegado. Además riesgo de **pérdida del trabajo** si se resetea el repo.

**Riesgo futuro.** Divergencia creciente working-tree/producción; conflictos de merge; decisiones tomadas sobre una versión que no es la viva.

**Solución recomendada.** Re-visar el diff por grupos lógicos (UI copy, productService/merge, tests, datos), commit atómicos con mensajes descriptivos, push, y confirmar despliegue con el nuevo hash de bundle.

**Implementación conceptual.** 1) `git diff` revisión manual grupo por grupo; 2) decidir si el JSON de datos regenerado se comitea como "última importación" o se regenera por el cron (recomendado: comitear el existente, el cron lo pisará); 3) commits separados: `fix(ui)`, `feat(merge)`, `test`, `chore(data)`; 4) push y corrobora en Vercel.

**Dependencias.** Debe hacerse ANTES de cualquier otro hallazgo (H2…H21): si no, no se puede validar nada contra producción.

**Riesgo de reparación.** BAJO. Único cuidado: el JSON regenerado y el estado de `sources` deben ser consistentes con lo que produjo el importador v1.1.

**Prueba de validación.** Tras push: el texto "Venta por bulto / con condiciones" debe aparecer en el nuevo bundle servido por Vercel; `git status` limpio; el cron del día siguiente debe poder pisar los JSON sin conflicto.

**Dificultad.** BAJA.

---

## H2 — Sección "Promociones / Ofertas TOP" permanentemente vacía

**Prioridad: P0** · **ESTADO: BUG CONFIRMADO**

**Problema.** El componente que rankea ofertas filtra observaciones con `discount_percentage > 0`. El modelo de datos nuevo (importador v1.1) **no incluye ese campo en ninguna observación**. Resultado: la sección se renderiza vacía para siempre.

**Evidencia.**
- `src/components/DealsRankingSection.tsx` líneas 23–27: filtro por `Boolean(o.discount_percentage && o.discount_percentage > 0 && ...)`.
- Claves reales de cada observación en `live-prices.json` (verificadas por script): `id, product_id, supermarket_id, branch_id, branch_name, branch_address, regular_price, current_price, price_per_unit, unit_label, query_date, is_verified, is_demo, source_url, source_name, channel, min_quantity, notes` — **sin `discount_percentage`**.
- Snapshot del sitio vivo: heading "Promociones" seguido de contenido vacío.
- Además, en el importador, `regular_price === current_price` siempre (se importa precio base sin promos), así que aún aceptando `regular>current` la lista sería pequeña.

**Ubicación.** `src/components/DealsRankingSection.tsx`, `src/components/BentoDealsGrid.tsx` (mismo criterio), `src/types/index.ts` (campo opcional solo usado por datos vitados viejos).

**Causa raíz.** Evolución del modelo de datos (eliminación de `discount_percentage` cuando se pasó a importación trazable) sin actualizar los dos componentes derivados.

**Consecuencia actual.** La promesa central ("comparador de ofertas") es una tabla vacía en producción; percepción de app incompleta.

**Riesgo futuro.** Si se añaden promos reales (2x1, segundo al 70%) seguirán sin aparecer en esta sección salvo cambio de modelo.

**Solución recomendada.** Recalcular el "descuento" como `(regular_price - current_price) / regular_price` cuando `regular_price > current_price`, y/o etiquetar `min_quantity>1` como "mayorista". Si el producto quiere promos reales con condiciones, entonces el hallazgo depende del cambio de modelo (H5/D), porque el importador hoy deliberadamente no descuenta promos.

**Implementación conceptual.** En `DealsRankingSection` y `BentoDealsGrid`: sustituir el filtro por deriva de `discount` calculada en runtime, con `useMemo` sobre `observations`; ocultar la sección si la lista es vacía (evitar heading con contenido vacío).

**Dependencias.** Independiente. Si se decide traer promos reales, coordina con H16 y el modelo del importador.

**Riesgo de reparación.** BAJO–MEDIO: mostrar descuentos calculados sobre precios base puede interpretarse como "oferta" cuando es rebaja permanente; el importador actual nunca pone `regular<current` sin causa.

**Prueba de validación.** Con datos de ChangoMás/Makro: la sección debe listar al menos observaciones y ordenarlas; el sitio vivo no debe mostrar "Promociones" + vacío.

**Dificultad.** MEDIA (1–2 h + decisión de producto).

---

## H3 — El histórico de precios entero viaja dentro del bundle JS y crece sin límite

**Prioridad: P0–P1** · **ESTADO: PROBLEMA PROBABLE (deterioro gradual confirmable por aritmética de datos)**

**Problema.** `price-history.json` (append-only, "no se borran consultas anteriores") está **embebido** en el bundle porque `productService.ts` hace `import ... from '../data/price-history.json'`. Con el ritmo del cron (~990 registros/día), el bundle crece ~1,3–1,4 MB/día.

**Evidencia.**
- Tamaños hoy: `live-prices.json` 1.301.351 B; `price-history.json` 1.451.911 B. Bundle total JS: 3.588.037 B; gzip servido: 550.884 B.
- Historial: 1.655 registros acumulados en **2 días** (30 y 31/10/2026) → extrapolación directa ~**300 KB–500 KB gzip por semana**, colisión con cualquier presupuesto móvil.
- `recordedHistory()` (productService.ts) itera todo el archivo por cada ficha abierta.

**Ubicación.** `src/services/productService.ts` (líneas 3–4, 83–98), `scripts/scrapers/sync_verified_prices.py` (apéndice de historial en `main()`).

**Causa raíz.** Arquitectura "todo-en-JS" para simplicidad estática + política append-only sin ventana de agregación.

**Consecuencia actual.** Descarga inicial pesada (aceptable hoy, malo en 3G móvil); parseo gigante del JSON en el hilo principal.

**Riesgo futuro.** En semanas: >10 MB; en meses: inusable. El crecimiento del bundle ES la falla, no un bug puntual.

**Solución recomendada.** (Corto plazo) Dejar de importar estáticamente el historial: moverlo a `public/` y hacer `fetch()` lazy solo cuando se abre la ficha. (Mediano) Agregar en el importador un resumen diario por producto/sucursal (min/avg) y mantener el detalle solo N meses; opcionalmente mover el detalle a Supabase.

**Implementación conceptual.** 1) `public/history.json` + `fetch('/history.json')` dentro de `ProductDetailModal` con caché en memoria; 2) en `sync_verified_prices.py`, agregar paso "digest" que escriba `src/data/price-history-daily.json`; 3) reescribir `recordedHistory()` para consumir el digest.

**Dependencias.** Ninguna técnica dura. Negociar con H5 (si Supabase pasa a ser la DB, el histórico va ahí).

**Riesgo de reparación.** MEDIO: cambio de ruta de datos toca `recordedHistory()` consumido por la ficha; hay tests de data-quality que importan JSON.

**Prueba de validación.** Abrir ficha de producto con historial → gráfico igual que hoy; Network: `history.json` se descarga solo al abrir la ficha; bundle JS principal baja su tamaño.

**Dificultad.** MEDIA.

---

## H4 — Regla de frescura 72 h sin degradación visible: si el cron falla, el catálogo se vacía en silencio

**Prioridad: P1** · **ESTADO: PROBLEMA PROBABLE (lógica verificada; evento real aún no ocurrido)**

**Problema.** `priceIsUsable()` exige `now - query_date <= 72h` a TODA observación, y se aplica en el nivel de estado global (`App.tsx`). Si el cron de GitHub Actions no produce precios frescos por 3 días corridos, **todas** las observaciones se descartan y el sitio pasa a "Sin precio vigente" en todo, sin error ni banner prominente.

**Evidencia.**
- `src/utils/dataQuality.ts` líneas 12–19 (regla dura).
- `src/App.tsx` líneas 36 y 56: `observations = result.observations.filter(o => priceIsUsable(o))`.
- `docs/DATOS_Y_COBERTURA.md` declara la política ("Los precios de más de 72 horas… no participan") pero no contempla UI de degradación.

**Ubicación.** `src/utils/dataQuality.ts`, `src/App.tsx`, `src/services/productService.ts` (mensajes).

**Causa raíz.** Regla de honestidad de datos aplicada también en la capa de presentación sin estado "stale" explícito.

**Consecuencia actual.** Ninguna (cron funcionando). Vulnerabilidad latente de todo el producto a un solo punto de fallo (GHA).

**Riesgo futuro.** Fallo silencioso total del producto ante caducidad del token de fuente, cambio de API, o simplemente 3 días sin ejecuciones (quotas de GHA).

**Solución recomendada.** Banner de primer nivel cuando `Date.now() - last_attempt > 72h` ("Datos del día X — seguimos monitoreando fuentes"), mantener la regla dura para comparaciones pero permitir mostrar (etiquetado) precios vencidos como referencia, y notificar por fallo del workflow (email GHA ya existe en `failure`).

**Implementación conceptual.** Comparar `snapshot.last_attempt` con `Date.now()` en `AppContent`; estado `stale:boolean`; banner condicional; opcional: modo "referencia" que muestre obs vencidas con badge amarillo.

**Dependencias.** Ninguna. Complementa H9 (observabilidad).

**Riesgo de reparación.** BAJO. Cuidado con no relajar `priceIsUsable` de facto para comparaciones without consent.

**Prueba de validación.** Cambiar manualmente una `query_date` a 4 días atrás (en local, dataset de prueba) → debe salir banner/etiqueta correcta y **no** aparecer en ranking comparativo.

**Dificultad.** MEDIA.

---

## H5 — Supabase: dataset semilla ficticio, código de nube esencialmente inerte y drift de esquema

**Prioridad: P1 (como decisión de arquitectura)** · **ESTADO: BUG CONFIRMADO (estado de datos y esquema)**

**Problema.** La BD de Supabase contiene un dataset demo (7 productos "prod-001…007" con imágenes Unsplash y EANs internos inventados tipo `2000001005001`), 14 observaciones del 27/10 sin columnas de trazabilidad, y 15 sucursales. El esquema (`schema.sql`) no tiene `is_verified`, `source_url`, `observed_at`, `channel`, `min_quantity` que `mergeCloudData()` exige (`is_verified === true && Boolean(row.source_url)`), por lo cual **ningún precio de nube puede entrar a comparaciones**, y las columnas faltante producían errores 42703 al consultar.

**Evidencia.**
- REST vivo: `products` = 7 filas; `price_observations` = 14 (`content-range: 0-13/14`); `supermarkets` = 15.
- Consulta con `select=id,ean` sobre `price_observations` devolvió `{"code":"42703","message":"column price_observations.ean does not exist"}` (esperables: la tabla no contiene `ean`).
- `schema.sql` define `products(unit TEXT)` sin `unit_measure/net_content_number/net_content_str` y `price_observations` sin columnas de trazabilidad.
- `sync_migration.sql` inserta en `price_history` un `product_id = 'prod_aceite_natura_900'` que NO existe en `products` (FK ON DELETE CASCADE) → el script **fallaría si se ejecutara**. Probablemente nunca se aplicó (pendiente confirmar, §21).
- `productService.ts` líneas 23–41: exige `is_verified===true` (imposible con el esquema actual), y separa EAN duplicados con `continue`.

**Ubicación.** Supabase (tablas vivas), `scripts/supabase/schema.sql`, `scripts/supabase/sync_migration.sql`, `src/services/productService.ts`.

**Causa raíz.** Supabase fue un MVP anterior; el proyecto maduró hacia importación Git🖰 pero los recursos de nube no se actualizaron ni se apagaron.

**Consecuencia actual.** Costo doble: la app hace 3 requests REST + merge completeo que aporta 0 precios útiles; y existe una superficie de riesgo: si alguien ejecutara el `schema.sql` semilleador en prod, aparecerían 30 precios ficticios con descuentos hardcodeados ("20% con Comunidad Coto") con `updated_at=now()`.

**Riesgo futuro.** Dos "fuente de verdad" divergentes; datos demo vistos como reales si el esquema se arregla a medias.

**Solución recomendada.** Decidir A) o B):
- **Opción B (corto plazo):** apagar la conexión (feature flag / no build) y remover `mergeCloudData` de la ruta crítica. Baja el riesgo y el costo actual.
- **Opción A (si se quiere escalar):** recrear el esquema con las columnas del JSON (`is_verified`, `source_url`, `observed_at`, `channel`, `min_quantity`, `quantity_multiple`, `promo_condition`, `regular_price/current_price`, `ean TEXT UNIQUE nullable`) y cargarlo desde el importador (escrituras con service-role server-side o Actions). Migrar el historial append-only allí (soluciona también H3).

**Implementación conceptual.** B: `isSupabaseConfigured=false` o gate por variable de entorno. A: un `schema_v2.sql` nuevo (idempotente), `sync_to_supabase.py` server-side, y el cliente derecho (no anon writes).

**Dependencias.** A depende de decidir la estrategia del histórico (H3). B no depende de nada.

**Riesgo de reparación.** B: BAJO. A: MEDIO–ALTO (migra datos a una infraestructura con RLS y service key: se debe NUNCA comitear service key).

**Prueba de validación.** B: quitar requests de vilo (network tab, 0 llamadas a `supabase.co`), site sigue funcionando con datos locales. A: la app debe leer de nube y las observaciones importadas deben aparecer con sus metadatos; los precios demo no deben sobrevivir a una carga regenerada.

**Dificultad.** B: BAJA. A: MEDIA–ALTA.

---

## H6 — Cobertura de EAN ≈ 24%: causa principal de "el lector no encuentra productos"

**Prioridad: P0 (para el valor prometido del escáner)** · **ESTADO: PROBLEMA CONFIRMADO (por diseño del importador y limitación de fuentes; no bug de software)**

**Problema.** Solo 238/984 productos (24,2%, working tree) tienen EAN. Los 783 de La Coope (`coope_*`) carecen de EAN porque **la API pública de la cooperativa no devuelve `ean`** para la mayoría de artículos (el importador solo lo incorpora cuando viene y pasa `valid_ean`, NUNCA usa `cod_interno` como EAN — decisión correcta). El escáner matchea EAN contra el catálogo, así que la mayoría de envases del mundo real no está mapeado.

**Evidencia.**
- Script sobre `live-prices.json`: 984 productos; 238 con `ean`; 0 con `ean_aliases` en snapshot; `coope_*` sin EAN.
- Códigos públicos reales de productos comunes (leche `7790742357007`, fideos `7790070336293`, Coca 3L `7790895007019`, aceite Natura 1.5L `7790272001029`) **no están** en el snapshot del importador (aunque están presentes en el bundle desplegado por blamed to INITIAL_PRODUCTS/semilla).
- Fuentes conectadas importan EAN: ChangoMás (VTEX) 6, Vital 87, Makro sin EAN (código interno).

**Ubicación.** `scripts/scrapers/sync_verified_prices.py` (`coope_record`, `mas_record`, `vital_record`, `parse_makro`), `src/components/BarcodeScannerModal.tsx` (lookup), datos JSON.

**Causa raíz.** Cobertura de fuentes y de APIs que no exponen EAN; alcance de términos de búsqueda del importador (20 términos).

**Consecuencia actual.** El usuario escanea envases comunes → "Este producto todavía no está en el catálogo" (mensaje correcto y verificado en vivo).

**Riesgo futuro.** El escáner queda como feature de demostración hasta que se importen más EANs.

**Solución recomendada.** (1) Inmediato: cuando el lookup falla, sugerir **búsqueda por nombre** (no hay forma de vincular product directo); (2) incorporate una fuente de traducción no-inventada: importar EANs desde Open Food Facts (trae catálogo argentino real) cuestionando `tax_included=false` (usar solo para vincular EAN↔nombre, NO precios); (3) documentar CSV de alta manual con el formato ya provisto (`scripts/imports/precios-template.csv`).

**Implementación conceptual.** Paso (1) en `BarcodeScannerModal` (mostrar input de búsqueda o producto similar); paso (2) un `scripts/scrapers/openfoodfacts_eans.py` que solo agrega `ean` a productos existentes cuando coinciden por nombre normalizado + redacción tras revisión humana (el importador ya tiene la disciplina de "identidad contradictoria").

**Dependencias.** (1) independiente; (2) independiente mientras no modifique precios.

**Riesgo de reparación.** (1) BAJO; (2) MEDIO (asociar EAN mal a un producto es exactamente el error que el proyecto ya sufrió — ver H7 — por lo que se exige validación de checksum + revisión humana).

**Prueba de validación.** Escanear leche/fideos/Coca reales y que bajen al catálogo de precios conectados por búsqueda-sugerida; grep de `ean` en JSON creciente; el checksum del cada EAN nuevo pasa `valid_ean`.

**Dificultad.** (1) BAJA; (2) MEDIA–ALTA.

---

## H7 — Alias de EAN incorrectos en la semilla: el EAN real de Coca-Cola 3 L está asignado como alias de un aceite

**Prioridad: P2** · **ESTADO: BUG CONFIRMADO (datos; latente, no disparado hoy)**

**Problema.** En `src/data/database.ts`, `prod_aceite_natura_900.ean_aliases` incluye `'7790895000997'`; mientras que `schema.sql` asigna ese mismo EAN a **Coca-Cola Original 3 L (prod-011)**. Un EAN no puede pertenecer a dos productos: uno está mal. `7790895000997` corresponde a Coca-Cola 3 L; el alias en el aceite es erróneo.

**Evidencia.**
- `database.ts`: `ean_aliases: ['7790272001005', '7790895000997', '7790272001012']` en `prod_aceite_natura_900`.
- `schema.sql`: `('prod-011', 'Gaseosa Coca-Cola Original 3L', ..., '7790895000997', ...)`.
- Independiente: el seed de Supabase contiene listado del aceite con la misma combinación, y el botón de ejemplo del músico lector Coca 3L usa `7790895007019`.

**Ubicación.** `src/data/database.ts`, `scripts/supabase/schema.sql`.

**Causa raíz.** Seed manual hecho por humanos-agentes con EANs "pegados" a título informativo sin verificación de checksum/identidad.

**Consecuencia actual.** Enmascarado: el producto semilla con alias está **filtrado** del catálogo por `localData` (su EAN `7790272001005` ya existe en snapshot, y los alias van con él). Si email filtro cambia o se re-habilita la semilla, **escanear una Coca-Cola abriría un aceite**.

**Riesgo futuro.** Reemergencia en cualquier refactor del `filter` de `localData` o al restaurar INITIAL_PRODUCTS.

**Solución recomendada.** Eliminar `'7790895000997'` de los aliases del aceite; por política, los aliases solo deben existir con fuente documentada (URL de la marca o ficha técnica).

**Implementación conceptual.** Editar `database.ts` (y el seed de `schema.sql` para que no fuesesis duplicado). Re-auditar **los 6 productos semilla restantes** (no se verificó 1 a 1 algunos alias con checksum — ver §21).

**Dependencias.** Ninguna.

**Riesgo de reparación.** BAJO.

**Prueba de validación.** Escanear `7790895000997` en build nuevo → debe mostrar Coca-Cola (o "no catálogo") y **nunca** un aceite. Test unitario: cada `ean_aliases` pasa `valid_ean` y no colisiona con otro `ean`/alias.

**Dificultad.** BAJA.

---

## H8 — Orden del listado recalcula el análisis de precios O(n×m) en cada comparación

**Prioridad: P2** · **ESTADO: PROBLEMA PROBABLE (no explosivo hoy; escala mal)**

**Problema.** `filteredProducts` (App.tsx) ordena con comparator que llama `analyzeProductPrices(product, observations)` dos veces por comparación; cada llamada filtra las ~990 observaciones globales por producto. Con 984 productos son decenas de miles de filtros por cada render de orden; y `ProductCard` vuelve a llamar `analyzeProductPrices` por tarjeta.

**Evidencia.** `src/App.tsx` líneas 94–109; `src/utils/priceAnalyzer.ts` línea 27 (`allObservations.filter(...)` por llamada); `src/components/ProductCard.tsx` línea 21.

**Ubicación.** `src/App.tsx`, `src/utils/priceAnalyzer.ts`, `src/components/ProductCard.tsx`.

**Causa raíz.** Implementación naive sin índice/memoización; `useMemo` de `filteredProducts` está bien pero la función de comparación no lo es.

**Consecuencia actual.** Latencia perceptible en interactive sorting en móviles de gama media (no medido con profiler, ver §21).

**Riesgo futuro.** Con 3.000+ productos +observaciones crecientes, ranking puede bloquear el main thread.

**Solución recomendada.** Precalcular un `Map<product_id, ProductPriceSummary>` con `useMemo` sobre `[products, observations]`, y ordenar leyendo del índice; pasar el análisis precalculado a `ProductCard` como prop.

**Implementación conceptual.** Extraer helper `buildAnalysisIndex(products, observations)`; comparator usa `index.get(a.id)`; `ProductCard` recibe `analysis` opcional.

**Dependencias.** Independiente.

**Riesgo de reparación.** BAJO (misma lógica, reordenado), salvo que algún componente dependa de "analysis live" — verificado que no.

**Prueba de validación.** Crux/devtools Performance: el sort debe bajar de orden de magnitud; funcionalmente los ordenes `max_savings / lowest_price / name_asc` deben dar el mismo resultado que hoy (test de snapshot simple).

**Dificultad.** BAJA–MEDIA.

---

## H9 — Errores silenciosos: `catch {}` sin log y sin telemetría

**Prioridad: P2** · **ESTADO: BUG CONFIRMADO**

**Problema.** Todas las rutas de fallo de datos/cámara se tragan excepciones sin `console.error` ni reporte, y no hay ningún sistema de telemetría. Los problemas en producción solo son visibles por *feeling* del usuario.

**Evidencia.**
- `src/services/productService.ts` líneas 78–80: `catch { return {...localData, message: ...} }` sin log.
- `src/components/BarcodeScannerModal.tsx`: `catch { /* Sound is optional. */ }`, `console.warn` en startCamera solamente.
- 0 referencias a Sentry/Umami/analytics en el repo (grep).

**Ubicación.** `src/services/productService.ts`, `src/components/BarcodeScannerModal.tsx`.

**Causa raíz.** Preferencia deliberada de integridad (no hacer fallar UI) sin contrapartida de observabilidad.

**Consecuencia actual.** Diagnóstico en producción depende del usuario; fallos de red de Supabase (o del parser) invisibles.

**Riesgo futuro.** Incidentes sin rastro; decisiones sin datos.

**Solución recomendada.** `console.error` mínimo en todos los catch siendo componente de datos; opcional Sentry (self-hosted) como capa 2; mantener "no fallar la UI" como política.

**Implementación conceptual.** Añadir `console.error('fetchLiveRadarData failed', error)`; crear `utils/logger.ts` con no-op en prod salvo opt-in.

**Dependencias.** Complementa H4 y el plan de pruebas.

**Riesgo de reparación.** BAJO.

**Prueba de validación.** Forzar error (bloquear red) y verificar que en consola aparece el mensaje, UI degrada con mensaje actual.

**Dificultad.** BAJA.

---

## H10 — Código muerto, rutas absolutas de un agente IA y dependencias sin usar

**Prioridad: P2** · **ESTADO: BUG CONFIRMADO**

**Problema.** Gran parte del material de scraping es un pipeline anterior no conectado, con rutas absolutas privadas que hacen no-portable el proyecto.

**Evidencia.**
- `scripts/scrapers/run_all_scrapers.py` línea ~13: `RAW_YAGUAR_MAKRO = '/home/rodrigo/.gemini/antigravity/brain/6b5d2c54-1a43-4358-a723-d129207f8449/scratch/precios_relevados_neuquen.json'` (carpeta scratch privada de un agente previo). Y `SCRAPERS_DIR = '/home/rodrigo/Escritorio/ANTIGRAVITY/radar-precios/scripts/scrapers'`.
- grep de referencias: el workflow solo llama `sync_verified_prices.py`; `run_all_scrapers.py`, `sync_neuquen_prices.py`, `coto_scraper.py`, `la_anonima_scraper.py`, `sepa_api.py`, `vtex_changomas.py`, `cooperativa_obrera_api.py` no tienen ni test ni invocation activa.
- `package.json`: `clsx`, `tailwind-merge` con 0 imports en `src/`.
- `precios_consolidados_neuquen.json`: datos viejos con precios fijos etiquetados con fecha de ejecución (documentado en `docs/DATOS_Y_COBERTURA.md` como problema histórico).

**Ubicación / listado.** `scripts/scrapers/*` (7 archivos), `scripts/scrapers/precios_consolidados_neuquen.json`, `package.json`.

**Causa raíz.** Iteraciones históricas del proyecto (el propio docs declara el diseño nuevo "sin alterar el script antiguo ni borrar su información").

**Consecuencia actual.** Confusión para auditor/maintainer; riesgo de que se ejecuten por error; cargo mental y superficie de ataque mínima pero no cero (scripts legacy sin validación de EAN checksum).

**Riesgo futuro.** "Fixes" aplicados a scripts muertos creyendo que están en el pipeline activo.

**Solución recomendada.** Mover `sync_neuquen_prices.py`, `run_all_scrapers.py`, los scrapers prototipo y el JSON viejo a `scripts/legacy/` con README "NO USAR — sustituido por sync_verified_prices.py"; reemplazar rutas absolutas por `Path(__file__).resolve().parents[...]`; `npm uninstall clsx tailwind-merge`.

**Implementación conceptual.** Sólo `git mv` + README + desintalación; no borrar el contenido (los datos históricos dentro del JSON viejo son irrepetibles para auditoría; documentar).

**Dependencias.** Ninguna.

**Riesgo de reparación.** BAJO. Cuidado: si algún doc/apéndice de datos referencia `precios_consolidados_neuquen.json` (el docs histórico usa el JSON nuevo; revisar run_all_scrapers antes de mover).

**Prueba de validación.** `grep -rn 'sync_neuquen_prices\|run_all_scrapers' .github scripts` → 0 hits en paths activos; CI verde.

**Dificultad.** BAJA.

---

## H11 — Modal de ficha de producto sin cierre por Escape ni clic-fuera, sin focus-trap

**Prioridad: P2** · **ESTADO: BUG CONFIRMADO (probado en vivo)**

**Problema.** `BarcodeScannerModal` cierra con Escape; `ProductDetailModal` lo **ignora**. Probado en vivo: con la ficha abierta, `Escape` no la cerró (siguió visiblemente detrás al reabrir el escáner). No hay clic en backdrop, ni `aria-modal`, ni foco inicial, ni lock del scroll del body.

**Evidencia.** Dispatch de `KeyboardEvent('keydown',{key:'Escape'})` contra el sitio desplegado → la ficha quedó abierta. En `src/components/ProductDetailModal.tsx` no hay `useEffect` de teclado ni handler de backdrop.

**Ubicación.** `src/components/ProductDetailModal.tsx` (root `div` líneas 38+), `src/components/BarcodeScannerModal.tsx` (contraste: sí lo tiene).

**Causa raíz.** Implementación asimétrica de modales.

**Consecuencia actual.** Fricción en móvil (Home/close real), problema de accesibilidad de teclado.

**Riesgo futuro.** Expec expectations de accesibilidad (WCAG 2.1: ESC/close para dialog).

**Solución recomendada.** Extraer un `useEscapeAndBackdrop(onClose)` compartido por ambas modales; onClick en backdrop (no en el contenido); `aria-modal="dialog"` + focus al abrir y volver al cerrar.

**Implementación conceptual.** Hook `useModalAccessibility(ref, onClose)`.

**Dependencias.** Ninguna.

**Riesgo de reparación.** BAJO.

**Prueba de validación.** En vivo: Escape cierra ficha; clic-fuera cierra; focus vuelve al origen; el escáner conserva su comportamiento actual (tests 9/9 deben seguir pasando).

**Dificultad.** BAJA.

---

## H12 — `stopCamera()` tras CADA lectura: la cámara se apaga también cuando el producto no está

**Prioridad: P2** · **ESTADO: BUG CONFIRMADO (comportamiento actual verificado en código y prosebado los flujos derivados)**

**Problema.** `handleLookup()` ejecuta `void stopCamera()` para códigos de cámara, foto y manual. Si el producto **no está en catálogo** (el caso más frecuente hoy, ver H6), el usuario vede el mensaje correcto pero debe pulsar "Volver a escanear" para reabrir la cámara. En escenas de supermercado (10 escaneos seguidos) son 10 interacciones extra y perturba el flujo.

**Evidencia.** `src/components/BarcodeScannerModal.tsx` líneas 91–119 (`handleLookup` → `void stopCamera()` alrededor de línea 98). Nota de diseño: REVISION_LECTOR.md explica la **serialización** de sesiones (motivo correcto), pero la decisão de apagar la cámara en `not-found` no está impuesta por la librería.

**Ubicación.** `src/components/BarcodeScannerModal.tsx`.

**Causa raíz.** Decision de simplicidad post-fix del lector (evitar sesiones superpuestas) → apagar siempre.

**Consecuencia actual.** En "no encontrado" el flujo real: mensaje + botón "Volver a escanear" (correcto, pero con pistolazo de cámara por cada envase).

**Riesgo futuro.** Uso real en tienda → abandono del escáner.

**Solución recomendada.** En `source === 'camera'` **sin producto**: NO parar la cámara; mostrar el mensaje en un toast/banda con último código escaneado y seguir escaneando (con debounce ~1,5 s para no re-disparar el mismo barcode). Mantener corte en `found` (navega a ficha) y en inputs manuales/photo.

**Implementación contextual.** Solo el branch `if (!found)`; gestión del mensaje con `errorMsg` ya existente + `resultTimerRef`-like debounce.

**Dependencias.** Ninguna; re-sondado con los tests 9/9 de la suite del lector (podría requerir 1 test nuevo: "después de lectura no catalogada la cámara sigue viva").

**Riesgo de reparación.** MEDIO: es justo el tipo de bug de sesiones cámara que se arregló; la suite de simulación existe y cubre esto.

**Prueba de validación.** Teléfono real: escanear 3 códigos seguidos con 2 desconocidos → cámara no se apaga tras los desconocidos, y tras un conocido abre ficha y cierra limpio. La suite nueva debe pasar.

**Dificultad.** MEDIA.

---

## H13 — Validación de códigos inconsistente entre capas (lector vs importador)

**Prioridad: P2** · **ESTADO: BUG CONFIRMADO (inconsistencia lógica, hoy de impacto bajo)**

**Problema.** Tres reglas distintas coexisten:
- Importador `valid_ean()`: acepta **8, 12, 13 y 14** dígitos (GTIN-14 incluidos) y verifica checksum.
- Lector input regex: `^\d{8}$|^\d{12,13}$` (no acepta 14 ni 12-UPC con verificación).
- Lector normalización: UPC-A de 12 → EAN-13 con `0` delante; **UPC-E no se normaliza** aunque el decoder ES lo devuelve en 8 dígitos (aceptable por regex, pero el catálogo guarda UPC-A/EAN-13 → un UPC-E de envase puede no matchear).

**Evidencia.** Comparación directa de los tres códigos (`sync_verified_prices.py` línea `valid_ean`; `BarcodeScannerModal.tsx` línea 94; observación de que `ean_aliases` se pensó exactamente para esto pero en el snapshot actual llega vacío).

**Ubicación.** `scripts/scrapers/sync_verified_prices.py` (valid_ean), `src/components/BarcodeScannerModal.tsx` (handleLookup normalización).

**Causa raíz.** Evolución por separado de backend (importador) y frontend (escáner) sin utilidad común.

**Consecuencia actual.** Un GTIN-14 impreso en un canecie cantaría en el importador pero el lector lo rechazará como "código inválido" por el regex: confunde al usuario con mensajes correcto+"invalido".

**Riesgo futuro.** Cuando se importen más EANs/catálogos, cumbre de aliases/o UPC-E elevables.

**Solución recomendada.** Único `normalizeEan()` + `isValidEan()` en `src/utils/dataQuality.ts` (o `src/utils/ean.ts`), usado por scanner e importador (el script Python mantiene su duplicado por ser Python, pero con la misma tabla de casos en tests).

**Implementación conceptual.** Añadir `expandGtin14ToEan13()`, `expandUpcEToUpcA()` (tabla de patrones estándar), ambos testeables con fixtures públicos.

**Dependencias.** Facilita H6.

**Riesgo de reparación.** BAJO–MEDIO (modificaciones del lexer con suite de tests existente).

**Prueba de validación.** Tests unitarios: 8/12/13/14 dígitos + UPC-E conocido (p. ej. `042640011` → `04264000011` completo) → los 4 casos pasan en ambas capas.

**Dificultad.** BAJA–MEDIA.

---

## H14 — "Evolución del precio" con solo 2 días de datos reales y deal-flags inalcanzables

**Prioridad: P3** · **ESTADO: PROBLEMA PROBABLE (se corrige solo con tiempo) + código muerto parcial**

**Problema.** El histórico real nació el 30/10/2026 (2 días). `ProductDetailModal` necesita ≥2 puntos para graficar y `priceAnalyzer` tiene hardcodeado `deal_flag: 'historial_insuficiente'`: las ramas `'oferta_real'` / `'suba_previa'` (iconos y labels asociados) son Código inalcanzable hoy.

**Evidencia.** `price-history.json` → fechas únicas `{2026-10-30, 2026-10-31}` (script). `src/utils/priceAnalyzer.ts` líneas 60–63 (`const deal_flag: DealFlag = 'historial_insuficiente'` incondicional).

**Ubicación.** `src/utils/priceAnalyzer.ts`, `src/components/ProductDetailModal.tsx`, `src/data/price-history.json`.

**Causa raíz.** Sistema nuevo de historial muy reciente.

**Consecuencia actual.** Copys honestos ("Historial en construcción"), gráficos que aparecen solo para productos con 2 snapshos.

**Riesgo futuro.** Si otra vez un agente "arma" un detección de suba con historial corto, se cometeran el error que evitó el diseño actual (el docs lo dice: "una serie mixta de sucursales no prueba inflación").

**Solución recomendada.** Dejar el flag `historial_insuficiente` hasta tener ≥30 días; cuando exista, implementar comparación **solo** con el mismo `product_id+branch_id+channel` para evitar mezclas. Antes de eso, retirar las ramas muertas o documentarlas como "futuro".

**Implementación conceptual.** Añadir en priceAnalyzer: `if (Array.isArray(historyPoints) && historyPoints.some(p=>p.date < minDate30d))` …, quitando el `const deal_flag` hardcode.

**Dependencias.** H3 (ventana de datos del historial).

**Riesgo de reparación.** BAJO–MEDIO (probabilidad de reintroducir inferencia indebida).

**Prueba de validación.** Con fixture de 2 series: mismo branch/canal → compara; mezcla secciones → no compara.

**Dificultad.** MEDIA (con decisión de producto).

---

## H15 — `mergeCloudData` pierde silenciosamente precios de nube al cuarentenar EANs duplicados

**Prioridad: P2** · **ESTADO: BUG CONFIRMADO (en código; sin efecto visible con los datos actuales de Supabase)**

**Problema.** Cuando un producto de nube trae un EAN ya presente en el catálogo, se hace `continue` **antes** de registrar el mapping `ids.set(row.id, product.id)`. Las filas de precio de ese producto en nube quedan huérfanas (`pid undefined` → descartadas silenciosamente).

**Evidencia.** `src/services/productService.ts` líneas 38–40 (comentario "quarantined until reviewed" + `continue` sin ids.set()). Con el dataset actual (7 productos) el efecto es menor pero real: el precio de un `prod-001`-ya-duplicado se pierde sin warning.

**Ubicación.** `src/services/productService.ts` (`mergeCloudData`).

**Causa raíz.** Intencionalidad de prudencia no acompañada de registro/observabilidad.

**Consecuencia actual.** Ninguna visible (dataset demo); si se activa la sincronización real (H5 Opción A), producirá descartes aleatorios invisibles.

**Riesgo futuro.** Datos faltantes sin causa aparente en producción (muy difícil de diagnosticar).

**Solución recomendada.** Acumular lista `quarantined: {productId, ean, reason}` y exponerla en el `message` de estado y en consola.

**Implementación conceptual.** En la branch de continue, push a array quarantined; en el retorno mostrar `N productos de nube en cuarentena por EAN duplicado` en `message`.

**Dependencias.** Se vuelve crítico si se elige la Opción A de H5.

**Riesgo de reparación.** BAJO.

**Prueba de validación.** Fix: insertar 2 productos de nube con el mismo EAN → el segundo debe quedar en el mensaje de cuarentena; tests nuevos en `data-quality.test.cjs`.

**Dificultad.** BAJA.

---

## H16 — UX del caso "producto encontrado pero sin precio" es indistinguible de un fallo

**Prioridad: P1** · **ESTADO: MEJORA (alta prioridad de percepción)**

**Problema.** Productos como Leche Serenísima 1 L (`7790742357007`), Fideos Matarazzo (`7790070336293`), Coca-Cola 3 L (`7790895007019`) existen en el catálogo (semilla `prod_*`/test-buttons del lector) pero **sin observaciones frescas**: la ficha abre con "Sin precio vigente" (o vacía de comparación). Para el usuario, "escaneé la leche y me abrió algo sin precios" == "la app no funciona".

**Evidencia.**
- Snapshot del importador no contiene los EANs de test-button 4/5/6 arriba (script).
- `ProductDetailModal.tsx` muestra estado vacío sin CTA de siguiente paso ("¿querés que lo agreguemos?").
- Los "botones de ejemplo" del escáner están etiquetados como cuesss de prueba ("lbl Natura 1.5L, Yerba Playadito, Leche Serenísima…") y 4 de 6 de ellos llevan a fichas sin datos utiles (2 funcionan: Natura 900 y 1.5L? → Natura 900ml **sí**; el resto se caminan a estados vacíos).

**Ubicación.** `src/components/ProductDetailModal.tsx`, `src/components/BarcodeScannerModal.tsx` (block "Buscar productos de ejemplo"), `src/data/database.ts` (semillas).

**Causa raíz.** Semillas históricas sin correspondencia en el importador nuevo; UX sin estados progresivos.

**Consecuencia actual.** Percepción de breakage en el flujo principal del escáner (aunque técnicamente sea "catálogo sin precios").

**Riesgo futuro.** Abandono del escáner; issues reportados como bugs por usuarios.

**Solución recomendada.** (1) En ficha sin precios: CTA explícito "No hay precios frescos para este producto. Envianos una foto o visitá la tienda — alta de producto" + estado por cadena ("El catálogo tiene este producto marca X, pero las fuentes cubren solo Coope/Vital/Makro/ChangoMás"); (2) relabel del bloque de "ejemplos" clasificarlos por si TRAEN precios estables (verde) o están "pendientes de alta" (gris); (3) ocultar secciones vacías ("Sin precio" en vez de tabla vacía).

**Implementación conceptual.** Condicionales en ProductDetailModal; refactor botón de ejemplo mapping `hasFreshPrice(product)`.

**Dependencias.** H6 (mejora la base), H2 (sincronía de estándares UI).

**Riesgo de reparación.** BAJO.

**Prueba de validación.** En el sitio: ficha de Leche Serenísima muestra CTA y estados; los 6 botones de ejemplo reflejan su verdad (precios o pendiente).

**Dificultad.** BAJA–MEDIA.

---

## H17 — Búsqueda sin ranking ni fuzzy; sin búsqueda por EAN en el input de búsqueda

**Prioridad: P2** · **ESTADO: MEJORA**

**Problema.** `matchesProduct()` = AND de palabras normalizadas sobre `name+brand+category+ean`; no hay ranking (los 6 primeros del autocomplete salen en orden de array), sin tolerancia a errores ("Serensima" sin tilde funciona por `normalizeText`, pero "LError de tipeo" falla), y el autocomplete corta a 6 sin "ver todos".

**Evidencia.** `src/utils/dataQuality.ts` líneas 30–33; `src/components/SearchAutocomplete.tsx` líneas 29 (`slice(0,6)`).

**Ubicación.** `src/utils/dataQuality.ts`, `src/components/SearchAutocomplete.tsx`, `src/App.tsx`.

**Causa raíz.** MVP consciente.

**Consecuencia actual.** Resultados conorticables (a veces el mejor queda fuera por orden del array), frustración ante typos.

**Riesgo futuro.** Con más productos, búsqueda "gana el más nuevo" de forma arbitraria.

**Solución recomendada.** Ranking simple por: underlying fresh-price presenta (oportuno), match de marca completa como bonus, startswith; búsqueda por EAN → abir productos; "Ver todos los resultados" llega al listado con query.

**Implementación conceptual.** `scoreProduct(product, query)` con fórmula simple; });



**Dependencias.** H6 (EAN mejorados), H8 (índice puede compartirse).

**Riesgo de reparación.** BAJO–MEDIO.

**Prueba de validación.** Casos tipográficos: "serensima", "cocacola", "7790742357007"; el expected debe estar primero o muy arriba; siguen pasando tests.

**Dificultad.** MEDIA.

---

## H18 — Sin security headers (CSP, HSTS, X-Frame-Options, Referrer-Policy)

**Prioridad: P3** · **ESTADO: MEJORA (riesgo bajo real)**

**Problema.** No hay `vercel.json` ni headers de seguridad. La app solo lee datos; no hay caja de verdad XSS conocida, pero `source_url` y `image_url` se renderizan sin sanitización extra y un defecto futuro de escapado sería explotable.

**Evidencia.** Repo sin `vercel.json`/`_headers`; bundle sin CSP en meta (verificado por `curl` del HTML: no hay `<meta http-equiv="Content-Security-Policy">`).

**Ubicación.** configuración de deploy (nueva `vercel.json`).

**Causa raíz.** Deploy por defecto de Vercel.

**Consecuencia actual.** Ninguna.

**Riesgo futuro.** Explotación de un XSS futuro; clickjacking/iframe; sniffing MIME.

**Solución recomendada.** `vercel.json` con: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security: max-age=31536000`, y CSP permitiendo: self + `images.openfoodfacts.org`, `lacoopeencasa.coop`, `store-level` de imágenes de Coope/VTEX, `supabase.co` (fetch/XHR), `vercel.app`/`vercel.live` si se requiere preview.

**Implementación conceptual.** Archivo estático; revisar que origin de imágenes coope (`$(fenêtre)`) quepa en CSP (descubrir los dominios exactos revisando `image_url` del JSON: **los dominios concretos de CDN de imágenes no fueron catalogados** — pendiente §21).

**Dependencias.** Ninguna.

**Riesgo de reparación.** BAJO (mésaje de CSP muy restrictivo podría romper features de imagen).

**Prueba de validación.** securityheaders.com A; sitio funciona íntegramente (imágenes cargando).

**Dificultad.** BAJA.

---

## H19 — Copys superprometen donde el modelo de datos no respalda

**Prioridad: P3** · **ESTADO: MEJORA**

**Problema.** Copy del hero/estados ("Ofertas TOP", botones "Buscar productos de ejemplo (sin usar la cámara)") + Ficha muestra "Información del precio" que no provee "detectar ofertar real" o subas. En producción además se ven los textos viejos (H1).

**Evidencia.** Snapshots del sitio + completo leído de las cadenas de UI en `src/`.

**Ubicación.** `src/App.tsx` (hero), `QuickActionCards`, `BarcodeScannerModal` línea 468ff.

**Causa raíz.** Escritura iterativa con resultados de ingeniería que luego se **restricto** al modelo de datos trazable (quiebre no propagado).

**Consecuencia actual.** Experiencia con expectativas no cumplidas en secciones clave.

**Riesgo futuro.** Reputación si se difunde el proyecto con la promesa de "detectar maniobras de doleros/inflación".

**Solución recomendada.** Alinear copys con capacidad #factual (p. ej. "Comparador con fuente y fecha" y "El lector encuentra productos ya relevados").

**Implementación conceptual.** Cambio de strings + revisión del hero.

**Dependencias.** H1 (deploy) para que se vea.

**Riesgo de reparación.** BAJO.

**Prueba de validación.** Releer la UI final vs claims en docs y `README`.

**Dificultad.** BAJA.

---

## H20 — Canasta persiste los objetos completos del producto en localStorage

**Prioridad: P3** · **ESTADO: MEJORA (riesgo bajo)**

**Problema.** `BasketContext` guarda `items: [{product: <sitemap completo>, quantity}]` con `JSON.stringify`. Si el catálogo cambia IDs/nombre, la canasta arrastra entidades viejas; los precios se recalculan live (bien) pero la identidad queda "congelada".

**Evidencia.** `src/context/BasketContext.tsx` (líneas 23–30, `addItem`: `prev.concat({product, quantity})`).

**Ubicación.** `src/context/BasketContext.tsx`.

**Causa raíz.** Diseño simple con deserialization directa.

**Consecuencia actual.** Ninguna crítica; individual de posibles "productos fantasma" tras cambios de strong IDs (no se ha aparecido: prod IDs son estables).

**Riesgo futuro.** Con migración de IDs (por ejemplo, si se estandariza `ean_*` como ID canónico), items viejos no matchearán y `bestFor` no les encuentra precio → columnas "missing".

**Solución recomendada.** Guardar `{product_id, quantity}` y rehidratar contra catálogo actual; si no existe, marcar "producto descontinuado del catálogo con acción de quitar".

**Implementación conceptual.** Cambiar persistencia + rehydration en el `useState initializer`.

**Dependencias.** Ninguna.

**Riesgo de reparación.** BAJO–MEDIO (compatibilidad con data storedexaken: need migration branch).

**Prueba de validación.** Persistent canasta sobrevive a reload tras renombrar un id en el JSON de prueba.

**Dificultad.** BAJA–MEDIA.

---

## H21 — Detalles del esquema SQL de referencia semilleable: RLS primero con política TEXT SELECT-only y sin validación de datos en seed

**Prioridad: P3** · **ESTADO: MEJORA / PROBLEMA PROBABLE (warning operativo)**

**Problema.** `schema.sql` habilita RLS con políticas `FOR SELECT USING (true)` para todas las tablas (correcto para anon-readonly), pero el **seed** de productos/precios es hardcodeado con descuentos ficticios y sin `ON CONFLICT` en `price_observations` no completo (sí existe upsert). El riesgo operativo es que un maintainer ejecute seed en una BD "real" pensando que se sincronizará con el importador (no lo hará — no existe ruta de escritura desde el pipeline a Supabase).

**Evidencia.** `schema.sql` head + sección "CARGA INICIAL" con 17 productos con imágenes Unsplash, 3 EANs internos `2000…` (curso de código de peso: legítimo para fruta/pan pero confuso como `ean UNIQUE`), y 30 filas de `price_observations` con `promo_condition` dolarizados.

**Ubicación.** `scripts/supabase/schema.sql` (líneas 90–170), `scripts/supabase/sync_migration.sql`.

**Causa raíz.** MVP pre-importador.

**Consecuencia actual.** Ninguna (BD viva ya tiene sus 7/14/15).

**Riesgo futuro.** Si alguien "arregla" Supabase ejecutando el SQL viejo, se contamina la nube con datos irreales.

**Solución recomendada.** Mover `schema.sql` a `scripts/supabase/legacy/` o anotarlo en la cabecera "SEED DEMO, NO USAR EN PROD"; el SN real (Opción A de H5) se escribirá nuevo.

**Implementación conceptual.** Solo aclaración de cabecera/move + check del `sync_migration.sql` (whose FK viola, ver H5).

**Dependencias.** H5.

**Riesgo de reparación.** BAJO.

**Prueba de validación.** `pg_dump`–like verificación de que la BD viva no cambió tras ejecutar nada (no se ejecutó: garantía por auditoría de solo lectura).

**Dificultad.** BAJA.

---

# 4. LECTOR DE CÓDIGOS DE BARRAS (análisis dedicado)

## 4.1 Flujo completo implementado

```
CÁMARA (getConstraints facingMode=environment, 1920×1080 ideal)
 → html5-qrcode (ZXing JS siempre; BarcodeDetector nativo SOLO si soporta ean_13/ean_8/upc_a/upc_e)
 → onSuccess: código string → handleLookup(code,'camera')
 → unqueue serializado (una sola sesión viva; generaciones para ignorar callbacks viejos)
 → cleanCode (strip espacios) + regex /^\d{8}$|^\d{12,13}$/ → mensaje de error de formato si falla
 → NORMALIZACIÓN: UPC-A 12 dígitos → EAN-13 con "0" delante; trim en catálogo y lookup
 → LOOKUP: products.find(p => [p.ean, ...(p.ean_aliases||[])].some(...)) sobre products DEL ESTADO DE LA APP
   → si NO está: mensaje "Código leído correctamente: X. Este producto todavía no está en el catálogo." + stopCamera
   → si ESTÁ: beep + successMsg + setTimeout 350ms → onProductFound(p) → ProductDetailModal → onClose
 → FICHA: analyzeProductPrices → precios por sucursal (priceIsUsable)
```

Caso **foto**: `scanFile` con `<div id="file-scanner-temp" class="hidden">` (válido para decodificación de imagem, no requiere visible). Caso **manual**: mismo `handleLookup`.

## 4.2 Verificación realizada en vivo (sitio de producción)

| Prueba | Resultado |
|---|---|
| Abrir modal escáner ("Escanear EAN") | ✅ abre (a11y tree no lo expone, DOM sí) |
| Input manual con `7790272001005` (aceite Natura 900ml, en catálogo CON precio fresco) | ✅ busca → successMsg → **ficha abierta** |
| Input manual con `7790262007700` (válido en formato, NO catalogado) | ✅ mensaje exacto correcto, sin crash, **ficha no abre** |
| Suite propia del lector (`tests/barcode-scanner.test.cjs`) | ✅ 9/9 pass (constraints, native dual-decode, unknown report, late release, UPC-A dup, cancelación, foto, controles opcionales, productos actualizados en vivo) |
| Escape con ficha abierta (otra modal) | ❌ ficha no se cierra (H11) |
| Cámara (óptica real) | ⚠️ **NO verificable en entorno de auditoría** (requiere dispositivo físico). REVISION_LECTOR.md declara igualmente "pendiente prueba en teléfono". |

## 4.3 Causa raíz del comportamiento observado por el usuario

**"El aceite funciona, otros productos no":**

1. **El aceite Natura 900 ml funciona** porque su EAN real (`7790272001005`) existe en el snapshot con **precio fresco verificado** asociado (ChangoMás import, 31/10, fuente HTTPS, `is_verified`): la ficha abre con lista de precios completa.
2. **Otros productos "no funcionan" por tres causas distintas que el usuario percibe igual:**
   - **A) Producto no catalogado** (76% del catálogo es `coope_*` sin EAN; o fuera de las 20 palabras de relevamiento del importador): mensaje correcto pero frustrante → H6.
   - **B) Producto en catálogo SIN*A precios frescos** (producto semilla `prod_*` popular como leche/fideos/Coca): ficha abre **vacía** de precios ("Sin precio vigente") → H16. El producto "Fowen" pero se lo vive como falla.
   - **C) Fracaso óptico del decode** (ángulo/curvatura/brillo/tiempo de exposición): el envase del aceite curvo se rinde conforme al hint UI de 15–20 cm; **hipótesis no descartable** hasta prueba en teléfono real (REVISION_LECTOR lo declara explícitamente).
3. No hay bug en el matcheo: la suite 9/9 cubre constraints + lookup + puertas de serialización/normatización. **No se registraron bugs de software en el decode path con la evidencia disponible.**

## 4.4 Cobertura de EAN medida

| Métrica | Valor |
|---|---|
| Productos totales (working tree) | 984 |
| Productos con `ean` | 238 (24,2%) |
| Productos `coope_*` sin EAN (La Coope no expone EAN en la API pública usada) | 783 (76%) |
| EANs únicos embebidos en el bundle de producción | 172 |
| Chamos/Vital con EAN válidos | ~93 |
| Con aliases (`ean_aliases`) en snapshot | 0 |
| Semillas `prod_*` (INITIAL PRODUCTS) | 6 (5 de los 6 test-buttons del lector) |

## 4.5 Separación formal de responsabilidades

**LECTOR FUNCIONA (software ok):**
- Serialización de sesiones, generaciones, liberación tardia de permisos, dual-decode native/ZXing, foto, input manual, beep, transiciones, messages.
- Test suite 9/9 + verificación en vivo del lookup y de la ficha por EAN correcto.

**LECTOR TIENE BUG (software a corregir):**
- H12: cámara se apaga tras cada lectura (incluida `not-found`).
- H13: regex/normatización EAN parcial (no hay UPC-E expansion, no acepta GTIN-14) e inconsistente con el importador.
- H11 (indirectamente): Escape no cierra la ficha a la que redirige (frustra el flujo de retorno a escanear).

**FALTAN DATOS (no es bug de software):**
- H6: 76% del catálogo sin EAN (Coope); 5/9 cadenas sin precios conectados; la mayoría de envases "normales" del supermercado no está en el catálogo.
- Test-buttons del lector apuntan a productos semilla sin precios frescos (ver 4.3-B).

**DATOS INCORRECTOS:**
- H7: alias Coca-Cola en el aceite (latente).
- H15: cuarentena de EAN duplicado sin registro (descartes silenciosos, hoy sin impacto).
- H5: seed demo de Supabase con EANs inventados (si se activara escritura, contaminaría).

**MEJORAS UX:**
- H16: ficha sin precios con CTA y estado por cadena; relabel de botones de ejemplo.
- H12/H11: escaneo consecutivo + cierre correcto de ficha; toast de última lectura.
- Recomendado: sugerir búsqueda por nombre tras "no catalogado" (baja fricción inmediata).

## 4.6 Productos sin EAN / cadenas que no lo exponen

- **La Coope:** API pública devuelve `cod_interno`, no GTIN (confirmado por el propio importador con el comentario `"cod_interno no es EAN. Nunca unir productos por semejanza del nombre."`). 783 productos.
- **Makro:** lista de precios en HTML solo trae código interno del catálogo (el importador lo aclama en notes).
- **Coto / La Anónima / Vea / Yaguar / Diarco:** sin fuente conectada (data no existe; no es problema de EAN sino de cobertura, `[ちゅ]`).
- Consecuencia: escaneabilidad baja **por cadena**: ChangoMás+Vital ~93 EANs reales; Coope 0.

## 4.7 Diferencia clave "no encontrado" vs "encontrado sin precio"

Actualmente ambos casos presentan la ficha con "Sin precio vigente" o no abren:
| Caso | Mensaje de éxito en el lector | Destino | UX Responsable |
|---|---|---|---|
| No está en catálogo | "…todavía no está en el catálogo." (correcto) | cámara parada | **H12/H16** |
| EAN en catálogo sin obs frescas | "¡Producto encontrado!" | ficha con "Sin precio vigente" (sin CTA) | **H16** |

Ambos absolutamente distintos en datos (A: `products.find()`=undefined; B: clear product, `analysis.observations.length===0`), similares en experiencia.

---

# 5. DATOS Y SUPABASE

## 5.1 Estado real de la BD (verificado en vivo 31/10/2026)

| Pregunta | Respuesta |
|---|---|
| Tablas y conteos | `products` 7 · `price_observations` 14 · `supermarkets` 15 |
| Edad de datos | observaciones del **27/10/2026** (fuera de la ventana de 72 h del parser: no se usarían aunque pasaran la validación) |
| Origen | seed en `schema.sql`: imágenes Unsplash truncadas de other groceries, EANs parcialmente ficticios (`2000001005001`, `2000001006002` = códigos internos de peso, `7500435122005` shampoo de cotización mexicana), descuentos hardcodeados (`'20% con Comunidad Coto'`) |
| Trazabilidad | ninguna: sin `is_verified`, `source_url`, `observed_at` (columnas inexistentes; `mergeCloudData` exige `is_verified===true && source_url` → **0 precios de nube entrantes**) |
| RLS | habilitado con `FOR SELECT USING(true)` para anon — correcto para lectura pública |
| Escritura | **No existe ruta activa** desde el importador a Supabase (confirmado en scripts y docs) |

## 5.2 Precios hardcodeados y semilla insegura ya incluidos

- `schema.sql` líneas 90–170: 30 `INSERT` de price_observations con descuentos ficticios, "product" names correctos pero marcas/imagen委 Unsplash genéricas.
- `sync_migration.sql`: 60+ INSERTs en `price_history` con product_ids de la semilla de `database.ts` (no presentes en la BD) → **violación de FK si se ejecuta**.
- Ambos scripts parecen descansos de iteraciones: hoy son **telemetría de la historia del proyecto**, no pipeline activo.

## 5.3 Esquema vs expectations del código (drift structurado)

| Lo que `mergeCloudData()` lee | Lo que `schema.sql` define | Consecuencia |
|---|---|---|
| `row.unit_measure` | `unit TEXT` | fallback a `unit`-string no numérica → `net_content_number` default 1 (mal: Precio por unidad incorrecto si se usara) |
| `row.net_content_str` | no existe | fallback a `row.unit` |
| `row.is_verified`, `row.source_url` | no existen | **ningún precio de nube pasa a comparaciones** |
| `row.observed_at || row.updated_at` | solo `updated_at` | fecha del upsert, no fecha de consulta real |
| `row.channel`, `row.min_quantity`, `row.quantity_multiple`, `row.promo_condition` | solo `promo_condition` | defaults silenciosos |

## 5.4 `mergeCloudData()` — comportamiento y problemas

- **Útil como(has investigado):** paginación >1.000 filas (`range(offset, offset+999)`); mapeo de cadenas desconocidas `mapSupermarketId` que nunca convierte `ting unreachable → coto` (finance-tests); filtrado de imágenes Unsplash de nube; actualización de fecha de versiones de nube vs locale.
- **Riesgos reales:** descartes silenciosos (H15); conflit EAN local vs nube (quarentena correcta pero no cupibles sin registro).
- **Test que lo cubre:** "cloud adds new products, maps their prices to their own IDs" — activo.

## 5.5 Fuente de verdad recomendada

**Recomiéndese: strict (hoy) → `src/data/*.json` como fuente de verdad de lectura, con una sola fuente de escritura = importador en GHA.** Supabase debe elegir entre (A) convertirse en la DB real del proyecto (incluyendo carga y migración del historial, con esquema v2 y escrituras server-side) o (B) desconectarse. No hay tercera opción sana, porque la coexistencia actual genera drift + carga inútil + confusión de fuero.

---

# 6. ACTUALIZACIÓN DE PRECIOS

## 6.1 Pipeline activo (correcto)

`sync-prices.yml` — `cron: '0 11 * * *'` (11:00 UTC = 08:00 ART, comentario del código correcto), tests previas (`python3 -m unittest …` + `node tests/data-quality.test.cjs`), `continue-on-error` en la consulta (conserva datos si falla), build posterior, commit automático `chore(prices): …` con `[skip ci]` implícito desde el cron. Fallos rellables → job en rojo (visible en GHA).

## 6.2 Cadena por cadena (estado del 31/10)

| Cadena | Estado | Precios votados | Motivo |
|---|---|---|---|
| coope*pera | **partial** | 687 (API con errores parciales por término) | ok con errores de búsqueda – ver `errors` en `sources` del snapshot |
| changomas | ok | 6 | término de búsqueda limitado + filtros rígidos de la simulación de checkout VTEX |
| vital | ok | 87 | bultos con `min_quantity` correctos |
| makro | ok | 36 | solo presentaciones un ambięguitas |
| coto / la_anonima / vea / yaguar / diarco | **pending** | 0 | sin fuente conectada; **5/9 cadenas del sector 8300 sin datos** |

## 6.3 Reglas de datos (positivas y peligrosas)

- ✅ Nunca se inventa precio ni se re-etiqueta fecha; `merge_observations` siempre conserva la última lectura por `id`.
- ⚠️ **Regla 72 h global** (H4) → punto débil unificatión del catálogo.
- ⚠️ **`mergePrices` por `observationKey` = product+branch+channel**: si la misma sucursal cambia `branch_id` (o el canal cambia en formato), el histórico queda dos llaves y puede duplicar en la ficha (no visto todavía, indicadalocation `branch_id` estables: `cooperativa_124`, `changomas_3608`… pendiente de confirmar en tiempo).
- ⚠️ **`GRAPE` sin notiificación** de caída parcia: `sources[chain].status` informa "partial"/"error" en el JSON, pero la **UI solo muestra el CoveragePanel** ("2 de 9 cadenas"); los `errors` detallados del importador no llegan al usuario ni a una página de status (H9).

## 6.4 Fallo silencioso global vs parcial

Es la combinació de H4+H9: si `collect_coope` para por cuota o cambio de API, el `continue-on-error` mantiene los datos (bien) pero no se notifica al usuario en la UI más allá de "sin precios conectados", ni hay ningún alerta si el job entero pasa sin datos nuevos.

---

# 7. HISTORIAL DE PRECIOS (dofísticas de rendimiento y crecimiento)

| Métrica | Hoy (30/10–31/10) | 7 días | 30 días | 1 año |
|---|---|---|---|---|
| Registros en `price-history.json` | 1.655 | ~8.6k | ~30k | ~335k |
| Tamaño estimado del JSON | 1,42 MB | ~7,4 MB | ~26 MB | ~290 MB |
| Impacto en bundle (si permanece embebido) | 1,42 MB | 7 MB | 26 MB | 290 MB ← inusable |

(Suponiendo ~990 registros/día estable; en realidad crecerá con el EAN y new cadenas.)

**Alternativas evaluadas.** (A) Ventana/agregación dinámica en importador; (B) **fetch lazy desde `public/history.json`**; (C) histórico en Supabase y queries por producto; (D) separar parte "últimos 30 días" embebida + resto lazy.

**Recomendación arquitectónica.** En el corto plazo, (B) (cambió de `import static` a `fetch()`, casi sin cambios en product logica); en el mediano, (A)+(C) combinadas: importador produce `price-history-daily.json` (min/avg por día/sucursal) + historiio detallado en Supabase/`public` con retención documentada de N meses. El prospecto "no se borran consultas" puede mantenerse como política de COLD storage (Git history es un archivo histórico de y en sí: cada commit conserva el estado precedente).

---

# 8. PROMOCIONES Y OFERTAS

- Causa técnica: filtro `discount_percentage` inexistente en el modelo nuevo (H2).
- Causa conceptual: el importador v1.1 es deliberadamente "precio base sin promos" (`promo_condition` solo como nota textual); las ofertas reales quedarán imposibles hasta decidir: (i) inferir ofertas de `regular vs current`, o (ii) importar promo real con condición explícita (requiere nueva fuente/parquet).
- UI actual muestra headline Promociones + secciones vacías (visto en el snapshot vivo de `DealsRankingSection`).
- El archivo de `price-history` y `price-history-daily` no cambiarán esto por sí solos; si se deriva de **precios vigentes** funciona ya (con 4 cadenas).

---

# 9. BUSCADOR

- Implementación actual: `matchesProduct` AND-terms sobre `name+brand+category+ean`; `SearchAutocomplete` `slice(0,6)`; sin fuzzy (solo normalización de acentos por `normalizeText`), sin ranking, sin "ver todos"-navigation, sin búsqueda de pegar-EAN.
- Problemas: resultados con ordenɑ arbitrario (array order), exact-match con palabras cortas ("le, mar?") y AcARITY; el EAN pegado en búsqueda sí matchea por la concatenación de `product.ean` en el texto COMPLETO del producto (funcional).
- Mejoras recomendadas (ver H17): scoring simple (marca completa + producto con precio fresco), búsqueda por EAN como path al producto, Vermut "Ver todos" que lista en `filteredProducts` en vez de solo suggestions.

---

# 10. RENDIMIENTO

| Área | Estado | Evidencia | Recomendación |
|---|---|---|---|
| Bundle | 3,59 MB (551 KB gzip), JSON embedded | `dist/assets/index-uV8uOiz7.js` | fetch lazy de JSON (B), code-splitting por modal (leaflet, gsap, recharts cargados siempre, incluso un usuario que no abre mapa/ficha/escáner) |
| Sort | O(n·m·log n) re-análisis por comparación | H8 | índice precalculado |
| Ficha | `recordedHistory` itera todo el histórico por apertura | H3/H14 | digest diario |
| Escáner | lean; carga html5-qrcode siempre (131 kB gzip aprox reinbound) | bundle | dynamic import al abrir el modal |
| Renders | `ProductCard` debe computar `analyzeProductPrices` por tarjeta con `observations` prop | H8 | pasar analysis precalculado |
| Imágenes | sin `width/height` ni srcset; fallback a Unsplash directa en uno de los paths de la ficha | ProductDetailModal líneas 69–72 | dimensiones + fallback consistente (excluye unsplash via edge…, revisar la anchor del `mergeCloudData` vs entorno) |

---

# 11. SEGURIDAD

| Ítem | Estado | Prioridad real | Nota |
|---|---|---|---|
| Secretos en repo | **OK** | — | `.env.local` gitignored; `git ls-files` sin env; `REVISION_LECTOR.md` declara respaldo sin `.env.local` |
| Anon Supabase key en cliente | **OK por diseño** | — | es publishable; RLS SELECT-only |
| VERCEL_OIDC_TOKEN en `.env.local` | **OK (local-only)** | — | corto-lived; no está commiteado; no debe entrar a backups (REVISION_LECTOR confirma) |
| RLS en BD | OK (SELECT-only) | — | verificado en schema.sql |
| Security headers (H18) | AUSENTES | P3 | riesgo bajo real; no exagerar |
| Sol sobre sanitización de `source_url` | Riesgo teórico | P3 | `href={source_url}` ribaria un `javascript:` si alguien stuffing: registrar filtro de `https:` (ya filtrado por `priceIsUsable` en visualmente en UI — se puede hardenizar) |
| `localStorage` canasta | Riesgo bajo | P3 | sin datos sensibles |

**Conclusión:** no hay exposición crítico. La prioridad real de seguridad es **procedural**: evitar que running SQL hered semilleado en producción (H5/H21) y unificar sanitización antes de que crezca el proyecto.

---

# 12. OBSERVABILIDAD Y ERRORES SILENCIOSOS

- `catch {}` sin logs (H9) en: productService, scanner (photo, torch, zoom), mapSupervisorId no hay.
- El usuario ve solamente el mensaje de estado del propio servicio ("No se pudo actualizar la conexión…"), que es correcto pero sin diagnóstico.
- NO hay: Sentry/other error tracking, logging server-side del cron (solo logs de GHA), dashbord de cobertura, webhook a telegram del job fallido (el workflow solo imprime y falla el query — queda en GHA UI).
- Dificultad para diagnóstico actual: **alta** — un usuario reportante "no funciona" no da ni señalgifsession nada.

Recomendación mínima: `console.error` +状态 de `sources` en la UI (CoveragePanel ya tiene métricas: agregar los errores del importador como details/doots) + (opcional) Sentry self-hosting.

---

# 13. CÓDIGO MUERTO Y DEUDA TÉCNICA (índice)

| Archivo/elemento | Qué es | Estado | Acción |
|---|---|---|---|
| `run_all_scrapers.py` | pipeline viejo | **muerto**, con rutas absolutas a `.gemini/antigravity/brain/<uuid>` | mover a legacy + quitar rutas |
| `sync_neuquen_prices.py` (466 líneas) | orquestador anterior | muerto (regex con `sepa_api`, `vtex_changomas`) | legacy |
| `coto_scraper.py`, `la_anonima_scraper.py`, `vital_scraper.py` (vitalún) | prototipos con BeautifulSoup | muertos (el vital real es API VTEX en sync_verified) | legacy, revisar antes de mover |
| `sepa_api.py` | consulta a SEPA | muerto (docs: HTTP 403) | legacy |
| `vtex_changomas.py` | prototipo VTEX | muerto (la versión real es `mas_record`+`collect_mas`) | legacy |
| `cooperativa_obrera_api.py` | prototipo API Coope | muerto (la versión real es `collect_coope`) | legacy |
| `precios_consolidados_neuquen.json` | consolidado viejo con datos fijos etiquetados como fecha actual | muerto/datos inválidos | legacy + advertencia |
| `clsx`, `tailwind-merge` | deps sin uso | muertos | uninstall |
| `INITIAL_PRICE_OBSERVATIONS` en `database.ts` | precios semilla sin trazabilidad | vivos pero descartados por `is_verified:false` (deliberado) | dejar (documentado) |
| ramas `oferta_real`/`suba_previa` en priceAnalyzer | código inalcanzable hoy | muerto-de-facto | H14 |
| `dist/` commiteado NO (está en gitignore) — pero presente localmente | artefacto build | local | ok |

---

# 14. LOCAL VS PRODUCCIÓN

| Aspecto | Working tree (31/10) | Git HEAD (`f2ed034`) | Vercel producción (31/10) |
|---|---|---|---|
| Bundle | `dist/` local build 20:34 | — | `index-uV8uOiz7.js` (mismo md5 que dist local) |
| Texto "Venta por bulto / con condiciones" | **PRESENTE** (cambio sin commit) | ausente | **AUSENTE** |
| Productos visibles en catálogo | 984 | — | 889 (verificado por UI) |
| Datos (last_attempt) | 31/10 23:45 (uncommitted) | el commit cron anterior | reciente (postcron del 31/10, dado por el despliegue del bundle) |
| Cobertura EAN | 238 (24,2%) | — | 172 únicos en el bundle |

**Riesgo majeur:** cualquier fix local que CI/CD no refleje puede ser evaluado como "arreglado" cuando producción sigue rota (o al revés). **Protocolo de auditoría recomendado:** siempre contrastar `git status` + hash del bundle servido antes de juzgar.

---

# 15. PRIORIZACIÓN (P0–P3)

**P0 — BLOQUEANTES** (afectan la función principal o la integridad de datos)
- H1 producción desalineada del código
- H2 Promociones/Ofertas muertas
- H6 cobertura EAN 24% + fichas sin precios al escanear

**P1 — IMPORTANTES** (número después de P0)
- H3 bundle con histórico en crecimiento
- H4 regla 72 h sin degradación visible
- H5 Supabase semilleo/inerte (decisión arquitectónica)
- H16 UX "encontrado sin precio"

**P2 — MEJORAS NECESARIAS**
- H7 alias EAN erróneo (latente pero crítico si se activa)
- H8 orden O(n×m)
- H9 errores silenciosos
- H10 código muerto + rutas privadas de agente IA
- H11 modales sin Escape/click-fuera
- H12 stopCamera tras lectura no encontrada
- H13 inconsistencia de validación EAN
- H15 descartes silenciosos en mergeCloudData
- H17 buscador sin ranking/EAN-first

**P3 — FUTURO**
- H14 gráfico/deal-flags (esperar datos)
- H18 security headers
- H19 copys
- H20 canasta por product_id
- H21 seed SQL legacy marcado

---

# 16. ORDEN EXACTO DE REPARACIÓN (con dependencias lógicas)

1. **H1** — Revisión + commits + push y verificar deployment. *(Nada puede evaluarse antes que esto.)*
2. **H2 + H19** — Arreglar "Promociones" Y alinear copys relacionados (mismo dominio UI, evitar dos pasadas).
3. **H16 + H11 + H12** — UX del ciclo escáner→ficha: estados sin precio + CTA, Escape/backdrop, cámara viva en not-found. *(mismo componente-cadena, probar junta en la suite del lector)*
4. **H9 + H4** — Logging + banner de frescura y degradación referencial. *(necesitan los componentes de estado de datos; hacerlas juntas)*
5. **H10** — Limpieza de legacy y deps (mover rutas/deps PO es independiente del resto, pero mejor después de H1 para no mezclar diffs).
6. **H13 + H7 + H15** — EAN: normalizador compartido + aliases corregidos + warnings de cuarentena. *(y solo después considerar "más EANs"/Open Food Facts, que amplía la superficie)*
7. **H3** — Fetch lazy del histórico (+ digest diario si se avanza). *(tocar producto-service una vez que H9/H4 sienten el estado de datos)*
8. **H5** — Decisión Supabase: (B) apagar o (A) reconstruir esquema v2 + sincronización server-side. *(si A, después de H3, porque el histórico con digest iría a la BD)*
9. **H8 + H17** — Índice de análisis + scoring de búsqueda (comparten utilidades). *(después de los datos estables para no reordenar constantemente)*
10. **H14, H18, H20, H21** — Mejoras a medida que pese por tracción (gráfiques por días de historial, headers, canasta por id, seed SQL marcado legacy).
11. Extras de crecimiento (no numerados aquí): integrar más cadenas vía CSV/`precios-template.csv`, Open Food Facts para EAN de Coope, telemetría.

**Justificación del orden:** evitar tocar `productService`/datos antes de que esté lo base de estado (H1), no cambiar UI del escáner sin devol-hенная tests (H16/H11/H12 juntos), no elegir DB antes de resolver el histórico (H3 antes de H5-A), y no ampliar EANs (Open Food Facts) antes de normalizar su tratamiento (H13/H7/H15).

---

# 17. QUICK WINS

| Fix | Horas | Riesgo | Beneficio |
|---|---|---|---|
| H1 commit/push + confirmar despliegue | 0,5 | bajo | toda la pila de desarrollo audible |
| H19 copys hero/escáner | 0,5 | bajo | percepción |
| H11 Escape/backdrop (ambas modales) | 1 | bajo | UX móvil + a11y |
| H9 `console.error` en catches | 0,5 | bajo | diagnosability |
| H10 `npm uninstall clsx tailwind-merge` | 0,1 | bajo | bundle |
| H7 quitar alias Coca del aceite | 0,1 | bajo | integridad |
| H15 warning de cuarentena en merge | 0,5 | bajo | future-proof |
| H21 encabezado "SEED DEMO" en schema.sql | 0,2 | bajo | proceso |
| H18 vercel.json con headers | 0,5 | bajo | seguridad básica |
| H16 CTA "sin precio" (versión simple: solo re-label del estado) | 1 | bajo | percepción del lector |

---

# 18. CAMBIOS ESTRUCTURALES (separados de los quirúrgicos)

Requieren decisiones de arquitectura / modelo de datos / infraestructura:

1. **Desactivar o reconstruir Supabase** (H5): esquema v2 + RLS + escritura server-side de datos importados.
2. **Histórico de precios fuera del bundle** (H3): estrategia de `public/history.json` + digest + (Opcional) BD + política de retención.
3. **Modelo de promociones** (H2 + decisión de negocio): si se buscan ofertas reales con condiciones (2x1 etc.), el importador necesita nueva fuente/estructura y el modelo gana campos.
4. **Modelo de expansión de catálogo por fuentes adicionales** (H6): CSV manual (ya existe template), Open Food Facts para EAN-only, integración Coto/La Anónima vía scraping es una decisión de legalidad/ToS que debe decidirse antes de implementar.
5. **Pipeline como macro-estrategia**: si migra a Backend server (Función Vercel / worker) el importador podría escribir a DB directamente en el día (evita commits de datos por día), cambiando el "data en Git" por "data en BD".

---

# 19. PLAN DE PRUEBAS POSTERIOR A LA REPARACIÓN

**Catálogo y datos**
- P1. Verificar que la suma de productos/observaciones del JSON nuevo coincide con lo que la UI muestra (snapshot del importador).
- P2. CoveragePanel debe mostrar el número de cadenas consistente con `sources` del snapshot.

**Búsqueda**
- P3. "Fideos", "Matarazzo", "yerba", "Playadito", "leche", "gaseosa", "aceite" → resultados relevantes arriba (si se implementa H17, con scoring).
- P4. Búsqueda completa exacta (marca + producto) → 1er resultado correcto.
- P5. Buscar/pegar un EAN válido → abre ficha (si H17-on).

**Escáner/lección**
- P6. EAN existente CON precio fresco (aceite Natura 900ml) → ficha con lista de precios y ahorro.
- P7. EAN existente SIN precio fresco (del seed) → ficha con CTA/estado honesto (H16).
- P8. EAN inexistente → mensaje "no está en el catálogo" + cámara activa (H12) o botón "volver a escanear" depending decision.
- P9. Múltiples escaneos consecutivos (10) — sin crash, sin sesiones superpuestas, timing razonable.
- P10. Formatos: EAN-13, UPC-A (12→13 con 0), UPC-E (si se normaliza), GTIN-14 (si se acepta tras H13).
- P11. FotoUploaded de código de barras correcto y fallido (mensajes diferenciados).
- P12. Diferentes cadenas: producto con precio en 2+ cadenas muestra mejor/peor/medio.

**Comparación/promo/histórico**
- P13. Ficha con 2+ días de historial: gráfico muestra min por fecha; tooltip legible.
- P14. Ficha con <2 días: mensaje "al menos dos fechas" (sin crash).

**Canasta**
- P15. Agregar cantidad 1 vs 6 con min_quantity de bulto: el óptimo respeta múltiplos (tests ya cubren parcialmente suite data-quality).
- P16. Canasta incompleta: missing ESTA explícito; saving vs most expensive solo en canastas completos.

**Pipeline**
- P17. Ejecutar workflow manual (`workflow_dispatch`) en beta: el JSON debe regenerarse sin corromper históricos (`git diff --stat` razonable).
- P18. Forzar fallo de fuente (mock/lighthouse) y verificar: datos preservados, job en rojo, `sources[chain].status=error` en JSON nuevo.
- P19. Importar CSV de prueba por la ruta del template con datos válidos y uno inválido (revisión `load_csv`).

**Producción / móvil**
- P20. Vercel: bundle nuevo servido (hash distinto), sin CSP errors en consola (si H18-on).
- P21. Móvil real (Andorid / iPhone): cámara, torch/zoom opcionales, ESC/backdrop, performance initial load comparado.
- P22. Lighthouse básico (performance/a11y) vs informe baseline (guardar resultados).

---

# 20. CRITERIOS DE ÉXITO PARA CONSIDERAR LISTO PARA PRODUCCIÓN

1. **Git == Producción:** hash del bundle servido == build del último commit; `git status` limpio.
2. **Cero estados engañosos:** cada acción del usuario tiene estado honesto (éxito, "sin precio", "no catálogo", error de conexión), nada silencioso.
3. **Cobertura medible:** al menos 3–5 cadenas con precios frescos conectadas y 500+ productos con EAN (o alternativa credibles si se califica el escáner como secundaria).
4. **Performance móvil:** first contentful paint <3 s en red 3G simulada (Lighthouse móvil ≥70 en Performance tras lazy de histórico y split).
5. **Resiliencia:** si el cron falla 24 h, el usuario lo sabe (estado de frescura visible); las fuentes degradadas se ven en UI.
6. **Datos trazables al 100%:** ninguna observación visible sin source HTTPS + fecha + sucursal; cero semillas demo en producción.
7. **Prueba real de escáner con 10 envases en un supermercado** registrada (modelo/bateria/navegador) según el plan que ya define REVISION_LECTOR.md.
8. **CI verde + tests pasando** (9/9 lector + data-quality + python unittest) y el cron automatico comitea datos frescos diariamente.

---

# 21. INFORMACIÓN NO VERIFICADA (no convertir en hechos)

1. **Óptica real del lector en teléfono:** no probado físicamente (REVISION_LECTOR lo marca pendiente). La calidad de decode en curvatura/brillo es estable antes que el lookup: por diseño.
2. **Estado actual de las tablas de Supabase tras los cambios no comiteados** (¿alguien ejecutó algo sobre la BD post-27/10?): solo contamos filas de am del 31/10; no verificamos permisos de escritura adicionales de service-role.
3. **Dominios de CDN de imágenes de Coope/VTEX reales:** necesario para escribir CSP (H18). Revisar todas las clases `image_url` del JSON actual.
4. **Medición real del sort/perceivended lag:** propiedad de tiempo del profiler no tomada (no incubación); H8 se introdice con análisis de código.
5. **`sync_migration.sql` nunca ejecutado:** inferido por violación FK; verificar en BD (DDL history) antes de eliminar.
6. **Decisiones de negocio:** patrocinio de volver promos reales, alcance de cadenas, licencia/ToS de scraping de Coto/La Anónima.
7. **Tests físicos de la categoría "precio por unidad" con gramajes mixtos de Coope** (caso 250cm3/1.5L, sprays 120grs): los unitarios derivan del `gramaje`, pero la presentación `spá y gr` con "120grs" hoy califica como unidad → puede renderizar "$ / u" donde podría esperarse "$ / l"; **pendiente de calibration con al menos un caso real de usuario**.
8. **Impacto exacto de la mezcla `channel` en la ficha** para productos con obs online vs store para la misma sucursal (estä marginada por `observationKey`, pero no se hizo walk-through con datos reales de dos canales).
9. **Cron de 11:00 UTC vs "08:00 Argentina":** correcto hoy (ATUS -03). Fijado, no verificado con el horario de verano 2027 (ART no aplica DST, safe).
10. **Los 6 product説明 proveeos EANs del bloque de test-buttons** (solo 2/6 funcionan como "con precios"): los 4 restantes no fueron lickstreams manualmente uno a uno en el sitio de producción por limitaciones de la sesión de auditoría; debe probarla case por caso en Fase 1.

---

# 22. TABLA FINAL PARA CODEX

| ID | Prioridad | Problema | Estado | Archivo/Componente | Solución propuesta | Riesgo | Dificultad |
|---|---|---|---|---|---|---|---|
| H1 | P0 | Producción ≠ working tree (12 archivos sin commit) | BUG CONFIRMADO | repo completo; diff avg >14k líneas | revisar + commits + push | BAJO | BAJA |
| H2 | P0 | Promociones/Ofertas vacias (filtro de campo inexistente) | BUG CONFIRMADO | DealsRankingSection.tsx, BentoDealsGrid.tsx | calcular desc. regular vs current; ocultar si vacío | BAJO–MEDIO | MEDIA |
| H3 | P0–P1 | Histórico completo embebido en bundle, crece ~1,4 MB/día | PROBLEMA PROBABLE | productService.ts, price-history.json, importador | fetch lazy + digest diario (+ DB a futuro) | MEDIO | MEDIA |
| H4 | P1 | Regla 72 h: fallo del cron vacíe todo sin banner | PROBLEMA PROBABLE | dataQuality.ts, App.tsx | banner de frescura + modo referencia etiquetado | BAJO | MEDIA |
| H5 | P1 | Supabase semilla demo + esquema incompatible + código inerte | BUG CONFIRMADO | Supabase, schema.sql, sync_migration.sql, productService.ts | decisión: (B) apagar o (A) esquema v2 + sync server-side | B: BAJO / A: MEDIO-ALTO | B: BAJA / A: MEDIA-ALTA |
| H6 | P0 | Cobertura EAN 24%: el lector "no encuentra" la mayoría | PROBLEMA CONFIRMADO (datos) | sync_verified_prices.py, JSONs, BarcodeScannerModal | sugerencia por nombre tras fallo + Open Food Facts EAN-only | MEDIO | MEDIA-ALTA |
| H7 | P2 | Alias Coca-Cola 3L en el aceite (semilla) | BUG CONFIRMADO (latente) | database.ts, schema.sql | quitar alias erróneo + audit aliases con checksum | BAJO | BAJA |
| H8 | P2 | Sort re-analisis O(n×m) por comparación | PROBLEMA PROBABLE | App.tsx, priceAnalyzer.ts, ProductCard.tsx | índice precalculado + prop analysis | BAJO | BAJA-MEDIA |
| H9 | P2 | Catch vacíos, cero logs/telemetría | BUG CONFIRMADO | productService.ts, BarcodeScannerModal.tsx | console.error + Sentry opcional + estado en UI | BAJO | BAJA |
| H10 | P2 | Código muerto, rutas absolutas a scratch de agente IA, deps sin uso | BUG CONFIRMADO | scripts/scrapers/* (7), run_all_scrapers.py, package.json | mover a legacy + quitar rutas privadas + uninstall | BAJO | BAJA |
| H11 | P2 | Ficha sin Escape, click-fuera, focus management | BUG CONFIRMADO (viva) | ProductDetailModal.tsx | hook useModalAccessibility compartido | BAJO | BAJA |
| H12 | P2 | stopCamera tras lectura "no encontrada" | BUG CONFIRMADO | BarcodeScannerModal.tsx | mantener cámara en not-found con debounce | MEDIO | MEDIA |
| H13 | P2 | Validación EAN inconsistente (8/12/13/14 + UPC-E) | BUG CONFIRMADO | BarcodeScanner, sync_verified_prices | normalizeEan() compartido con tests | BAJO-MEDIO | BAJA-MEDIA |
| H14 | P3 | Gráfico inservible con 2 días + deal_flag inalcanzable | PROBLEMA PROBABLE + código muerto | priceAnalyzer.ts, ProductDetailModal.tsx | esperar datos; impl deal-flags solo mismo branch/canal | BAJO-MEDIO | MEDIA |
| H15 | P2 | mergeCloudData pierde precios en cuarentena silenciosa | BUG CONFIRMADO | productService.ts | registrar quarantined en message + tests | BAJO | BAJA |
| H16 | P1 | "Encontrado sin precio" imposible de distinguir de fallo | MEJORA | ProductDetailModal.tsx, escáner, database.ts | CTA + relabel de examples + estado por cadena | BAJO | BAJA-MEDIA |
| H17 | P2 | Búsqueda sin ranking/fuzzy/EAN-first | MEJORA | dataQuality.ts, SearchAutocomplete.tsx | scoreProduct + EAN path + "ver todos" | BAJO-MEDIO | MEDIA |
| H18 | P3 | Sin security headers/CSP | MEJORA | vercel.json (nuevo) | headers básicos + CSP cuidando dominios de imágenes | BAJO | BAJA |
| H19 | P3 | Copys superprometen (det_student oferta, escáner) | MEJORA | App.tsx, QuickActionCards, BarcodeScanner labels | alinear copys al modelo trazable | BAJO | BAJA |
| H20 | P3 | Canasta persiste objetos completos | MEJORA | BasketContext.tsx | {product_id, quantity} + rehydratación | BAJO-MEDIO | BAJA-MEDIA |
| H21 | P3 | Seed SQL legacy en schemas (con datos ficticios FK-violantes) | PROBLEMA PROBABLE | schema.sql, sync_migration.sql | cabezera legacy/database + no ejecutar en prod | BAJO | BAJA |

---

### Cierre del auditor

- Los **3 primeros pasos inmediatos** son: (1) commit/push con revisión (H1), (2) sección de ofertas honesta (H2/H16), (3) prueba física real del escáner en teléfono con los 10 envases del plan de REVISION_LECTOR.md (única pieza que este auditó no pudo verificar y que define el carro del producto).
- El proyecto tiene un **fondo técnico serio** (el importador y las reglas de datos son la parte más defendible), pero su **actualidad visible permite criticar que la magia del escaneo está limitada por cobertura, no por software**; eso es también una decisión de producto que Codex debe discutir, no solo técnicamente corregir.
- Se recomienda a Codex re-verificar cada evidencia con los comandos concretos citados (md5 del bundle, REST de Supabase, `node --test`), y **no actuar sobre hipótesis** marcadas en §21.

— *Fin del informe. No se ha modificado ningún archivo del proyecto aparte de este documento.*

---

## 22. Delta 03-11-2026 — Yaguar integrado como fuente oficial

*Sección agregada el 03-11-2026 por GLM (OpenCode). No reemplaza lo anterior: lo anticúa.*

**Qué cambió.** Yaguar pasó de "pendiente" a **5ª fuente oficial del pipeline** (`sync_verified_prices.py → collect_yaguar()`). Los datos de la cuarentena del 01-11 (prototipo `probe_yaguar.py`) se reemplazaron por un colector trazable con el mismo estándar que Coope/ChangoMás/Makro/Vital.

**Estado de fuentes tras la integración** (definitivo, `live-prices.json` 03-11 ~04:05 UTC):

| Fuente | Estado | Observaciones | Origen |
|---|---|---|---|
| Coope, ChangoMás, Makro, Vital | ok | 823 + 215 + 36 + 94 = 1.168 | sync 01-11 (siguen pendientes de refresco, ver nota 72 h) |
| **Yaguar** | **ok (nueva)** | **1.718** | Store API `/neuquen/wp-json/wc/store/v1/products`, `per_page=100`, 25 términos, sin recortes |
| Coto, La Anónima, Vea, Diarco | pendiente / excluida | 0 | según decisiones D3/D5 y exclusiones del commit `f424e45` |

Catálogo: **2.880 productos / 2.886 observaciones**. Verificación empírica de precios 03-11: Manaos Pomelo 2,25 L = $2.168 (con stock; ChangoMás sin stock), Lay's 330 g ≈ $6.999.

**Calidad y trazabilidad.** 0 observaciones sin `is_verified` + `source_url` (ficha oficial de producto en `/neuquen/producto/`). Reglas heredadas del colector: sucursal "Yaguar Neuquén · tienda online" sin coordenadas inventadas; mínimos y múltiplos (`add_to_cart`) documentados en `notes`; ciudad validada contra `/wp-json/` (nombre + zona horaria); moneda ARS con escala entera (`currency_minor_unit:0`, precios sin centavos — igual que Makro).

**Clima mayorista explicitado**: la nota de cada observación aclara que el sitio de Yaguar es mayorista y que impuestos/condiciones del canal se confirman en la tienda (misma convención que ya usa Makro). No se mostró como minorista ni se prometió precio de góndola.

**Tests**: Python 28/28 (3 casos nuevos `YaguarTests`) + Node 31/31. El paso de CI que ejecutaba `probe_yaguar.py` se quitó del workflow (el colector oficial corre dentro de `sync_verified_prices.py`).

**Nota crítica de frescura (72 h)**: los datos de Coope/ChangoMás/Makro/Vital siguen con fecha 2026-11-01T19:44Z; a partir de ~04-11T19:44Z la regla `priceIsUsable` los descartaría. Ejecutar el sync completo de todas las fuentes antes de esa ventana.

El detalle técnico (URLs, atributos, aprendizajes) queda en `agent_memory/LEARNINGS.md`; el estado vivo, en `agent_memory/CURRENT_STATE.md`.