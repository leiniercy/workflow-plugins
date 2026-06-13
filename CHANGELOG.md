# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/).
Versionado [SemVer](https://semver.org/lang/es/).

## [0.1.0] - 2026-06-12

### Añadido

- **Arquitectura core + adaptadores (multi-agente)**:
  - `core/` como **única fuente de verdad**: 4 workflows (`start`, `plan`, `implement`,
    `review`) y 4 guías (`estados-tareas`, `registro-progreso`, `grafo-conocimiento`,
    `formato-toon`) agnósticos de herramienta, con tokens `{{guide:nombre}}` para las
    referencias cruzadas.
  - `scripts/sync.mjs`: generador que produce ambos adaptadores desde `core/`
    (sustituye tokens por la ruta propia de cada herramienta y antepone su frontmatter).
    Los ficheros generados no se editan a mano.
  - **Adaptador Claude Code** (`adapters/claude/`): plugin nativo con manifiesto
    (`plugin.json`), comandos con `description`/`argument-hint`, skills con
    `user-invocable: false`, y hook `Stop` de notificación sonora multiplataforma
    (`hooks/notify.js`, win32/darwin/linux con degradación silenciosa) — el hook es
    exclusivo de este adaptador.
  - **Adaptador OpenCode** (`adapters/opencode/.opencode/`): comandos en
    `.opencode/command/*.md` (frontmatter `description`, hint de uso embebido) y guías
    en `.opencode/guides/*.md`, listo para copiar al repo consumidor. Formato basado en
    conocimiento de enero 2026 — verificar contra https://opencode.ai/docs.
- **Marketplace `biomas`** (`.claude-plugin/marketplace.json`) con el plugin referenciado
  por ruta relativa (`./adapters/claude`) para que herede el tag de descarga.
- **Flujo de 4 comandos** con: fases numeradas, `$ARGUMENTS` con fallback por inferencia
  de rama, pre-flight checks, gates de aprobación humana para acciones visibles o
  irreversibles, detección de modo por contexto y cierre orientativo.
- **Integración graphify** (grafo de conocimiento del repo): detección de la CLI,
  construcción/actualización con gate de aprobación, patrones de consulta
  (`query`/`explain`/`path`), aristas INFERRED/AMBIGUOUS tratadas como hipótesis a
  verificar, fallback a exploración manual.
- **Convención TOON** para salidas con listas largas y uniformes (resultados del grafo,
  esquemas de BD, tablas de hallazgos), con sintaxis canónica y límites de uso.
- **CI agnóstica**: workflow reusable `.github/workflows/review.yml` (revisor
  independiente con lectura de `tasks/<taskId>/spec.md`, severidades y veredicto; solo
  comenta) + caller de ejemplo `examples/pr-review.yml` con `permissions` declarados.
- **Plantillas para repos consumidores** (`examples/`): `repo-settings.json` (pin por tag,
  `autoUpdate: false`), `mcp.json.example` (ClickUp para Claude Code),
  `opencode.json.example` (ClickUp para OpenCode) y `AGENTS.md.example` (contexto del
  flujo para OpenCode y otros agentes compatibles con AGENTS.md).
- README con arquitectura, instalación por herramienta, CI, publicación y troubleshooting.

### Decisiones de diseño

- **Core como fuente única**: los workflows se escriben una sola vez; cada adaptador es
  un artefacto generado. Se descartó mantener copias paralelas por herramienta para
  evitar drift entre Claude Code y OpenCode.
- **Soporte limitado a Claude Code y OpenCode**: el formato de OpenCode se construyó con
  conocimiento local (sin verificación web); otros agentes podrán añadirse como nuevos
  adaptadores en `scripts/sync.mjs`.
- **Hook sonoro solo en Claude Code**: OpenCode usa un sistema de plugins JS distinto;
  se pospone su equivalente hasta verificar la API real.
- **ClickUp como gestor de tareas** vía MCP, con estados estándar (`to do / in progress /
  review / complete`). Todos los comandos degradan a modo manual si el MCP no está
  configurado.
- **Responsabilidad única sobre transiciones**: `/start` mueve a `in progress`,
  `/implement` mueve a `review` al crear la PR, el cierre a `complete` es siempre humano.
  Se descartó que `/review` cerrara tareas para mantener al humano en el gate final.
- **`/review` es solo-lectura** con una única excepción documentada: registrar hallazgos
  en `progress.md` bajo petición explícita, para habilitar el modo corrección de
  `/implement` en sesiones limpias. Coherente con ello, `/review` consulta el grafo de
  graphify solo si ya existe — nunca lo construye ni actualiza.
- **graphify como acelerador, no como requisito**: `/plan` y `/review` lo usan si está
  disponible y degradan a exploración manual si no. El grafo orienta dónde mirar; las
  decisiones de diseño se confirman siempre en el código fuente.
- **TOON solo como formato de presentación**: prohibido en ficheros parseables
  (manifiestos JSON, configs de CI) y no altera el contrato Markdown de
  `spec.md`/`progress.md`.
- **Sin agente "experto en el repo"**: el conocimiento vive en el código y en `docs/` del
  repo consumidor, evitando el drift de un experto desactualizado.
- **Solo 4 comandos**: se descartaron `/debug` y un `/validate-pr` local; la validación de
  PRs vive en CI (workflow reusable), siguiendo la pauta de empezar pequeño.
- **Fuera de alcance en 0.1.0**: worktrees con script de copia de ficheros no versionados
  y soporte de IDs personalizados de ClickUp.
