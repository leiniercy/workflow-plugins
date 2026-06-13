# Registro de progreso — procedimiento de escritura

`progress.md` es el diario de continuidad de la tarea. Su lector objetivo es un agente en
sesión limpia que necesita saber, en menos de un minuto, dónde quedó el trabajo.

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

## Reglas de escritura

1. **"Estado actual" es sobrescribible.** Cada vez que añadas una entrada al historial,
   reemplaza la línea de Estado actual para que refleje la situación nueva. Nunca dejes un
   estado actual desactualizado.
2. **"Historial" es append-only e inmutable hacia atrás.** Las entradas nuevas se añaden AL
   FINAL de la sección. PROHIBIDO editar, reordenar o borrar entradas anteriores, aunque
   contengan errores: si una entrada pasada era incorrecta, se corrige añadiendo una entrada
   nueva que lo aclare.
3. **Fecha real.** Usa la fecha y hora actuales del sistema en formato `YYYY-MM-DD HH:MM`.
   No inventes timestamps.
4. **Valores de `<fase>`:** `start`, `plan`, `implement`, `review`. No uses otros.

## Inputs requeridos para añadir una entrada

- `taskId` y ruta del fichero (`tasks/<taskId>/progress.md`).
- `fase` (uno de los cuatro valores válidos).
- `resultado` (una frase concreta y verificable: "criterio 3 completado, suite en verde",
  no "se avanzó").
- `notas` (opcional pero recomendado: lo que tu yo futuro necesitará saber).
- Nueva línea de `Estado actual`.

## Creación inicial (solo /start)

Si el fichero no existe, créalo con la estructura completa, el Estado actual
"Rama creada, pendiente de planificación" y la primera entrada del historial con fase
`start`. Si el fichero YA existe, jamás lo recrees: añade entradas según las reglas.
