# Auditoría MEM-002 — 5 de noviembre de 2026

## Alcance y método

Auditoría solicitada por el usuario; solo se modifica agent_memory. Repositorio:
`/home/rodrigo/Escritorio/ANTIGRAVITY/radar-precios`. `/agent_memory` absoluto no existe;
la memoria está dentro del repositorio. HEAD `701d8e3`, rama main, un worktree.
Se revisaron los cinco documentos, REGLAS_TRABAJO, AGENTS, código frontend,
colectores, workflow, configuración Vite/TypeScript, pruebas y docs relevantes.
Se preservaron íntegramente los cinco documentos anteriores en history/MEM-002_antes
(nombre con fecha y hora). No se corrigieron documentos externos a agent_memory.

## Hallazgos y evidencia

1. **P0 · Producción no coincide con la memoria.** Lectura HTTP del 05-11:
   home 200 con `/assets/index-Bugw-9or.js`; `/data/live-prices.json` 404.
   La memoria afirmaba bundle DXx-QxSU y 11.250 cotizaciones en ese endpoint.
   Esto refuta el estado vigente, no la existencia de un despliegue anterior.
   No se infiere que toda la página esté caída: la versión antigua puede cargar
   datos embebidos. No se midió su catálogo visible en navegador.
2. **P0 · Sincronización remota y autenticación mal descritas.** HEAD local 701d8e3;
   origin/main local f424e45 (21 commits detrás del HEAD local), pero `git ls-remote`
   devuelve df2b9acefbee4499181248932ab0ff9814b9a099, commit del bot 05-11 18:31:35Z.
   La referencia local está desactualizada: “ahead 21” no mide la divergencia real.
   gh disponible en la carpeta del curso autentica a legajodecuadros6-sudo; API del
   repositorio informa push/admin true. No se imprimieron secretos ni se probó
   push. No hace falta pedir un PAT como primer paso. Falta reconciliar ambas
   historias preservando datos antes de publicar; nunca force-push por defecto.
   Últimas tres corridas consultadas (03, 04 y 05-11) concluyen failure.
   Cron configurado a 11 UTC no prueba hora efectiva ni éxito de ejecución.
3. **P0 · Coto sigue infringiendo D4.** `coto_record` (sync_verified_prices.py:622)
   elige listPrice de store185, luego el menor discountPrice global, sin validar
   sucursal del descuento, cantidad, condición ni vigencia. Publica min_quantity=1.
   Snapshot: Lay’s330 EAN7790310985588, lista10500, actual6825, mínimo1.
   La prueba `test_search_price_scale_ean_and_discount` consagra esta conducta;
   pasarla no demuestra corrección comercial. No deducir “2da al70%” solo de
   un 35%: esa equivalencia aritmética no acredita la condición real.
   El relevo anterior ya detectaba el problema; no se reparó el código.
4. **P1 · Yaguar: error reproducido y validación incompleta.** En collect_yaguar:365,
   `products,observations,errors,at_limit={},{},{},[]` crea errors como dict.
   Un error de consulta simulado produce AttributeError: dict has no attribute append.
   Además, el retorno descarta errors y solo informa límites de páginas. Un payload
   no-lista termina silenciosamente. Los tests de Yaguar cubren yagu_record, no
   el recorrido de error del colector (el nombre de un test menciona paginación
   pero no la ejercita). Corregir solo el tipo no basta: hay que propagar errores.
   yagu_record marca is_verified=True mientras sus propias notes dicen que impuestos
   y condiciones deben confirmarse; no hay evidencia de cierre de la cuarentena D6.
   El snapshot incorpora 1.718 observaciones; eso no equivale a precio final validado.
5. **P1 · La Anónima admite stock desconocido.** anonima_record:467 rechaza -1 y
   enteros <=0, pero acepta campo ausente o texto inválido. Reproducción aislada:
   artículo con código/nombre/precio y sin stock produce registro verificado.
   La memoria decía exigir stock>0. Las cookies geográficas existen en código,
   pero enviarlas y comprobar que existe sucursal no demuestra que el servidor
   aplicó esa zona al precio. Falta evidencia de respuesta regional.
6. **P1 · Jumbo: validación del resultado de simulación incompleta.** collect_jumbo:819
   comprueba availability y price positivo, pero no seller devuelto, quantity,
   measurementUnit/unitMultiplier, tax, priceTags, sellingPrice ni logística local
   por ítem. Publica price/100 y mínimo1. Contrasta con mas_record/vital_record,
   que aplican más verificaciones. No se afirma que todas las cotizaciones sean
   incorrectas; falta protección ante respuestas incompatibles. Los tres tests
   Jumbo prueban record/metadata, no esa validación de simulación.
7. **P1 · Respaldo y pruebas de carga incompletos.** Vite intercepta live-prices.json
   con un stub vacío. Si falla fetch, productService devuelve localData, que en
   producción contiene legacy no verificado, no el snapshot completo. El mensaje
   “última importación guardada” puede ser engañoso. Tests Node cargan el JSON real,
   no el módulo interceptado; no cubren fallo de red con el bundle de producción.
   JSON.parse no se vuelve asíncrono por usar fetch; no hay worker. No se revalidan
   afirmaciones de 15ms, carga móvil instantánea o tiempos/gzip de builds anteriores.
8. **P1 · Stock retirado y fechas.** merge_observations conserva observaciones antiguas
   cuando una nueva consulta no incluye el artículo (incluido sin stock). Pueden
   seguir comparables hasta 72h/168h. Histórico preservado es correcto, pero no
   demuestra disponibilidad actual. Falta distinguir archivo histórico de retiro
   explícito de cotizaciones activas.
9. **P2 · H4 existe; texto contradictorio.** CoveragePanel recibe allObservations y
   muestra aviso de vencidas. Regla real:72h general/168h Makro. El texto visible
   dice72h para todas. La justificación legal/semanal de D11 no fue verificada;
   tratar168h como política implementada, no garantía de vigencia del comercio.
10. **Memoria histórica presentada como actual.** D5/Coto aplazado y D6/cuarentena
    contradicen integración. LEARNINGS aún decía catálogo/histórico embebidos,
    cero Manaos, Makro72h, sin banner y sin credencial GitHub. H6 24,2% corresponde
    al01-11: snapshot actual tiene7554 productos con campo EAN de10862 (~69,5%;
    presencia de campo, no prueba de exactitud de identidad). La afirmación universal
    “La Anónima NO bloquea403” no se sostiene por una sonda. Vea/Diarco se retiraron
    por decisión del usuario, no por prueba concluyente de inexistencia/entrega.
    La estimación de precio físico de Lay’s330 en el relevo anterior es especulación
    y no puede usarse para poblar datos. La relación EAN Coca3L/2,25L en LEARNINGS
    es contradictoria y debe verificarse en fuente antes de reutilizar.

## Cifras locales, no catálogo vigente de producción

Snapshot:10862 productos/11250 observaciones. Histórico:25491 observaciones.
A las23:30UTC del05-11 (20:30ART), por fecha y ventana del código:

| Cadena | Guardadas | Dentro de ventana |
|---|---:|---:|
| Coope |851|784|
| ChangoMás |233|187|
| Makro |36|36|
| Vital |98|90|
| Yaguar |1718|1718|
| La Anónima |676|676|
| Coto |7290|7290|
| Jumbo |348|348|

Total11129 dentro de ventana,121 vencidas. Estar dentro de ventana no valida
impuestos, promociones, stock ni identidad; estos números envejecen.

## Verificación ejecutada

- `PYTHONDONTWRITEBYTECODE=1 python3 -B -m unittest discover -s tests -p 'test_*.py'`:
  40 pruebas OK; pruebas de escritura usan directorios temporales.
- `node --test tests/*.test.cjs`:3 archivos OK,0 fallos. El runner de este entorno
  reporta3 unidades de archivo; no atribuirle71 ni31 casos individuales recontados.
- `./node_modules/.bin/tsc --noEmit`:exit0, sin salida.
- Reproducciones Python aisladas, sin escritura en proyecto: error de Yaguar y
  stock ausente de La Anónima, usando mocks/datos sintéticos, ambos confirmados.
- Lecturas HTTP/GitHub descritas arriba. No scraper real, sync, build, deploy,
  push, fetch de Git, cambio de credenciales ni escritura a Supabase.
- No se ejecutó npm run build: prebuild escribe public/data, resumen histórico y
  src/data/branches.json/sources.json. La autorización permite solo editar memoria.
- Logs de esta sesión en /tmp/radar-audit-*.log; son auxiliares efímeros.

## Veredicto

La memoria anterior NO era confiable como descripción actual. La memoria corregida
sí sirve como relevo de auditoría acotada, con incertidumbres explícitas. No certifica
la calidad comercial de todos los precios ni la igualdad local/remoto/producción.
El próximo trabajo debe atender divergencia de despliegue y Coto antes de ampliar
fuentes. La orden vigente sigue siendo no modificar código hasta nueva instrucción.


## Confirmación adicional del cron (lectura de logs)

Run42084492544 del05-11: el sync remoto produjo1071 cotizaciones nuevas,
1289 productos y7083 registros históricos. Coope795, ChangoMás185 y Vital91;
Makro falló con “lista futura o de más de72horas”. Se construyó y confirmó
un commit de datos pese al exit1 (continue-on-error); la tarea final de aviso
marcó failure. Por tanto, failure NO significa que no se guardaron datos.
Ese workflow aún no incluía los nuevos colectores locales ni la ventana168h.
Al reconciliar, unir históricos de ambas ramas; no reemplazar remoto por snapshot
local ni interpretar los7083 como total del histórico local de25491.
Fuente: https://github.com/legajodecuadros6-sudo/radar-precios-neuquen/actions/runs/42084492544
