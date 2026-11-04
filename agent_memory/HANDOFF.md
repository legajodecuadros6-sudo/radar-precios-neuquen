# HANDOFF — relevo entre agentes

> ⚠️ **Regla de cierre vigente** (`agent_memory/REGLAS_TRABAJO.md`): antes de cerrar la app o entregar el control, verificar que este HANDOFF refleje el estado real y aplique el checklist.

## Datos del relevo

- **Agente que entrega:** Antigravity (harness) — **Modelo real utilizado: Gemini 2.5 Pro**
- **Fecha y hora:** 04-11-2026 (~19:35 ART / 22:35 UTC)
- **Objetivo recibido:** Auditoría técnica sobre Coto: investigar por qué figuraba en papas Lay's 330g (o papas en general) una promoción de "70% de descuento en la segunda compra valiendo ~6560 pesos cada una", por qué ese precio no figuraba en la página principal de Coto Neuquén y por qué en internet en general sí aparecía.

## Hallazgos de la Auditoría Técnica

1. **El precio y producto exacto encontrado en los datos del sistema:**
   - En `live-prices.json` (corrida del 03-11), **Papas Fritas Clásicas Lays 330g** (`ean_7790310985588`) tenía:
     - `regular_price`: **$10.500,00** (precio de lista de la sucursal 185 Neuquén).
     - `current_price`: **$6.825,00** (precio con 35% de descuento).
     - `promo_label`: "Oferta Coto", `discount_percentage`: 35%.
   - En la misma consulta de papas en la API de Coto figura **Papas Noisette McCain 600g**:
     - `regular_price`: **$10.094,00**.
     - `discountPrice`: **$6.561,10** (exactamente los **~$6.560** reportados por el usuario).
     - `discountText`: "35%Dto".
2. **Causa raíz técnica en el scraper (`scripts/scrapers/sync_verified_prices.py`):**
   - En `coto_record()` se extrae el precio de lista de la sucursal 185 (`store: "185"`), pero para los descuentos se itera ciegamente sobre `data.get("discounts")`.
   - La API de Constructor.io de Coto devuelve `discounts` a nivel global (sin discriminar por `store`).
   - Coto expresa comercialmente las promociones de **"70% en la 2da unidad"** como un descuento del **35% por unidad llevando 2** ($10.500 x 2 = $21.000 - $7.350 = $13.650 / 2 = $6.825; y $10.094 x 0.65 = $6.561,10).
   - El colector pisó `current_price` con el precio bonificado unitario llevando dos, **infringiendo la Decisión D4** ("No mostrar promociones por cantidad como oferta confirmada sin comprobar precio, vigencia y presentación en fuente").
3. **Por qué no estaba en la página principal de Coto Neuquén:**
   - En Coto Neuquén (góndola online o física), el precio para una sola unidad es el precio de lista ($10.500 o $10.094). El descuento no se aplica si el cliente compra un solo paquete.
   - Las promociones masivas de 70% en 2da unidad de snacks suelen pertenecer a campañas regionales de AMBA/CABA; en el feed de Constructor.io, las tiendas de AMBA tenían `saleImage1: "oferta.png"`, mientras que en Neuquén figuraba `null`.
4. **Por qué en internet en general sí aparecía:**
   - La web de Coto Digital (`cotodigital.com.ar`) y Google indexan por defecto la portada de **Capital Federal / GBA (AMBA)** (sucursal central 091/056), donde los banners y promociones de 2da al 70% se muestran en la home nacional. Al seleccionar la zona de entrega Neuquén (CP 8300 / Sucursal 185), el catálogo regional no muestra esa promoción en su home o no la aplica como oferta directa.

## Pruebas y estado del sistema

- Relevo previo archivado en: `agent_memory/history/2026-11-03_2145_Antigravity_Gemini_Coto_Map_Fix.md`.
- No se alteró código de producción durante la investigación (modo auditoría).
- Pruebas unitarias: Node 31/31 pass, Python 40/40 OK.
- Estado git: árbol de trabajo limpio con commits de la memoria de auditoría.

## Próximo paso recomendado

- Actualizar `coto_record()` en `sync_verified_prices.py` para:
  1. Ignorar descuentos en `current_price` si son condicionales ("2da al...", "3x2", "35%Dto" condicionado a volumen), respetando la regla D4 y dejando `current_price = regular_price`.
  2. Solo aplicar `discountPrice` si `saleImage1` o la concordancia de listas confirma que la sucursal 185 participa de una oferta directa por unidad.

## Incidencia de Despliegue Detectada y Solucionada (04-11-2026 ~19:50 ART)

- **Síntoma:** El usuario reportó que desapareció Jumbo y solo figuraban 3 supermercados en la página de producción.
- **Causa raíz:** El cron diario de GitHub Actions (`.github/workflows/sync-prices.yml`) se ejecutó en GitHub y realizó un `git push` a `origin/main`. Como `origin/main` estaba desfasado (19 commits detrás del local por falta de token de push), Vercel detectó el commit en GitHub y disparó un autodespliegue automático de la versión antigua del repositorio.
- **Solución ejecutada:** Se ejecutó `npm run build` y se desplegó de inmediato a Vercel Producción con `npx vercel deploy --prod --yes` (Deploy `radar-precios-neuquen-azvy443s6-radar-de-precios.vercel.app`).
- **Verificación en vivo:** Endpoint `/data/live-prices.json` restaurado al 100% con **11.250 observaciones y 8 cadenas activas** (Coto 7.290, Yaguar 1.718, Coope 851, La Anónima 676, Jumbo 348, ChangoMás 233, Vital 98, Makro 36).
