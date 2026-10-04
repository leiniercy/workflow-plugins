# /lead de backbone · diseño del coordinador

> Spec de diseño, 4 de octubre de 2026. Salida del brainstorming con el usuario.
> Siguiente paso: plan de implementación. Antecedente: el `/lead` de voice
> (`docs/superpowers/specs/2026-10-04-voice-design.md`, ya en `main`).

## 1. Qué es

`/lead` es el coordinador del flujo de una tarea de backbone (`/define` → `/start` → `/plan` →
`/implement` → `/review` → `/close`). En cada vuelta lee el estado, lo diagnostica en una línea,
propone la siguiente fase con su motivo, la lanza con la herramienta Skill cuando el usuario da
el visto bueno y, al terminar la fase, vuelve a leer. **No escribe nunca**, no se salta los gates
de las fases y no encadena fases sin preguntar. Todo eso ya está en
`core/snippets/coordinador.md` y se reutiliza tal cual.

Lo nuevo, y lo que el usuario pidió con más fuerza, es **cómo habla cuando no sabe algo**.

## 2. La regla de honestidad (en el snippet compartido)

Va en `core/snippets/coordinador.md`, así que la ganan los dos `/lead` (backbone y voice).
Decisión del usuario (opción A): ni solo en backbone, ni en `evidencia-y-preguntas`.

Bloque nuevo, entre el bucle y la lista de lo que no se hace:

> **Lo que dices, de dónde sale.** Cada cosa que le dices al usuario sobre el estado del trabajo
> es comprobada o no lo es, y se tiene que notar en cómo la dices.
>
> - **Comprobado** es lo que has leído o ejecutado en esta vuelta: un fichero, la salida de un
>   comando, el estado de ClickUp. Lo dices en firme y con su origen al lado: «`spec.md` tiene 3
>   de 7 criterios marcados».
> - **No comprobado** es todo lo demás, incluido lo que «seguro que es así». Va en su propia
>   línea, empezando por **«⚠ No comprobado:»**, y termina en una de dos salidas: lo que hay que
>   mirar para saberlo, o una pregunta al usuario. Si no sabes cómo averiguarlo, dilo con esas
>   palabras: «no lo sé; deberíamos investigarlo».
> - **No escribes nada que siga un patrón sin haberlo visto:** ni rutas, ni nombres de fichero o
>   de rama, ni comandos, ni cifras, ni citas de un texto, ni enlaces. Que sea lo normal en este
>   tipo de repo no es una fuente.
> - **Si no puedes decir con evidencia qué toca y por qué es lo correcto, no lo propones como
>   siguiente paso: se lo preguntas al usuario**, contándole qué sabes, qué no sabes y qué
>   opciones ves. Proponer una fase sin estar seguro es empujarle a aprobarla.

Banderas rojas nuevas, en la tabla de **cada** `/lead`:

| Pensamiento | Realidad |
|---|---|
| "Lo normal es que la rama se llame así, la nombro" | Si no la has visto con `git`, no la nombras. |
| "Digo 'parece que' y ya queda claro que dudo" | Un «parece» dentro de una frase en firme no cambia el tono. Lo que dudas va en su línea «⚠ No comprobado:». |
| "Propongo la fase más probable y si no, que me corrija" | Sin evidencia, se pregunta. El usuario aprueba lo que le presentas como cierto. |

**Lo que no se sabe:** si la línea base sin la regla ya se comporta así. La marca literal no la
conoce el modelo sin el snippet, así que un caso que busque la marca fallaría siempre y no
mediría nada (ADR-0004 pide medir primero). Lo medible sería «inventa menos», y no hay todavía
un diseño de caso que no dé falsos negativos con el corrector por subcadena (ADR-0011). Por eso
esta regla se verifica en la prueba de humo leyendo la respuesta, y se dice así: **no es un eval
medido**.

## 3. Qué tarea

- `$ARGUMENTS` es un taskId → esa.
- Sin argumentos → la de la rama actual (`<tipo>/<taskId>_<slug>`).
- En una rama que no es de tarea → lista las tareas vivas (`tasks/*/` sin entrada `complete`) y
  las de ClickUp en curso, y **elige el usuario**.
- `$ARGUMENTS` es una descripción, no un id → propone `/define`.
- `/setup` no se propone nunca: su propia definición dice que nadie lo sugiere.

## 4. Diagnóstico

Decisión de diseño: **no se inventa una lista cerrada de títulos de `progress.md`** como en
voice. backbone ya tiene señales con forma fija y no hace falta tocar ninguna otra fase:

- `progress.md`: entrada `— complete` y sección `## Bloqueo` (las lee ya
  `hooks/session-context.js`).
- `spec.md`: marcadores `_pendiente de /plan_` y casillas `- [ ]` / `- [x]` de los criterios.
- `tasks/<id>/.frontera`: la crea `/implement` al entrar en modo corrección y la borra al cerrarla.
- La PR, con `gh pr view` (como ya hace `/close`).
- El estado de ClickUp, con la tabla de `estados-tareas`.

El resultado en texto libre de `progress.md` («PR creada») se lee como contexto, nunca para
decidir el estado.

Manda la primera fila que se cumpla:

| Estado | Señal | Siguiente paso |
|---|---|---|
| cerrada | entrada `— complete` | ninguno; lo dice y termina |
| bloqueada | existe `## Bloqueo` | lo cuenta y pregunta; no propone fase |
| incoherente | dos señales se contradicen (ClickUp en `complete` sin sello, `.frontera` en una tarea cerrada, PR mergeada con criterios sin marcar…) | lo dice y pregunta; no lo arregla |
| sin empezar | ClickUp en `to do`, sin rama ni `tasks/<id>/` | `/start` |
| sin plan | sin `spec.md`, o con `_pendiente de /plan_` | `/plan` |
| en corrección | existe `.frontera` | `/implement` (modo corrección) |
| implementando | quedan criterios sin marcar | `/implement` (con «N de M») |
| criterios hechos, sin PR | todo marcado y `gh` no encuentra PR | `/implement`, para push y PR |
| PR abierta | `gh` encuentra la PR abierta | «⚠ No consta si has pasado `/review`»: pregunta |
| PR mergeada | `gh` la da por mergeada | `/close` |

La lista de incoherencias son ejemplos. La regla que se escribe es la general: dos señales que se
contradicen → se dice y se pregunta.

**Señal que no se pudo leer** (`gh` no instalado, ClickUp sin responder): pasa a «no se pudo
mirar», que no es «no hay». Va con «⚠ No comprobado:» y una pregunta.

### El hueco de `/review`

`/review` no escribe ficheros, y eso no se toca (`core/scripts/frescura-revision.mjs` explica por
qué y `check-behavior` lo vigila). Por eso no queda rastro de un `/review` limpio. Decisión del
usuario (opción A): `/lead` lee la PR con `gh`, dice en firme lo que eso muestra, y para lo que
no consta **pregunta**; no da el `/review` por hecho ni por pendiente.

## 5. Dónde va cada cosa

**Choque de nombres.** `COMMANDS` de `scripts/sync.mjs` usa el nombre como clave y lee el cuerpo
de `core/workflows/<nombre>.md`; hoy `lead` es el de voice. Solución:

- `core/workflows/lead.md` → `core/workflows/lead-voice.md`; nuevo
  `core/workflows/lead-backbone.md`.
- Campo opcional `source` en las entradas de `COMMANDS` (fichero de `core/workflows/` que usar)
  y campo `name` (nombre del comando generado). Dos entradas, `lead-backbone` y `lead-voice`,
  las dos con `name: "lead"`, cada una con su `packages`.
- El fichero generado de voice (`plugins/voice/claude/commands/lead.md`) tiene que quedar
  idéntico salvo por el bloque nuevo del snippet y las tres banderas rojas.

**Solo Claude Code.** No se sabe si en OpenCode un comando puede lanzar otro como hace `/lead`
con Skill; voice ya no se genera para OpenCode por algo parecido. El `/lead` de backbone se
genera solo para el adaptador `claude` hasta que alguien lo investigue, y el README lo dice. Si
`sync.mjs` no admite hoy limitar un comando a un adaptador dentro de un paquete, el plan lo
añade.

**`allowed-tools`** (pre-aprueba, no prohíbe — ADR-0008): `Read, Glob, Grep, Skill,
Bash(git status:*), Bash(git log:*), Bash(git branch:*), Bash(gh pr view:*)`. Las lecturas de
ClickUp no se pre-aprueban: ningún comando del repo pre-aprueba herramientas MCP hoy, y no se
cambia esa costumbre aquí.

| Fichero | Cambio |
|---|---|
| `core/snippets/coordinador.md` | bloque «Lo que dices, de dónde sale» (§2) |
| `core/workflows/lead-backbone.md` | nuevo: §3, §4, lanzar y volver, banderas rojas |
| `core/workflows/lead-voice.md` | renombrado; más las tres banderas rojas del §2 |
| `scripts/sync.mjs` | `source` y `name`, entrada del `/lead` de backbone, solo `claude` |
| `scripts/check-behavior.mjs` | rutas nuevas de voice; para backbone, lo mismo que voice (no pre-aprueba Write, Edit ni Bash libre; lleva el snippet); los dos `/lead` contienen «⚠ No comprobado:» y «no lo sé; deberíamos investigarlo» |
| README, CHANGELOG, `MEMORY.md` | el comando, «solo Claude Code», riesgos conocidos |

## 6. Cómo se comprueba

1. **Suite estática:** `node scripts/sync.mjs` sin deriva y todos los `scripts/check-*.mjs` en
   verde (sin `check-activation`, que gasta sesiones).
2. **Prueba de humo** con `claude -p "/backbone:lead ..." --plugin-dir plugins/backbone/claude`
   en repos temporales con estados preparados: sin plan, criterios a medias, `## Bloqueo`,
   señales que se contradicen y sin `gh`. En cada uno: el diagnóstico es el de la tabla y
   `git status` sigue vacío. Se repite la prueba de humo de voice.
3. **Honestidad**, dentro de la prueba de humo: un repo con ClickUp sin responder y una rama que
   no sigue el patrón. Debe salir «⚠ No comprobado:» con una pregunta, no un nombre inventado.
   Se revisa leyendo la respuesta y se informa como revisión manual, no como eval.

## 7. Lo que queda sin comprobar

- Si `/implement` llega a la Fase 4 (push y PR) cuando todos los criterios ya están marcados.
  Por cómo está escrito, creo que sí; se confirma en la prueba de humo (fila «sin PR»).
- Si `.frontera` se versiona. No está en `.gitignore`. Si no se commitea, en otra máquina no
  existe y `/lead` no vería una corrección abierta. No se sabe qué pasa en la práctica.
- Si OpenCode puede alojar un coordinador (§5).
- Si la regla de honestidad cambia el comportamiento frente a la línea base (§2).
