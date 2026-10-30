# Revisión del lector — 29 de octubre de 2026

## Alcance
Respaldo del proyecto y corrección local del lector. No se modificaron precios, Supabase, secretos, automatizaciones ni el despliegue de Vercel.

## Fallas confirmadas en el código anterior
- El respaldo html5-qrcode 2.3.8 recibía facingMode, width y height como primer argumento. La biblioteca exige exactamente una propiedad en ese argumento; las dimensiones corresponden a videoConstraints.
- El contenedor del lector de respaldo estaba oculto hasta que terminaba start(), aunque la biblioteca necesita las dimensiones del video para procesar imágenes durante el inicio.
- El bucle nativo ignoraba errores de detección indefinidamente; el respaldo se ejecutaba solamente si fallaba el inicio.
- Los reintentos podían abrir otra sesión antes de cerrar la anterior. El cierre tampoco cancelaba resultados diferidos.
- La interfaz identificaba cualquier código desconocido como EAN-13 válido sin comprobarlo y llamaba Lens HD a un motor que no es Google Lens.

## Corrección
Unificar la cámara bajo html5-qrcode, con alternancia nativa/ZXing cuando los formatos son compatibles y ZXing en los demás casos. Corregir constraints, mantener visible el contenedor y serializar inicio, cierre y lectura de fotografías. Invalidar callbacks de sesiones anteriores. Separar lectura correcta de ausencia en catálogo. Compatibilizar UPC-A y EAN-13 con cero inicial. Las capacidades opcionales de linterna/zoom no bloquean el lector. Mantener búsqueda manual con teclado numérico y ejemplos identificados como búsquedas, no pruebas de cámara.

## Verificación
Pruebas de lógica con cámara y decodificador simulados: configuración, compatibilidad nativa, códigos desconocidos, reintentos, cierre durante permisos, resultados duplicados, cancelación de navegación, lectura de fotos, controles opcionales y catálogo actualizado. Estas pruebas NO comprueban la capacidad óptica ni la decodificación real de un envase.

## Prueba pendiente en teléfono
Abrir una versión de prueba mediante HTTPS. Probar un código conocido y otro fuera del catálogo, confirmar el número leído, repetir escaneo, cerrar/reabrir el modal y probar foto y permisos rechazados. Registrar modelo de teléfono y navegador. No se afirma que el problema del dispositivo esté resuelto hasta completar esta prueba.

## Respaldo
../respaldos/radar-precios-antes-lector.tar.gz en la carpeta de trabajo de Codex. Incluye el código y Git originales; excluye dependencias, build y .env.local. El archivo de entorno original no fue modificado.
