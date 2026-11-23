# HANDOFF — SYNC-004: reactivación total de precios y resolución de límite 100MB Git

- Agente/herramienta: Antigravity; modelo: Gemini.
- Fecha/hora: 2026-11-23T00:10:00-03:00.
- Objetivo: Diagnosticar fallo de GitHub Actions, destrabar el guardado de precios y reactivar los precios de todos los supermercados en Neuquén.
- Estado: COMPLETADO.
- Rama: main.

## Trabajo y evidencia
1. **Diagnóstico del fallo de GitHub Actions:**
   - La API de GitHub confirmó que los runs del 13 al 22 de noviembre fallaban en el paso `Guardar datos e historial y estado de fuentes` (`git push`).
   - Causa: `src/data/price-history.json` alcanzó 101,8 MB el 12-11 (113.921 filas) y el 13-11 superó los 100 MiB (104.857.600 bytes), disparando el bloqueo pre-receive de GitHub (`GH001: Large files detected`).
2. **Solución de compresión transparente:**
   - Modificados `scripts/scrapers/sync_verified_prices.py` y `scripts/build-history.mjs` para leer/escribir `src/data/price-history.json.gz`.
   - Tamaño reducido de 102 MB a 3,9 MB (reducción de 96,2%), permitiendo que Git y GitHub Actions acepten el archivo sin inconvenientes.
   - Retirado `src/data/price-history.json` de Git e incorporado en `.gitignore`.
   - Actualizado `.github/workflows/sync-prices.yml` para hacer `git add src/data/live-prices.json src/data/price-history.json.gz`.
3. **Sincronización completa de precios (Neuquén, 22/23-11-2026):**
   - Recolectados 11.412 precios frescos de 8 cadenas activas:
     - Coto: 7.194
     - Yaguar: 1.663
     - Cooperativa Obrera: 795
     - La Anónima: 646
     - Carrefour: 489
     - Jumbo: 339
     - ChangoMás: 194
     - Vital: 92
   - Catálogo activo (`src/data/live-prices.json`): 12.530 productos y 13.511 cotizaciones.
   - Histórico acumulado (`src/data/price-history.json.gz`): 125.333 cotizaciones conservadas sin pérdida (cero pérdidas respecto a las 113.921 del 12-11).
   - Precios activos en la app (`priceIsUsable`): 11.412 cotizaciones vigentes hoy.
4. **Pruebas y compilación:**
   - Python: 54 tests unitarios OK (`python3 -m unittest discover -s tests -p 'test_*.py'`).
   - Node: 35 tests PASS (`node --test tests/*.test.cjs`).
   - Build: `npm run build` exitoso, generando bundle cliente `index-BAloxFBX.js` y `dist/data/live-prices.json` con paridad idéntica.

## Limitaciones
- Makro: Su sitio oficial mantiene la lista del 31 de octubre (más de 7 días); conserva histórico según D11/D20.
- Vea y Diarco: Permanecen excluidos conforme a D3.

## Próximo paso
- Realizar commit y push a GitHub (`origin main`) para que Vercel despliegue la versión actualizada y GitHub Actions continúe las actualizaciones automáticas diarias con éxito.
