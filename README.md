# backbone · marketplace `biomas`

**Entra un ticket de ClickUp, sale una PR que otra persona puede revisar.** Entre medias el
agente recorre siempre el mismo camino de cinco pasos, deja por escrito en el repo lo que
decide, y te pide permiso para todo lo que se ve desde fuera: commits, push, PR y cambios
de estado.

Funciona igual en **Claude Code** y en **OpenCode**.

## De un vistazo

| | |
|---|---|
| **Qué es** | Un flujo de desarrollo para agentes de IA, guiado por tareas de ClickUp: `spec.md` → TDD → revisión → cierre |
| **Para quién** | Equipos que ya trabajan por ticket, con criterios de aceptación y una PR que revisa un humano |
| **Qué trae** | 8 comandos · 32 guías que se activan solas · 8 subagentes de solo lectura · 4 hooks |
| **Dónde corre** | Claude Code (plugin del marketplace `biomas`) · OpenCode (carpeta `.opencode/` lista para copiar) |
| **Mínimo para arrancar** | Git con rama base `develop` + Node.js 18+ |
| **Para el 100 %** | ClickUp, `gh`, graphify, `CLAUDE.md` y tres add-ons — [tabla de complementos](#los-complementos) |
| **Qué NO hace** | Aprobar por ti. `/review` solo informa, y el paso a `complete` lo firma siempre una persona |

## El marketplace tiene dos plugins

- **`backbone`** (este README): de un ticket de ClickUp a una PR que otra persona revisa.
- **`voice`**: de un encargo de cliente a un entregable que se puede enviar (manual de usuario,
  presentación, informe técnico). Se instala aparte con `/plugin install voice@biomas`; mira su
  [README](plugins/voice/README.md).

## El problema que resuelve

Un agente suelto sobre un ticket falla casi siempre por los mismos tres sitios:

- **Escribe código antes de saber qué se acepta.** Sin criterios verificables, "está hecho"
  es una opinión, y la discusión llega en la PR, cuando ya cuesta cambiarla.
- **Cada sesión empieza de cero.** Cierras el portátil y se va con él qué se decidió, qué se
  probó y qué quedó a medias.
- **El repaso lo hace quien escribió el código.** Un agente revisando su propio diff
  confirma lo que ya creía.

El plugin contesta a los tres con ficheros del repo y con agentes distintos: `spec.md` fija
los criterios antes de tocar código, `progress.md` guarda el hilo entre sesiones, y `/review`
despacha subagentes de contexto fresco que no escribieron nada, más un verificador que
intenta refutar cada hallazgo antes de que llegue al informe.

## El flujo, en ocho comandos

| Comando | Qué hace | Transición de ClickUp |
|---|---|---|
| `/lead [taskId \| descripción]` | Coordina sin escribir: lee el estado de la tarea (spec, progress, PR, ClickUp), dice en una línea dónde está y propone la siguiente fase; la lanza con tu visto bueno. Lo que no ha comprobado lo marca con «⚠ No comprobado:» y lo pregunta. **Solo Claude Code** | ninguna |
| `/define [descripción]` | Redacta una tarea bien formada o descompone un problema en varias priorizadas, y las crea en ClickUp. No escribe en el repo ni estima | crea tareas en `to do` (con aprobación) |
| `/start [taskId]` | Lee la tarea, crea rama `tipo/taskId_slug` desde `develop` y el esqueleto `tasks/<taskId>/` (spec.md + progress.md) | `to do → in progress` (con aprobación) |
| `/plan [taskId]` | Explora el repo (grafo de graphify si está disponible) y completa `spec.md` con criterios de aceptación, alcance y enfoque | ninguna |
| `/implement [taskId]` | TDD criterio a criterio contra spec.md; duda en vuelo sobre las decisiones no triviales; commits/push/PR solo con aprobación | `in progress → review` al crear la PR (con aprobación) |
| `/review [taskId]` | Diagnóstico en 7 dimensiones frente a spec.md (taxonomía ISO 25010; usabilidad/accesibilidad solo si el diff toca UI, entrega y operación solo si toca despliegue); **solo informa** | ninguna |
| `/close [taskId]` | Valida los criterios contra spec.md; si están en verde, sella la salida en `progress.md` y propone el cierre. Admite cierre por abandono | `review → complete` (con aprobación) |
| `/setup` | A petición, fuera del camino de un ticket: comprueba si faltan `CLAUDE.md` (o `AGENTS.md`) y `MEMORY.md`, explica para qué sirve cada uno y los crea con aprobación. `CLAUDE.md` sale de lo verificado en el repo; `MEMORY.md` es personal y va al `.gitignore` | ninguna |

Principios transversales: **nada se afirma sin comprobarlo** —todo dato escrito es hecho
verificado, asunción declarada o dato del usuario, y un hueco que cambiaría el trabajo se
pregunta en vez de suponerse (guía `evidencia-y-preguntas`)—, gates de aprobación para todo
lo visible, `$ARGUMENTS` con fallback por inferencia de rama, detección de modo por
contexto, degradación elegante si falta ClickUp o graphify, e historial inmutable en
`progress.md`.

## Qué ganas

- **Continuidad sin volver a contarlo.** Al abrir sesión sobre una rama de tarea, el hook
  `SessionStart` inyecta el "Estado actual" de `progress.md` y los criterios que quedan
  pendientes en `spec.md`. No hay que ponerle al día.
- **Datos que puedes discutir.** La guía `evidencia-y-preguntas` obliga a etiquetar cada
  afirmación como hecho verificado, asunción declarada o dato tuyo. Un "debería funcionar"
  sin comprobar no llega al informe.
- **Tú firmas lo que se ve.** Commit, push, PR y cambio de estado pasan por una aprobación
  explícita, y lo irreversible tiene además un hook determinista detrás (abajo).
- **La revisión la hace quien no escribió el código.** Cuatro subagentes que se reparten las
  seis dimensiones, con
  el campo `tools` limitado a lectura —bloqueo real, no una promesa en la prosa— y un
  verificador adversarial que intenta refutar cada hallazgo antes del informe.
- **El criterio no se reinventa en cada sesión.** 32 guías (SQL, migraciones, rendimiento,
  accesibilidad, coste, prompts, diagramas…) que se activan solas por contexto, con sus
  síntomas escritos en la `description`.
- **La misma prosa en dos herramientas.** Todo vive en `core/` y `scripts/sync.mjs` genera
  los dos adaptadores, así que Claude Code y OpenCode no se separan con el tiempo.
- **Lo que promete está probado.** Trece comprobaciones `check-*.mjs` —doce de ellas en CI—
  verifican el comportamiento, no solo que el YAML parsee: que los hooks no escriban fuera,
  que la fusión no pierda hallazgos, que el escaneo del suelo de calidad case de verdad.

### El gate de lo irreversible (hook `PreToolUse`)

Los gates de arriba viven en la prosa de los comandos: gobiernan al agente cuando razona, no
cuando se salta el paso. Para el puñado de acciones que un `git revert` **no deshace**, el
plugin añade un hook determinista (`hooks/destructive-guard.js`) que devuelve la decisión al
usuario antes de ejecutarlas:

| Acción | Decisión |
|---|---|
| Push forzado a `main`/`master`/`develop` · `DROP DATABASE` · `rm -rf` sobre `/`, `~` o un comodín | **deny** (que lo ejecute el usuario) |
| Push forzado a otra rama · `reset --hard` · `clean -f` · borrado forzado de rama · `rm -rf` acotado | **ask** |
| `DROP TABLE` · `TRUNCATE` · `DELETE`/`UPDATE` sin `WHERE` · reinicio de migraciones | **ask** |
| Escribir sobre `.env*` (no plantillas) o editar una migración ya existente | **ask** |

Es una **red para accidentes, no un sandbox**: un agente decidido puede reformular el comando.
El bloqueo duro de solo-lectura sigue siendo el campo `tools` de los agentes revisores.
Se ajusta por entorno: `BACKBONE_PROTECTED_PATHS` añade rutas propias del repo y
`BACKBONE_GUARD=off` lo desactiva (ver `examples/repo-settings.json`).

### El commit que no consta (hook `PostToolUse`)

Registrar el avance es el paso 5 de la fase de `/implement` y el gate de commit es el 6.
El orden es correcto, pero vive en la prosa del comando: depende de que el agente no se
salte el paso y de que el commit pase por ahí. Un commit a mano, o una sesión que
encadena, y el historial de `progress.md` se queda corto — que es justo el antipatrón
«Entrada sin salida» que la guía `registro-progreso` nombra sin poder impedir.

El hook `post-commit-progress.js` lo cierra por el otro lado: tras un `git commit` en una
rama de tarea, si la última entrada del historial es más de 15 minutos anterior al
commit, inyecta un recordatorio con el hash y el asunto y apunta a la guía. **No escribe
nada** — como el resto de hooks, solo lee y emite contexto. `SessionStart` repite la
comprobación al arrancar, por si el aviso se perdió.

El margen de 15 minutos es la decisión de diseño, no un detalle: en el camino feliz la
entrada se escribe justo **antes** del commit, así que exigir que el historial sea más
nuevo que HEAD haría saltar el aviso siempre, incluso cuando el flujo se cumplió. Un
aviso que salta siempre se lee como ruido y acaba en el mismo sitio que el «Bloqueo
fantasma»: ignorado.

## Qué necesitas

### Lo mínimo

Sin esto el flujo no arranca:

- **Git** y la rama base `develop` en el repo consumidor.
- **Node.js 18+** (para el MCP de ClickUp vía `npx` y para los scripts del plugin).

### Los complementos

Todo lo demás es opcional y **degrada en vez de romperse**: si falta, el comando lo dice y
sigue por el camino manual. Esta tabla es la respuesta a "qué me falta para el 100 %".

| Complemento | Qué añade | Si no está |
|---|---|---|
| **ClickUp** (MCP incluido) | `/start` lee la tarea y los comandos mueven el estado. Necesita API key personal `pk_…` + `TEAM_ID` | El agente te pregunta el estado y sigue con tu respuesta |
| **`CLAUDE.md` / `AGENTS.md` del repo** | De ahí salen stack, comandos exactos, convenciones y ficheros intocables que `/plan` e `/implement` respetan | Se deducen leyendo código: acierta menos y gasta más |
| **GitHub CLI (`gh`)** | `/implement` crea la PR y `/close` comprueba si está mergeada | Abres la PR a mano y se lo dices |
| **graphify** | Mapa del repo en `/plan` y análisis de impacto en `/review` sin leer ficheros crudos | Exploración por lectura directa |
| **diagram-design** | Diagramas editoriales HTML/SVG/PNG para documentación, cliente o diapositivas | La guía `diagramas` degrada a Mermaid |
| **frontend-design** (Anthropic, se instala aparte) | UI distintiva —paleta, tipografía, layout— antes de cablear la lógica en `/implement` | El flujo sigue sin él |
| **Automatización de navegador** (Chrome DevTools MCP o Playwright) | QA exploratoria real sobre la aplicación en `/implement` | El mismo proceso, a mano |

Instalación de los tres add-ons:

- **graphify**: `uv install graphifyy` (con doble *y*; el comando CLI es `graphify`). Añade
  `graphify-out/` al `.gitignore` del repo consumidor.
- **diagram-design**: `/plugin marketplace add https://github.com/cathrynlavery/diagram-design.git`
  y `/plugin install diagram-design@diagram-design` (ámbito *user*). Usa la URL HTTPS: con el
  atajo `owner/repo` Claude Code resuelve a SSH y falla si no tienes la host key de GitHub.
  Para exportar a PNG hace falta además `pip install playwright` y
  `python -m playwright install chromium`.
- **frontend-design**: es software propietario de Anthropic (© Anthropic PBC), así que **no
  se redistribuye** con este plugin — solo lo recomendamos. Instálalo desde
  [su repositorio oficial](https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design).

#### graphify en Windows

```powershell
# 1. Python 3.13 desde https://www.python.org/downloads/
# 2. uv
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
# 3. graphify en el proyecto
uvx --from graphifyy graphify install --project
```

## Cuándo NO usar este flujo

Este plugin está construido para **trabajo guiado por tarea**: hay un ticket, hay
criterios de aceptación que alguien va a verificar, y hay una PR que otro humano revisa.
Fuera de ese supuesto, la ceremonia cuesta más de lo que aporta. No lo uses para:

- **Un arreglo de un fichero que ya sabes hacer.** Crear rama, `spec.md`, `progress.md` y
  PR para cambiar una constante es papeleo. Haz el cambio.
- **Un *spike* exploratorio.** `/plan` te pide criterios de aceptación verificables; un
  spike existe precisamente porque todavía no sabes cuáles son. Explora primero, y abre la
  tarea cuando sepas qué vas a construir.
- **Una emergencia en producción.** Los gates de aprobación están para frenar; a las tres
  de la mañana lo que necesitas es desplegar y documentar después.
- **Un repo sin rama base `develop`, o sin nadie que revise la PR.** El flujo termina en
  una revisión humana que no existiría: `/review` solo informa, nunca aprueba.

Y una advertencia sobre el resto del README: los porcentajes, tiempos y costes que
aparecen aquí se midieron **en nuestros repos**. El eval de activación
(`scripts/check-activation.mjs`) existe para que midas los tuyos, no para que te creas los
nuestros. Un número que no has reproducido en tu código es una expectativa, no un dato.

## Instalación — Claude Code

### Ruta rápida

```
/plugin marketplace add leiniercy/biomas-workflow
/plugin install backbone@biomas
/reload-plugins
```

Comprueba con `/help` que aparecen `/start`, `/plan`, `/implement`, `/review` y `/close`.

Si vas a usar graphify, indexa el repo una vez:

```
/graphify src                 # solo el código fuente
/graphify src --mode deep     # extracción más rica (más relaciones inferidas, más tokens)
/graphify src --wiki          # además genera un wiki navegable (graphify-out/wiki/index.md)
```

### Qué configurar después

1. **Credenciales de ClickUp por variables de entorno (recomendado).** El plugin ya incluye
   su propio `.mcp.json` (`plugins/backbone/claude/.mcp.json`, generado por `sync.mjs`) que Claude
   Code auto-registra al instalarlo. Solo exportas las credenciales — no hace falta ningún
   fichero con secretos en el repo consumidor:

   ```bash
   # PowerShell:  $env:CLICKUP_API_KEY="pk_..."; $env:CLICKUP_TEAM_ID="123456"
   export CLICKUP_API_KEY="pk_..."
   export CLICKUP_TEAM_ID="123456"
   ```

   Claude Code expande `${CLICKUP_API_KEY}` y `${CLICKUP_TEAM_ID}` al cargar el `.mcp.json`.
   La API key sale de ClickUp → Settings → Apps → API Token (empieza por `pk_`), y el
   `TEAM_ID` es el número de la URL `app.clickup.com/<TEAM_ID>/...`.
   _(Alternativa por repo: copia `examples/mcp.json.example` como `.mcp.json` con los
   valores literales y añádelo al `.gitignore` — útil si prefieres credenciales por proyecto.)_

2. **Contexto del repo.** Ejecuta `/setup`: propone un `CLAUDE.md` rellenado con lo que
   verifica en el repo, y un `MEMORY.md` personal (ignorado por git). Si prefieres hacerlo a
   mano, la plantilla está en `core/templates/CLAUDE.md.example`; rellena los marcadores: stack, comandos exactos, convenciones, reglas de negocio y
   ficheros que no se tocan. Claude Code lo carga en cada sesión, y es de donde `/plan` e
   `/implement` sacan las convenciones que deben respetar.

3. **Pineado de versión (equipos).** Copia `examples/repo-settings.json` como
   `.claude/settings.json` (o fusiónalo con el existente): deja el plugin fijado al último
   tag publicado (p. ej. `v0.1.2`) con `autoUpdate: false`, para que una actualización no
   cambie el flujo a mitad de sprint.

Al abrir una sesión sobre una rama de tarea (`<tipo>/<taskId>_<slug>`), el hook
`SessionStart` inyecta automáticamente el "Estado actual" de `progress.md` y los criterios
pendientes de `spec.md` — continuidad entre sesiones sin intervención manual.

## Instalación — OpenCode

> **Integración a fondo:** para el detalle completo de cómo OpenCode carga cada pieza
> (comandos, subagentes, skills, MCP, AGENTS.md, plugins), la brecha actual frente al
> adaptador de Claude y el plan para llegar al 100 % de paridad, consulta
> [docs/opencode-integracion.md](docs/opencode-integracion.md).

OpenCode no cuenta con un marketplace interno: la instalación consiste en copiar la carpeta
`.opencode/` del adaptador a tu proyecto. Esa carpeta ya trae **todo** generado por `sync.mjs`.

1. **Copia el adaptador completo:** copia `plugins/backbone/opencode/.opencode/` a la raíz del repo.
   Resultado: `<repo>/.opencode/` con `command/*.md` (comandos `/start` `/plan` `/implement`
   `/review`), `agent/*.md` (subagentes read-only de `/review` y `/plan` + el primario
   `revisor`), `skills/*/SKILL.md` (las guías, auto-activables) y `opencode.json` (MCP de
   ClickUp). OpenCode lee `<repo>/.opencode/opencode.json` automáticamente.

2. **Exporta las credenciales (sin secretos en el repo):** el `opencode.json` usa la
   sustitución `{env:VAR}` de OpenCode, así que solo exportas las variables en tu entorno:

   ```bash
   # PowerShell:  $env:CLICKUP_API_KEY="pk_..."; $env:CLICKUP_TEAM_ID="123456"
   export CLICKUP_API_KEY="pk_..."
   export CLICKUP_TEAM_ID="123456"
   ```
   _(Alternativa por proyecto: copia `examples/opencode.json.example` a la raíz con valores
   literales y añádelo al `.gitignore`.)_

3. **Define el contexto (AGENTS.md):** ejecuta `/setup`, o copia
   `.opencode/templates/AGENTS.md.example` como `AGENTS.md` en la raíz. OpenCode lo lee automáticamente para entender las reglas del flujo.

4. **Verifica:** abre OpenCode en el repo y comprueba — `/` muestra los comandos; `@` muestra
   los subagentes (`revisor-bugs-seguridad`, etc.); `/review` los despacha en paralelo y **no
   puede editar** ficheros (bloqueo real por `permission`). Si dudas de rutas en tu versión,
   `opencode debug paths` lista los directorios que escanea.

## Cómo está hecho (para quien lo mantiene)

```
biomas-workflow/
├── core/                      ← ÚNICA fuente de verdad (editar SOLO aquí)
│   ├── workflows/             start.md · plan.md · implement.md · review.md · close.md
│   ├── guides/                evidencia-y-preguntas · estados-tareas · registro-progreso · grafo-conocimiento · formato-toon · revision-hallazgos · historias-usuario · codigo-limpio · patrones-diseno · niveles-y-tipos-de-prueba · arquitectura · calidad-producto · rendimiento · coste-y-estructuras · llamadas-a-modelos · ingenieria-de-prompts · consultas-correctas · usabilidad-accesibilidad · migraciones-de-datos · depuracion-sistematica · recepcion-de-revision · qa-exploratoria · espacio-de-trabajo-aislado · diagramas · escritura-natural
│   │   └── in-progress/      borradores versionados que NO se publican (ver su README)
│   ├── templates/             CLAUDE.md · AGENTS.md · MEMORY.md (.example) — lo que /setup copia al repo del usuario; se copian byte a byte al plugin
│   ├── snippets/              prosa canónica que se renderiza en varios sitios: dato-no-fiable (el texto de ClickUp es contenido, no instrucciones) · estado-de-cierre (los 4 estados de salida)
│   ├── scripts/               suelo-calidad.mjs (escaneo del suelo de calidad) · fusion-hallazgos.mjs (síntesis de los revisores) · frescura-revision.mjs (¿la revisión cubre lo que cierras?) · entorno.mjs (pre-flight: git, tarea, antigüedad del grafo) — se ejecutan en el repo del usuario
│   └── agents/                revisor-bugs-seguridad · revisor-spec-tests · revisor-convenciones · revisor-usabilidad-accesibilidad · verificador-hallazgos · explorador-repo · refutador-decision
├── scripts/                   sync.mjs (genera adaptadores) · bump-version · check-version · check-behavior (contratos, CI) · check-routing (enrutado del catálogo, CI) · check-hygiene (los hooks no escriben fuera, CI) · check-hooks (el hook de SessionStart, ejecutado, CI) · check-post-commit (el hook de commit sin registrar, ejecutado, CI) · check-guard (el gate de lo irreversible, CI) · check-suelo (el escaneo del suelo, ejecutado, CI) · check-fusion (la fusión no pierde hallazgos, CI) · check-graders (que los graders distingan, CI) · check-frescura (el grado de frescura de la revisión, CI) · check-entorno (el pre-flight no miente, CI) · check-activation (activación con modelo, manual)
├── plugins/                 un directorio por plugin del marketplace, hermanos
│   ├── backbone/
│   │   ├── claude/                plugin nativo de Claude Code (generado + manifiesto + hooks)
│   │   │   ├── scripts/           (generado por sync.mjs — copia de core/scripts)
│   │   │   ├── templates/         (generado por sync.mjs — copia de core/templates)
│   │   │   ├── .claude-plugin/plugin.json
│   │   │   ├── .mcp.json          (generado por sync.mjs — MCP de ClickUp por env vars)
│   │   │   ├── evals/             casos del eval de activación + routing.json (corpus del eval de enrutado) — a mano, NO generado
│   │   │   ├── commands/          (generado por sync.mjs — no editar a mano)
│   │   │   ├── skills/            (generado por sync.mjs — no editar a mano)
│   │   │   ├── agents/            (generado por sync.mjs — subagentes read-only de /review, /plan e /implement)
│   │   │   └── hooks/             SessionStart (contexto de tarea) · Stop (notificación sonora) · PreToolUse (gate de acciones irreversibles) · PostToolUse (commit que no consta en progress.md)
│   │   └── opencode/
│   │       └── .opencode/         carpeta lista para copiar al repo consumidor
│   │           ├── command/       (generado por sync.mjs — no editar a mano)
│   │           ├── scripts/       (generado por sync.mjs — copia de core/scripts)
│   │           └── guides/        (generado por sync.mjs — no editar a mano)
│   └── voice/                 segundo plugin (entregables de cliente): README, memoria de trabajo propia y su salida generada en claude/
├── .claude-plugin/marketplace.json   ← marketplace "biomas" (apunta a plugins/backbone/claude y a plugins/voice/claude)
├── docs/adr/                  decisiones de arquitectura del plugin (léelas antes de re-litigar una)
├── .github/workflows/         review.yml (CI de PRs) · sync-check · version-check · behavior-check · manifest-check · hygiene-check · codeql · secret-scan
└── examples/                  plantillas para repos consumidores
```

**Regla de mantenimiento:** los workflows y guías se editan únicamente en `core/`
(usan tokens `{{guide:nombre}}` para las referencias cruzadas y `{{snippet:nombre}}` para
insertar prosa canónica de `core/snippets/`). Después se ejecuta:

```bash
node scripts/sync.mjs
```

Esto regenera `plugins/backbone/claude/{commands,skills,agents,scripts}` y
`plugins/backbone/opencode/.opencode/{command,guides,agent,skills,scripts}`
sustituyendo los tokens por la ruta correcta de cada herramienta y anteponiendo el
frontmatter propio de cada una. Los ficheros generados se sobrescriben: no los edites a mano.

> **Mejoras y referencias:** los patrones de otros plugins analizados (claude-mem,
> superpowers, code-review, frontend-design) y su estado de adopción están catalogados en
> [docs/referencias.md](docs/referencias.md) — consúltalo antes de planear una mejora.
