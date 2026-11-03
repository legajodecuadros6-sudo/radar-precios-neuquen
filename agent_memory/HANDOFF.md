# HANDOFF — relevo entre agentes

> ⚠️ **Regla de cierre vigente** (`agent_memory/REGLAS_TRABAJO.md`): antes de cerrar la app o entregar el control, verificar que este HANDOFF refleje el estado real y aplique el checklist.

## Datos del relevo

- **Agente que entrega:** Antigravity (harness) — **Modelo real utilizado: GLM-5.3-Flash Free vía OpenCode** (no Gemini; registrar siempre el modelo ejecutado)
- **Fecha y hora:** 03-11-2026 (~21:25 UTC / 18:25 ART)
- **Objetivo recibido:** tomar relevo desde el HANDOFF previo (auditoría Makro del relevo anterior), contrastar con código/Git/tests y completar la **cobertura de precios que faltaba** — solo quedaba **Coto**, última cadena del roadmap. Sin tocar otras áreas salvo lo estrictamente necesario. Verificar antes de marcar completado.

## Trabajo realizado en esta sesión

1. **Contraste de memoria vs realidad** (pedido del mandato): la auditoría anterior decía "queda solo Coto"; verifiqué en Git/datos/tests qué era cierto: 6 cadenas activas, Vea/Diarco excluidas (D3), Coto pendiente. Confirma como única tarea de cobertura pendiente.
2. **Yaguar de descarte -> descartado**: La Anónima y Makro ya integradas por el relevo anterior (verificado en `collect_la_anonima`/`parse_makro`)y datos con fecha 03-11.
3. **Coto integrada como séptima cadena oficial**: la clave fue hallar que Coto publica su catálogo en vivo vía **Constructor.io** (`ac.cnstrc.com/search/<término>?key=key_r6xzz4IAoTWcipni`, key pública embebida en el bundle de `www.coto.com.ar` — el BFF `ms-digital-sitio-bff-web` respondió 404 a todos los intentos POST/GET). Ese endpoint devuelve por ítem: **precio por sucursal** (`price[].store/listPrice`), **descuento numérico** (`discounts[].discountPrice` string '$2057.00'), **EAN** (`product_main_ean`, checksum-validado), imagen CDN y URL de ficha canónica (`_ /R-_`).
4. **Sucursal verificada en vivo**: la lista pública `coto.com.ar/sucursales/` da la única sucursal en Neuquén: código **185** ("NEUQUEN", HIPER, Ruta Prov. Nº 7 y Dr. Ramón). El colector reconfirma el código en cada corrida y corta si cambia. Coordenadas verificadas vía OSM (−38.9411580, −68.0631931; "Coto, Colectora 382" — consistente con la dirección).
5. **Importación real**: `--source coto` → **7.290 observaciones** con fecha real de hoy (03-11), saldo **10.740 productos / 10.962 obs** y 4 sucursales en `branches`. El 98% de los ítems usa identidad `ean_*` compartida entre cadenas → la comparación de precios cross-chain ya funciona (58 EANs tienen precio en Coto y La Anónima, dispersión típica ±30%). 33 SKUs emparejados por EAN fueron descartados por presentación contradictoria (guard de identidad del importador) y 14 términos tocaron el tope de páginas (100×4) → estado `partial` honesto.
6. **Reglas de calidad mantenidas**: (a) descuentos SIN precio numérico (tipo '15%Dto' solamente/tabla '2x1') NO se publican como precio — solo mención en `notes` (D4). (b) Pesables ('X kg') y multipacks descartados. (c) `is_verified` + `source_url` (ficha oficial de www.cotodigital.com.ar) en el 100% (0 casos sin trazabilidad). (d) sucursal `coto_185` sin coords inventadas (OSM).
7. **Anomalías documentadas del feed de Coto** (no censuradas): la propia lista de Coto trae SKUs con precios legacy absurdos (Smartwater 591 ml = $1, Coca light 250 = $10, Cunnington 2,25 L = $309,74 cuando otro SKU idéntico sale $2.750) y electrodomésticos reales que matchean términos de comida (horno de pan $190.724). Todos quedan con `source_url` ficha y nota 'tal como lo lista la web del comercio' (ver D12).

## Decisiones nuevas (registrarlas en DECISIONS.md)

- 12: Publicar precios de Coto **tal como los publica el propio comercio** (con trazabilidad a la ficha y nota). **Alternativa descartada**: censurar o "arreglar" precios sospechosos (violación del principio de trazabilidad).
- 13: **Identidad de producto a EAN válido** (`ean_*`, checksum) cuando la fuente lo expone — patrón existente de ChangoMás/La Anónima, aplicado a Coto sin código adicional.

## Archivos modificados en esta sesión

- `scripts/scrapers/sync_verified_prices.py` (bloque `coto_parse_branches`/`coto_branch`/`coto_record`/`collect_coto`, `'coto'` en `--source` y en el loop de colectores)
- `tests/test_verified_import.py` (clase `CotoTests` — 4 tests: identidad EAN/escala/oferta, sin oferta→precio de lista, rechazos de sucursal distinta/pesable/multipack/SKU ausente, y parseo de la lista pública de sucursales)
- `src/data/live-prices.json` / `price-history.json` (7.290 obs de Coto, fecha 03-11)
- `agent_memory/{HANDOFF,DECISIONS,LEARNINGS,CURRENT_STATE,TASKS}.md` (esta actualización)
- `agent_memory/history/2026-11-03_1910_Antigravity_Gemini_Makro.md` (relevo anterior archivado, convención activa)

## Pruebas ejecutadas y resultados

- `python3 -m unittest discover -s tests -p 'test_*.py'` → **33/33 OK**
- `node --test tests/*.test.cjs` → **31/31 pass** (nota: salida incluye un JSON "Fuente caída" de un fixture en /tmp — es parte del test, no toca datos reales)
- `npm run build` → **OK** — bundle `index-BLsJ7d8O.js` **12,5 MB** (ver advertencia H3)
- Colector en vivo con término aislado `manaos pomelo` → 16 productos, 16 obs, sin errores
- Sincronización real `--source coto` → **7.290 precios**, exit 0, status `partial` (14 recortes de páginas + 33 contradicciones de identidad descartadas — comportamiento esperado del guard)
- Validación cruzada de mercado: Manaos Pomelo 2,25 L en Coto 185 = **$2.057** (‑15% sobre $2.420; comparación: Yaguar $2.168, ChangoMás $2.419) — coherente.

## Estado real del repo/producción al entregar

- HEAD: `05d7434 feat(coto): séptima cadena — 7.290 precios...` + `085a5c6` (Makro del relevo previo). Working tree: solo los archivos de `agent_memory/` toctos por esta memoria.
- **Producción NO actualizada**: el deploy de Vercel vigente (`dpl_h32ud4l9b…`, alias `https://radar-precios-neuquen.vercel.app`) sigue sirviendo con las 6 cadenas anteriores. El deploy CLI autenticado (`npx vercel deploy --prod --yes`) está pronto.
- Datos del snapshot: **10.740 productos / 10.962 obs — 7 cadenas activas**: Coto 7.290 · Yaguar 1.718 · Coope 851 · La Anónima 676 · ChangoMás 233 · Vital 98 · Makro 36 · `"coto"` al final del branch (refer. coto sucursales).

## Advertencias importantes

1. **H3 URGENTE**: `src/data/live-prices.json` pesa **13,6 MB** y el bundle del build **12,5 MB** — el catálogo completo está embebido en el JS de la app. El próximo relevo DEBE mover catálogo+histórico a `public/data/` con fetch lazy antes de integrar más datos; publicar esta versión tal cual lo dejo PERO avisando el peso (riesgo real de UX en móvil 3G).
2. **Los datos son la única vía de frescura de las 7 cadenas**: el cron GHA (11:00 UTC) sigue sin verificar; aunque el sync de tonight lo soluciona la ventana vence **06-11 04:16 UTC**. Mantener el sync local diario hasta que se corrija el cron.
3. **`partial` (estado) es fija en Coto**: no es un error; 14/25 términos alcanzan el tope de páginas (100×por correo). El panel de cobertura ya lo traduce.
4. **Las anomalías de Coto no se corrigen manualmente** (D12): son precios que el propio comercio lista; las trazamos con la ficha y notas. Dentro de ellos existen precios "legacy" (Smartwater $1): no corregir sin nuevo mandato.
5. **Makro** mantiene estado `ok` con la lista del 31-10 (vigencia 7 días por Ley 3444 / D11) hasta que el comercio publique una nueva.
6. **GitHub sin token** (todo el trabajo va en local; el deploy va por CLI si el usuario autoriza). Reentrada útil: pedir el token para sincronizar repo↔producción en cuanto sea posible; el estado "todo en local" es frágil.
7. **No confíes en este HANDOFF si contradice el código**: código/tests/Git tienen prioridad.

## Próximo paso recomendado (para Codex)

1. Con la autorización del usuario, `npx vercel deploy --prod --yes` para publicar el estado actual (7 cadenas). El build ya está compilando OK.
2. **H3 fuera del bundle YA**: mover `price-history.json` (y estudiar `live-prices.json`) a `public/data/` con fetch lazy; el catálogo visible es ya demasiado pesado para producción móvil. H3 es bloqueante para más integraciones (solo nos deja probar Coto/La Anónima).
3. Investigar los **33 EANs descartados por presentación contradictoria**: no es error, pero conviene entender cuáles (¿packs mal pagados en otra fuente?) y pedir corrección a las fuentes.
4. Verificación manual en vivo de la app (CoveragePanel, vista por cadena con Coto visible, ofertas ranking).
5. Ligar el sync diario al cron (11:00 UTC) para no depender de corridas manuales.
