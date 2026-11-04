# HANDOFF — relevo entre agentes

> ⚠️ **Regla de cierre vigente** (`agent_memory/REGLAS_TRABAJO.md`): antes de cerrar la app o entregar el control, verificar que este HANDOFF refleje el estado real y aplique el checklist.

## Datos del relevo

- **Agente que entrega:** Antigravity (harness) — **Modelo real utilizado: Gemini 2.5 Pro**
- **Fecha y hora:** 03-11-2026 (~23:50 UTC / 20:50 ART)
- **Objetivo recibido:** Realizar un estudio técnico y empírico de factibilidad para determinar si es posible scrapear los precios de Jumbo en Neuquén (para agregarlo a la página en el mapa, filtros y catálogo), y dejar registrado el resultado y la integración como actividad pendiente en la memoria compartida.

## Trabajo realizado en esta sesión

1. **Investigación empírica y descubrimiento de arquitectura de Jumbo:**
   - **Presencia física activa en Neuquén:** Se confirmó la existencia y operación activa del hipermercado Jumbo dentro del centro comercial **Portal Patagonia Shopping** (Av. Juan Julián Lastra 2400, CP Q8300, Neuquén Capital), compartiendo predio con Easy. Se constató que, tras el cierre de la sucursal de Vea (calle Láinez) a fines de octubre de 2026, Jumbo Portal Patagonia continúa 100% operativo con normalidad.
   - **Plataforma de e-commerce:** Opera bajo **VTEX IO** (`account: jumboargentinaio`, `salesChannel: 32`).
   - **Auditoría de MasterData NT:** Se consultó la API de entidades `NT` (`/api/dataentities/NT/search`), descubriendo el registro oficial de la sucursal:
     - `storeid`: `"5216"`
     - `SellerName`: `"jumboargentinaj5216neuquen"`
     - `geocoordinates`: `"-38.9602105000,-68.0927295000"` (Portal Patagonia)
     - `hasPickup`: `true` | `hasDelivery`: `true` | Teléfono: `0810-999-58626`.
2. **Ingeniería inversa de la API y resolución de precios locales:**
   - **Diagnóstico del catálogo general:** `GET /api/catalog_system/pub/products/search?ft=<término>` devuelve todos los productos con sus EANs oficiales (GTIN-13) y SKUs, pero con precios del seller genérico `"1"` (AMBA). No debe usarse solo para precios finales, pues publicaría precios de CABA.
   - **Diagnóstico del error ORD027:** Las llamadas directas de simulación por código postal (`postalCode: 8300`) fallaban con `ORD027: Ítem no disponible`, porque la plataforma VTEX de Cencosud no resuelve directamente por código postal simple.
   - **Descubrimiento del mecanismo de sesión y cotización regional:**
     Analizando los bundles React del frontend de Jumbo (`jumboargentinaio.delivery-modal@1.0.83`), se extrajo el protocolo nativo utilizado por su selector de sucursal:
     1. **Sesión VTEX con vendedor Neuquén:** `POST https://www.jumbo.com.ar/api/sessions?sc=32` configurando:
        ```json
        {
          "public": {
            "buyselectMethod": {"value": "recogida"},
            "regionId": {"value": "U1cjanVtYm9hcmdlbnRpbmFqNTIxNm5ldXF1ZW4="},
            "selectedSeller": {"value": "jumboargentinaj5216neuquen"},
            "geoCoordinates": {"value": "-68.0927295000,-38.9602105000"}
          }
        }
        ```
        *(donde `regionId` es `btoa("SW#jumboargentinaj5216neuquen")`).*
     2. **Batch Simulation:** `POST https://www.jumbo.com.ar/api/checkout/pub/orderForms/simulation?sc=32` con `items: [{"id": sku, "quantity": 1, "seller": "jumboargentinaj5216neuquen"}]`.
3. **Comprobación empírica en tiempo real de precios y stock:**
   - **Diferenciación geográfica comprobada:**
     - Coca Cola Sabor Original 2.25 L (`EAN 7790895000997`, SKU `246613`): **$6.290 en Neuquén** vs $6.100 en Buenos Aires (Seller 1).
     - Coca Cola Zero 2.25 L (`EAN 7790895067570`, SKU `18976`): **$6.290 en Neuquén** vs $6.100 en Buenos Aires (Seller 1).
     - Coca Cola Sin Azúcar 1.75 L (SKU `269646`): `withoutStock` en Neuquén (filtro de stock local verificado).
   - **Servicios de logística confirmados:** SLAs devueltos `"Retiro en Tienda - Jumbo Neuquen Av. J.J. Lastra 2400"` y `"Envío a Domicilio"`.
   - **Batching validado:** Se comprobó simulación en lote de 11 SKUs en una sola petición HTTP (HTTP 200 OK en ~1s).
4. **Archivo histórico y sincronización de memoria compartida:**
   - Archivada la versión anterior de `HANDOFF.md` en `agent_memory/history/2026-11-03_2015_Antigravity_Gemini_H3_Deploy.md`.
   - Actualizado `agent_memory/TASKS.md` registrando la actividad completada y la tarea pendiente para la implementación de Jumbo como 8ª cadena.
   - Actualizado `agent_memory/LEARNINGS.md` con la documentación técnica de las APIs de Jumbo VTEX (`MasterData NT`, sesión regional con `regionId` en Base64, batch simulation y sucursal física).

## Archivos modificados en esta sesión

- `agent_memory/history/2026-11-03_2015_Antigravity_Gemini_H3_Deploy.md` (nuevo archivo histórico inmutable)
- `agent_memory/TASKS.md` (incorporado estudio completado y tarea pendiente de Jumbo)
- `agent_memory/LEARNINGS.md` (incorporada sección completa de arquitectura y APIs de Jumbo)
- `agent_memory/HANDOFF.md` (este documento de relevo)

## Commits realizados

- *(Pendiente de commit de memoria al cierre de esta sesión)*

## Pruebas ejecutadas y resultados

- Pruebas empíricas de red contra `jumbo.com.ar` (MasterData NT, VTEX Session, Catalog Search, Batch OrderForm Simulation) → **Todas exitosas y documentadas**.
- `node --test tests/*.test.cjs` → **31/31 pass**.
- `python3 -m unittest discover -s tests -p 'test_*.py'` → **37/37 OK**.

## Estado real del repo/producción al entregar

- **Producción:** Activa y sirviendo en `https://radar-precios-neuquen.vercel.app` las 7 cadenas verificadas (10.740 productos / 10.902 cotizaciones) con bundle JS optimizado H3 (`index-R20ZPT5U.js` de 432 kB gzip).
- **Git local:** Limpio tras el commit de las memorias.
- **Factibilidad de Jumbo:** **100% FACTIBLE** y lista para implementar.

## Advertencias importantes

1. **No usar solo el buscador nacional de Jumbo:** El endpoint `/api/catalog_system/pub/products/search` debe usarse únicamente para el descubrimiento de catálogo (nombres, marcas, imágenes y códigos EAN). Para los precios y stock, es indispensable ejecutar la simulación por lote con `seller: jumboargentinaj5216neuquen` y la cookie de sesión regional para no contaminar los precios locales de Neuquén con los de Buenos Aires.
2. **Tokens de GitHub:** El entorno local aún no dispone de credenciales git configuradas para `git push` al repositorio remoto origin.

## Próximo paso recomendado (para el agente entrante)

1. **Implementar el colector de Jumbo en `sync_verified_prices.py` (`collect_jumbo`)**:
   - Inicializar sesión regional en `POST /api/sessions?sc=32` con `regionId: U1cjanVtYm9hcmdlbnRpbmFqNTIxNm5ldXF1ZW4=`.
   - Consultar catálogo por términos clave (`TERMS`) vía `/api/catalog_system/pub/products/search`.
   - Agrupar SKUs y ejecutar `orderForms/simulation?sc=32` con `seller: jumboargentinaj5216neuquen` en lotes de 20-30 SKUs.
   - Filtrar productos sin stock (`availability != 'available'`).
2. **Agregar la sucursal de Jumbo en el mapa y configuración de frontend**:
   - Añadir la sucursal a `SUPERMARKETS_NEUQUEN` / `branches.json`:
     - ID: `jumbo-lastra`
     - Nombre: `Jumbo - Portal Patagonia`
     - Cadena: `Jumbo`
     - Dirección: `Juan Julián Lastra 2400`
     - Coordenadas: `[-38.9602, -68.0927]`
     - Tipo: `Hipermercado` (con pickup y delivery)
3. **Crear suite de pruebas unitarias (`JumboTests`)** en `tests/test_sync_verified_prices.py` validando parsing, simulación y filtros de stock.
