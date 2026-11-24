# Plan operativo — Indumentaria lornas

Definido por Codex por instrucción del usuario el 23-11-2026. Este documento define el diseño; no acredita una instalación ni un flujo n8n operativo.

## Arquitectura elegida

- WhatsApp Business Platform → webhook HTTPS → n8n en computadora del responsable.
- Excel administrado por Escobar Rodrigo, con columnas de producto, descripción, precio, moneda y fecha de actualización; sin datos de clientes.
- Revisar precios cada día de atención y modificarlos cuando cambien. Consultar Excel en cada pregunta de precios; no pedir al modelo que invente valores. Si falla la consulta o falta un dato, derivar al correo.
- Inicio solo con texto y consultas de ropa/precios. Sin pedidos, pagos, imágenes, audios ni documentos.
- OpenAI recibe exclusivamente un objeto permitido con consulta redactada, contexto relevante y filas pertinentes del catálogo. Nunca enviar el webhook entero, teléfono, nombre de perfil, ID de WhatsApp, credenciales ni todo el Excel.
- Comprobar y filtrar datos personales en el texto y contexto antes de enviarlos. Un filtro no garantiza detectar toda información personal; limitar contexto y advertir que no se envíen datos innecesarios. Si el flujo no puede minimizar una consulta, derivarla a atención humana.
- Usar solicitudes sin estado a la API de OpenAI con `store: false` donde corresponda. No crear Conversations, Files, vector stores ni tareas en segundo plano. El parámetro no elimina la retención independiente del proveedor: verificar las condiciones de la cuenta y del endpoint antes de activar.

## Conversaciones y registros

- Guardar solo historial necesario y fecha del último mensaje en un almacén local separado de la base interna de n8n. Identificar con un ID seudónimo y conservar la asociación al número solo donde sea imprescindible; este ID sigue siendo dato personal si permite vinculación.
- Política del historial: 30 días desde último mensaje (720 horas). Borrar conversación, memoria y asociación de contacto al vencer. No renovar el plazo por tareas internas que no sean mensajes de la conversación.
- Ejecutar limpieza al iniciar y cada hora. Tras apagado, limpiar antes de volver a atender; impedir atención si falla la limpieza. No ejecutar borrados contra la base interna de n8n con SQL inventado: usar su mecanismo soportado.
- No hacer copias de seguridad del almacén de conversaciones en el diseño inicial. Respaldar flujo y catálogo sin secretos ni datos personales; si se agregan respaldos de conversaciones, revisar primero la política y la eliminación en todas las copias.
- No guardar payloads completos de ejecuciones exitosas, fallidas o manuales. Configuración de referencia de n8n, a validar contra versión instalada:

```dotenv
EXECUTIONS_DATA_SAVE_ON_SUCCESS=none
EXECUTIONS_DATA_SAVE_ON_ERROR=none
EXECUTIONS_DATA_SAVE_ON_PROGRESS=false
EXECUTIONS_DATA_SAVE_MANUAL_EXECUTIONS=false
EXECUTIONS_DATA_PRUNE=true
EXECUTIONS_DATA_MAX_AGE=336
```

Estas opciones no son una memoria de conversaciones ni sustituyen su limpieza. El pruning puede tener excepciones según estado de la ejecución; no depender de él para el historial del cliente.

- Diagnóstico propio: solo fecha/hora, estado y categoría de error, sin teléfono, mensajes, IDs personales ni respuestas completas. Rotación a 14 días. No loguear objetos de error completos que puedan contener solicitudes o credenciales.
- Revisar y purgar pruebas con datos ficticios antes del lanzamiento. No usar fijación de datos (pinning) ni exportaciones de ejecuciones con conversaciones reales.

## Solicitudes de eliminación

- Correo: modanqnbylornas@gmail.com. Responsable: Escobar Rodrigo.
- Recibir asunto, número con código de país y alcance solicitado. No pedir DNI, claves ni OTP por defecto.
- Acusar recibo y verificar identidad cuando sea necesario por confirmación desde el mismo número, o método alternativo proporcionado. No asumir que esto suspende plazos legales.
- Atender rectificación/supresión dentro de 5 días hábiles; acceso dentro de 10 días corridos. Revisar el caso y las excepciones aplicables; documentar e informar cualquier impedimento.
- Eliminar historial, memoria y asociación de contacto del almacén local; revisar n8n, correos y cualquier copia efectiva. No exportar el contenido eliminado como evidencia.
- Responder con el alcance, fecha y límites de la eliminación, incluyendo que el negocio no controla todos los registros de Meta/OpenAI ni el teléfono del usuario.
- Borrar el contenido del correo de la solicitud a los 30 días de su cierre, salvo necesidad concreta y justificada. Revisar también enviados, papelera y mecanismos reales de conservación del correo; no prometer borrado en sistemas que no controla el negocio.

## Controles antes de atender clientes

1. Confirmar cuentas, proveedores adicionales, tratamiento internacional y garantías aplicables; reflejar cambios en la política antes de usar el flujo.
2. Habilitar cifrado de disco, acceso restringido a la computadora y protección de credenciales. Webhook con autenticidad comprobada y HTTPS, sin exponer el editor ni la base de datos de n8n a Internet.
3. Probar la selección de campos enviados a OpenAI y que el catálogo no contiene datos personales.
4. Con un reloj/datos de prueba, verificar eliminación por vencimiento, reinicio tras inactividad y pedido por correo. Asegurar eliminación antes de servir una conversación vencida.
5. Verificar que ejecuciones y errores no retienen contenidos. Comprobar la configuración efectiva, no solo variables declaradas.
6. Confirmar respuesta segura ante Excel no disponible, precio ausente o contexto insuficiente.
7. Recién al superar los controles, actualizar las páginas para describir el canal como activo. Publicar ahora las páginas no cumple estos controles ni garantiza aprobación de Meta.

## Fuentes consultadas

- n8n: https://github.com/n8n-io/n8n-docs/blob/main/docs/deploy/host-n8n/configure-n8n/scaling/manage-execution-data.md
- OpenAI: https://developers.openai.com/api/docs/guides/your-data
- Ley 25.326, derechos: https://www.argentina.gob.ar/normativa/nacional/64790/texto
- AAIP: https://www.argentina.gob.ar/aaip/datospersonales/derechos
