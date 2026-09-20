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
| `review` | in review, en revisión, code review, qa | `/review`, luego `/close` | Hay PR abierta o trabajo terminado: primero el diagnóstico. Si la revisión dejó hallazgos por corregir → `/implement` (modo corrección); si está limpia → `/close` para validar y cerrar. |
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
- `review → complete`: **solo /close**, tras aprobación explícita del usuario y con el gate de
  cumplimiento en verde. El comando propone la transición; nunca la ejecuta por su cuenta.
- Transiciones hacia atrás (ej. `review → in progress`): siempre manuales en ClickUp; los
  comandos las detectan al leer el estado pero nunca las ejecutan.

## Salida por abandono

Una tarea que se descarta a mitad también **sale** del flujo, y registrarlo importa: si no se
sella, cuenta como trabajo en curso indefinidamente.

`/close` la acepta con `**Salida:** abandonada — <motivo>` en `progress.md`. El sello local se
escribe siempre, sepa o no el agente a qué estado moverla en ClickUp.

Para el estado de destino manda la **Regla de oro**: muchos espacios usan `cancelled`,
`archived` o un estado propio, y ninguno está en la tabla de arriba. **No inventes el mapeo —
pregunta al usuario** a qué estado quiere moverla.
