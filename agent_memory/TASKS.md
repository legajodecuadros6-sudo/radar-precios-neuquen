# Tareas — estado auditado y actualizado

- **Última actualización:** 2026-11-05T21:25:00-03:00
- **Responsable:** Antigravity / Gemini

---

## Ejecuciones registradas

- **MEM-001** · COMPLETADO · ChatGPTWork / Codex · 2026-11-05T20:01:43-03:00.
  - Protocolo, reglas e historial unificados.
- **MEM-002** · COMPLETADO · Codex / GPT-6 · 2026-11-05T20:35:12-03:00.
  - Auditoría integral de los 5 documentos contra código/tests/Git/HTTP. Restricción respetada: solo memoria.
- **SYNC-002** · COMPLETADO · Antigravity / Gemini · 2026-11-05T21:25:00-03:00.
  - **Reconciliación histórica:** Merge en commit `013b8ec` uniendo histórico local (25.491) y remoto (7.083), alcanzando **40.725 cotizaciones conservadas sin pérdidas** tras la nueva corrida.
  - **Calibración regional de datos:**
    - Coto: solo precio de lista regional sucursal 185; descartados descuentos globales sin condiciones (D4).
    - Yaguar: `price_validation: pending`; excluido de canasta y comparador. Lay's 330g verificado a $9.103 en API de Neuquén, coincidiendo con góndola física.
    - La Anónima: validación de stock positivo.
    - Jumbo: validación estricta de cotización local.
  - **Pruebas:** 44 Python OK, 35 Node PASS, build exitoso.
  - **Despliegue Producción:** Desplegado en Vercel (`https://radar-precios-neuquen.vercel.app`) y verificado HTTP 200 en bundle `index-C-rP_Szo.js` y `/data/live-prices.json`.

- **GIT-SYNC-001** · COMPLETADO · Antigravity / Gemini · 2026-11-05T21:35:00-03:00.
  - Sincronización completa con GitHub ejecutada con éxito (`git push origin main`, commit `3dfd86c`).
  - GitHub y Vercel en paridad total con el repositorio local.
- **DATA-YAGUAR-NEUQUEN** · COMPLETADO · Antigravity / Gemini · 2026-11-05T21:59:00-03:00.
  - Activadas 1.777 cotizaciones verificadas de Yaguar Neuquén (`https://yaguar.com.ar/neuquen/producto/...`).
  - Validación de origen regional en `dataQuality.ts` y notas transparentes de compra mínima en UI.
  - Desplegado y verificado en producción Vercel (`index-SvRbYVC9.js`).
- **FEAT-CARREFOUR-NEUQUEN** · COMPLETADO · Antigravity / Gemini · 2026-11-05T22:30:00-03:00.
  - Integración completa de Carrefour como 9ª cadena activa en Radar de Precios.
  - Incorporadas sucursales físicas Carrefour Centro (Olascoaga 350) y Carrefour Antártida (Antártida Arg. 3600) en el mapa interactivo y filtros con logos oficiales.
  - Colector VTEX con simulación regional estricta (CP 8300) y filtrado de entrega local.
  - 499 precios verificados en vivo; catálogo ampliado a 11.531 productos y 12.257 cotizaciones.
  - Suite de pruebas: 50 Python OK, 35 Node PASS, build exitoso (`index-DI9aTYXZ.js`).
  - Desplegado y verificado en producción Vercel (`https://radar-precios-neuquen.vercel.app`).

---

## Pendientes

- [ ] **P1 DATA-ANONIMA:** Acreditar persistencia y alcance regional de cookies y preflight en La Anónima.
- [ ] **P1 DATA-JUMBO:** Profundizar validación de logística por ítem y cobertura geográfica.
- [ ] **P2 SUPABASE:** Definir arquitectura futura: reactivar sincronización bidireccional o retirar código residual de lectura.
- [ ] **P2 UI-FRESH:** Homogeneizar texto de vencimiento en UI (72h vs 168h de Makro).
