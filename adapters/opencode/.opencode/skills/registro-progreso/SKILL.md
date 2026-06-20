---
name: registro-progreso
description: Procedimiento exacto para crear y actualizar tasks/<taskId>/progress.md. Úsala SIEMPRE que vayas a registrar avance de una tarea, crear su fichero de estado inicial o actualizar su estado actual. Garantiza que cualquier agente en sesión limpia recupere el contexto.
---
# Registro de progreso — procedimiento de escritura

Cuando registres avance, **escribes para tu yo futuro en sesión limpia**: un agente sin nada
de tu contexto que, leyendo `progress.md`, debe saber en menos de un minuto dónde quedó el
trabajo y cómo retomarlo. Ese lector es tu criterio para todo lo que escribas aquí.

## Estructura del fichero

```markdown
# Progreso — <taskId>: <título de la tarea>

## Estado actual

<UNA línea que resume dónde está el trabajo ahora mismo.>

## Historial

### YYYY-MM-DD HH:MM — <fase>

- **Resultado:** <qué se logró o decidió>
- **Notas:** <contexto útil para retomar: decisiones, bloqueos, siguiente paso previsto>
```

## Proceso

1. **"Estado actual" es sobrescribible.** Cada vez que añadas una entrada al historial,
   reemplaza la línea de Estado actual para que refleje la situación nueva.
2. **"Historial" es append-only e inmutable hacia atrás.** Las entradas nuevas van AL FINAL.
   Si una entrada pasada era incorrecta, NO la edites: añade una nueva que lo aclare.
3. **Fecha real del sistema** en formato `YYYY-MM-DD HH:MM`. No inventes timestamps.
4. **`<fase>` ∈ {`start`, `plan`, `implement`, `review`}.** No uses otros valores.
5. **Inputs de una entrada:** `taskId` y ruta (`tasks/<taskId>/progress.md`), `fase`,
   `resultado` (frase concreta y verificable), `notas` (opcional pero recomendado) y la nueva
   línea de Estado actual.
6. **Creación inicial (solo /start):** si el fichero no existe, créalo completo con Estado
   actual "Rama creada, pendiente de planificación" y la primera entrada de fase `start`. Si
   YA existe, jamás lo recrees: añade entradas según el proceso.

## Anti-patrones (nómbralos para no caer en ellos)

- **Resultado vago** — "se avanzó", "hechos algunos cambios". Un resultado es concreto y
  verificable: "criterio 3 completado, suite en verde".
- **Estado actual fantasma** — dejar la línea de Estado actual reflejando una situación ya
  superada. Se sobrescribe SIEMPRE que añades historial.
- **Reescritura de la historia** — editar, reordenar o borrar entradas pasadas. Rompe la
  trazabilidad; los errores se corrigen hacia delante.
- **Entrada sin salida** — registrar lo hecho pero no el siguiente paso ni el porqué de una
  decisión. Tu yo futuro se queda sin hilo del que tirar.
- **Recrear un fichero existente** — destruye el historial acumulado.

## Autocrítica antes de cerrar

Relee la entrada que acabas de escribir y pregúntate: **¿un agente sin mi contexto retomaría
la tarea solo con esto?** Si la respuesta es no, falta el siguiente paso, el porqué de una
decisión, o el resultado es demasiado vago. Arréglalo antes de continuar.
