# Aprendizajes verificados — revisión 05-11-2026

Detalles reproducibles y límites en AUDIT_MEM-002.md. El contenido previo íntegro
está preservado en history; no reutilizar afirmaciones históricas como estado vivo.

- Un 200/403 es observación de una ruta/cliente/fecha. No declarar una tienda
  permanentemente bloqueada ni inmune a 403. Verificar ruta local, moneda, unidades,
  stock, impuestos y restricciones antes de aceptar cotización.
- Coope usa local 124, offset/pedido; código actual envía pedido 0. Promos estructuradas
  requieren validar semántica. cod_interno no es EAN.
- Yaguar tiene API por ciudad y JSON puede contener BOM. `/neuquen/` y validación
  ARS/escala/mínimos existen. El colector actual tiene `errors={}` usado como lista;
  reproducción del fallo en informe. Precio marcado verificado aún dice impuestos
  pendientes en notes. No confundir ubicación de catálogo con precio final.
- **Yaguar Neuquén y discrepancias de góndola:** El catálogo consultado por el colector
  es efectivamente de Neuquén (`https://yaguar.com.ar/neuquen/producto/papas-fritas-lays-330gr/`).
  La cotización de Lay's 330g pasó de $6.999 (03-11) a $9.103 (05-11). La observación
  presencial del usuario en Neuquén ($9.103) coincide exactamente al centavo con
  la remarcación registrada en la API oficial de Neuquén. No era un precio de Buenos Aires.
- La Anónima usa HTMLParser, cookies CP 8300 / sucursal 8 y preflight de sucursal. Eso
  prueba intención de región, no aceptación del servidor. Stock desconocido se
  rechaza con el guard `stock > 0`.
- Coto ya usa Constructor.io; precio por store 185. Los descuentos globales sin
  condiciones comprobadas se eliminaron para respetar la regla D4 (precio de lista regional).
- Jumbo envía sesión regional y seller local; se valida `jumbo_quote_is_local()`
  verificando seller, unidad, multiplicador, ausencia de impuestos adicionales y priceTags.
- Makro conserva fecha publicada, no fecha de descarga, y admite 168h; el resto 72h.
- merge_observations conserva filas previas: fuente fallida no borra histórico.
  La unión histórica en el commit `013b8ec` combinó 25.491 cotizaciones locales y
  7.083 remotas sin pérdida (sumando 40.725 cotizaciones tras la corrida completa).
- Vite intercepta snapshot con stub; tests Node usan snapshot real. La descarga
  de catálogo en el frontend cuenta ahora con estado visible de error y reintento.
- **Desfasaje Vercel / GitHub Actions:** GitHub Actions ejecuta un cron que comitea
  a `origin/main`. Si `origin/main` está desfasado respecto al desarrollo local,
  la integración de auto-deploy de Git en Vercel compila la rama desactualizada y
  sobreescribe despliegues manuales recientes. Para evitarlo, se debe sincronizar
  GitHub con `git push` o pausar el auto-deploy en el panel de Vercel.
