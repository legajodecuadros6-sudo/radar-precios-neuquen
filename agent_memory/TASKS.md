# TAREAS — Radar de Precios

**Convención:** `[ ]` pendiente · `[~]` en progreso · `[x]` completada y verificada (con evidencia).
**Regla:** no marcar `[x]` sin verificación real (código corrido, test verde, o comprobación en producción).

## En progreso

- [~] **Publicación en producción.** (03-11) **Commit `475545a` **(Yaguar) + `43b47f6` **(docs/memoria) hechos localmente; deploy Vercel CLI `dpl_EjS1UY7DmLZTNQJiPgCbDhP15TWf` con alias producción verificado (bundle con datos Yaguar). Pendiente: sensibilizar el `git push` (sin token GitHub, repo↔producción no sincronizados).
- [~] **Memoria compartida de agentes** (esta carpeta): inicializada el 03-11. Mantener al final de cada sesión.

## Pendientes

- [ ] **Integrar colector La Anónima al importador** (factibilidad probada el 01-11: search HTML estructurado `data-precio/…`, EAN en ficha de detalle). Decidir cap de peticiones para no abusar del sitio.
- [ ] **Refrescar datos** (cron 2 días sin actualización visible en el snapshot; riesgo 72 h ~04-11T19:44Z). Ejecutar sync local o investigar fallos del cron en GHA.
- [ ] **Promos por cantidad desde Coope**: decodificar `tipo_promo/cantidad_promo/precio_promo` de la API, importar como `promo_condition` documentada y solo mostrar la UI cuando la condición esté verificada (política del usuario del 01-11: no publicar "llevando N" sin comprobar).
- [ ] **Sincronización repo↔producción**: conseguir GitHub token (o SSH) para `git push`; hasta entonces decidir si se publica por CLI de Vercel con riesgo de divergencia repo/producción.
- [ ] **Banner de degradación 72 h** (H4 de auditoría) — evitar vaciado silencioso del catálogo.
- [ ] **Histórico fuera del bundle** (H3): mover a `public/` con fetch lazy.
- [ ] **Supabase**: decisión del usuario — (B) apagar rico `mergeCloudData` o (A) esquema v2 + escritura server-side. *(pendiente de decisión)*
- [ ] **UX canasta/navegación** (prioridad 1 del usuario del 01-11): elegir comercio, presentación y cantidad con más claridad. Detalle abierto con el usuario.
- [ ] **Imágenes/categorías/rendimiento móvil** (prioridad 4): code-splitting (leaflet/gsap/recharts), lazy del escáner, dimensiones de imágenes.
- [ ] **Coto** (postergado por decisión del usuario del 01-11): requiere Playwright o ingeniería inversa del BFF `ms-digital-sitio-bff-web`. No iniciar sin nuevo mandato.
- [ ] **Cobertura EAN**: La Anónima (fichas con EAN) y Open Food Facts con revisión humana; Coope/Makro no exponen EAN (comprobado).

## Completadas y verificadas

- [x] **Integración oficial de Yaguar al importador** (03-11): colector en `sync_verified_prices.py` (`collect_yaguar`, con validación estricta de ciudad/moneda/escala/stock/mínimos), tests nuevos (`YaguarTests`, 3 casos) y primera importación real: **1.718 observaciones / ~880 productos nuevos**, estado `ok`, sin recortes de páginas (`per_page=100`, `pages=3`). Verificado: 0 observaciones sin trazabilidad, Manaos Pomelo 2,25 L = $2.168 (fecha real 03-11), tests Python OK + node 31/31 pass.
- [x] Auditoría completa H1–H21 documentada en `AUDITORIA_GLM_RADAR_PRECIOS.md` (1231 líneas, 01-11) — evidencia verificada contra código, datos, producción y tests.
- [x] Factibilidad de fuentes difíciles probada con sondas reales (01-11): Yaguar OK (tienda activa), La Anónima OK (sin 403, con EAN), Vea no entrega en 8300, Diarco sin sucursal en Capital, Coope expone promos con condiciones, Coto exige esfuerzo extra.
- [x] Exclusión de **Diarco y Vea** de cobertura pública (decisión usuario 03-11) — commit `f424e45` de otro agente.
- [x] UI por comercio / ofertas / productos pedidos visibles en Git — commits `28d2673`, `4b71ce6` (verificación en vivo aún pendiente tras redeploy).
- [x] Localización de credenciales: **token Vercel válido** (CLI del usuario); **sin token GitHub** comprobado.
- [x] Lector de códigos: suite 9/9 y lookup en vivo verificados el 01-11 (`tests/barcode-scanner.test.cjs`).
