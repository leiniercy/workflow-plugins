# Progreso — cierre-y-telemetria: comando `/close` y telemetría de flujo

## Estado actual

Spec aprobada y plan de implementación escrito (6 tareas); no se ha tocado `core/` todavía.

## Historial

### 2026-09-20 11:46 — plan

- **Resultado:** `spec.md` completa con 13 criterios de aceptación, enfoque técnico y cuatro
  decisiones registradas. Diseño aprobado por el usuario en tres secciones (modelo de datos,
  contrato de `/close`, impacto en la tubería).
- **Notas:** La carpeta usa un slug porque el conector de ClickUp no alcanza el workspace
  (`Workspace not authorized` y `Resource not found` en tres endpoints distintos); renombrar a
  `tasks/<taskId>/` al crear la tarea. El esqueleto lo creó esta sesión, no `/start`: el repo
  del plugin nunca había usado su propio flujo y no existe rama `develop`, así que la rama
  `feat/cierre-y-telemetria` sale de `main`. **Llegada: inferida** — el trabajo de análisis
  empezó antes de este sello. Siguiente paso: revisión de la spec por el usuario y, tras su
  visto bueno, plan de implementación.

### 2026-09-20 11:56 — plan

- **Resultado:** spec aprobada por el usuario y `plan.md` escrito: 6 tareas con pasos de 2-5
  minutos, código literal en cada paso y ciclo TDD sobre `scripts/check-*.mjs` (este repo no
  tiene framework de tests: los checks SON los tests).
- **Notas:** La auto-revisión del plan destapó una contradicción propia y se corrigió: las
  restricciones globales prohíben aseverar prosa, y la Task 3 incluía dos `grep` sobre el
  texto del comando. Quedan solo las aserciones de frontmatter, que sí son contrato legible
  por máquina; el comportamiento redactado lo cubre el eval manual. Orden de las tareas por
  dependencia: contrato de datos → máquina de estados → comando → esqueleto idempotente →
  hook → versión. Nada commiteado todavía: el usuario no ha aprobado el commit del scaffold.
  Siguiente paso: elegir modo de ejecución (subagentes por tarea, o en línea).
