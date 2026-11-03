# Carpeta de historial inmutable de relevos

Aquí se archivan de manera **permanente e inmutable** los `HANDOFF.md` anteriores antes de que un nuevo agente reemplace el relevo activo.

- El **HANDOFF activo** siempre está únicamente en `agent_memory/HANDOFF.md` (raíz de la carpeta de memoria).
- **Formato obligatorio de archivo histórico:** `AAAA-MM-DD_HHMM_AGENTE_MODELO.md`
  - *Ejemplo:* `2026-11-03_1845_GLM_5.3.md`, `2026-11-03_0930_Antigravity_Gemini.md`
- **Reglas del historial:**
  - Nunca borrar un handoff histórico.
  - Nunca sobrescribir un handoff histórico.
  - Nunca reutilizar el mismo archivo para un relevo diferente.
  - Si hay colisión de nombre, agregar sufijo único (`_bis`, `_02`).
  - Los agentes entrantes **no** deben leer automáticamente esta carpeta al iniciar para no consumir contexto/tokens innecesariamente; solo se consulta puntualmente por causas justificadas (regresiones, auditorías, discrepancias).

