# Estado y pendientes — 1 de noviembre de 2026

## Entrega visible

- Vista por comercio: al seleccionar una cadena se abre su sección, sus categorías y cotizaciones; los comercios sin datos muestran un estado pendiente explícito. No aparecen precios de otras cadenas en sus tarjetas.
- Botones separados: Mayoristas (incluye precios unitarios de Makro y bultos de Vital) y Ofertas minoristas (solo promociones identificadas y verificadas).
- Accesos a Papas Lay’s, Manaos pomelo y Bebidas alcohólicas. Las cervezas declaradas sin alcohol permanecen en Bebidas.
- Se retiraron fotos genéricas ajenas al producto del catálogo heredado. Para carne sin foto comprobada se usa una ilustración de carne etiquetada como tal. Las fotos disponibles de catálogos oficiales se conservan.
- Encabezado adaptable a pantallas medianas; el filtro desplaza a la sección para que su resultado sea visible.
- Se corrigió el fin normal de paginación de Coope, que antes generaba avisos falsos de actualización incompleta.

## Catálogos conectados

Las cantidades son cotizaciones guardadas en esta entrega, no el catálogo completo de cada comercio. Su vigencia se evalúa con el límite de 72 horas.

| Cadena | Cotizaciones | Alcance |
|---|---:|---|
| Cooperativa Obrera | 813 | Local 124, Sucursal del Oeste, Neuquén; precio base online |
| ChangoMás | 190 | Sucursal 3608, Perticone, cotización local individual |
| Makro | 36 | Lista pública de Neuquén, con IVA y fecha de publicación |
| Vital | 87 | Vendedor Neuquén; cotización por bulto, mínimos y múltiplos |

## Productos solicitados

Lay’s: 18 fichas de catálogo (9 Coope y 9 ChangoMás). Hay clásicas 40, 85, 134, 230 y 330 g, además de sabores. Algunas presentaciones aparecen en ambas cadenas, pero no se fusionan por nombre: Coope no entrega EAN documentado. Son precios base, no promociones confirmadas.

Manaos Pomelo Blanco 2,25 L: encontrada en el catálogo público de ChangoMás, SKU 246138. La simulación para Neuquén del 1 de noviembre respondió `withoutStock`. No se publicó su precio como disponible. Coope no devolvió coincidencias. No se afirma ausencia de stock en todos los comercios. También apareció Manaos Placer pomelo 1,5 L sin stock, que es agua saborizada y no se confunde con la gaseosa solicitada.

`lays`, `manaos pomelo`, `cerveza`, `vino` y `fernet` forman parte de las consultas diarias del importador para Coope y ChangoMás. La actualización es diaria (08:00 Argentina), no en tiempo real; depende de que cada fuente responda y la cotización sea válida.

## Pendientes difíciles: se dejan para el final

| Cadena o tarea | Qué falta / impedimento comprobado |
|---|---|
| Coto | Conectar y validar catálogo, sucursal y precios de Neuquén. No hay fuente operativa integrada; no se ha demostrado que sea imposible. |
| La Anónima | Acceso automático respondió HTTP 403 en la revisión anterior. Necesita una fuente autorizada accesible o lista documentada. |
| Vea | Se identificó vendedor local, pero las cotizaciones exploratorias anteriores no devolvieron artículos disponibles. Falta validar más catálogo y logística local; no equivale a falta de stock de toda la cadena. |
| Yaguar | El acceso consultado respondió HTTP 403 en la revisión anterior. No hay precios ni ofertas locales verificados integrados. |
| Diarco | Falta confirmar una sucursal/canal que atienda Neuquén Capital y sus precios. El listado revisado mostraba otras localidades de la provincia. |
| Promociones minoristas reales | El botón está implementado, pero las fuentes integradas entregan precios base o condiciones que aún no se validan automáticamente. No se fabrican descuentos. Hace falta una fuente de promociones con fechas, presentación, sucursal y restricciones claras. |
| Supabase | Esquema y escritura de importaciones verificadas aún pendientes. Actualmente se preserva snapshot/histórico en Git y se consulta la nube heredada; no hay sincronización de escritura. |
| EAN y comparación entre cadenas | Obtener EAN oficial de Coope y Makro; no asignarlos por similitud de nombre. |

Los bloqueos de fuentes anteriores no fueron vueltos a probar en esta entrega, siguiendo la decisión de dejar los más difíciles para el final. Antes de reemplazar una cadena conviene volver a comprobar el acceso o aceptar listas CSV documentadas. No se elimina ninguna cadena sin decisión del usuario.

## Otros trabajos que quedan

- Separar más librerías de la descarga inicial y medir rendimiento real en teléfono.
- Revisar las direcciones heredadas del mapa y limpiar scripts/SQL de demostración.
- Mejorar ranking de búsqueda y tolerancia a errores de escritura.
- Revisar persistencia de canasta y normalización de códigos GTIN con pruebas específicas.
- Pruebas físicas del lector con más envases y dispositivos. Las pruebas automatizadas no sustituyen esa comprobación.
