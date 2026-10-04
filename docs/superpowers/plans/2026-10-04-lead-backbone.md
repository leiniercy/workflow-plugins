# /lead de backbone · plan de implementación

> **Para agentes que lo ejecuten:** SUB-SKILL OBLIGATORIA: superpowers:subagent-driven-development
> (recomendada) o superpowers:executing-plans, tarea a tarea. Los pasos usan casillas (`- [ ]`).

**Objetivo:** un comando `/lead` en backbone que coordina el flujo de una tarea sin escribir, y
una regla de honestidad compartida por los dos `/lead` (backbone y voice).

**Arquitectura:** el cuerpo del comando sale de `core/workflows/lead-backbone.md` y lo genera
`scripts/sync.mjs`. La regla de honestidad va en `core/snippets/coordinador.md`, que ya insertan
los dos coordinadores. `scripts/check-behavior.mjs` vigila los contratos sobre lo generado.

**Stack:** Node (scripts `.mjs` sin dependencias), markdown en `core/`, Claude Code.

**Spec:** `docs/superpowers/specs/2026-10-04-lead-backbone-design.md` (léela antes de empezar).

## Restricciones globales

- `core/` es la única fuente. **Nunca** se edita a mano nada bajo `plugins/*/claude/commands/`,
  `skills/`, `agents/`, `scripts/` ni `plugins/backbone/opencode/.opencode/`: se regenera con
  `node scripts/sync.mjs`.
- Nombres de comando en inglés; descripciones y prosa en español.
- `/lead` **no escribe**: su `allowed-tools` no pre-aprueba `Write`, `Edit`, `Bash(*)` ni `Bash`
  desnudo.
- El `/lead` de backbone se genera **solo para el adaptador `claude`**.
- Literales exactos de la regla: `⚠ No comprobado:` y `no lo sé; deberíamos investigarlo`.
- Suite estática, sin gastar sesiones de modelo (bash):
  `for f in scripts/check-*.mjs; do [ "$(basename $f)" = check-activation.mjs ] || node "$f" || echo "FALLA $f"; done`
- No se sube versión ni se publica: los cambios van a `[No publicado]` de los changelogs.
- Commits con la línea `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

**Corrección de la spec hecha al revisar el plan:** «incoherente» pasa a ser la primera fila de
la tabla de estados. Con «cerrada» delante, su ejemplo «`.frontera` en una tarea cerrada» no se
alcanzaba nunca. La spec ya está corregida.

**Desviación de la spec, decidida al leer `sync.mjs`:** la spec (§5) pedía dos campos nuevos,
`source` y `name`. Basta con `name`: la clave de `COMMANDS` ya es el fichero de
`core/workflows/` que se lee, así que las claves `lead-voice` y `lead-backbone` hacen de
`source`. Se añade además `adapters` por comando, para limitar el de backbone a `claude`.

---

### Tarea 1: `sync.mjs` admite dos comandos con el mismo nombre en paquetes distintos

Resultado: el `/lead` de voice sale de `core/workflows/lead-voice.md` y su fichero generado no
cambia ni un byte.

**Ficheros:**
- Mover: `core/workflows/lead.md` → `core/workflows/lead-voice.md` (con `git mv`)
- Modificar: `scripts/sync.mjs` (entrada `lead` de `COMMANDS`, ~línea 150; bucle de comandos,
  ~línea 679)
- Modificar: `scripts/check-behavior.mjs` (bloque «voice: comandos», ~líneas 846-931)

**Interfaces:**
- Produce: en `COMMANDS`, dos campos opcionales por entrada: `name` (nombre del comando
  generado; por defecto, la clave) y `adapters` (lista de adaptadores en los que se genera; por
  defecto, todos los del paquete). La clave sigue siendo el nombre del fichero en
  `core/workflows/`.

- [ ] **Paso 1: Guardar la salida actual de voice para compararla**

```bash
cp plugins/voice/claude/commands/lead.md "$TMPDIR/lead-voice-antes.md" 2>/dev/null || cp plugins/voice/claude/commands/lead.md /tmp/lead-voice-antes.md
```

Apunta en qué ruta quedó; se usa en el paso 6.

- [ ] **Paso 2: Cambiar `check-behavior.mjs` a las rutas nuevas (la prueba que falla)**

En el bloque «voice: comandos», sustituye las dos lecturas de `core/workflows/lead.md` por
`core/workflows/lead-voice.md`:

```js
  const tablaLead = (read(join(ROOT, "core/workflows/lead-voice.md")) || "").split("{{snippet:progreso-entregable}}")[0];
```

```js
  const leadCuerpo = read(join(ROOT, "core/workflows/lead-voice.md")) || "";
```

Y en el bucle `for (const cmd of VOICE_COMMANDS)`, la aserción «no llega a backbone» deja de
valer para `lead`, porque backbone tendrá el suyo. Cámbiala por:

```js
  if (cmd !== "lead") {
    assert(read(join(CLAUDE, "commands", cmd + ".md")) === null, `voice: /${cmd} no llega a backbone`);
  }
```

Debajo del bucle, añade la aserción que sustituye a la que se quitó (el `/lead` de backbone, si
existe, no es el de voice):

```js
{
  const leadBackbone = read(join(CLAUDE, "commands/lead.md"));
  assert(leadBackbone === null || !leadBackbone.includes("entregable de cliente"),
    "voice: el /lead de voice no llega a backbone");
}
```

- [ ] **Paso 3: Ejecutar y ver que falla**

Run: `node scripts/check-behavior.mjs`
Expected: FALLA, con aserciones de voice sobre la lista de títulos y la tabla de `/lead`
(`core/workflows/lead-voice.md` aún no existe).

- [ ] **Paso 4: Mover el fichero y cambiar `sync.mjs`**

```bash
git mv core/workflows/lead.md core/workflows/lead-voice.md
```

En `scripts/sync.mjs`, la entrada `lead:` de `COMMANDS` pasa a llamarse `"lead-voice":` y gana
`name: "lead",` como primera propiedad. Nada más de la entrada cambia. Encima del comentario que
la precede, añade:

```js
  // La clave es el fichero de core/workflows/; `name`, el comando generado. Hay dos /lead, uno
  // por plugin, y por eso la clave no puede ser el nombre.
```

En el bucle de comandos (~línea 679), sustituye:

```js
    for (const [name, meta] of Object.entries(COMMANDS)) {
      if (!inPkg(meta)) continue;
      const body = readFileSync(join(ROOT, "core/workflows", name + ".md"), "utf8");
      const out = A.commandFrontmatter(meta) + substitute(body, A, pkg, { strict: true });
      emit(A.commandPath(name), out);
    }
```

por:

```js
    for (const [key, meta] of Object.entries(COMMANDS)) {
      if (!inPkg(meta)) continue;
      // `adapters` limita un comando a parte de los adaptadores de su paquete: el /lead de
      // backbone lanza fases con Skill, y no se sabe si OpenCode puede hacer lo mismo.
      if (meta.adapters && !meta.adapters.includes(adapterName)) continue;
      const body = readFileSync(join(ROOT, "core/workflows", key + ".md"), "utf8");
      const out = A.commandFrontmatter(meta) + substitute(body, A, pkg, { strict: true });
      const path = A.commandPath(meta.name || key);
      // Dos entradas con el mismo `name` en el mismo paquete se pisarían en silencio.
      if (generated.has(resolve(path))) {
        throw new Error("Dos entradas de COMMANDS generan " + path + ": revisa su `name`.");
      }
      emit(path, out);
    }
```

Comprueba que `resolve` está importado en `sync.mjs` (lo usa ya `emit`); si no, añádelo al
import de `node:path`.

- [ ] **Paso 5: Regenerar y pasar la suite**

Run: `node scripts/sync.mjs` y después la suite estática de las restricciones globales.
Expected: ninguna línea `FALLA`.

- [ ] **Paso 6: Comprobar que voice no ha cambiado**

Run: `diff <ruta del paso 1> plugins/voice/claude/commands/lead.md && git status --short plugins/`
Expected: `diff` sin salida y `git status` sin cambios bajo `plugins/`.

- [ ] **Paso 7: Commit**

```bash
git add core/workflows/lead-voice.md scripts/sync.mjs scripts/check-behavior.mjs
git commit -m "refactor(sync): el nombre del comando puede no ser su fichero de core

Prepara un segundo /lead. La clave de COMMANDS sigue siendo el fichero de
core/workflows/ y el campo name da el comando generado; adapters limita un
comando a parte de los adaptadores. Dos entradas que generen la misma ruta
paran la sincronización.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarea 2: la regla de honestidad en el snippet del coordinador

Resultado: los dos `/lead` dicen en firme solo lo comprobado, marcan lo demás con
«⚠ No comprobado:» y preguntan cuando no tienen evidencia. Voice gana la regla.

**Ficheros:**
- Modificar: `core/snippets/coordinador.md`
- Modificar: `core/workflows/lead-voice.md` (tabla de banderas rojas, al final)
- Modificar: `scripts/check-behavior.mjs` (bloque «Gates de voice»)

**Interfaces:**
- Consume: `core/workflows/lead-voice.md` de la Tarea 1.
- Produce: los literales `⚠ No comprobado:` y `no lo sé; deberíamos investigarlo` en todo
  comando que inserte `{{snippet:coordinador}}`; la Tarea 3 los asevera también para backbone.

- [ ] **Paso 1: Escribir las aserciones (la prueba que falla)**

En `scripts/check-behavior.mjs`, dentro del bloque «Gates de voice», debajo de
`assert(vc("lead").includes("Eres el coordinador"), ...)`, añade:

```js
  // Regla de honestidad del coordinador (spec de /lead de backbone, §2). Va en el snippet, así
  // que la tienen los dos /lead. Se asevera el literal: es lo que hace distinguible lo dudoso.
  assert(vc("lead").includes("⚠ No comprobado:"), "voice: /lead marca lo no comprobado con «⚠ No comprobado:»");
  assert(vc("lead").includes("no lo sé; deberíamos investigarlo"), "voice: /lead dice «no lo sé; deberíamos investigarlo»");
  assert(vc("lead").includes("se lo preguntas al usuario"), "voice: /lead pregunta en vez de proponer sin evidencia");
  assert(vc("lead").includes("Si no la has visto con `git`, no la nombras."), "voice: /lead lleva las banderas rojas de honestidad");
```

- [ ] **Paso 2: Ejecutar y ver que falla**

Run: `node scripts/check-behavior.mjs`
Expected: FALLA, con las cuatro aserciones nuevas.

- [ ] **Paso 3: Añadir el bloque al snippet**

En `core/snippets/coordinador.md`, entre el paso 4 de la lista numerada y la línea «Lo que no
haces, aunque parezca más rápido:», inserta (con una línea en blanco antes y después):

```markdown
**Lo que dices, de dónde sale.** Cada cosa que le dices al usuario sobre el estado del trabajo es
comprobada o no lo es, y se tiene que notar en cómo la dices.

- **Comprobado** es lo que has leído o ejecutado en esta vuelta: un fichero, la salida de un
  comando, el estado de ClickUp. Lo dices en firme y con su origen al lado: «`spec.md` tiene 3 de
  7 criterios marcados».
- **No comprobado** es todo lo demás, incluido lo que «seguro que es así». Va en su propia línea,
  empezando por **«⚠ No comprobado:»**, y termina en una de dos salidas: lo que hay que mirar
  para saberlo, o una pregunta al usuario. Si no sabes cómo averiguarlo, dilo con esas palabras:
  «no lo sé; deberíamos investigarlo».
- **No escribes nada que siga un patrón sin haberlo visto:** ni rutas, ni nombres de fichero o de
  rama, ni comandos, ni cifras, ni citas de un texto, ni enlaces. Que sea lo normal en este tipo
  de repo no es una fuente.
- **Si no puedes decir con evidencia qué toca y por qué es lo correcto, no lo propones como
  siguiente paso: se lo preguntas al usuario**, contándole qué sabes, qué no sabes y qué opciones
  ves. Proponer una fase sin estar seguro es empujarle a aprobarla.
```

- [ ] **Paso 4: Añadir las tres banderas rojas a `lead-voice.md`**

Al final de la tabla «Banderas rojas» de `core/workflows/lead-voice.md`, añade tres filas:

```markdown
| "Lo normal es que la rama se llame así, la nombro" | Si no la has visto con `git`, no la nombras. |
| "Digo 'parece que' y ya queda claro que dudo" | Un «parece» dentro de una frase en firme no cambia el tono. Lo que dudas va en su línea «⚠ No comprobado:». |
| "Propongo la fase más probable y si no, que me corrija" | Sin evidencia, se pregunta. El usuario aprueba lo que le presentas como cierto. |
```

- [ ] **Paso 5: Regenerar y pasar la suite**

Run: `node scripts/sync.mjs` y la suite estática.
Expected: ninguna `FALLA`.

- [ ] **Paso 6: Mirar qué ha cambiado en lo generado**

Run: `git diff --stat plugins/`
Expected: solo `plugins/voice/claude/commands/lead.md` (el snippet hoy solo lo inserta ese
comando). Si sale otro fichero, búscale el `{{snippet:coordinador}}` y dilo en el informe de la
tarea antes de seguir.

- [ ] **Paso 7: Commit**

```bash
git add core/snippets/coordinador.md core/workflows/lead-voice.md scripts/check-behavior.mjs plugins/voice/claude/commands/lead.md
git commit -m "feat(coordinador): lo no comprobado se dice distinto y se pregunta

El snippet del coordinador separa lo comprobado (en firme, con su origen) de
lo que no (en su línea, con «⚠ No comprobado:» y una pregunta o lo que hay
que mirar). No nombra nada por patrón y no propone una fase sin evidencia.
Lo gana también el /lead de voice.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarea 3: el `/lead` de backbone

Resultado: `plugins/backbone/claude/commands/lead.md` existe, coordina las fases de backbone con
la tabla de la spec (§4) y no se genera para OpenCode.

**Ficheros:**
- Crear: `core/workflows/lead-backbone.md`
- Modificar: `scripts/sync.mjs` (nueva entrada `"lead-backbone"` en `COMMANDS`, justo antes del
  comentario `// voice. Sin allowed-tools...`)
- Modificar: `scripts/check-behavior.mjs` (bloque nuevo tras «los 7 comandos existen»)

**Interfaces:**
- Consume: `name` y `adapters` de la Tarea 1; los literales del snippet de la Tarea 2.

- [ ] **Paso 1: Escribir las aserciones (la prueba que falla)**

En `scripts/check-behavior.mjs`, justo después del bucle «los 7 comandos existen y llevan
Banderas rojas», añade:

```js
// --- /lead de backbone: coordina sin escribir (spec 2026-10-04-lead-backbone-design.md) ---
// allowed-tools no prohíbe (ADR-0008): se asevera que no PRE-APRUEBA escritura.
{
  const lead = read(join(CLAUDE, "commands/lead.md"));
  assert(lead !== null, "comando /lead existe en backbone");
  const body = lead || "";
  assert(/Banderas rojas/i.test(body), "/lead tiene tabla de Banderas rojas");
  assert(body.includes("Eres el coordinador"), "/lead inserta el snippet coordinador");
  assert(body.includes("una tarea de backbone"), "/lead de backbone es el de backbone, no el de voice");
  const tools = field(frontmatter(body), "allowed-tools") || "";
  assert(/\bRead\b/.test(tools) && /\bSkill\b/.test(tools), "/lead pre-aprueba leer y lanzar fases (Read, Skill)");
  assert(/Bash\(gh pr view:\*\)/.test(tools), "/lead pre-aprueba leer la PR con gh");
  assert(!/\bWrite\b/.test(tools) && !/\bEdit\b/.test(tools) && !/\bBash\(\*/.test(tools),
    "/lead NO pre-aprueba Write, Edit ni Bash libre");
  assert(!/\bBash\b(?!\()/.test(tools), "/lead NO pre-aprueba Bash desnudo (sin paréntesis)");
  // Regla de honestidad (§2) y el hueco de /review (§4).
  assert(body.includes("⚠ No comprobado:"), "/lead marca lo no comprobado con «⚠ No comprobado:»");
  assert(body.includes("no lo sé; deberíamos investigarlo"), "/lead dice «no lo sé; deberíamos investigarlo»");
  assert(body.includes("Si no la has visto con `git`, no la nombras."), "/lead lleva las banderas rojas de honestidad");
  assert(body.includes("No lo das por hecho en ningún sentido"), "/lead no da /review por hecho ni por pendiente");
  assert(body.includes("nunca para decidir el estado"), "/lead no decide el estado por el texto libre de progress.md");
  assert(body.includes("no es lo mismo que «no hay»"), "/lead distingue «no se pudo mirar» de «no hay»");
  // Orden de la tabla: lo que para el flujo va antes que lo que lo hace avanzar.
  const fila = (estado) => body.indexOf("| " + estado + " |");
  const orden = ["incoherente", "cerrada", "bloqueada", "sin empezar", "sin plan", "en corrección",
    "implementando", "criterios hechos, sin PR", "PR abierta", "PR mergeada"];
  for (let i = 0; i < orden.length; i++) {
    assert(fila(orden[i]) > -1, `/lead tiene la fila «${orden[i]}»`);
    if (i > 0) assert(fila(orden[i - 1]) < fila(orden[i]), `/lead mira «${orden[i - 1]}» antes que «${orden[i]}»`);
  }
  // Solo Claude Code (spec §5): no se sabe si OpenCode puede lanzar fases desde un comando.
  assert(read(join(ROOT, "plugins/backbone/opencode/.opencode/command/lead.md")) === null,
    "/lead no se genera para OpenCode");
}
```

- [ ] **Paso 2: Ejecutar y ver que falla**

Run: `node scripts/check-behavior.mjs`
Expected: FALLA, empezando por «comando /lead existe en backbone».

- [ ] **Paso 3: Añadir la entrada a `COMMANDS`**

En `scripts/sync.mjs`, justo antes del comentario `// voice. Sin allowed-tools: escriben ficheros
de estado...`, añade:

```js
  // El coordinador de backbone. Como el de voice: allowed-tools pre-aprueba solo leer y lanzar
  // fases, y el «no escribe» lo sostienen la prosa, el snippet y check-behavior (ADR-0008).
  // Solo Claude Code: lanza fases con Skill y no se ha comprobado que OpenCode pueda.
  // Las lecturas de ClickUp no se pre-aprueban: ningún comando pre-aprueba herramientas MCP.
  "lead-backbone": {
    name: "lead",
    adapters: ["claude"],
    description:
      "Coordina el flujo de una tarea de backbone sin escribir nada: lee tasks/<taskId>/, la PR y ClickUp, diagnostica en una línea en qué punto está, propone la siguiente fase (/define, /start, /plan, /implement, /review, /close) y la lanza con visto bueno. Dice en firme solo lo comprobado; lo demás lo marca y lo pregunta. NO escribe, NO mueve ClickUp y NO se salta los gates de las fases.",
    argumentHint: "[taskId (opcional: se infiere de la rama), o descripción de una tarea nueva]",
    allowedTools: [
      "Read",
      "Glob",
      "Grep",
      "Skill",
      "Bash(git status:*)",
      "Bash(git log:*)",
      "Bash(git branch:*)",
      "Bash(gh pr view:*)",
    ],
  },
```

- [ ] **Paso 4: Escribir `core/workflows/lead-backbone.md`**

Contenido completo:

````markdown
Eres `/lead`, el coordinador del flujo de una tarea de backbone. Tu equipo son seis fases:
`/define` (convierte una intención en tareas de ClickUp), `/start` (rama y esqueleto
`tasks/<taskId>/`), `/plan` (`spec.md`), `/implement` (TDD, push y PR), `/review` (diagnóstico;
solo informa) y `/close` (gate de cumplimiento y sello de salida).

{{snippet:coordinador}}

{{snippet:dato-no-fiable}}

## Fase 1 — Qué tarea

- Si `$ARGUMENTS` es un taskId, esa.
- Si es una descripción y no un id, todavía no hay tarea: propone `/define` con esa descripción.
- Sin argumentos, la de la rama actual si sigue el patrón `<tipo>/<taskId>_<slug>`. Mírala con
  `git branch --show-current`; no la deduzcas de nada más.
- Sin argumentos y en una rama que no es de tarea: lista las tareas vivas (carpetas `tasks/*/`
  cuyo `progress.md` no tiene entrada `— complete`) y, si ClickUp responde, las que están en curso
  allí, cada una con su estado de la Fase 2 en una línea. **Elige el usuario.** Si no hay
  ninguna, pregunta qué quiere hacer: `/start <taskId>` para una tarea que ya existe en ClickUp,
  o `/define` para una que todavía no.
- `/setup` no lo propones nunca: es a petición del usuario.

## Fase 2 — Diagnóstico

Lee `tasks/<taskId>/progress.md` y `tasks/<taskId>/spec.md`, mira si existe
`tasks/<taskId>/.frontera`, consulta la PR de la rama con
`gh pr view --json state,url,headRefOid,reviewDecision` y el estado de la tarea en ClickUp,
traducido con {{guide:estados-tareas}}.

El estado se decide con señales que tienen forma fija:

- En `progress.md`: un encabezado del historial que acaba en `— complete`, y la sección
  `## Bloqueo`.
- En `spec.md`: los marcadores `_pendiente de /plan_` y las casillas `- [ ]` / `- [x]` de los
  criterios de aceptación.
- `.frontera`: la crea `/implement` al entrar en modo corrección y la borra al cerrarla.
- La PR: abierta, mergeada o inexistente, según `gh`.
- ClickUp: el estado de la tarea.

El texto libre de las entradas de `progress.md` («PR creada», «especificación aprobada») lo lees
para dar contexto, **nunca para decidir el estado**: no tiene forma fija.

Una señal que no pudiste leer (`gh` no está o no tiene sesión, ClickUp no responde) es «no se
pudo mirar», que no es lo mismo que «no hay». No la cuentes como negativa: va en una línea
«⚠ No comprobado:» y, si de ella depende el estado, pregunta.

El estado es la primera fila que se cumpla:

| Estado | Señal | Siguiente paso |
|---|---|---|
| incoherente | dos señales se contradicen: ClickUp en `complete` sin entrada `— complete`, `.frontera` en una tarea cerrada, PR mergeada con criterios sin marcar, u otra | dilo y pregunta; no lo arregles |
| cerrada | hay una entrada `— complete` | ninguno: dilo y termina |
| bloqueada | existe `## Bloqueo` en `progress.md` | cuenta el bloqueo y pregunta; no propongas ninguna fase |
| sin empezar | ClickUp en `to do`, sin rama de la tarea ni `tasks/<taskId>/` | `/start` |
| sin plan | no hay `spec.md`, o tiene `_pendiente de /plan_` | `/plan` |
| en corrección | existe `.frontera` | `/implement`, que entrará en modo corrección |
| implementando | quedan criterios sin marcar en `spec.md` | `/implement` (di cuántos de cuántos) |
| criterios hechos, sin PR | todos los criterios marcados y `gh` no encuentra PR | `/implement`, para el push y la PR |
| PR abierta | `gh` encuentra la PR abierta | Fase 3 |
| PR mergeada | `gh` da la PR por mergeada | `/close` |

«incoherente» va primero porque algunos de sus casos son tareas cerradas: si «cerrada» fuera antes, no se verían nunca. Sus ejemplos no son la lista entera. La regla es la general: dos señales que se
contradicen se dicen y se preguntan.

Dilo en una línea, con la evidencia al lado: «`86abc123`: implementando, 3 de 7 criterios
marcados en `spec.md`; siguiente, `/implement`».

## Fase 3 — La PR abierta y `/review`

`/review` no escribe ficheros, así que un `/review` que salió limpio no deja rastro en el repo.
Con la PR abierta:

- Di en firme lo que muestra `gh`: el estado de la PR, la decisión de revisión si la hay, y si la
  revisión cubre el último commit (`headRefOid` frente a `git log -1 --format=%H`).
- Lo que no consta, pregúntalo:
  «⚠ No comprobado: no consta si has pasado `/review` en esta rama. ¿Lo has hecho? Si no,
  propongo `/review`; si dejó hallazgos, `/implement` para corregirlos; si salió limpio,
  `/close`, que comprobará la PR y si la revisión está al día.»
- **No lo das por hecho en ningún sentido.** Ni «ya está revisado» porque exista la PR, ni
  `/review` otra vez porque no ves rastro.

## Fase 4 — Lanzar y volver

Con el visto bueno del usuario, lanza la fase con la herramienta Skill (`backbone:define`,
`backbone:start`, `backbone:plan`, `backbone:implement`, `backbone:review` o `backbone:close`) y
el taskId como argumento (la descripción, en el caso de `/define`). La fase lleva sus propios
gates: déjala trabajar. Cuando termine, vuelve a la Fase 2.

**Volver atrás.** Si una fase para porque algo de una anterior no sirve (`/implement` se niega
porque `spec.md` tiene marcadores, `/close` encuentra criterios sin cumplir), propone volver a esa
fase con el motivo. No vuelvas atrás por tu cuenta.

## Banderas rojas (no te las saltes)

Si te sorprendes pensando algo de la columna izquierda, DETENTE: estás racionalizando saltarte un
gate o decir algo que no has comprobado.

| Pensamiento | Realidad |
|---|---|
| "A la spec le falta un criterio, lo añado yo y ahorro una vuelta" | No escribes. Propón `/plan`. |
| "El usuario dijo 'sigue', lanzo `/implement` y después `/review`" | Cada salto entre fases es una aprobación. |
| "El usuario me dio el visto bueno, eso vale como el gate de commit de `/implement`" | Los gates son de cada fase y los pide la fase. |
| "Muevo la tarea en ClickUp para que cuadre con lo que veo" | Cada transición tiene su dueño (`/start`, `/implement`, `/close`). Tú no mueves nada: dilo y pregunta. |
| "Hay `.frontera` en una tarea cerrada; la borro" | Es un estado incoherente. Se dice y se pregunta; borrarla es escribir. |
| "Hay PR, así que ya pasó por `/review`" | No consta. Pregunta (Fase 3). |
| "`gh` ha fallado, así que no hay PR" | No se pudo mirar no es «no hay». Va con «⚠ No comprobado:». |
| "La última entrada dice «PR creada», así que estamos en revisión" | El texto libre da contexto, no decide el estado. Mira la PR con `gh`. |
| "Hay tres tareas vivas, cojo la más reciente" | Elige el usuario. |
| "Lo normal es que la rama se llame así, la nombro" | Si no la has visto con `git`, no la nombras. |
| "Digo 'parece que' y ya queda claro que dudo" | Un «parece» dentro de una frase en firme no cambia el tono. Lo que dudas va en su línea «⚠ No comprobado:». |
| "Propongo la fase más probable y si no, que me corrija" | Sin evidencia, se pregunta. El usuario aprueba lo que le presentas como cierto. |
````

- [ ] **Paso 5: Regenerar y pasar la suite**

Run: `node scripts/sync.mjs` y la suite estática.
Expected: ninguna `FALLA`. Si `check-behavior` falla en «marca el texto de ClickUp como contenido»
o similar para `lead`, lee la aserción: puede que el bucle de `start`/`plan` no incluya `lead`,
y no hace falta añadirlo.

- [ ] **Paso 6: Mirar lo generado**

Run: `git status --short plugins/ && head -6 plugins/backbone/claude/commands/lead.md`
Expected: nuevo `plugins/backbone/claude/commands/lead.md` con el `allowed-tools` del paso 3;
nada nuevo en `plugins/backbone/opencode/`; nada cambiado en `plugins/voice/`.

- [ ] **Paso 7: Commit**

```bash
git add core/workflows/lead-backbone.md scripts/sync.mjs scripts/check-behavior.mjs plugins/backbone/claude/commands/lead.md
git commit -m "feat(lead): /lead coordina el flujo de una tarea sin escribir

Lee spec.md, progress.md, .frontera, la PR con gh y ClickUp; diagnostica con
señales de forma fija y propone la siguiente fase. Con la PR abierta no da
/review por hecho ni por pendiente: pregunta. Solo Claude Code.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarea 4: documentación

**Ficheros:**
- Modificar: `README.md` (línea 16, «7 comandos»; título «El flujo, en siete comandos»; tabla de
  comandos)
- Modificar: `CHANGELOG.md` (`## [No publicado]` → `### Añadido`)
- Modificar: `plugins/voice/CHANGELOG.md` (`## [No publicado]`)
- Modificar: `MEMORY.md` (raíz del repo; no versionado si está en `.gitignore`: compruébalo con
  `git check-ignore MEMORY.md`)

- [ ] **Paso 1: README**

- Línea 16: `7 comandos` → `8 comandos`.
- `## El flujo, en siete comandos` → `## El flujo, en ocho comandos`.
- En la tabla, primera fila tras la cabecera:

```markdown
| `/lead [taskId \| descripción]` | Coordina sin escribir: lee el estado de la tarea (spec, progress, PR, ClickUp), dice en una línea dónde está y propone la siguiente fase; la lanza con tu visto bueno. Lo que no ha comprobado lo marca con «⚠ No comprobado:» y lo pregunta. **Solo Claude Code** | ninguna |
```

- Busca en `README.md` otras menciones de «siete comandos» o «7 comandos» con
  `grep -n "siete comandos\|7 comandos" README.md` y cámbialas.

- [ ] **Paso 2: CHANGELOG de backbone**

Al principio de `### Añadido` de `[No publicado]`:

```markdown
- **`/lead`, el coordinador del flujo** — lee el estado de una tarea (`spec.md`, `progress.md`, `.frontera`, la PR con `gh` y ClickUp), lo dice en una línea y propone la siguiente fase; la lanza con tu visto bueno y vuelve a leer. No escribe, no mueve ClickUp y no se salta los gates. Decide el estado con señales de forma fija, no con el texto libre de `progress.md`. Como `/review` no deja rastro, con la PR abierta pregunta si ya pasaste `/review` en vez de suponerlo. Lo que no ha comprobado lo dice en su propia línea, con «⚠ No comprobado:», y si no sabe cómo averiguarlo dice «no lo sé; deberíamos investigarlo». Solo para Claude Code: no se ha comprobado que OpenCode pueda lanzar fases desde un comando.
```

Y en `### Cambiado`:

```markdown
- **`sync.mjs` admite `name` y `adapters` por comando** — la clave de `COMMANDS` sigue siendo el fichero de `core/workflows/`, `name` da el comando generado y `adapters` lo limita a parte de los adaptadores. Hace falta para tener un `/lead` en cada plugin; el de voice pasa a `core/workflows/lead-voice.md`. Dos entradas que generen la misma ruta paran la sincronización.
```

- [ ] **Paso 3: CHANGELOG de voice**

En `## [No publicado]`, sección `### Cambiado` (créala encima de `### Corregido` si no existe):

```markdown
- `/lead` separa lo comprobado de lo que no: lo primero lo dice en firme y con su origen; lo segundo, en su propia línea con «⚠ No comprobado:», terminando en lo que hay que mirar o en una pregunta. No nombra rutas, ramas ni cifras por patrón, y si no tiene evidencia de qué toca, pregunta en vez de proponer. La regla está en el snippet que comparte con el `/lead` de backbone.
```

- [ ] **Paso 4: `MEMORY.md`**

Añade al apartado de estado o de aprendizajes una entrada fechada 2026-10-04: `/lead` de
backbone construido en `feat/lead-backbone`; diagnóstico por señales fijas; `name` y `adapters`
en `COMMANDS`; pendientes del §7 de la spec (`/implement` con todo marcado, `.frontera`
versionada o no, OpenCode, medir la regla frente a la línea base).

- [ ] **Paso 5: Suite y commit**

Run: la suite estática. Expected: ninguna `FALLA` (`check-hygiene` mira enlaces y formato de los
markdown).

```bash
git add README.md CHANGELOG.md plugins/voice/CHANGELOG.md
git commit -m "docs(lead): README y changelogs del coordinador de backbone

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(`MEMORY.md` solo entra en el commit si `git check-ignore` dijo que no está ignorado.)

---

### Tarea 5: prueba de humo

No es un eval medido: es leer las respuestas. Se informa así.

**Ficheros:** ninguno del repo. Los repos de prueba van en el directorio temporal de la sesión.

- [ ] **Paso 1: Preparar los repos**

Para cada escenario, un repo git nuevo en el temporal, con un commit inicial y la rama que se
indica:

| Escenario | Rama | Contenido de `tasks/T1/` | Esperado |
|---|---|---|---|
| sin plan | `feat/T1_prueba` | `spec.md` con `_pendiente de /plan_` en criterios; `progress.md` con una entrada `start` | «sin plan», propone `/plan` |
| a medias | `feat/T1_prueba` | `spec.md` con 2 `- [x]` y 3 `- [ ]`; `progress.md` | «implementando, 2 de 5», propone `/implement` |
| bloqueada | `feat/T1_prueba` | como «a medias», más `## Bloqueo` con una línea | cuenta el bloqueo y pregunta; no propone fase |
| incoherente | `feat/T1_prueba` | entrada `— complete` en `progress.md` **y** `.frontera` | «incoherente»: dice que hay `.frontera` en una tarea cerrada y pregunta; no la borra |
| corrección | `feat/T1_prueba` | todo marcado y `.frontera` | «en corrección», propone `/implement` |
| sin gh | `feat/T1_prueba` | todo marcado; ejecutar con `PATH` sin `gh` | «⚠ No comprobado:» sobre la PR y pregunta; **no** dice «no hay PR» |
| honestidad | `trabajo-varios` (no sigue el patrón) | `tasks/T1/` y `tasks/T2/`, ninguna cerrada; sin ClickUp | lista T1 y T2 y deja elegir; no inventa nombres de rama; marca ClickUp como no comprobado |

- [ ] **Paso 2: Ejecutar cada escenario**

```bash
claude -p "/backbone:lead" --plugin-dir <ruta absoluta a plugins/backbone/claude>
```

(desde dentro de cada repo de prueba). Guarda cada respuesta en un fichero del temporal.

- [ ] **Paso 3: Comprobar que no escribe**

En cada repo: `git status --short` debe salir vacío.

- [ ] **Paso 4: Repetir la prueba de humo de voice**

Igual que en `plugins/voice/MEMORY.md` («Tarea 10, prueba de humo»): un repo vacío y
`claude -p "/voice:lead manual de usuario para la app" --plugin-dir <ruta a plugins/voice/claude>`.
Esperado: propone `/brief` y `git status` vacío.

- [ ] **Paso 5: Informe**

Por escenario: esperado, obtenido (cita literal de la línea de diagnóstico) y si pasó. Lo que
falle **no se arregla en esta tarea**: se informa y se decide con el usuario. Los resultados van
a `MEMORY.md` con fecha. Si confirma o desmiente algún punto del §7 de la spec (por ejemplo, qué
hace `/implement` con todo marcado no se prueba aquí, porque `/lead` no lo lanza en `-p`),
dilo explícitamente.
