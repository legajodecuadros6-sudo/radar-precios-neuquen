# HANDOFF — relevo entre agentes

> ⚠️ **Regla de cierre vigente** (`agent_memory/REGLAS_TRABAJO.md`): antes de cerrar la app o entregar el control, verificar que este HANDOFF refleje el estado real y aplique el checklist.

## Datos del relevo

- **Agente que entrega:** Antigravity (harness) — **Modelo real utilizado: Gemini 2.5 Pro**
- **Fecha y hora:** 04-11-2026 (~19:58 ART / 22:58 UTC)
- **Objetivo recibido:** 
  1. Auditoría técnica sobre Coto: investigar por qué figuraba en papas Lay's 330g una promoción de "70% de descuento en la segunda compra valiendo ~6560 pesos cada una", por qué ese precio no figuraba en la página principal de Coto Neuquén y por qué en internet en general sí aparecía.
  2. Contrastar con el hallazgo del usuario en la sucursal física de Coto Neuquén (góndola física tiene a $10.500 la bolsa de 230g y no la de 330g).
  3. Diagnóstico y reestablecimiento urgente de producción: resolver la desaparición de Jumbo y la reducción de cadenas en Vercel causada por el cron de GitHub Actions.

## Hallazgos de la Auditoría Técnica (Coto y Promociones)

1. **Evidencia empírica en la base de datos de Radar de Precios:**
   - En `src/data/live-prices.json` (corrida del 03-11), **Papas Fritas Clásicas Lay's 330g** (`ean_7790310985588`) tenía:
     - `regular_price`: **$10.500,00** (precio de lista de la sucursal 185 Neuquén).
     - `current_price`: **$6.825,00** (precio con 35% de descuento).
     - `promo_label`: "Oferta Coto", `discount_percentage`: 35%.
   - En la misma categoría de papas de la API de Coto figura **Papas Noisette McCain 600g**:
     - `regular_price`: **$10.094,00**.
     - `discountPrice`: **$6.561,10** (exactamente los **~$6.560** reportados por el usuario).
     - `discountText`: "35%Dto".
2. **Causa raíz técnica en el scraper (`scripts/scrapers/sync_verified_prices.py`):**
   - En `coto_record()` se extrae el precio de lista de la sucursal 185 (`store: "185"`), pero para los descuentos se itera ciegamente sobre `data.get("discounts")`.
   - La API de Constructor.io de Coto devuelve `discounts` a nivel global nacional (sin atributo `store`).
   - Coto expresa comercialmente las promociones de **"70% en la 2da unidad"** calculando el precio promedio por unidad llevando 2:
     - Para McCain: `$10.094 x 0.65 = $6.561,10` ("35%Dto").
     - Para Lay's 330g: `$10.500 x 0.65 = $6.825,00` ("35%Dto").
   - El colector pisó `current_price` con el precio bonificado unitario llevando dos, **infringiendo la Decisión D4** ("No mostrar promociones por cantidad como oferta confirmada sin comprobar precio, vigencia y presentación en fuente").
3. **Por qué no estaba en la página principal de Coto Neuquén:**
   - Para compras individuales, el precio real de lista en góndola/web en Neuquén es de **$10.500 / $10.094**. Nadie puede comprar un solo paquete a $6.825 o $6.561.
   - Las promociones masivas de 70% en 2da unidad de snacks suelen pertenecer a campañas regionales de AMBA/CABA; en el feed de Constructor.io, las tiendas de AMBA tenían `saleImage1: "oferta.png"`, mientras que en Neuquén figuraba `null`.
4. **Por qué en internet en general sí aparecía:**
   - La web de Coto Digital (`cotodigital.com.ar`) y Google indexan por defecto la portada de **Capital Federal / GBA (AMBA)** (sucursal central 091/056), donde los banners y promociones de 2da al 70% se muestran en la home nacional. Al seleccionar la zona de entrega Neuquén (CP 8300 / Sucursal 185), el catálogo regional no muestra esa promoción en su home o no la aplica como oferta directa.
5. **Contraste con la góndola física presencial (Reporte del usuario):**
   - El usuario fue presencialmente al hipermercado Coto en Neuquén (Ruta 7 y Dr. Ramón) y verificó que **lo que está a $10.500 en la góndola física son las Lay's de 230g**, no las de 330g.
   - Esto evidencia un desfasaje entre el canal online (`channel: "online"`) y el salón de ventas físico (`channel: "local"`):
     - En salón presencial, la bolsa de 230g ya fue remarcada a $10.500 (alineada con ChangoMás Neuquén donde cuesta $10.639).
     - En la web de Coto Digital, la de 230g figuraba a $9.500 y la de 330g a $10.500.
     - Si en góndola física 230g valen $10.500 ($45.650/kg), una bolsa de 330g en salón físico rondaría los $12.000 a $15.000 (o directamente no tiene stock en salón, exhibiéndose únicamente la de 230g).

## Incidencia de Despliegue y Reestablecimiento en Vivo (04-11-2026 ~19:50 ART)

1. **Problema reportado:** Desaparición de Jumbo y reducción del catálogo a 3 cadenas en producción Vercel.
2. **Causa raíz:**
   - El workflow diario `.github/workflows/sync-prices.yml` corrió en GitHub Actions a las 11:00 UTC (08:00 ART) e hizo un `git push` a `origin/main` en GitHub.
   - Debido a que en el entorno local no se cuenta con credenciales de GitHub para hacer push, el `origin/main` remoto estaba desfasado (20 commits detrás de `main` local, previo a la integración de Jumbo, Coto y H3).
   - Vercel tiene configurada la integración de autodespliegue con GitHub: al recibir el commit del bot de GitHub Actions, **Vercel disparó un despliegue automático desde la versión antigua de GitHub**, pisando el despliegue manual del CLI.
3. **Solución ejecutada:**
   - Se compiló el proyecto con Vite (`npm run build` en 19.19s, bundle `index-DXx-QxSU.js` de 1.512 kB / 433 kB gzip).
   - Se ejecutó el despliegue directo a producción por Vercel CLI: `npx vercel deploy --prod --yes`.
   - **Deploy ID activo:** `radar-precios-neuquen-azvy443s6-radar-de-precios.vercel.app`.
   - **URL de producción:** `https://radar-precios-neuquen.vercel.app`.
4. **Verificación en vivo:**
   - Endpoint `/data/live-prices.json` restaurado al 100% con **11.250 observaciones y 8 cadenas activas**:
     - Coto: 7.290
     - Yaguar: 1.718
     - Cooperativa Obrera: 851
     - La Anónima: 676
     - **Jumbo: 348 (reestablecido con sucursal física en Portal Patagonia)**
     - ChangoMás: 233
     - Vital: 98
     - Makro: 36
   - Se confirmó que el mapa y filtros muestran nuevamente las 8 cadenas completas y 1 única sucursal de Coto.

## Commits de la sesión

- `ed07e57`: docs(memoria): registrar auditoria de promociones Coto y reglas de volumen D4
- `2ed9445`: docs(memoria): registrar resolucion de sobreescritura de Vercel por cron de GHA

## Próximos pasos recomendados

1. **Sincronizar GitHub (`git push`):** Solicitar al usuario un Personal Access Token (PAT) de GitHub para su cuenta `legajodecuadros6-sudo` y ejecutar `git push origin main`. Esto evitará definitivamente que el cron de GitHub Actions de mañana vuelva a desplegar la versión vieja sobre Vercel.
2. **Corregir `coto_record()` en `sync_verified_prices.py`:**
   - No pisar `current_price` cuando el descuento en Constructor.io corresponda a promociones por cantidad ("35%Dto" derivado de 2da al 70%, "3x2", etc.).
   - Mantener el precio de lista de la sucursal 185 como `current_price` y registrar la condición en `promo_condition: "Llevando 2 unidades (70% en la 2da)"` con `min_quantity: 2`, respetando la regla D4.
