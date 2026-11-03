# DECISIONES — Radar de Precios

Formato: decisión · motivo · alternativas · fecha. Las decisiones del usuario mandan sobre las técnicas.

| # | Decisión | Motivo | Alternativas consideradas | Fecha |
|---|---|---|---|---|
| D1 | Fuente de verdad del sistema = JSON versionados en Git (`live-prices.json`, `price-history.json`); único escritor = `sync_verified_prices.py` en GHA. | Trazabilidad, auditoría, sin drift entre capas. | Supabase como DB (requiere esquema v2 + service role server-side). | 01-11-2026 |
| D2 | No eliminar una cadena conectada/pendiente sin decisión explícita del usuario. | Nada se quita "silenciosamente"; cada fuente tiene valor dokumentado. | Retirar fuentes bloqueadas por defecto. | 01-11-2026 |
| D3 | **Excluir Diarco y Vea de la cobertura pública** (a pedido del usuario; Diarco: sin sucursal en Neuquén Capital — solo Cutral Có; Vea: su simulación rechaza toda entrega para CP 8300). Ejecutado por otro agente en commit `f424e45`. | No prometer datos que no llegan al usuario de Neuquén Capital. | Mantenerlas como "pendiente" o "referencia nacional". | 03-11-2026 |
| D4 | No mostrar promociones por cantidad ("llevando N") como oferta confirmada sin comprobar precio, vigencia y presentación en fuente. | Evitar precio engañoso; las APIs meten condiciones ambiguas (p. ej. `precio_promo` de Coope). | Publicar tal cual la API (descartado). | 01-11-2026 |
| D5 | Coto queda postergado al final; no se integra por ahora. | Costo altomedio (SPA + BFF `ms-digital-sitio-bff-web`, requiere Playwright o RE de chunks) frente al valor. | Automatización browser desde ya (descartado por costo). | 01-11-2026 |
| D6 | Yaguar se quarentena hasta verificar impuestos/condiciones para consumidor final (prototipo read-only de otro agente). | Los precios de la Store API podrían ser mayoristas/por región sin fuego claro de vigencia. | Importar directo (descartado por trazabilidad). | 01→03-11-2026 |
| D7 | Publicación de producción vía CLI Vercel (token local) mientras no exista token GitHub para `git push`. | Publicar ya; AVISO: genera divergencia potencial repo↔producción hasta sincronizar. | Esperar token GitHub; recrear remote con SSH (sin clave disponible). | 03-11-2026 |
| D8 | EAN de Coope/Makro: no se obtiene de esas fuentes (no la exponen). Cobertura EAN se amplía por (a) fichas de La Anónima, (b) `product_main_ean` de Coto, (c) Open Food Facts con revisión humana; nunca por similitud de nombre. | Integridad de identidad de producto (evitar H7). | Asignación por nombre (descartado). | 03-11-2026 (ampliada) |
| D12 | Publicar los precios de Coto **tal como el propio comercio los lista**, sin filtros de plausibilidad. Anomalías del feed (Smartwater $1, Cunnington 2,25 L $309,74) quedan trazables a su ficha y anotadas en `notes`. | Trazabilidad > censura; inventar una "corrección" sería fabricar datos. | Filtrar por umbral de precio (descartado: heurística arbitraria dependiente del nombre). | 03-11-2026 |
| D13 | Identidad de producto por **EAN válido** (`ean_*`, checksum) cuando la fuente lo expone: Coto lo trae en el 98% de sus SKUs ('product_main_ean'); se comparte la identidad con ChangoMás/La Anónima y enable comparaciones cross-chain. | Patrón ya existente; el guard de presentación contradictoria protege la coherencia. | IDs por cadena aislados (pierde comparabilidad). | 03-11-2026 |
| D9 | Parser de La Anónima implementado con `html.parser.HTMLParser` nativo de la biblioteca estándar de Python (sin dependencias como `bs4`). | Garantizar compatibilidad 100% con el entorno de GitHub Actions (que no tiene paquetes pip adicionales instalados en el workflow). | BeautifulSoup (requiere pip install en CI), expresiones regulares directas (frágiles ante atributos con espacios o signos `>`). | 03-11-2026 |
| D10 | Identidad de producto de La Anónima: `ean_<ean>` cuando la ficha expone GTIN válido comprobado, `anonima_<code>` cuando no expone EAN. | Evitar duplicados de código de barras en `snapshot.products` (exigido por test `official barcode products replace legacy examples`) y unificar observaciones entre cadenas para un mismo EAN. | Mantener siempre `anonima_<code>` (rompía unicidad de EAN en catálogo). | 03-11-2026 |
| D11 | Vigencia semanal de 7 días para listas normativas de Ley 3444 (Makro) en scraper y frontend (`priceIsUsable`). | Makro publica bajo Ley 3444 de forma periódica/semanal, no diaria; 72h causaba desaparición forzada de precios válidos. Se preserva fecha real (31-10) y sello de re-verificación. | Mantener 72h (hacía desaparecer a Makro a los 3 días de cada lista) o falsear la fecha de consulta (inaceptable por trazabilidad). | 03-11-2026 |

## Pendientes de decisión del usuario

- Supabase: apagar (sin costo) o reconstruir (v2 + sync server-side).
- Ruta definitiva de publicación: CLI Vercel vs. conseguir token GitHub.
- Nivel de detalle de la canasta/navegación (prioridad 1 del usuario).
