# Progreso — cierre-y-telemetria: comando `/close` y telemetría de flujo

## Estado actual

Implementación completa en `feat/cierre-y-telemetria` (7 commits, versión 0.20.0); pendiente
el eval manual de comportamiento y la decisión humana de PR.

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

### 2026-09-20 12:43 — implement

- **Resultado:** las 6 tareas del plan ejecutadas en 7 commits sobre `feat/cierre-y-telemetria`.
  `/close` creado y generado en ambos adaptadores; `/plan` e `/implement` crean el esqueleto;
  fase `complete` y campos de salida en la guía; `review → complete` es de `/close`; el hook
  sugiere el cierre; versión 0.20.0. Suite completa de CI en verde (7 checks, 259 aserciones
  de comportamiento).
- **Notas:** Dos huecos del plan detectados al ejecutar y corregidos sobre la marcha. (1) El
  punto 9 de `registro-progreso` decía «Creación inicial (solo /start)», que la Task 4 dejaba
  falso; reescrito. (2) La Fase 1 de `/plan` mandaba «ejecuta /start primero» cuando no había
  carpetas en `tasks/`; ahora pide el taskId, que es lo único que le falta. Tercera desviación
  deliberada: «Salida por abandono» se colocó al final de `estados-tareas.md` y no tras la
  Regla de oro, porque menciona a `/close` y su dueño se define en la sección intermedia.
  **Verificación pendiente:** A1-A5, A10 y A12 están comprobados mecánicamente; A6-A9 y A11
  son contratos redactados en prosa y solo están *implementados*, no verificados como
  comportamiento. Eso lo decide el eval manual de `docs/eval-comportamiento.md`, con atención
  al par confundible nuevo `/review` vs `/close`. Siguiente paso: cerrar la rama (PR o merge).
