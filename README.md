# custom-ia-plugin · marketplace `biomas`

Flujo de desarrollo guiado por tareas de **ClickUp** para agentes de IA, con soporte para
**Claude Code** y **OpenCode**: planificación con `spec.md`, implementación con TDD,
revisión independiente y continuidad entre sesiones vía `progress.md`.

## Arquitectura: core + adaptadores

```
custom-ia-plugin/
├── core/                      ← ÚNICA fuente de verdad (editar SOLO aquí)
│   ├── workflows/             start.md · plan.md · implement.md · review.md
│   ├── guides/                evidencia-y-preguntas · estados-tareas · registro-progreso · grafo-conocimiento · formato-toon · revision-hallazgos · historias-usuario · codigo-limpio · patrones-diseno · niveles-y-tipos-de-prueba · arquitectura · calidad-producto · rendimiento · coste-y-estructuras · consultas-correctas · usabilidad-accesibilidad · migraciones-de-datos · depuracion-sistematica · recepcion-de-revision · qa-exploratoria · espacio-de-trabajo-aislado
│   │   └── in-progress/      borradores versionados que NO se publican (ver su README)
│   └── agents/                revisor-bugs-seguridad · revisor-spec-tests · revisor-convenciones · revisor-usabilidad-accesibilidad · verificador-hallazgos · explorador-repo
├── scripts/                   sync.mjs (genera adaptadores) · bump-version · check-version · check-behavior (CI) · check-activation (eval de activación, manual)
├── adapters/
│   ├── claude/                plugin nativo de Claude Code (generado + manifiesto + hooks)
│   │   ├── .claude-plugin/plugin.json
│   │   ├── .mcp.json          (generado por sync.mjs — MCP de ClickUp por env vars)
│   │   ├── evals/             casos del eval de activación (a mano, NO generado)
│   │   ├── commands/          (generado por sync.mjs — no editar a mano)
│   │   ├── skills/            (generado por sync.mjs — no editar a mano)
│   │   ├── agents/            (generado por sync.mjs — subagentes read-only de /review y /plan)
│   │   └── hooks/             SessionStart (contexto de tarea) · Stop (notificación sonora) · PreToolUse (gate de acciones irreversibles)
│   └── opencode/
│       └── .opencode/         carpeta lista para copiar al repo consumidor
│           ├── command/       (generado por sync.mjs — no editar a mano)
│           └── guides/        (generado por sync.mjs — no editar a mano)
├── .claude-plugin/marketplace.json   ← marketplace "biomas" (apunta a adapters/claude)
├── .github/workflows/         review.yml (CI de PRs) · sync-check · version-check · behavior-check · manifest-check
└── examples/                  plantillas para repos consumidores
```

**Regla de mantenimiento:** los workflows y guías se editan únicamente en `core/`
(usan tokens `{{guide:nombre}}` para las referencias cruzadas). Después se ejecuta:

```bash
node scripts/sync.mjs
```

Esto regenera `adapters/claude/{commands,skills}` y `adapters/opencode/.opencode/{command,guides}`
sustituyendo los tokens por la ruta correcta de cada herramienta y anteponiendo el
frontmatter propio de cada una. Los ficheros generados se sobrescriben: no los edites a mano.

> **Mejoras y referencias:** los patrones de otros plugins analizados (claude-mem,
> superpowers, code-review, frontend-design) y su estado de adopción están catalogados en
> [docs/referencias.md](docs/referencias.md) — consúltalo antes de planear una mejora.

## El flujo (igual en ambas herramientas)

| Comando | Qué hace | Transición de ClickUp |
|---|---|---|
| `/start [taskId]` | Lee la tarea, crea rama `tipo/taskId_slug` desde `develop` y el esqueleto `tasks/<taskId>/` (spec.md + progress.md) | `to do → in progress` (con aprobación) |
| `/plan [taskId]` | Explora el repo (grafo de graphify si está disponible) y completa `spec.md` con criterios de aceptación, alcance y enfoque | ninguna |
| `/implement [taskId]` | TDD criterio a criterio contra spec.md; commits/push/PR solo con aprobación | `in progress → review` al crear la PR (con aprobación) |
| `/review [taskId]` | Diagnóstico en 6 dimensiones frente a spec.md (taxonomía ISO 25010; usabilidad/accesibilidad solo si el diff toca UI); **solo informa** | ninguna |

El paso a `complete` es siempre humano. Principios transversales: **nada se afirma sin
comprobarlo** —todo dato escrito es hecho verificado, asunción declarada o dato del usuario, y
un hueco que cambiaría el trabajo se pregunta en vez de suponerse (guía
`evidencia-y-preguntas`)—, gates de aprobación para todo lo visible (commits, push, PR,
estados), `$ARGUMENTS` con fallback por inferencia de rama, detección de modo por contexto,
degradación elegante si falta ClickUp o graphify, e historial inmutable en `progress.md`.

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
Se ajusta por entorno: `CUSTOM_IA_PROTECTED_PATHS` añade rutas propias del repo y
`CUSTOM_IA_GUARD=off` lo desactiva (ver `examples/repo-settings.json`).

## Add-on recomendado: diseño de UI (`frontend-design`)

Para tareas de **interfaz web**, este flujo compone bien con la skill oficial de
Anthropic [`frontend-design`](https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design)
(genera UI distintiva — paleta, tipografía, layout — evitando la "estética genérica de IA").

Es **opcional y se instala aparte**: `frontend-design` es software propietario de Anthropic
(© Anthropic PBC), por lo que **no se redistribuye** con este plugin — solo lo recomendamos.
Instálalo siguiendo su repositorio oficial (enlace arriba). Cuando lo tengas instalado,
`/implement` lo aprovechará para diseñar componentes de UI antes de cablear la lógica; si no
está, el flujo degrada sin problema.

## Requisitos comunes

- **Git** y la rama base `develop` en el repo consumidor.
- **Node.js 18+** (para el MCP de ClickUp vía `npx` y para `scripts/sync.mjs`).
- **GitHub CLI (`gh`)** opcional pero recomendado (creación de PRs).
- **ClickUp**: API key personal (ClickUp → Settings → Apps → API Token, empieza por `pk_`)
  y tu `TEAM_ID` (el número en la URL `app.clickup.com/<TEAM_ID>/...`).
- **graphify** (opcional): `uv install graphifyy` (con doble *y*; el comando CLI es
  `graphify`). Añade `graphify-out/` al `.gitignore` del repo consumidor.

## Instalación graphifyy en windows
- python-3.13.14-amd64.exe from https://www.python.org/downloads/
- powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
- C:\Users\TU_USUARIO\.local\bin\uvx.exe --from graphifyy graphify install --project
- uvx --from graphifyy graphify install --project

## Instalación — Claude Code

### A) Desde el marketplace (uso normal)

1. Publica este repo en GitHub (ver "Publicación") o usa el repo ya publicado.
2. En el **repo consumidor**, copia `examples/repo-settings.json` como
   `.claude/settings.json` (o fusiónalo con el existente). Apunta al repo y al tag:
   el plugin queda pineado al último tag publicado (p. ej. `v0.1.2`) con `autoUpdate: false`.
3. **ClickUp por variables de entorno (recomendado).** El plugin ya incluye su propio
   `.mcp.json` (`adapters/claude/.mcp.json`, generado por `sync.mjs`) que Claude Code
   auto-registra al instalarlo. Solo necesitas exportar las credenciales en tu entorno —
   no hace falta crear ningún fichero con secretos en el repo consumidor:

   ```bash
   # PowerShell:  $env:CLICKUP_API_KEY="pk_..."; $env:CLICKUP_TEAM_ID="123456"
   export CLICKUP_API_KEY="pk_..."
   export CLICKUP_TEAM_ID="123456"
   ```

   Claude Code expande `${CLICKUP_API_KEY}` y `${CLICKUP_TEAM_ID}` al cargar el `.mcp.json`.
   _(Alternativa por repo: copia `examples/mcp.json.example` como `.mcp.json` con los
   valores literales y añádelo al `.gitignore` — útil si prefieres credenciales por proyecto.)_
4. **Define el contexto del repo (recomendado).** Copia `examples/CLAUDE.md.example` como
   `CLAUDE.md` en la raíz y rellena los marcadores: stack, comandos exactos, convenciones,
   reglas de negocio y ficheros que no se tocan. Claude Code lo carga en cada sesión, y es de
   donde `/plan` e `/implement` sacan las convenciones que deben respetar. Sin él, el agente
   las deduce leyendo código — funciona, pero acierta menos y gasta más.
5. Abre Claude Code en el repo: aceptará el marketplace `biomas` y cargará el plugin.
   Comprueba con `/help` que aparecen `/start`, `/plan`, `/implement`, `/review`.
   Al abrir una sesión sobre una rama de tarea (`<tipo>/<taskId>_<slug>`), el hook
   `SessionStart` inyecta automáticamente el "Estado actual" de `progress.md` y los
   criterios pendientes de `spec.md` — continuidad entre sesiones sin intervención manual.

## Instalación — ClaudeCode
1. Levanta la terminar con claude
2. Ejecuta el comando /init 
3. ejecuta /plugin marketplace add leiniercy/custom-ia-plugin
4. ejecuta /plugin install custom-ia-plugin@biomas
5. ejecuta /reload-plugins
6. ejecuta /graphify src → solo el código fuente
           /graphify src --mode deep → extracción más rica (más relaciones inferidas, más tokens)
           /graphify src --wiki → además genera un wiki navegable (graphify-out/wiki/index.md)

## Instalación — OpenCode

> **Integración a fondo:** para el detalle completo de cómo OpenCode carga cada pieza
> (comandos, subagentes, skills, MCP, AGENTS.md, plugins), la brecha actual frente al
> adaptador de Claude y el plan para llegar al 100 % de paridad, consulta
> [docs/opencode-integracion.md](docs/opencode-integracion.md).

OpenCode no cuenta con un marketplace interno: la instalación consiste en copiar la carpeta
`.opencode/` del adaptador a tu proyecto. Esa carpeta ya trae **todo** generado por `sync.mjs`.

1. **Copia el adaptador completo:** copia `adapters/opencode/.opencode/` a la raíz del repo.
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

3. **Define el contexto (AGENTS.md):** copia `examples/AGENTS.md.example` como `AGENTS.md` en
   la raíz. OpenCode lo lee automáticamente para entender las reglas del flujo.

4. **Verifica:** abre OpenCode en el repo y comprueba — `/` muestra los comandos; `@` muestra
   los subagentes (`revisor-bugs-seguridad`, etc.); `/review` los despacha en paralelo y **no
   puede editar** ficheros (bloqueo real por `permission`). Si dudas de rutas en tu versión,
   `opencode debug paths` lista los directorios que escanea.
