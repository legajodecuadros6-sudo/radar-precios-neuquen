# REGLAS DE TRABAJO — mecanismo de memoria compartida

*vigente desde 03-11-2026 · aplica a TODO agente/modelo que trabaje en este proyecto*

## Regla de cierre de sesión (checklist obligatorio)

**ANTES de cerrar la app o finalizar la sesión, debo preguntarme y responder:**

¿Actualicé `agent_memory/HANDOFF.md`?

- [ ] Checklist de cierre (todas exteriores a mano):
  1. `git status` → ¿hay archivos modificados sin comitear? Los rejisto en HANDOFF o los commiejo.
  2. `git log --oneline -5` → registro los commits hechos en esta sesión.
  3. ¿Actualizó el estado real? → reflejarlo en `CURRENT_STATE.md` y `TASKS.md` (hoy en progreso/pendiente/completado con evidencia).
  4. ¿Decisiones nuevas? → `DECISIONS.md`.
  5. ¿Aprendizajes útiles para el próximo? → `LEARNINGS.md` (solo hechos verificados con evidencia).
  6. **HANDOFF.md** → ¿refleja el estado real de AHORA? Si alguna advertencia venció (fechas, vencimientos, sincronización) o un "próximo paso" ya está hecho, reemplazarlo. Relevo debe contener: agente/fecha, objetivo en curso, trabajo realizado, archivos modificados, tests corridos y resultados, errores conocidos, próximos pasos, advertencias.
  7. Commit de la memoria si quedó pendiente.

*Si la sesión se interrumpe a mitad de algo, dar prioridad a actualizar HANDOFF con lo incompleto, NO dejarlo con estado viejo: un HANDOFF desactualizado es peor que ninguno.*

## Reglas de trabajo permanente

1. **Leer primero**: `agent_memory/CURRENT_STATE.md`, `TASKS.md`, `DECISIONS.md`, `HANDOFF.md` (y `LEARNINGS.md` si toca fuentes/datos).
2. **Prioridad de verdad**: código + tests + Git > memoria. Si el HANDOFF contradice el estado real, corregir el HANDOFF y registrar el hallazgo.
3. **No marcar completado sin verificación real** (test corrido, comando ejecutado, comprobación en producción).
4. **Nunca inventar ni data ni precios ni EAN.** Trazabilidad obligatoria (`is_verified` + `source_url` + fecha real).
5. **Mantener actualizadas** las 5 memorias al cambiar el estado real.
6. **Antes de publicar en producción**: pedir aprobación explícita del usuario.
7. Archivo del relevo antiguo a `history/` cuando el HANDOFF se reescribe sustancialmente.
