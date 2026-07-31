---
name: estados-tareas
description: "Úsala cuando necesites interpretar en qué punto del ciclo está una tarea de ClickUp, decidir qué comando del flujo sugerir al usuario, o validar una transición de estado antes de proponerla."
---
# Estados de tareas (ClickUp) — fuente de verdad compartida

Cuando interpretes el estado de una tarea, **traduces el estado de ClickUp a la acción correcta
del flujo** — sin inventar mapeos (ver Regla de oro). Los nombres de estado pueden variar en
mayúsculas, espacios o idioma: aplica **matching tolerante** (case-insensitive, ignora
espacios/guiones, acepta sinónimos listados).

## Tabla estado → comando sugerido

| Estado en ClickUp | Sinónimos aceptados | Comando sugerido | Por qué |
|---|---|---|---|
| `to do` | todo, por hacer, pendiente, backlog, open | `/start` | La tarea no tiene rama ni carpeta de estado: hay que iniciarla. |
| `in progress` | en progreso, en curso, doing, wip | `/plan` o `/implement` | Decide leyendo `tasks/<taskId>/`: si spec.md tiene placeholders `_pendiente de /plan_` → `/plan`; si está completo → `/implement` (que detectará trabajo nuevo o continuación). |
| `review` | in review, en revisión, code review, qa | `/review` | Hay PR abierta o trabajo terminado: toca diagnóstico. Si la revisión dejó hallazgos por corregir → `/implement` (modo corrección). |
| `complete` | completado, done, closed, cerrado, hecho | (ninguno) | La tarea está cerrada. Si el usuario quiere reabrir trabajo, debe hacerlo en ClickUp primero. |

## Regla de oro

**Si el estado de la tarea NO está en la tabla ni coincide con ningún sinónimo: NO
inventes un mapeo. Pregunta al usuario** qué significa ese estado en su flujo y qué quiere
hacer. Los espacios de ClickUp admiten estados personalizados y adivinar produce
transiciones incorrectas.

## Transiciones permitidas y su propietario

Cada transición tiene UN único comando responsable. Ningún otro comando la ejecuta:

- `to do → in progress`: **solo /start**, tras aprobación del usuario.
- `in progress → review`: **solo /implement**, al crear la PR, tras aprobación del usuario.
- `review → complete`: **manual** (la hace el humano o el proceso de merge del equipo).
  Ningún comando del paquete cierra tareas.
- Transiciones hacia atrás (ej. `review → in progress`): siempre manuales en ClickUp; los
  comandos las detectan al leer el estado pero nunca las ejecutan.
