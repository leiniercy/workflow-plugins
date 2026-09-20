# Registro de progreso — procedimiento de escritura

Cuando registres avance, **escribes para tu yo futuro en sesión limpia**: un agente sin nada
de tu contexto que, leyendo `progress.md`, debe saber en menos de un minuto dónde quedó el
trabajo y cómo retomarlo. Ese lector es tu criterio para todo lo que escribas aquí.

## Estructura del fichero

```markdown
# Progreso — <taskId>: <título de la tarea>

## Estado actual

<UNA línea que resume dónde está el trabajo ahora mismo.>

<!-- La sección `## Bloqueo` SOLO existe mientras el trabajo está parado. Si no lo está,
     no la copies: ni la sección ni este comentario. -->
## Bloqueo

<UNA línea: qué impide avanzar y qué hace falta para desbloquearlo.
La sección entera se borra cuando se resuelve.>

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
3. **`Bloqueo` es sobrescribible y opcional.** Existe solo mientras el trabajo está
   parado esperando algo que no depende de ti: una decisión del usuario, un acceso, una
   respuesta externa, un test que no sabes arreglar. Cuando se resuelve, **borra la
   sección entera** y anota en el historial cómo se desbloqueó. Si no hay bloqueo, la
   sección no está.
4. **Un bloqueo se escribe en los DOS sitios.** La sección `## Bloqueo` (para que tu yo
   futuro lo vea al arrancar) y una entrada de historial que diga qué lo causó (para que
   dentro de un mes se sepa por qué se perdieron tres días). Lo primero es un aviso; lo
   segundo, la trazabilidad.
5. **Fecha real del sistema** en formato `YYYY-MM-DD HH:MM`. No inventes timestamps.
6. **`<fase>` ∈ {`start`, `plan`, `implement`, `review`, `complete`}.** No uses otros valores.
   `complete` la escribe únicamente `/close`, y es la última entrada de la tarea: marca su
   salida del flujo.
7. **Inputs de una entrada:** `taskId` y ruta (`tasks/<taskId>/progress.md`), `fase`,
   `resultado` (frase concreta y verificable), `notas` (opcional pero recomendado) y la nueva
   línea de Estado actual.
8. **Una decisión no se borra: se supera.** Cuando una decisión ya registrada deja de valer
   —en `progress.md` o en «Decisiones tomadas» de `spec.md`—, no la reescribas ni la quites:
   añade la nueva **diciendo a cuál sustituye y por qué cambió**. Lo que se pierde al borrarla
   no es el texto viejo, es la razón por la que se tomó, y sin esa razón el siguiente vuelve a
   proponer lo mismo dentro de tres meses. La historia de por qué se descartó algo vale tanto
   como la decisión vigente.
9. **Creación inicial:** si el fichero no existe, créalo completo con su Estado actual y una
   primera entrada. Lo hace el comando que llegue primero —`/start` normalmente, pero también
   `/plan` o `/implement` cuando se entra al flujo con la tarea ya definida— y cada uno pone
   su propia fase. Si YA existe, jamás lo recrees: añade entradas según el proceso.

10. **La entrada `complete` lleva `**Salida:**`.** Dos valores posibles: `completada`, o
    `abandonada — <motivo en una línea>`. El motivo no es adorno: una tarea que se abandona
    sin registrar su salida queda como trabajo en curso eterno y falsea cualquier medida
    posterior del flujo. Se etiqueta para poder filtrarla, no se borra.

11. **Una llegada que no consta se marca, no se inventa.** Si el esqueleto lo crea `/plan` o
    `/implement` porque no hubo `/start`, nadie sabe cuándo empezó el trabajo de verdad.
    Escribir la hora actual como si fuera la de inicio es inventar un dato. La entrada lo
    declara con un campo `**Llegada:** inferida — <explicación>`, que vale como cota inferior
    y se puede descartar después.

## Anti-patrones (nómbralos para no caer en ellos)

- **Resultado vago** — "se avanzó", "hechos algunos cambios". Un resultado es concreto y
  verificable: "criterio 3 completado, suite en verde".
- **Estado actual fantasma** — dejar la línea de Estado actual reflejando una situación ya
  superada. Se sobrescribe SIEMPRE que añades historial.
- **Reescritura de la historia** — editar, reordenar o borrar entradas pasadas. Rompe la
  trazabilidad; los errores se corrigen hacia delante.
- **Entrada sin salida** — registrar lo hecho pero no el siguiente paso ni el porqué de una
  decisión. Tu yo futuro se queda sin hilo del que tirar.
- **Bloqueo implícito** — dejar el bloqueo solo en «Notas» del historial. El hook de
  `SessionStart` no lee el historial: una sesión limpia arrancará sugiriendo
  `/implement` sin saber que el trabajo está parado, y el agente empujará contra una
  pared que tú ya conocías. Si bloquea, va en `## Bloqueo`.
- **Bloqueo fantasma** — dejar la sección puesta después de resolverlo. Se reinyecta en
  cada arranque, deja de significar nada y acabas leyéndola como ruido.
- **Recrear un fichero existente** — destruye el historial acumulado.
- **Reescribir una decisión que cambió** — deja la vieja y añade la nueva diciendo a cuál
  sustituye. Borrarla borra el porqué, y el porqué es lo que evita repetir el error.
- **Tarea abandonada sin cerrar** — dejarla sin entrada `complete` porque "ya no se hace". Sin
  sello de salida sigue contando como trabajo en curso para siempre.
- **Llegada inventada** — estampar la hora de creación del esqueleto como si fuera la de inicio
  cuando no hubo `/start`. Es un dato no comprobado escrito como si constara: márcalo inferido.
- **Entrada `complete` sin motivo de salida** — "cerrada" a secas no distingue una tarea
  terminada de una descartada, y son cosas distintas al mirar atrás.

## Autocrítica antes de cerrar

Relee la entrada que acabas de escribir y pregúntate: **¿un agente sin mi contexto retomaría
la tarea solo con esto?** Si la respuesta es no, falta el siguiente paso, el porqué de una
decisión, o el resultado es demasiado vago. Arréglalo antes de continuar.

Y una segunda, que se responde mirando el fichero entero y no la entrada: **si el trabajo
está parado, ¿se ve al abrirlo?** Un bloqueo que solo consta en el historial no frena a
nadie.
