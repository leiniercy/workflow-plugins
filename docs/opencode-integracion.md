# Integración con OpenCode — guía detallada

> Cómo `backbone` se integra con **OpenCode** hoy, qué capacidades de OpenCode
> aún no aprovechamos, y el plan concreto para llegar al **100 %** de paridad con el
> adaptador de Claude Code. Todas las rutas y campos de frontmatter están verificados
> contra el **código fuente** de OpenCode (`sst/opencode`), no solo contra la documentación.
>
> **Estado** de cada mejora: `✅ adoptado` · `🔜 pendiente` · `🟡 parcial` · `⛔ descartado`

> **⚡ Estado de implementación:** las **Mejoras 1–4** de la §5 ya están **implementadas** en
> `scripts/sync.mjs` y reflejadas en `adapters/opencode/.opencode/` (subagentes read-only,
> guías→skills, `opencode.json` generado y read-only duro en `/review`). La **Mejora 5**
> (plugin de hooks) queda **opcional/pendiente**: la continuidad ya la cubre `AGENTS.md`.

---

## 0. Resumen ejecutivo (TL;DR)

El adaptador de OpenCode funciona, pero usa **menos de la mitad** de lo que OpenCode ofrece.
Hoy generamos solo **comandos** + **guías como Markdown plano**. OpenCode soporta además
**subagentes**, **skills** (mismo `SKILL.md` que Claude, auto-activables), **plugins** (hooks
en TS/JS) y generación de `opencode.json` desde una única fuente. Las cuatro mejoras de la
§5 cierran la brecha con el adaptador de Claude.

| Capacidad | Claude Code | OpenCode (antes) | OpenCode (ahora) |
|---|---|---|---|
| Comandos slash | ✅ `commands/` | ✅ `command/` | ✅ (sin cambios) |
| Guías reutilizables | ✅ skills auto-activables | 🟡 Markdown plano referenciado por ruta | ✅ **skills** `SKILL.md` auto-activables |
| Subagentes de `/review` y `/plan` | ✅ 5 agentes read-only con tiering | ⛔ degrada a análisis en línea | ✅ **subagentes** `mode: subagent` read-only |
| Read-only DURO en revisión | ✅ `tools` allowlist en agentes | 🟡 solo prosa + banderas rojas | ✅ `permission` bloquea edit + bash (salvo git/graphify de lectura) |
| Config MCP desde fuente única | ✅ `.mcp.json` generado por `sync.mjs` | ⛔ `opencode.json.example` a mano (drift) | ✅ `opencode.json` generado con `{env:}` |
| Hooks de sesión (contexto/sonido) | ✅ `SessionStart` + `Stop` | ⛔ no existe | 🟡 opcional vía **plugin** (o cubierto por AGENTS.md) |
| Contexto del repo | `CLAUDE.md` | ✅ `AGENTS.md` | ✅ (sin cambios) |

---

## 1. Cómo OpenCode carga cada pieza (verdad de la fuente)

OpenCode descubre extensiones recorriendo desde el directorio de trabajo hacia la raíz del
worktree de git, en dos ámbitos: **global** (`~/.config/opencode/…`) y **proyecto**
(`<repo>/.opencode/…`). Detalle por pieza, con la línea exacta del loader entre paréntesis:

### 1.1 Comandos — `.opencode/command/*.md` (o `commands/`)

El loader hace `Glob.scan("{command,commands}/**/*.md")` → **acepta singular y plural**.
Nuestro `.opencode/command/` (singular) es válido. Cada `.md` se vuelve `/<nombre>`.

Frontmatter soportado (todos opcionales):

```markdown
---
description: Texto que se muestra al teclear / en el TUI.
agent: build            # ejecuta el comando bajo ese agente (p. ej. uno read-only)
model: anthropic/claude-sonnet-4-5   # fuerza modelo para este comando
subtask: true           # fuerza que actúe como subagente aunque su modo sea primary
---
Cuerpo = prompt. Placeholders dinámicos:
- $ARGUMENTS  (todos) · $1 $2 $3 (posicionales)
- !`comando`  → inyecta la salida de un comando de shell
- @ruta/fichero → inyecta el contenido de un fichero
```

### 1.2 Agentes y subagentes — `.opencode/agent/*.md` (o `agents/`)

El loader hace `Glob.scan("{agent,agents}/**/*.md")` → **acepta singular y plural**.
También se pueden declarar en `opencode.json` bajo la clave `"agent"`.

- **`mode: primary`** — asistente principal (Tab para alternar). Built-in: `build`, `plan`.
- **`mode: subagent`** — especialista que el primario invoca por `@mención` o por la
  herramienta `task`. Built-in: `general`, `explore` (read-only), `scout`.
- **`mode: all`** — disponible como ambos.

Frontmatter:

```markdown
---
description: Para qué sirve (lo usa el primario para decidir cuándo invocarlo).
mode: subagent
model: anthropic/claude-opus-4-1   # opcional; si se omite, hereda el de la sesión
temperature: 0.1                   # opcional
permission:                        # PUERTA DURA de permisos
  edit: deny
  bash: deny
  webfetch: deny
tools:                             # alternativa/complemento: write: false ≡ deny
  write: false
---
Prompt de sistema del agente.
```

> **Clave de seguridad:** en OpenCode `permission` es un **bloqueo real**, no una
> pre-aprobación. `edit: deny` + `bash: deny` deja el subagente en **solo-lectura duro**
> (read/grep/glob/list siguen permitidos por defecto). Es el equivalente exacto al campo
> `tools: [Read, Grep, Glob]` de los agentes de Claude.

Claves de `permission`: `read`, `edit`, `glob`, `grep`, `list`, `bash`, `task`,
`external_directory`, `todowrite`, `webfetch`, `websearch`, `lsp`, `skill`.

### 1.3 Skills — `.opencode/skills/<name>/SKILL.md`

Esto es lo que hoy **no** usamos y es la mayor ganancia de paridad. OpenCode tiene una
herramienta nativa `skill`: lee el `name` + `description` de cada skill y **el modelo decide
solo** cuándo cargar el cuerpo según relevancia — idéntico a las skills de Claude Code.

Ubicaciones que carga (todas plurales, **skill requiere plural**):

- Proyecto: `.opencode/skills/<name>/SKILL.md`
- Global: `~/.config/opencode/skills/<name>/SKILL.md`
- **Compatibles con Claude**: `.claude/skills/<name>/SKILL.md` y `~/.claude/skills/<name>/SKILL.md`
- Compatibles con `.agents/`: `.agents/skills/<name>/SKILL.md`

Formato (frontmatter mínimo idéntico al de Anthropic):

```markdown
---
name: estados-tareas          # ^[a-z0-9]+(-[a-z0-9]+)*$ y == nombre del directorio
description: Cuándo y para qué usar esta guía (es el disparador de auto-activación).
---
Contenido de la guía.
```

> Como OpenCode lee `.claude/skills/`, un mismo árbol de skills podría servir a ambas
> herramientas. Pero **nuestras** skills de Claude se instalan dentro del directorio del
> plugin (no en `<repo>/.claude/skills/`), así que para OpenCode las generamos en
> `.opencode/skills/`. La fuente sigue siendo única (`core/guides/`).

### 1.4 Contexto del proyecto — `AGENTS.md` + `instructions`

OpenCode lee automáticamente, en orden de precedencia (gana el primero de cada categoría):

1. `<repo>/AGENTS.md` (proyecto)
2. `~/.config/opencode/AGENTS.md` (global)
3. Fallback a `CLAUDE.md` / `~/.claude/CLAUDE.md` si no hay AGENTS.md

Además, `opencode.json` admite `"instructions": [...]` con rutas, globs y URLs remotas
(`packages/*/AGENTS.md`, `docs/*.md`). **Importante:** `instructions` carga el contenido
**siempre** (contexto permanente). Por eso las guías deben ser **skills** (carga perezosa por
relevancia), **no** entradas de `instructions`; reservamos `AGENTS.md` para las reglas
innegociables que sí queremos siempre presentes.

### 1.5 MCP — `opencode.json` clave `mcp`

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "clickup": {
      "type": "local",
      "command": ["npx", "-y", "@taazkareem/clickup-mcp-server@latest"],
      "enabled": true,
      "environment": {
        "CLICKUP_API_KEY": "{env:CLICKUP_API_KEY}",
        "CLICKUP_TEAM_ID": "{env:CLICKUP_TEAM_ID}"
      }
    }
  }
}
```

> **Sustitución de variables:** OpenCode usa la sintaxis **`{env:VAR}`** (no `${VAR}`,
> que es de Claude Code). Usarla evita versionar secretos en `opencode.json`, igual que el
> adaptador de Claude evita secretos vía variables de entorno. Servidores remotos usan
> `"type": "remote"`, `"url"`, `"headers"`.

### 1.6 Plugins (hooks) — `.opencode/plugin/*.{ts,js}` o npm

Módulos TS/JS que exportan funciones de plugin. Reciben `{ project, client, $, directory,
worktree }` y devuelven un objeto de hooks. Eventos relevantes para nosotros:
`session.created`, `session.idle`, `tool.execute.before/after`, `shell.env`,
`tui.toast.show`. Se cargan solos desde el directorio o se registran en `opencode.json`:
`"plugin": ["@org/paquete", "./ruta-local"]`.

---

## 2. Estado del adaptador ANTES de estas mejoras (`adapters/opencode/.opencode/`)

> Punto de partida que motivó las mejoras de la §5 (ya implementadas). Se conserva como
> contexto del "antes/después".

Generado por `scripts/sync.mjs` desde `core/`:

- `command/{start,plan,implement,review}.md` — frontmatter solo con `description`. ✅ Carga bien.
- `guides/{estados-tareas,registro-progreso,grafo-conocimiento,formato-toon,revision-hallazgos}.md`
  — **Markdown plano sin frontmatter**, referenciados por **ruta** dentro de la prosa de los
  comandos (token `{{guide:x}}` → `` `x` (`.opencode/guides/x.md`) ``). No se auto-activan;
  el agente los lee solo cuando un comando se lo indica.
- **Sin agentes** — `sync.mjs` no define `agentPath` para OpenCode, así que `/review` y
  `/plan` **degradan al análisis en línea** (sin paralelismo, sin tiering, sin refutación
  adversarial por un agente independiente).
- `examples/opencode.json.example` — **a mano**, con placeholders literales de credenciales.
- `examples/AGENTS.md.example` — **a mano**, contexto del repo.

---

## 3. Brecha frente al adaptador de Claude

El adaptador de Claude genera, además de comandos y skills: **7 subagentes read-only con
tiering** (`revisor-bugs-seguridad`=opus, `verificador-hallazgos`=opus,
`refutador-decision`=opus, `revisor-spec-tests`=sonnet, `revisor-convenciones`=sonnet,
`revisor-usabilidad-accesibilidad`=sonnet, `explorador-repo`=sonnet),
un **`.mcp.json` generado**, y **hooks** (`SessionStart` inyecta el estado de `progress.md`;
`Stop` notifica con sonido). De todo eso, OpenCode hoy solo recibe los comandos y las guías.

El workflow `core/workflows/review.md` ya está escrito para degradar con elegancia
("**Si NO dispones de esos agentes (p. ej. en OpenCode)**: analiza tú mismo…"), así que las
mejoras de abajo son **aditivas**: no rompen nada, solo elevan a OpenCode al nivel de Claude.

---

## 4. Filosofía aplicada (el filtro)

Cada mejora se valida contra los principios del plugin (ver `docs/referencias.md`):
gates humanos, degradación elegante, `core/` como fuente única (todo se genera con
`sync.mjs`, nada se edita a mano), empezar pequeño y continuidad entre sesiones. Lo que
choque, se descarta y se anota por qué.

---

## 5. Plan de mejoras para el 100 %

Orden recomendado por impacto/esfuerzo. Cada una es un cambio en `scripts/sync.mjs`
(la fuente sigue siendo `core/`).

### Mejora 1 — Subagentes read-only para OpenCode ✅ adoptado (impacto ALTO)

Generar `core/agents/*.md` también como `.opencode/agent/<name>.md`, para que `/review`
despache sus revisores en paralelo y `/plan` use el explorador, igual que en Claude.

En `scripts/sync.mjs`, dentro del adaptador `opencode`, añadir:

```js
opencode: {
  // … guideRef, commandPath, commandFrontmatter existentes …
  agentPath: (name) =>
    join(ROOT, "adapters/opencode/.opencode/agent", name + ".md"),
  agentFrontmatter: (name, meta) =>
    [
      "---",
      "description: " + meta.description,
      "mode: subagent",
      // read-only DURO (equivale al `tools: [Read,Grep,Glob]` de Claude):
      "permission:",
      "  edit: deny",
      "  bash: deny",
      "  webfetch: deny",
      "  websearch: deny",
      "---",
      "",
    ].join("\n"),
}
```

El bucle de agentes de `sync.mjs` ya está guardado con `if (A.agentPath)`, así que con
solo definir `agentPath`/`agentFrontmatter` para OpenCode, los cinco agentes se generan.

**Tiering de modelos (opcional).** El `model` de Claude (`opus`/`sonnet`/`haiku`) no es
portable: OpenCode espera `proveedor/modelo` (p. ej. `anthropic/claude-opus-4-1`) y depende
del proveedor del usuario. Dos opciones:

- **Simple (recomendada por defecto):** omitir `model` → los subagentes heredan el modelo de
  la sesión. Cero configuración, funciona con cualquier proveedor.
- **Con tiering:** mapear el tier de `AGENTS[name].model` a un id de OpenCode y emitir la
  línea `model:`. Para no hardcodear ids volátiles, permitir override por
  `opencode.json` del repo consumidor:

  ```jsonc
  {
    "agent": {
      "revisor-bugs-seguridad": { "model": "anthropic/claude-opus-4-1" },
      "revisor-spec-tests":     { "model": "anthropic/claude-sonnet-4-5" },
      "revisor-convenciones":   { "model": "anthropic/claude-sonnet-4-5" }
    }
  }
  ```

  > Verifica los ids con `opencode models`; cambian con cada release del proveedor.

**Nota sobre `/review`:** el workflow detecta los agentes por nombre y los despacha vía la
herramienta `task` (o el usuario por `@mención`). El comando puede además fijar
`agent:` a un primario read-only (ver Mejora 3) para reforzar el contrato.

### Mejora 2 — Guías como skills auto-activables ✅ adoptado (impacto ALTO)

Convertir las guías de Markdown plano a **skills** OpenCode, para igualar la auto-activación
por `description` que ya tienen en Claude. En `scripts/sync.mjs`, adaptador `opencode`:

```js
opencode: {
  // la referencia pasa a ser por NOMBRE de skill (el modelo la auto-activa):
  guideRef: (name) => "`" + name + "` (skill de OpenCode, auto-activable)",
  guidePath: (name) =>
    join(ROOT, "adapters/opencode/.opencode/skills", name, "SKILL.md"),
  guideFrontmatter: (name, meta) =>
    [
      "---",
      "name: " + name,
      "description: " + meta.description,
      "---",
      "",
    ].join("\n"),
}
```

Los `name` de las guías (`estados-tareas`, `registro-progreso`, `grafo-conocimiento`,
`formato-toon`, `revision-hallazgos`) ya cumplen `^[a-z0-9]+(-[a-z0-9]+)*$`. ✅

> **Por qué skills y no `instructions`:** `instructions` cargaría las cinco guías SIEMPRE
> (gasto de tokens constante); las skills se cargan solo cuando el modelo las juzga
> relevantes — exactamente el comportamiento de Claude.
>
> **Migración:** al adoptarla, borrar el viejo `adapters/opencode/.opencode/guides/`
> (queda obsoleto) y actualizar el paso de instalación que copiaba esa carpeta.

### Mejora 3 — `opencode.json` generado desde fuente única ✅ adoptado (impacto MEDIO)

Hoy `MCP_SERVERS` ya genera el `.mcp.json` de Claude; replicar para OpenCode evita el drift
del `opencode.json.example` hecho a mano. Al final de `sync.mjs`, junto al bloque de Claude:

```js
// opencode.json del adaptador (MCP + instructions), desde la misma fuente MCP_SERVERS.
const ocMcp = Object.fromEntries(
  Object.entries(MCP_SERVERS).map(([name, s]) => [
    name,
    {
      type: "local",
      command: [s.command, ...s.args],
      environment: Object.fromEntries(
        // ${VAR} (Claude) → {env:VAR} (OpenCode)
        Object.entries(s.env).map(([k, v]) => [k, v.replace(/^\$\{(\w+)\}$/, "{env:$1}")])
      ),
    },
  ])
);
const opencodeJson = JSON.stringify(
  { $schema: "https://opencode.ai/config.json", mcp: ocMcp, instructions: ["AGENTS.md"] },
  null, 2
) + "\n";
writeFileSync(join(ROOT, "adapters/opencode/.opencode/opencode.json"), opencodeJson);
```

Opcionalmente añadir al objeto un bloque `"agent"` con el tiering de la Mejora 1. El
consumidor copia este `opencode.json` a la raíz del repo (no a `.opencode/`) o lo fusiona
con el suyo; deja de mantener el `.example` a mano.

### Mejora 4 — Read-only DURO en `/review` ✅ adoptado (impacto MEDIO)

Más fuerte que en Claude: en Claude `allowed-tools` es pre-aprobación; en OpenCode podemos
**bloquear de verdad**. Dos capas:

1. **Subagentes** read-only por `permission` (Mejora 1) — ya cubre el grueso.
2. **Agente primario read-only** para correr el comando entero bajo deny. Generar
   `.opencode/agent/revisor.md` con `mode: primary`, `permission: {edit: deny, bash: deny}`,
   y en el frontmatter de `command/review.md` emitir `agent: revisor`. Así, aunque el modelo
   "quiera" editar durante `/review`, OpenCode lo impide a nivel de herramienta.

### Mejora 5 — Plugin de hooks (paridad con `SessionStart`/`Stop`) 🟡 (opcional)

El hook `SessionStart` de Claude inyecta el "Estado actual" de `progress.md` al abrir sesión
en una rama de tarea. En OpenCode no hay un hook documentado que inserte contexto de sistema
al arrancar; los eventos de plugin son sobre todo observacionales. Dos caminos:

- **Recomendado (sin plugin):** confiar en `AGENTS.md`, que ya ordena *"Léelo SIEMPRE al
  empezar para recuperar el contexto"* sobre `progress.md`. Cubre la continuidad sin código.
- **Avanzado (plugin):** `.opencode/plugin/notify.ts` que en `session.idle` dispare
  `tui.toast.show` (equivalente al sonido del hook `Stop`). La inyección de contexto por
  rama queda como nice-to-have de menor madurez; no bloquea el 100 % funcional.

```ts
// adapters/opencode/.opencode/plugin/notify.ts (ejemplo mínimo)
import type { Plugin } from "@opencode-ai/plugin"
export const Notify: Plugin = async ({ client }) => ({
  "session.idle": async () => {
    await client.tui.showToast?.({ message: "Tarea lista para tu revisión", variant: "info" })
  },
})
```

---

## 6. Instalación en el repo consumidor (objetivo, tras las mejoras)

1. **Comandos, agentes y skills:** copia `adapters/opencode/.opencode/` a la raíz del repo.
   Resultado: `<repo>/.opencode/{command,agent,skills}/…`.
2. **Config (`opencode.json`):** copia el `opencode.json` generado (o `examples/opencode.json.example`)
   a la **raíz del repo** y exporta las credenciales en tu entorno (no las escribas en el fichero):
   ```bash
   # PowerShell:  $env:CLICKUP_API_KEY="pk_..."; $env:CLICKUP_TEAM_ID="123456"
   export CLICKUP_API_KEY="pk_..."
   export CLICKUP_TEAM_ID="123456"
   ```
   OpenCode expande `{env:CLICKUP_API_KEY}` / `{env:CLICKUP_TEAM_ID}` al cargar el fichero.
3. **Contexto (`AGENTS.md`):** copia `examples/AGENTS.md.example` como `AGENTS.md` en la raíz.
4. **Verifica** (§7).

> Requisitos comunes (Git + rama `develop`, Node 18+, `gh` opcional, ClickUp, graphify
> opcional) son los mismos del README principal.

---

## 7. Verificación

- `opencode debug paths` — confirma qué directorios escanea tu versión (zanja cualquier duda
  singular/plural en tu instalación concreta).
- En el TUI, teclea `/` → deben aparecer `/start`, `/plan`, `/implement`, `/review` con su
  descripción.
- `@` → deben aparecer los subagentes (`revisor-bugs-seguridad`, etc.) tras la Mejora 1.
- Ejecuta `/review` sobre una rama de tarea y comprueba que despacha los revisores en
  paralelo (no análisis en línea) y que **no puede** editar ficheros.
- Abre una sesión y pregunta algo que dispare una guía (p. ej. una transición de estado) →
  el modelo debe cargar la skill correspondiente por sí mismo (Mejora 2).

---

## 8. Referencias

- Plugins — https://opencode.ai/docs/plugins/
- Comandos — https://opencode.ai/docs/commands/
- Agentes/subagentes — https://opencode.ai/docs/agents/
- Skills — https://opencode.ai/docs/skills/
- Reglas / AGENTS.md — https://opencode.ai/docs/rules/
- Config — https://opencode.ai/docs/config/
- MCP — https://opencode.ai/docs/mcp-servers/
- Fuente (loaders verificados) — `sst/opencode`:
  `packages/opencode/src/config/{command,agent,markdown}.ts`
