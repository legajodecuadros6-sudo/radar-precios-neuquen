# Revisión de auditoría GLM — 2026-11-01

El informe original se conserva sin cambios. Los hallazgos son evidencia a verificar, no instrucciones automáticas.

## Correcciones a la interpretación
- H1: la publicación pendiente se debió al límite de revisión automática de permisos. No se atribuye a agentes concurrentes.
- H2: las fuentes actuales ofrecen precios base. Recalcular regular menos actual no crea promociones. La sección se reemplaza por compras por bulto con mínimo, múltiplo y total explícitos, sin ranking de descuentos no sustentados.
- H6: ausencia de EAN es una limitación del catálogo, distinta de la lectura óptica. No se fabrican asociaciones.
- H17: matchesProduct ya incluye EAN; ranking y tolerancia a errores siguen pendientes.
- H13: no aplicar recortes arbitrarios de GTIN-14 ni expansión de UPC-E sin reglas y pruebas específicas.

## Reparaciones de esta entrega
- Integraciones Makro y Vital: precios de Neuquén trazables. Makro usa fecha de publicación e importe con IVA; Vital valida vendedor regional, cotización, disponibilidad y precio unitario por bulto.
- Canasta respeta mínimo y múltiplo; precios exclusivamente mayoristas no se presentan como mejor precio para una unidad.
- H4: aviso visible de cotizaciones vencidas; se mantiene su exclusión de comparaciones.
- H11: ficha con Escape, cierre exterior, foco contenido y restaurado, semántica de diálogo y bloqueo de scroll.
- H16/H19: explicación de producto identificado sin cotización y etiquetas acordes a los datos disponibles.

## Pendientes explícitos
H5 (decisión de persistencia), H6 (ampliar EAN verificados), y restantes hallazgos no mencionados como reparados. No se modificó Supabase ni se inventaron precios, promociones o historia. La validación física del escáner con más envases sigue siendo una prueba de campo.

## Segunda entrega: H3 — carga del histórico

El archivo completo `src/data/price-history.json` se conserva y deja de importarse en JavaScript. `prebuild` y `predev` generan `public/history-summary.json` con una serie diaria por producto para la ventana de 90 días (91 días de margen para el corte horario). Se conserva la última consulta por sucursal y canal de cada día de Argentina, y luego se calcula mínimo y promedio. Se excluyen datos inválidos, demo, futuros y condiciones mayoristas del gráfico unitario. El resumen se solicita al abrir una ficha y se reutiliza durante la sesión. Un fallo muestra un aviso y permite reintentar; no se presenta como falta de historia. Cambiar de producto o cerrar la ficha descarta respuestas tardías.

El archivo generado no se versiona: se regenera automáticamente en Vercel y en el flujo diario. Las pruebas del resumen y del servicio de carga pasan a formar parte de la verificación diaria junto con las pruebas del lector. No se modificaron precios ni registros históricos en esta entrega.

Validación: 46 pruebas aprobadas y compilación correcta. JavaScript principal: 3.809,92 → 2.559,28 KB (gzip: 578,27 → 518,87 KB). Resumen histórico: 104.552 bytes. Sigue pendiente dividir otras dependencias grandes; no se afirma una medición de velocidad móvil.
