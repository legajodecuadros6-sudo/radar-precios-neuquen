# Corrección regional y sincronización — 5 de noviembre de 2026

El usuario informó que no encontró la promoción de Lay’s en Coto Neuquén y
que en Yaguar vio un precio presencial de $9103. Este último dato se conserva
como reporte, pendiente de confirmar presentación y condiciones; no sustituye
una cotización oficial ni justifica ajustar otras presentaciones por porcentaje.

## Cambios

- Reconciliación de main local con GitHub: unión de ambos históricos por
  `(id, query_date, current_price)`. Antes:25491 locales y7083 remotos;
  unión:29729, antes de la consulta nueva. Respaldo verificado en
  `/tmp/radar-sync-backup-20261105-204721`; versiones previas además en Git.
- Coto: precio de lista explícito de sucursal185. No se aplican descuentos
  globales sin cantidad, vigencia y alcance regional comprobados. Las ofertas
  antiguas ambiguas se excluyen del comparador y resumen público del histórico;
  los registros originales permanecen en el archivo completo.
- Yaguar: se conserva el comercio y su catálogo fuente. Sus precios online no
  acreditan precio final para consumidor/góndola; quedan pendientes, fuera de
  canasta, ahorros y gráficos hasta confirmar impuestos y condiciones.
- La Anónima: se rechaza stock ausente/no numérico/no positivo.
- Jumbo: se verifica seller devuelto, cantidad1, unidad/multiplicador1, ausencia
  de impuestos adicionales y ajustes priceTags, e igualdad sellingPrice/price.
- Yaguar: se corrige errors dict/list y se propagan fallos parciales.
- Descarga de catálogo: error y reintento visibles; no se presenta un stub vacío
  como copia completa del último catálogo. Pruebas específicas de esa ruta.
- Cron actualizado en la misma rama que se publicará: ocho colectores, límite
  60min para terminar la consulta secuencial. Conservar fechas originales,
  incluso cuando una fuente falla. Un exit1 parcial no significa que no se
  hayan guardado resultados de otras fuentes.

## Límites

Los precios online siguen identificados como online: no garantizan el importe
en góndola. La vigencia temporal no confirma stock actual. Las cookies de zona
de La Anónima y la logística por ítem de Jumbo requieren más comprobaciones.
No se declara calibración física de todos los comercios. Coope y Makro siguen
sin EAN oficial en las fuentes utilizadas. No hay modificación de Supabase.
