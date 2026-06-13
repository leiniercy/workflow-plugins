# custom-ia-plugin · marketplace `biomas`

Flujo de desarrollo guiado por tareas de **ClickUp** para agentes de IA, con soporte para
**Claude Code** y **OpenCode**: planificación con `spec.md`, implementación con TDD,
revisión independiente y continuidad entre sesiones vía `progress.md`.

## Arquitectura: core + adaptadores

```
custom-ia-plugin/
├── core/                      ← ÚNICA fuente de verdad (editar SOLO aquí)
│   ├── workflows/             start.md · plan.md · implement.md · review.md
│   └── guides/                estados-tareas · registro-progreso · grafo-conocimiento · formato-toon
├── scripts/
│   └── sync.mjs               genera los adaptadores desde core/
├── adapters/
│   ├── claude/                plugin nativo de Claude Code (generado + manifiesto + hook)
│   │   ├── .claude-plugin/plugin.json
│   │   ├── commands/          (generado por sync.mjs — no editar a mano)
│   │   ├── skills/            (generado por sync.mjs — no editar a mano)
│   │   └── hooks/             notificación sonora (exclusivo de Claude Code)
│   └── opencode/
│       └── .opencode/         carpeta lista para copiar al repo consumidor
│           ├── command/       (generado por sync.mjs — no editar a mano)
│           └── guides/        (generado por sync.mjs — no editar a mano)
├── .claude-plugin/marketplace.json   ← marketplace "biomas" (apunta a adapters/claude)
├── .github/workflows/review.yml      ← CI de revisión de PRs (agnóstico de la herramienta)
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

## El flujo (igual en ambas herramientas)

| Comando | Qué hace | Transición de ClickUp |
|---|---|---|
| `/start [taskId]` | Lee la tarea, crea rama `tipo/taskId_slug` desde `develop` y el esqueleto `tasks/<taskId>/` (spec.md + progress.md) | `to do → in progress` (con aprobación) |
| `/plan [taskId]` | Explora el repo (grafo de graphify si está disponible) y completa `spec.md` con criterios de aceptación, alcance y enfoque | ninguna |
| `/implement [taskId]` | TDD criterio a criterio contra spec.md; commits/push/PR solo con aprobación | `in progress → review` al crear la PR (con aprobación) |
| `/review [taskId]` | Diagnóstico en 5 dimensiones frente a spec.md; **solo informa** | ninguna |

El paso a `complete` es siempre humano. Principios transversales: gates de aprobación para
todo lo visible (commits, push, PR, estados), `$ARGUMENTS` con fallback por inferencia de
rama, detección de modo por contexto, degradación elegante si falta ClickUp o graphify, y
historial inmutable en `progress.md`.

## Requisitos comunes

- **Git** y la rama base `develop` en el repo consumidor.
- **Node.js 18+** (para el MCP de ClickUp vía `npx` y para `scripts/sync.mjs`).
- **GitHub CLI (`gh`)** opcional pero recomendado (creación de PRs).
- **ClickUp**: API key personal (ClickUp → Settings → Apps → API Token, empieza por `pk_`)
  y tu `TEAM_ID` (el número en la URL `app.clickup.com/<TEAM_ID>/...`).
- **graphify** (opcional): `pipx install graphifyy` (con doble *y*; el comando CLI es
  `graphify`). Añade `graphify-out/` al `.gitignore` del repo consumidor.

## Instalación — Claude Code

### A) Desde el marketplace (uso normal)

1. Publica este repo en GitHub (ver "Publicación") o usa el repo ya publicado.
2. En el **repo consumidor**, copia `examples/repo-settings.json` como
   `.claude/settings.json` (o fusiónalo con el existente). Apunta al repo y al tag:
   el plugin queda pineado a `v0.1.0` con `autoUpdate: false`.
3. Copia `examples/mcp.json.example` como `.mcp.json` en el repo consumidor y rellena
   `CLICKUP_API_KEY` y `CLICKUP_TEAM_ID`. **No lo commitees** (ya está en `.gitignore`).
4. Abre Claude Code en el repo: aceptará el marketplace `biomas` y cargará el plugin.
   Comprueba con `/help` que aparecen `/start`, `/plan`, `/implement`, `/review`.

### B) Prueba en local (desarrollo del plugin)

```bash
claude --plugin-dir D:/Github/Nextjs/custom-ia-plugin/adapters/claude
```

> Nota: la ruta apunta al **adaptador**, no a la raíz del repo.

### Extra incluido solo en Claude Code

- **Hook `Stop`** con notificación sonora multiplataforma cuando Claude termina
  (`adapters/claude/hooks/`). OpenCode no incluye equivalente en esta versión.

## Instalación — OpenCode

> ⚠️ **Verifica contra la documentación oficial** (https://opencode.ai/docs): los detalles
> de formato (`.opencode/command/`, esquema de `opencode.json`) provienen de información
> de enero de 2026 y pueden haber cambiado.

OpenCode no tiene marketplace de comandos Markdown: la instalación es copiar ficheros.

1. Copia la carpeta `adapters/opencode/.opencode/` a la **raíz del repo consumidor**
   (quedará `<repo>/.opencode/command/*.md` y `<repo>/.opencode/guides/*.md`).
2. Copia `examples/opencode.json.example` como `opencode.json` en la raíz del repo
   consumidor y rellena `CLICKUP_API_KEY` y `CLICKUP_TEAM_ID`. Si dejas la key en el
   fichero, añádelo a `.gitignore`; mejor aún, usa variables de entorno.
3. Copia `examples/AGENTS.md.example` como `AGENTS.md` en la raíz del repo consumidor
   (OpenCode lo lee automáticamente como contexto del proyecto).
4. Abre OpenCode en el repo y escribe `/start`: debería aparecer el comando con su
   descripción.

Decide en equipo si `.opencode/` se versiona en el repo consumidor (recomendado: sí,
así todo el equipo comparte el flujo) o se mantiene local.

## CI: revisión automática de PRs (agnóstica)

`.github/workflows/review.yml` es un workflow **reusable** que revisa cada PR con Claude
(lee `tasks/<taskId>/spec.md`, analiza 5 dimensiones, comenta con severidades y veredicto;
nunca modifica código). Funciona igual aunque el código se haya escrito con OpenCode.

En el repo consumidor:

1. Copia `examples/pr-review.yml` a `.github/workflows/pr-review.yml` (incluye los
   `permissions` necesarios, también `id-token: write`).
2. Crea el secret `ANTHROPIC_API_KEY` en GitHub (Settings → Secrets → Actions).
3. Ajusta en el `uses:` el usuario/repo/tag de este repositorio.

## Publicación y versionado

```bash
cd D:/Github/Nextjs/custom-ia-plugin
git init -b main
git add .
git commit -m "feat: plugin custom-ia-plugin v0.1.0 (marketplace biomas)"
gh repo create custom-ia-plugin --public --source=. --push
git tag v0.1.0
git push --tags
```

Para publicar cambios: edita `core/`, ejecuta `node scripts/sync.mjs`, commitea, sube un
tag nuevo (`v0.1.1`) y actualiza el `ref` en el `settings.json` de los repos consumidores.

## Solución de problemas

- **No aparecen los comandos (Claude)**: revisa que `.claude/settings.json` apunta al repo
  correcto y que el tag del `ref` existe. En local, recuerda que `--plugin-dir` apunta a
  `adapters/claude`.
- **No aparecen los comandos (OpenCode)**: confirma que los `.md` están en
  `<repo>/.opencode/command/` y consulta la doc oficial por si la ruta ha cambiado.
- **El MCP de ClickUp no conecta**: verifica `pk_...` y `TEAM_ID`; prueba
  `npx -y @taazkareem/clickup-mcp-server@latest` a mano para ver el error real. Todos los
  comandos degradan a modo manual (pegas ID/título/descripción) si el MCP falla.
- **graphify no instalado**: es opcional; los comandos continúan con exploración manual.
- **Los adaptadores divergen del core**: alguien editó los ficheros generados a mano.
  Ejecuta `node scripts/sync.mjs` para restaurar la coherencia.
