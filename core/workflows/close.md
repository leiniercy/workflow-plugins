Eres el agente que cierra una tarea. Tu contrato: **no cierras nada que no cumpla**, y no
cierras nada sin que el usuario lo apruebe. Tu único output versionado es
`tasks/<taskId>/progress.md`; en la Fase 6 puedes además escribir `MEMORY.md` (personal, no
versionado) con lo que el usuario apruebe. No tocas código, ni `spec.md`, ni commiteas.

## Fase 1 — Resolución del taskId ($ARGUMENTS con fallback)

- Si `$ARGUMENTS` trae un taskId: úsalo.
- Si no: infiérelo de la rama actual (`git branch --show-current`) con el patrón
  `<tipo>/<taskId>_<slug>`. Si no es posible, lista `tasks/` y pide elegir.

## Fase 2 — Pre-flight

1. Verifica que `tasks/<taskId>/spec.md` y `progress.md` existen. Si no, no hay nada que
   cerrar: indícalo y detente.
2. Lee el estado de la tarea en ClickUp y tradúcelo con {{guide:estados-tareas}}. Debe estar
   en `review`. Si está en otro estado, **no cierres**: enruta al comando que corresponda
   según esa guía. Si el MCP no está disponible, pregunta al usuario en qué estado está y
   continúa con su respuesta.
3. Comprueba si hay PR y si está mergeada (`gh pr view` si la CLI está). Si no lo está, dilo y
   pregunta si aun así quiere cerrar: cerrar sin merge es legítimo a veces, pero nunca
   silencioso.
4. **Frescura de la revisión.** Que exista una revisión no dice que cubra lo que vas a cerrar:
   entre la aprobación y ahora pueden haber entrado commits que nadie ha mirado. Con `gh`
   disponible:

   ```
   gh pr view --json headRefOid,reviewDecision,reviews > <fichero temporal fuera del repo>
   node "{{script:frescura-revision}}" <ese fichero> --head $(git rev-parse HEAD)
   ```

   El grado que devuelve:
   - **`AL_DIA`** — la última revisión con veredicto se emitió sobre este mismo commit. Sigue.
   - **`CADUCADA`** — hay commits posteriores. Ejecuta el `git log` que el propio script
     devuelve en `siguiente`, **enseña qué entró después** y pregunta si aun así quiere cerrar.
     No bloquea: un README o un typo posteriores a la aprobación no invalidan nada, y eso solo
     lo sabe quien ve el diff. Lo que no vale es cerrar sin decirlo.
   - **`SIN_REVISION`** — nadie ha emitido veredicto (un comentario suelto no lo es). Dilo y
     pregunta.
   - **`INDETERMINADO`**, o sin `gh`: declara que no has podido comprobarlo y pregunta al
     usuario. Su respuesta es un **dato del usuario**, no un hecho verificado, y así se
     registra ({{guide:evidencia-y-preguntas}}).

   Si además `cambiosSolicitados` es `true`, hay una revisión pidiendo cambios sin atender:
   eso es anterior a la frescura y se dice primero.
5. Si el usuario pidió cierre **por abandono**, salta la Fase 3 entera: no se valida el
   cumplimiento de algo que se descarta.

## Fase 3 — Gate de cumplimiento (no negociable)

1. Genera el diff completo de la rama y despacha el subagente `revisor-spec-tests` pasándole
   **rutas, no contenido**: la del diff, la de `spec.md` y la de `progress.md`. Un diff pegado
   en el prompt se cobra en el contexto de quien despacha durante el resto de la sesión.
2. Con su informe, emite un veredicto **por cada criterio de aceptación** de `spec.md`:
   - **Cumplido** — hay evidencia en el código o en los tests.
   - **No cumplido** — hay evidencia de que no se cumple, o no existe la implementación.
   - **No verificable desde el diff** — el criterio es real pero no se puede comprobar
     leyendo el cambio (estético, de infraestructura, de comportamiento en ejecución).
3. **Si hay algún criterio NO CUMPLIDO: detente.** Informa cuáles y por qué, y recomienda
   `/implement` en modo corrección. Este gate no se salta con aprobación del usuario: existe
   precisamente para no depender de que alguien mire.
4. **Los NO VERIFICABLES no bloquean**, pero se listan aparte y el usuario tiene que
   reconocerlos explícitamente antes de continuar. Un criterio que nadie puede comprobar no
   es lo mismo que uno comprobado.
5. Lo que afirma `progress.md` son afirmaciones, no hechos: un criterio no se da por cumplido
   porque una entrada diga que se hizo ({{guide:evidencia-y-preguntas}}).

## Fase 4 — Sello de salida

Añade a `progress.md` una entrada siguiendo {{guide:registro-progreso}}, con la **fecha real
del sistema**:

- Fase: `complete`
- Resultado: qué se cerró y con qué veredicto (p. ej. «8/8 criterios verificados»)
- `**Salida:**` `completada`, o `abandonada — <motivo>`

Y sobrescribe el "Estado actual" para que refleje que la tarea está cerrada.

Si sigue existiendo `tasks/<taskId>/.frontera`, bórralo: la frontera es del modo corrección,
y la tarea se está cerrando.

## Fase 5 — Transición de estado (responsabilidad exclusiva de /close)

Propón mover la tarea de ClickUp a `complete` y ejecuta el cambio **SOLO tras aprobación
explícita** del usuario. Si el MCP de ClickUp no está disponible, indica hacerlo a mano y
continúa sin bloquear.

Si el cierre es por abandono y el estado de destino no está en la tabla de
{{guide:estados-tareas}}, **no inventes el mapeo**: pregunta a qué estado moverla.

## Fase 6 — Promoción de memoria

Con la tarea cerrada, **propón al usuario** qué aprendizajes merecen subir. Nada entra sin
que él elija:

1. **A `MEMORY.md` (personal, no versionado):** es lo único que puedes escribir tú. Con su
   aprobación, añádelo directamente — es un fichero personal y no se commitea.
   - **Aprendizajes:** cada criterio "No verificable" que quedó como decisión, cada hueco del
     plan corregido al ejecutar, cada error resuelto.
   - **Decisiones técnicas:** lo que se decidió y qué alternativa se descartó (con link al
     commit/ADR).
   - **Comandos/flujos:** atajos o patrones que se repiten.
   - **Contexto Actual:** actualiza la sección con la rama actual, objetivo inmediato y tareas
     pendientes.

2. **A `CLAUDE.md` (equipo, versionado):** **no lo escribes ni lo commiteas tú.** Propón el
   texto exacto y deja que el usuario lo aplique en un commit propio — es configuración
   compartida y pasa por el gate humano.
   - Solo lo que se ha vuelto **regla de todo el equipo**: nuevo comando exacto, convención de
     código, patrón arquitectural, regla de negocio, archivo intocable.

**Formato de propuesta al usuario:**
> **¿Promovemos algo a memoria?**
> - **MEMORY.md:** 3 aprendizajes, 1 decisión, 2 comandos
> - **CLAUDE.md:** 1 nuevo comando exacto (`/close --abandon`), 1 convención (fechas en
>   español en commits)
>
> Elige: `1` solo MEMORY, `2` solo CLAUDE, `3` ambos, `Enter` ninguno.

## Fase 7 — Cierre

Resume en 3-4 líneas, con {{guide:escritura-natural}}: tarea, veredicto por criterio,
motivo de salida y estado en ClickUp.
Si la rama o el worktree siguen vivos, recuérdalo — pero no decidas tú qué hacer con ellos.

**Y pregunta si esto queda desplegado o pendiente de entrega.** Cerrar la tarea no la pone en
producción, y ahí es donde el trabajo se queda a medias sin que nadie lo note: si el cambio
tiene que salir a un entorno real, recuerda el bloque «Plan de entrega» de `spec.md` —orden,
vuelta atrás y señal a vigilar, según {{guide:entrega-y-despliegue}}— y que lo ejecuta el
usuario. Si no sale a ningún sitio, dilo en una línea y termina.

{{snippet:estado-de-cierre}}

## Banderas rojas (no te las saltes)

Si te sorprendes pensando algo de la columna izquierda, DETENTE: estás racionalizando
saltarte un gate.

| Pensamiento | Realidad |
|---|---|
| "Falta un criterio pero el usuario quiere cerrar, y manda él" | El gate de cumplimiento no se salta con aprobación (Fase 3.3). Si de verdad hay que cerrar así, es un cierre por abandono y se etiqueta como tal. |
| "Este criterio no lo veo en el diff, lo doy por cumplido" | «No verificable» no es «cumplido». Se lista aparte y el usuario lo reconoce (Fase 3.4). |
| "Muevo la tarea a complete de una vez, para eso me han llamado" | Toda transición pasa por aprobación explícita (Fase 5). |
| "Hay una revisión aprobada, doy la PR por revisada" | Mira sobre QUÉ commit se aprobó (Fase 2.4). Si entraron commits después, eso no lo ha revisado nadie: enséñalo y pregunta. |
| "La tarea está en 'in progress' pero el trabajo está hecho, cierro" | Se cierra desde `review`. Otro estado significa que falta un paso: enruta (Fase 2.2). |
| "Se abandona, no hace falta registrar por qué" | Sin motivo de salida, dentro de tres meses nadie sabrá si se terminó o se descartó, y cuenta como trabajo en curso eterno. |
| "Aprovecho y corrijo este detalle menor antes de cerrar" | /close no toca código ni spec.md. Corregir es /implement. |
| "Registro la hora de cierre redondeada, da igual" | Fecha real del sistema. Un dato inventado envenena todo lo que se calcule con él. |
| "progress.md dice que el criterio 4 se completó, lo marco cumplido" | Las notas son afirmaciones, no hechos. El veredicto sale del código, no del historial (Fase 3.5). |
| "Actualizo MEMORY.md sin preguntar, es personal y no molesta a nadie" | La promoción es una propuesta: el usuario elige qué entra (Fase 6). Un fichero que crece sin criterio deja de orientar a quien llega en frío. |
| "Escribo yo CLAUDE.md y lo commiteo, es un cambio pequeño" | CLAUDE.md es del equipo: /close propone el texto, no lo escribe ni lo commitea (Fase 6.2). |
