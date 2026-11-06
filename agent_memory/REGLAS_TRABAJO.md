# REGLAS DE TRABAJO — mecanismo de memoria compartida

*vigente desde 03-11-2026 · aplica a TODO agente/modelo que trabaje en este proyecto*

---

## 1. HANDOFF obligatorio al finalizar cada trabajo

Todo agente/modelo que realice trabajo sobre el proyecto **DEBE** actualizar `agent_memory/HANDOFF.md` antes de finalizar su sesión o entregar el control a otro agente.

Esto es obligatorio aunque:
- La tarea haya sido completada;
- La tarea haya quedado parcialmente completada;
- No se haya podido resolver;
- Se hayan encontrado errores o bloqueos;
- Solamente se haya realizado una auditoría o investigación relevante.

El HANDOFF debe reflejar siempre el estado real y exacto en el que queda el proyecto. **No esperar a que el usuario solicite manualmente la creación o actualización del HANDOFF.**

---

## 2. HANDOFF preventivo ante límite de contexto, tokens o interrupción

Si el agente detecta que está acercándose a su límite de contexto, tokens, tiempo de ejecución o cualquier otra restricción que pueda impedir terminar el trabajo, debe **PRIORITARIAMENTE**:

1. Detener nuevas tareas no esenciales.
2. Dejar el proyecto en un estado seguro.
3. Actualizar `CURRENT_STATE.md` y `TASKS.md` si corresponde.
4. Crear/actualizar inmediatamente `HANDOFF.md`.
5. Registrar exactamente hasta qué punto llegó.
6. Registrar qué falta hacer.
7. Registrar archivos modificados.
8. Registrar pruebas ejecutadas y sus resultados.
9. Registrar errores, advertencias o trabajo sin verificar.
10. Indicar el próximo paso concreto para que otro agente pueda continuar sin fricción.

> **Principio clave:** Es preferible dejar un HANDOFF incompleto pero fiel y actualizado antes que perder el estado del trabajo por agotamiento de contexto/tokens.

---

## 3. Historial obligatorio e inmutable (`agent_memory/history/`)

Antes de reemplazar un `HANDOFF.md` existente por un nuevo relevo, se debe conservar el relevo anterior dentro de:

```
agent_memory/history/
```

Utilizar, cuando sea posible, nombres con el formato cronológico:

```
AAAA-MM-DD_HHMM_AGENTE_MODELO.md
```

*Ejemplo:* `2026-11-03_1845_GLM_5.3.md`, `2026-11-03_0930_Antigravity_Gemini.md`

### Reglas estrictas del historial:
- **Nunca borrar** un handoff histórico.
- **Nunca sobrescribir** un handoff histórico existente.
- **Nunca reutilizar** el mismo archivo histórico para un relevo diferente.
- Si existe conflicto de nombre, agregar un sufijo único (ej: `_bis`, `_02`).
- El historial debe permitir reconstruir cronológicamente toda la evolución de los relevos del proyecto.

---

## 4. `HANDOFF.md` siempre representa el último relevo

`agent_memory/HANDOFF.md` debe contener **únicamente el relevo ACTUAL / MÁS RECIENTE**.

Los relevos anteriores pertenecen exclusivamente a `agent_memory/history/`.

De esta manera:
- **`HANDOFF.md`** = dónde quedó el proyecto ahora mismo.
- **`history/`** = cómo fue evolucionando cronológicamente y quién realizó cada relevo.

---

## 5. Orden de lectura al iniciar (No leer todo el historial)

Al tomar el relevo, el nuevo agente **NO debe leer automáticamente todos los archivos de `agent_memory/history/`**.

Debe comenzar leyendo estrictamente en este orden:
1. Las **REGLAS DE TRABAJO** permanentes (`agent_memory/REGLAS_TRABAJO.md`).
2. `agent_memory/HANDOFF.md` (último estado).
3. `agent_memory/CURRENT_STATE.md` (qué funciona, qué está degradado).
4. `agent_memory/TASKS.md` (pendientes, en progreso, completadas).
5. `agent_memory/DECISIONS.md` (decisiones tomadas y motivos).
6. `agent_memory/LEARNINGS.md` cuando sea relevante (APIs, fuentes, gotchas técnicos).

`history/` se considera archivo histórico y **solamente debe consultarse cuando exista una razón concreta**, por ejemplo:
- Contradicción flagrante entre memoria y código;
- Necesidad de rastrear el origen histórico de una decisión;
- Investigación de una regresión técnica;
- Auditoría profunda;
- Pérdida de información en el último HANDOFF;
- Solicitud explícita del usuario.

Esto evita saturar y desperdiciar contexto/tokens leyendo relevos antiguos innecesariamente.

---

## 6. Identificación obligatoria del agente en cada relevo

Cada nuevo HANDOFF debe registrar de forma explícita y completa:
- **Agente / herramienta utilizada** (ej: `Agente: Antigravity`).
- **Modelo utilizado** (ej: `Modelo: Gemini ...`). *No asumir el modelo si no puede determinarse con seguridad; indicarlo con precisión.*
- **Fecha y hora** (con zona horaria / UTC).
- **Objetivo recibido** del usuario o del relevo previo.
- **Trabajo realizado** en la sesión.
- **Archivos modificados**.
- **Commits realizados**, si existen (hash y mensaje).
- **Pruebas ejecutadas** (comandos exactos).
- **Resultado de las pruebas** (OK / fallos / cobertura).
- **Errores conocidos** o bloqueos encontrados.
- **Trabajo pendiente**.
- **Próximo paso recomendado** para el agente entrante.
- **Advertencias relevantes** (riesgos de frescura, credenciales, límites).

---

## 7. Prioridad de verdad y reglas permanentes

1. **Prioridad de verdad:**
   $$\text{Código} + \text{pruebas} + \text{Git} > \text{memoria}$$
   El HANDOFF sirve para transferir contexto operativo, pero nunca sustituye la verificación del estado real del repositorio. Si el nuevo agente encuentra una contradicción, debe verificarla contra el código real y corregir la memoria correspondiente registrando el hallazgo.
2. **Verificación real obligatoria:** No marcar ninguna tarea como completada `[x]` sin comprobación empírica (test ejecutado, comando exitoso, o verificación directa).
3. **Trazabilidad e integridad:** Nunca inventar ni datos, ni precios, ni códigos EAN. Trazabilidad obligatoria (`is_verified` + `source_url` HTTPS oficial + fecha real).
4. **Sincronización de memoria:** Mantener actualizados los 5 archivos de memoria al cambiar el estado real del proyecto.
5. **Aprobación de producción:** Antes de publicar en producción (deploy), pedir aprobación explícita al usuario.

---

## 8. Checklist de cierre de sesión

Antes de cerrar la aplicación o entregar el control al siguiente agente, ejecutar este checklist:

- [ ] 1. `git status` → ¿Hay archivos modificados sin commitear? Registrarlos en HANDOFF o commitearlos si corresponde.
- [ ] 2. `git log --oneline -5` → Registrar los commits hechos en esta sesión.
- [ ] 3. ¿Actualicé el estado real? → Reflejarlo en `CURRENT_STATE.md` y `TASKS.md` (con evidencia verificada).
- [ ] 4. ¿Decisiones nuevas tomadas? → Registrar en `DECISIONS.md`.
- [ ] 5. ¿Aprendizajes técnicos útiles comprobados? → Registrar en `LEARNINGS.md`.
- [ ] 6. **Historial:** ¿Archivé el `HANDOFF.md` previo en `history/AAAA-MM-DD_HHMM_AGENTE_MODELO.md` antes de sobrescribirlo?
- [ ] 7. **HANDOFF.md:** ¿Contiene la identificación completa del agente, modelo, trabajo hecho, tests, errores, pendientes y próximo paso?
- [ ] 8. Commit de la memoria si quedó pendiente.


## 9. Estados y coordinación al tomar un relevo

Leer estas reglas y usar el último HANDOFF como punto de partida. Antes de editar,
revisar TASKS, `git status --short --branch`, los diffs del índice y del directorio
de trabajo y los archivos afectados. Revisar los worktrees y consultar el registro
de responsables activos. Si hay otro agente trabajando en los mismos archivos o
no se puede aclarar una superposición, coordinar antes de tocarlos y registrar el
bloqueo por un canal disponible. Los diffs limpios no prueban ausencia de concurrencia.

Para toda tarea iniciada, registrar en TASKS un ID estable, descripción, responsable
(agente y modelo), fecha y hora con zona, archivos reservados y exactamente un estado:

- `EN_PROGRESO`: trabajo iniciado. Registrar antes de editar los archivos de la tarea.
- `INTERRUMPIDO`: se detuvo antes de terminar y puede retomarse. Ante el límite
  de tokens o contexto, guardar inmediatamente un relevo parcial en este estado.
- `COMPLETADO`: se cumplieron los criterios de aceptación y se verificaron con
  evidencia registrada. Si faltó una prueba necesaria, documentar la limitación
  y dejar el estado abierto que corresponda.
- `BLOQUEADO`: un impedimento concreto impide avanzar. Registrar la causa y
  la condición o acción exacta que permitiría continuar.

Las casillas anteriores siguen siendo el registro del backlog y de su evidencia.
Un pendiente sin iniciar todavía no tiene ejecución asignada. Al tocar una
tarea existente, incorporar su ID y estado explícito conservando sus antecedentes.

Si el agente desaparece y queda `EN_PROGRESO`, la tarea queda pendiente de
verificación. La falta de respuesta no acredita éxito. Una vez descartada una
edición simultánea, reconstruir el estado con Git, los archivos y las pruebas
disponibles, registrar `INTERRUMPIDO` y documentar el relevo. Para reanudar, el
entrante registra su titularidad y pasa a `EN_PROGRESO`.

## 10. Registro de salida

Aplicar los campos de la sección 6 y agregar ID y descripción, estado literal,
archivos creados o modificados, rama y HEAD, cambios preparados, sin preparar
y sin seguimiento, y próxima acción exacta. Distinguir las pruebas realizadas
de las omitidas y explicar las limitaciones. Incluir pendientes vigentes
necesarios para continuar aunque provengan del relevo anterior.

Al cerrar, añadir una entrada al historial cronológico existente en `history/`:
archivar íntegramente el HANDOFF previo si aún no está archivado y guardar una
copia íntegra del nuevo HANDOFF bajo un nombre único. Si el relevo previo ya
está archivado con el mismo contenido, conservar esa entrada. Escribir el último
relevo en HANDOFF.md. Consultar el historial solamente para investigar antecedentes.

## 11. Protección de precios históricos

Ninguna actualización puede eliminar silenciosamente precios históricos, incluidos
los de Makro. Antes de cambiar un actualizador, comprobar dónde y cómo se almacenan
las observaciones, qué respaldo verificable existe y cómo se recupera. Al
actualizar un precio, preservar la observación anterior con su fecha y registrar
la nueva con su fecha y trazabilidad. Verificar que el historial sobreviva a
la actualización, incluso si falla una fuente. Las migraciones destructivas y
los cambios en datos de producción requieren autorización explícita.

## 12. Preparación para automatización

El registro, la coordinación y la verificación son manuales. Los identificadores,
estados literales y campos de relevo permiten automatizar luego la detección de
pendientes e interrupciones, la coordinación de archivos, la verificación de
evidencia, la selección de agente, la reanudación y el registro del relevo.
Todavía no hay hooks, scripts ni orquestador para esas funciones.
