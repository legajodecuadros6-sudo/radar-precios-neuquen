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

