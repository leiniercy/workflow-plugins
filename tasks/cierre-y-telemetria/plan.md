# Cierre de tareas y telemetría de flujo — Plan de implementación

> **Para agentes ejecutores:** SUB-SKILL REQUERIDA: usa `superpowers:subagent-driven-development`
> (recomendado) o `superpowers:executing-plans` para ejecutar tarea a tarea. Los pasos usan
> casillas (`- [ ]`) para el seguimiento.

**Goal:** Añadir el comando `/close` —con gate de cumplimiento y sello de salida— y hacer que
`/plan` e `/implement` creen el esqueleto de tarea, para que el plugin genere un dataset de
flujo con llegada y salida por tarea.

**Architecture:** Se sella la **transición de estado**, no la invocación del comando. Cada
transición ya tiene un dueño único en `estados-tareas.md`; `/close` completa la serie
haciéndose cargo de `review → complete`. `/review` no se toca: su contrato read-only
sobrevive intacto porque no le corresponde sellar nada.

**Tech Stack:** Markdown en `core/` (única fuente de verdad) + Node ESM en `scripts/`. Los
adaptadores se generan con `node scripts/sync.mjs`; nunca se editan a mano.

**Spec:** `tasks/cierre-y-telemetria/spec.md`

## Global Constraints

- **`core/` es la única fuente de verdad.** Jamás edites `adapters/claude/commands/`,
  `adapters/claude/skills/` ni `adapters/opencode/.opencode/`: se sobrescriben. Tras tocar
  `core/`, ejecuta `node scripts/sync.mjs`.
- **Referencias cruzadas entre guías con tokens `{{guide:nombre}}`**, nunca con rutas.
- **No hay framework de tests.** Los "tests" son `scripts/check-*.mjs` ejecutados con `node`.
  El ciclo TDD es: añadir la aserción que falla, verla fallar, hacerla pasar.
- **`check-behavior.mjs` asevera contratos, no prosa** (frontmatter, `allowed-tools`,
  presencia de secciones estructurales). No añadas aserciones que comprueben redacción: la
  guía `niveles-y-tipos-de-prueba` llama anti-patrón al «test contra el texto fuente».
- **Los cambios de prosa en guías no tienen test automático.** Su verificación es el eval
  manual de `docs/eval-comportamiento.md`, más la revisión humana.
- **No commitees sin aprobación explícita del usuario.** Cada paso de commit del plan es una
  propuesta, no una licencia.
- **Fecha real del sistema** (`date +"%Y-%m-%d %H:%M"`) en toda entrada de `progress.md`.

---

## Estructura de ficheros

| Fichero | Responsabilidad | Acción |
|---|---|---|
| `core/guides/registro-progreso.md` | Contrato de datos de `progress.md`: fases, campos, anti-patrones | Modificar |
| `core/guides/estados-tareas.md` | Máquina de estados y dueño de cada transición | Modificar |
| `core/workflows/close.md` | El comando `/close`: gate, sello, transición | **Crear** |
| `core/workflows/plan.md` | Deja de exigir `/start` previo | Modificar (Fase 2, punto 1) |
| `core/workflows/implement.md` | Íd. | Modificar (Fase 2, punto 1) |
| `scripts/sync.mjs` | Metadatos de frontmatter por comando | Modificar (objeto `COMMANDS`) |
| `scripts/check-behavior.mjs` | Contratos aseverados sobre lo publicado | Modificar (línea 52 + aserciones) |
| `adapters/claude/hooks/session-context.js` | Sugerencia de próximo paso | Modificar (bloque `nextStep`) |

El orden de las tareas sigue la dependencia: primero el contrato de datos, luego la máquina de
estados, después el comando que los usa, y al final la recolección y el pulido.

---

### Task 1: El contrato de datos — fase `complete` en `registro-progreso.md`

Todo lo demás escribe contra este contrato, así que va primero.

**Files:**
- Modify: `core/guides/registro-progreso.md`

**Interfaces:**
- Produces: la fase `complete`, el campo `**Salida:**` (valores `completada` | `abandonada — <motivo>`)
  y el campo `**Llegada:**` con valor `inferida — <explicación>`. Las tareas 3 y 4 los escriben.

- [ ] **Step 1: Ampliar el enum de fases**

En la sección «Proceso», punto 6, sustituye:

```markdown
6. **`<fase>` ∈ {`start`, `plan`, `implement`, `review`}.** No uses otros valores.
```

por:

```markdown
6. **`<fase>` ∈ {`start`, `plan`, `implement`, `review`, `complete`}.** No uses otros valores.
   `complete` la escribe únicamente `/close`, y es la última entrada de la tarea: marca su
   salida del flujo.
```

- [ ] **Step 2: Documentar los dos campos nuevos**

Añade al final de la sección «Proceso», como puntos 10 y 11:

```markdown
10. **La entrada `complete` lleva `**Salida:**`.** Dos valores posibles: `completada`, o
    `abandonada — <motivo en una línea>`. El motivo no es adorno: una tarea que se abandona
    sin registrar su salida queda como trabajo en curso eterno y falsea cualquier medida
    posterior del flujo. Se etiqueta para poder filtrarla, no se borra.

11. **Una llegada que no consta se marca, no se inventa.** Si el esqueleto lo crea `/plan` o
    `/implement` porque no hubo `/start`, nadie sabe cuándo empezó el trabajo de verdad.
    Escribir la hora actual como si fuera la de inicio es inventar un dato. La entrada lo
    declara con un campo `**Llegada:** inferida — <explicación>`, que vale como cota inferior
    y se puede descartar después.
```

- [ ] **Step 3: Añadir los anti-patrones correspondientes**

En la sección «Anti-patrones», añade estas tres filas al final de la lista:

```markdown
- **Tarea abandonada sin cerrar** — dejarla sin entrada `complete` porque «ya no se hace». Sin
  sello de salida sigue contando como trabajo en curso para siempre.
- **Llegada inventada** — estampar la hora de creación del esqueleto como si fuera la de inicio
  cuando no hubo `/start`. Es un dato no comprobado escrito como si constara: márcalo inferido.
- **Entrada `complete` sin motivo de salida** — «cerrada» a secas no distingue una tarea
  terminada de una descartada, y son cosas distintas al mirar atrás.
```

- [ ] **Step 4: Regenerar los adaptadores y verificar que la suite sigue verde**

```bash
node scripts/sync.mjs
node scripts/check-behavior.mjs && node scripts/check-hygiene.mjs && node scripts/check-routing.mjs
```

Esperado: los tres terminan sin fallos. `sync.mjs` debe haber reescrito
`adapters/claude/skills/registro-progreso/SKILL.md` y
`adapters/opencode/.opencode/guides/registro-progreso.md`.

- [ ] **Step 5: Commit (propón, no ejecutes sin permiso)**

```bash
git add core/guides/registro-progreso.md adapters/
git commit -m "feat(registro-progreso): fase complete, motivo de salida y llegada inferida"
```

---

### Task 2: La máquina de estados — `review → complete` pasa a `/close`

**Files:**
- Modify: `core/guides/estados-tareas.md`

**Interfaces:**
- Consumes: la fase `complete` de la Task 1.
- Produces: la regla de propiedad que la Task 3 implementa en el comando.

- [ ] **Step 1: Reescribir la transición**

En «Transiciones permitidas y su propietario», sustituye:

```markdown
- `review → complete`: **manual** (la hace el humano o el proceso de merge del equipo).
  Ningún comando del paquete cierra tareas.
```

por:

```markdown
- `review → complete`: **solo /close**, tras aprobación explícita del usuario y con el gate de
  cumplimiento en verde. El comando propone la transición; nunca la ejecuta por su cuenta.
```

- [ ] **Step 2: Añadir la fila de `/close` a la tabla estado → comando**

En la tabla «estado → comando sugerido», sustituye la fila de `review`:

```markdown
| `review` | in review, en revisión, code review, qa | `/review` | Hay PR abierta o trabajo terminado: toca diagnóstico. Si la revisión dejó hallazgos por corregir → `/implement` (modo corrección). |
```

por:

```markdown
| `review` | in review, en revisión, code review, qa | `/review`, luego `/close` | Hay PR abierta o trabajo terminado: primero el diagnóstico. Si la revisión dejó hallazgos por corregir → `/implement` (modo corrección); si está limpia → `/close` para validar y cerrar. |
```

- [ ] **Step 3: Documentar la salida por abandono**

Añade tras la «Regla de oro»:

```markdown
## Salida por abandono

Una tarea que se descarta a mitad también **sale** del flujo, y registrarlo importa: si no se
sella, cuenta como trabajo en curso indefinidamente.

`/close` la acepta con `**Salida:** abandonada — <motivo>` en `progress.md`. El sello local se
escribe siempre, sepa o no el agente a qué estado moverla en ClickUp.

Para el estado de destino manda la **Regla de oro**: muchos espacios usan `cancelled`, `archived`
o un estado propio, y ninguno está en la tabla de arriba. **No inventes el mapeo — pregunta al
usuario** a qué estado quiere moverla.
```

- [ ] **Step 4: Regenerar y verificar**

```bash
node scripts/sync.mjs
node scripts/check-routing.mjs && node scripts/check-behavior.mjs
```

Esperado: sin fallos. `check-routing` valida los pares de guías confundibles; esta guía no
gana ninguno nuevo, así que no debería moverse.

- [ ] **Step 5: Commit**

```bash
git add core/guides/estados-tareas.md adapters/
git commit -m "feat(estados-tareas): /close es dueño de review -> complete"
```

---

### Task 3: El comando `/close`

La tarea más grande. El test va primero: las aserciones de contrato en `check-behavior.mjs`.

**Files:**
- Modify: `scripts/check-behavior.mjs:52` y siguientes
- Create: `core/workflows/close.md`
- Modify: `scripts/sync.mjs` (objeto `COMMANDS`)

**Interfaces:**
- Consumes: fase `complete` y campo `**Salida:**` (Task 1); regla de propiedad (Task 2);
  subagente `revisor-spec-tests` (ya existe, read-only).
- Produces: el comando `/close`, que la Task 5 referencia desde el hook.

- [ ] **Step 1: Escribir las aserciones que fallan**

En `scripts/check-behavior.mjs`, añade `"close"` a la lista de la línea 52:

```javascript
for (const cmd of ["start", "plan", "implement", "review", "close"]) {
```

Y añade este bloque justo después de ese bucle:

```javascript
// --- /close: escribe, pero solo progress.md; y puede despachar el revisor de spec ---
const closeFm = frontmatter(read(join(CLAUDE, "commands/close.md")));
const closeTools = field(closeFm, "allowed-tools") || "";
assert(/\bAgent\b/.test(closeTools),
  "/close allowed-tools incluye Agent (despacha revisor-spec-tests para el gate)");
assert(/\bWrite\b/.test(closeTools) || /\bEdit\b/.test(closeTools),
  "/close allowed-tools permite escribir (sella la salida en progress.md)");
```

Solo se asevera el **frontmatter**, que es contrato legible por máquina. Que el comando
contemple el abandono, o que respete su ámbito de escritura, es comportamiento redactado en
prosa: aseverarlo con un `grep` sobre el propio texto solo demostraría que la fuente es la
fuente. Eso lo cubre el eval manual de `docs/eval-comportamiento.md`.

- [ ] **Step 2: Verla fallar**

```bash
node scripts/check-behavior.mjs
```

Esperado: FALLA con `comando /close existe` (el fichero no está todavía).

- [ ] **Step 3: Registrar el comando en `sync.mjs`**

En el objeto `COMMANDS` de `scripts/sync.mjs`, añade tras la entrada `review`:

```javascript
  close: {
    description:
      'Valida el cumplimiento de los criterios de aceptación contra spec.md y, si están en verde, sella la salida de la tarea en progress.md y propone moverla a "complete" en ClickUp. Admite cierre por abandono. Solo escribe progress.md - nunca código ni spec.md.',
    argumentHint: "[taskId (opcional: se infiere de la rama actual)]",
  },
```

- [ ] **Step 4: Escribir `core/workflows/close.md`**

```markdown
Eres el agente que cierra una tarea. Tu contrato: **no cierras nada que no cumpla**, y no
cierras nada sin que el usuario lo apruebe. Tu único output persistente es
`tasks/<taskId>/progress.md`: no tocas código, ni `spec.md`, ni commiteas.

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
4. Si el usuario pidió cierre **por abandono**, salta la Fase 3 entera: no se valida el
   cumplimiento de algo que se descarta.

## Fase 3 — Gate de cumplimiento (no negociable)

1. Genera el diff completo de la rama y despacha el subagente `revisor-spec-tests` pasándole
   **rutas, no contenido**: la del diff, la de `spec.md` y la de `progress.md`.
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

## Fase 4 — Sello de salida

Añade a `progress.md` una entrada siguiendo {{guide:registro-progreso}}, con la **fecha real
del sistema**:

- Fase: `complete`
- Resultado: qué se cerró y con qué veredicto (p. ej. «8/8 criterios verificados»)
- `**Salida:**` `completada`, o `abandonada — <motivo>`

Y sobrescribe el "Estado actual" para que refleje que la tarea está cerrada.

## Fase 5 — Transición de estado (responsabilidad exclusiva de /close)

Propón mover la tarea de ClickUp a `complete` y ejecuta el cambio **SOLO tras aprobación
explícita** del usuario. Si el MCP de ClickUp no está disponible, indica hacerlo a mano y
continúa sin bloquear.

Si el cierre es por abandono y el estado de destino no está en la tabla de
{{guide:estados-tareas}}, **no inventes el mapeo**: pregunta a qué estado moverla.

## Fase 6 — Cierre

Resume en 3-4 líneas: tarea, veredicto por criterio, motivo de salida y estado en ClickUp.
Si la rama o el worktree siguen vivos, recuérdalo — pero no decidas tú qué hacer con ellos.

## Banderas rojas (no te las saltes)

Si te sorprendes pensando algo de la columna izquierda, DETENTE: estás racionalizando
saltarte un gate.

| Pensamiento | Realidad |
|---|---|
| "Falta un criterio pero el usuario quiere cerrar, y manda él" | El gate de cumplimiento no se salta con aprobación (Fase 3.3). Si de verdad hay que cerrar así, es un cierre por abandono y se etiqueta como tal. |
| "Este criterio no lo veo en el diff, lo doy por cumplido" | «No verificable» no es «cumplido». Se lista aparte y el usuario lo reconoce (Fase 3.4). |
| "Muevo la tarea a complete de una vez, para eso me han llamado" | Toda transición pasa por aprobación explícita (Fase 5). |
| "La tarea está en 'in progress' pero el trabajo está hecho, cierro" | Se cierra desde `review`. Otro estado significa que falta un paso: enruta (Fase 2.2). |
| "Se abandona, no hace falta registrar por qué" | Sin motivo de salida, dentro de tres meses nadie sabrá si se terminó o se descartó, y cuenta como trabajo en curso eterno. |
| "Aprovecho y corrijo este detalle menor antes de cerrar" | /close no toca código ni spec.md. Corregir es /implement. |
| "Registro la hora de cierre redondeada, da igual" | Fecha real del sistema. Un dato inventado envenena todo lo que se calcule con él. |
```

- [ ] **Step 5: Generar y verificar que pasa**

```bash
node scripts/sync.mjs
node scripts/check-behavior.mjs
```

Esperado: PASA, incluidas las dos aserciones de frontmatter nuevas y las dos del bucle
(`/close` existe, `/close` tiene tabla de Banderas rojas). Comprueba también que se han creado
`adapters/claude/commands/close.md` y `adapters/opencode/.opencode/command/close.md`.

- [ ] **Step 6: Commit**

```bash
git add core/workflows/close.md scripts/sync.mjs scripts/check-behavior.mjs adapters/
git commit -m "feat(close): comando de cierre con gate de cumplimiento y sello de salida"
```

---

### Task 4: El esqueleto deja de depender de `/start`

Esta es la tarea que ataca la causa raíz del `n=2`.

**Files:**
- Modify: `core/workflows/plan.md` (Fase 2, punto 1)
- Modify: `core/workflows/implement.md` (Fase 2, punto 1)

**Interfaces:**
- Consumes: el campo `**Llegada:** inferida` de la Task 1.

- [ ] **Step 1: `/plan` crea el esqueleto en vez de rechazar**

En `core/workflows/plan.md`, Fase 2, sustituye:

```markdown
1. Verifica que `tasks/<taskId>/spec.md` y `progress.md` existen. Si no: indica ejecutar
   `/start` primero y detente.
```

por:

```markdown
1. Verifica que `tasks/<taskId>/spec.md` y `progress.md` existen.
   **Si no existen, créalos en vez de detenerte.** Una tarea ya definida no necesita `/start`,
   y negarse aquí es lo que hace que el flujo pierda el rastro de tareas que sí se trabajaron.
   - `spec.md` con el mismo esqueleto de secciones que crea `/start`, con placeholders
     `_pendiente de /plan_` en lo que vas a completar tú.
   - `progress.md` según {{guide:registro-progreso}}, con una primera entrada de fase `plan`,
     resultado «esqueleto creado (sin /start previo)» y el campo
     `**Llegada:** inferida — el trabajo empezó antes de este sello`. No estampes la hora
     actual como si fuera la de inicio: no la sabes.
   - Informa al usuario de que lo has creado y de que **no hay rama ni transición de ClickUp**
     —eso es de `/start`—, por si las quiere.
   Si YA existen, no los recrees nunca: sigue con el punto 2.
```

- [ ] **Step 2: Lo mismo en `/implement`**

En `core/workflows/implement.md`, Fase 2, sustituye el punto 1:

```markdown
1. Verifica que `tasks/<taskId>/spec.md` existe y NO tiene placeholders
   `_pendiente de /plan_` en Criterios de aceptación o Enfoque técnico. Si los tiene,
   niégate a implementar e indica ejecutar `/plan` primero: implementar sin criterios
   definidos produce trabajo no verificable.
```

por:

```markdown
1. Verifica que `tasks/<taskId>/spec.md` existe.
   **Si no existe, crea el esqueleto** (`spec.md` con placeholders `_pendiente de /plan_` y
   `progress.md` según {{guide:registro-progreso}}, con primera entrada de fase `implement`,
   resultado «esqueleto creado (sin /start previo)» y
   `**Llegada:** inferida — el trabajo empezó antes de este sello`). Después sigue con la
   comprobación de abajo, que te hará parar: crear el rastro y negarte a implementar sin
   criterios son cosas distintas, y la primera no debe perderse por culpa de la segunda.
   Si YA existe, no lo recrees.

   Con `spec.md` disponible, verifica que NO tiene placeholders `_pendiente de /plan_` en
   Criterios de aceptación o Enfoque técnico. Si los tiene, niégate a implementar e indica
   ejecutar `/plan` primero: implementar sin criterios definidos produce trabajo no
   verificable.
```

- [ ] **Step 3: Regenerar y verificar**

```bash
node scripts/sync.mjs
node scripts/check-behavior.mjs && node scripts/check-guard.mjs && node scripts/check-hygiene.mjs
```

Esperado: sin fallos. Presta atención a `check-guard`: vigila la frontera de acciones
irreversibles, y crear ficheros de estado no lo es — pero si salta, léelo antes de tocarlo.

- [ ] **Step 4: Commit**

```bash
git add core/workflows/plan.md core/workflows/implement.md adapters/
git commit -m "feat(plan,implement): crean el esqueleto de tarea si no existe"
```

---

### Task 5: El hook sugiere `/close`

**Files:**
- Modify: `adapters/claude/hooks/session-context.js` (bloque `nextStep`, ~línea 212)

**Interfaces:**
- Consumes: el comando `/close` de la Task 3.

> El hook **no** lo genera `sync.mjs`: se mantiene a mano. No lo regeneres.

- [ ] **Step 1: Añadir el eslabón que falta**

Sustituye la rama final del bloque `nextStep`:

```javascript
    } else if (items.length) {
      nextStep =
        "Todos los criterios están marcados. Sugerido: `/review` para un diagnóstico " +
        "independiente antes de pedir revisión humana.";
    }
```

por:

```javascript
    } else if (items.length) {
      nextStep =
        "Todos los criterios están marcados. Sugerido: `/review` para un diagnóstico " +
        "independiente y, si sale limpio, `/close` para validar y cerrar.";
    }
```

El hook deriva su sugerencia del estado de `spec.md` y no puede saber si `/review` ya corrió,
así que nombra los dos pasos en vez de intentar adivinar en cuál estás.

- [ ] **Step 2: Ejecutar el check del hook**

```bash
node scripts/check-hooks.mjs && node scripts/check-hygiene.mjs
```

Esperado: sin fallos. `check-hooks` ejecuta el hook de verdad; `check-hygiene` comprueba que
no escribe fuera de su sitio.

- [ ] **Step 3: Commit**

```bash
git add adapters/claude/hooks/session-context.js
git commit -m "feat(hook): sugerir /close tras la revisión"
```

---

### Task 6: Documentación, versión y verificación completa

**Files:**
- Modify: `README.md` (tabla de comandos y árbol de arquitectura)
- Modify: `CHANGELOG.md`
- Version: 0.19.0 → 0.20.0

- [ ] **Step 1: Añadir `/close` a la tabla de comandos del README**

En «El flujo (igual en ambas herramientas)», añade tras la fila de `/review`:

```markdown
| `/close [taskId]` | Valida los criterios contra spec.md; si están en verde, sella la salida en `progress.md` y propone el cierre. Admite cierre por abandono | `review → complete` (con aprobación) |
```

Y en el árbol de arquitectura, añade `close.md` a la lista de `core/workflows/`.

- [ ] **Step 2: Corregir la frase del README que ya no es cierta**

El README afirma «El paso a `complete` es siempre humano». Sustitúyela por:

```markdown
El paso a `complete` lo propone `/close` y lo aprueba siempre una persona.
```

- [ ] **Step 3: Subir la versión**

```bash
node scripts/bump-version.mjs minor
node scripts/check-version.mjs
```

Esperado: 0.20.0 en todos los manifiestos, y `check-version` en verde.

- [ ] **Step 4: Pasar la suite entera, como en CI**

```bash
node scripts/sync.mjs
git diff --exit-code adapters/ || echo "DESINCRONIZADO: commitea los adaptadores"
node scripts/check-version.mjs
node scripts/check-hygiene.mjs
node scripts/check-behavior.mjs
node scripts/check-hooks.mjs
node scripts/check-routing.mjs
node scripts/check-guard.mjs
node scripts/check-graders.mjs
```

Esperado: los ocho en verde y `adapters/` sin diferencias pendientes.

- [ ] **Step 5: Commit**

```bash
git add README.md CHANGELOG.md .claude-plugin/ adapters/
git commit -m "chore(release): 0.20.0"
```

---

## Verificación manual pendiente (no automatizable)

Los cambios de prosa en guías y workflows no los cubre ningún check. Antes de publicar, pasa
el eval de comportamiento de `docs/eval-comportamiento.md` con atención a dos cosas:

1. **Que `/close` se active cuando toca** y no lo haga cuando el usuario pide una revisión.
   `/review` y `/close` son el par confundible nuevo de este cambio.
2. **Que `/plan` e `/implement` creen el esqueleto** sin pedir `/start`, y que la entrada
   quede marcada como llegada inferida.

## Lo que este plan NO hace

- No calcula percentiles, ni dibuja scatterplots ni CFDs. Con `n=2` sería teatro.
- No mide el tiempo bloqueado: `registro-progreso.md` ordena borrar la sección `## Bloqueo` al
  resolverla, así que la duración es hoy irrecuperable. Es un hueco real y es otra tarea.
- No repara el pasado. Las tareas sin `progress.md` siguen sin datos; la muestra crece desde
  la próxima.
