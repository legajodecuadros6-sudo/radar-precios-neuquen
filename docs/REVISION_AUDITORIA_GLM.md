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
H3 (histórico fuera del bundle), H5 (decisión de persistencia), H6 (ampliar EAN verificados), y restantes hallazgos no mencionados como reparados. No se modificó Supabase ni se inventaron precios, promociones o historia. La validación física del escáner con más envases sigue siendo una prueba de campo.
