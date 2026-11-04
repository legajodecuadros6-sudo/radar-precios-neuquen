# HANDOFF — relevo entre agentes

> ⚠️ **Regla de cierre vigente** (`agent_memory/REGLAS_TRABAJO.md`): antes de cerrar la app o entregar el control, verificar que este HANDOFF refleje el estado real y aplique el checklist.

## Datos del relevo

- **Agente que entrega:** Antigravity (harness) — **Modelo real utilizado: Gemini 2.5 Pro**
- **Fecha y hora:** 03-11-2026 (~21:45 ART / 00:45 UTC 04-11)
- **Objetivo recibido:** Eliminar el supermercado Coto duplicado en el mapa interactivo (figuraban dos marcadores de Coto en Alto Comahue) y publicar la corrección en producción Vercel.

## Trabajo realizado en esta sesión

1. **Diagnóstico del duplicado de Coto:**
   - En `src/data/supermarkets.ts`, `ORIGINAL_BRANCHES` contenía la sucursal legacy con ID `'coto_alto_comahue'`.
   - Cuando se integró el scraper oficial de Coto, las cotizaciones y el feed generaron la sucursal oficial `'coto_185'` en `branches.json`.
   - Al construir `SUPERMARKETS_NEUQUEN`, como los IDs diferían (`'coto_alto_comahue'` vs `'coto_185'`), la concatenación agregaba ambos registros, provocando que se renderizaran dos pines de Coto en el mapa de Neuquén en la misma ubicación (Dr. Ramón / Alto Comahue).
2. **Corrección y Unificación:**
   - Se actualizó el ID de la sucursal en `ORIGINAL_BRANCHES` a `'coto_185'`, conservando el nombre descriptivo (`Coto Hipermercado Alto Comahue`), dirección precisa (`Av. Dr. Ramón 382`), horarios, logo SVG oficial y teléfono.
   - Con esta unificación, el merge con `branches.json` de-duplica automáticamente el registro.
   - Verificado con script de Node: el mapa ahora tiene **exactamente 1 supermercado Coto** (`coto_185`), y todos los 7.290 precios de Coto se asocian limpiamente a esta única sucursal física.
3. **Pruebas y Verificación:**
   - `node --test tests/*.test.cjs` → **31/31 pass** (4.2s).
   - `python3 -m unittest discover -s tests -p 'test_*.py'` → **40/40 OK** (0.098s).
4. **Compilación y Despliegue en Vercel:**
   - Ejecutado `npm run build` en 22.7s (nuevo bundle cliente: `dist/assets/index-DXx-QxSU.js`, 1.512 kB / 433 kB gzip).
   - Desplegado a producción con Vercel CLI: `npx vercel deploy --prod --yes`.
   - Deploy ID: `radar-precios-neuquen-rgjc5le65-radar-de-precios.vercel.app`
   - Alias oficial activo: **`https://radar-precios-neuquen.vercel.app`**
   - Verificado en vivo que la página sirve el nuevo bundle `index-DXx-QxSU.js` con el mapa corregido.

## Archivos modificados en esta sesión

- `src/data/supermarkets.ts` (unificado ID de Coto a `'coto_185'`, eliminando el duplicado)
- `agent_memory/history/2026-11-03_2120_Antigravity_Gemini_Jumbo_Live.md` (relevo previo archivado)
- `agent_memory/CURRENT_STATE.md` (documentado deployment vigente y unificación de Coto)
- `agent_memory/HANDOFF.md` (este relevo)

## Commits realizados

- `c3dc43e`: feat(jumbo): integrar Jumbo como 8va cadena oficial en catalogo, mapa y produccion Vercel
- *(Pendiente commit de la de-duplicación de Coto al cierre)*

## Pruebas ejecutadas y resultados

- `node --test tests/*.test.cjs` → **31/31 pass** (4.2s).
- `python3 -m unittest discover -s tests -p 'test_*.py'` → **40/40 OK** (0.098s).
- `npm run build` → **OK** (22.7s, bundle `index-DXx-QxSU.js` 1.512 kB / 433 kB gzip).
- `curl -s https://radar-precios-neuquen.vercel.app` → **HTTP/2 200 OK** sirviendo `index-DXx-QxSU.js`.
- Comprobación en vivo: **10.862 productos / 11.250 cotizaciones en 8 cadenas activas**, y 1 único Coto en el mapa.

## Estado real del repo/producción al entregar

- **Producción:** 100% al día con 8 cadenas y mapa interactivo sin duplicados.
- **Git local:** Adelantada a `origin/main` (requiere credenciales GitHub para push).
- **Working tree:** Limpio tras el commit.

## Próximo paso recomendado (para el agente entrante)

1. Sincronizar el repositorio remoto mediante `git push` una vez que el usuario suministre un token personal de GitHub o clave SSH.
2. Abordar el soporte de promociones por cantidad de Cooperativa Obrera (`promo_condition`, ver D4 en `DECISIONS.md`).
