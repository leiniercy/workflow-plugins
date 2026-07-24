#!/usr/bin/env node
/**
 * sync.mjs — genera los adaptadores (Claude Code y OpenCode) desde core/.
 *
 * core/ es la ÚNICA fuente de verdad de workflows y guías. Este script:
 *   - sustituye los tokens {{guide:nombre}} por la referencia correcta de cada herramienta
 *   - antepone el frontmatter propio de cada adaptador
 *   - escribe los ficheros generados (NO editar a mano: se sobrescriben)
 *
 * Uso:  node scripts/sync.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// ---------------------------------------------------------------------------
// Metadatos por comando (frontmatter)
// ---------------------------------------------------------------------------
const COMMANDS = {
  start: {
    description:
      'Toma una tarea de ClickUp, crea la rama de trabajo desde develop y el esqueleto de estado tasks/<taskId>/ (spec.md + progress.md). Mueve la tarea a "in progress". NO planifica en detalle ni implementa código.',
    argumentHint:
      "[taskId de ClickUp (opcional: si se omite, lista las tareas en 'to do' para elegir)]",
  },
  plan: {
    description:
      "Completa tasks/<taskId>/spec.md con criterios de aceptación, alcance y enfoque técnico tras explorar el repo (vía grafo de conocimiento si graphify está disponible). Requiere aprobación antes de guardar. NO modifica código ni el estado de ClickUp.",
    argumentHint: "[taskId (opcional: se infiere de la rama actual)]",
  },
  implement: {
    description:
      'Implementa la tarea siguiendo spec.md con TDD, criterio a criterio, y actualiza progress.md. Commits, push y PR solo con aprobación explícita. Mueve la tarea de ClickUp a "review" al crear la PR.',
    argumentHint: "[taskId (opcional: se infiere de la rama actual)]",
  },
  review: {
    description:
      "Diagnóstico de los cambios de la rama frente a spec.md - cumplimiento de criterios, bugs, tests, convenciones y seguridad, con análisis de impacto vía grafo de conocimiento si existe. SOLO informa - nunca modifica código, ficheros de estado ni ClickUp.",
    argumentHint: "[taskId (opcional: se infiere de la rama actual)]",
    // OpenCode: ejecuta /review bajo el agente primario read-only `revisor` (su
    // `permission` BLOQUEA edición y todo bash salvo git/graphify de lectura). Es el
    // refuerzo equivalente —y más fuerte— al `allowed-tools` de Claude de abajo.
    opencodeAgent: "revisor",
    // Lista blanca de herramientas (solo Claude Code). OJO: `allowed-tools` en un
    // slash command NO es un sandbox duro — es PRE-APROBACIÓN de permisos (esas tools
    // corren sin prompt; otras seguirían el flujo normal de permisos). Aquí pre-autoriza
    // solo herramientas de lectura (privilegio mínimo), reforzando el contrato junto con
    // la prosa y las banderas rojas. El bloqueo DURO de solo-lectura lo dan los agentes
    // revisores (su campo `tools` SÍ es allowlist hard). `Agent` pre-autoriza despachar
    // esos subagentes; Bash queda acotado a git de lectura y consultas de grafo.
    allowedTools: [
      "Read",
      "Glob",
      "Grep",
      "Agent",
      "Bash(git diff:*)",
      "Bash(git log:*)",
      "Bash(git show:*)",
      "Bash(git blame:*)",
      "Bash(git status:*)",
      "Bash(graphify query:*)",
      "Bash(graphify explain:*)",
      "Bash(graphify path:*)",
      "Bash(graphify --version:*)",
    ],
  },
};

// ---------------------------------------------------------------------------
// Agentes de plugin (solo Claude Code). Subagentes de solo-lectura que /review
// despacha por dimensión, cada uno con el modelo adecuado a su coste/complejidad
// (tiering, patrón del plugin oficial code-review). Su campo `tools` es una
// allowlist DURA: Read/Grep/Glob y nada más → no pueden modificar nada ni
// despachar otros agentes. OpenCode no recibe agentes: /review degrada al análisis
// en línea de las cinco dimensiones.
// ---------------------------------------------------------------------------
const AGENTS = {
  "revisor-bugs-seguridad": {
    description:
      "Subagente de /review (solo-lectura) para las dimensiones de BUGS y SEGURIDAD. Despáchalo en paralelo desde /review para auditar errores lógicos, edge cases, SSR/hidratación, secretos, validación de inputs e inyección. Devuelve hallazgos puntuados (confianza ≥ 75); no emite veredicto global.",
    model: "opus",
    tools: ["Read", "Grep", "Glob"],
  },
  "revisor-spec-tests": {
    description:
      "Subagente de /review (solo-lectura) para las dimensiones de CUMPLIMIENTO DE SPEC y TESTS. Despáchalo en paralelo desde /review para comprobar criterios de aceptación y la cobertura/calidad de los tests. Devuelve hallazgos puntuados (confianza ≥ 75); no emite veredicto global.",
    model: "sonnet",
    tools: ["Read", "Grep", "Glob"],
  },
  "revisor-convenciones": {
    description:
      "Subagente de /review (solo-lectura) para la dimensión de CONVENCIONES del repo. Despáchalo en paralelo desde /review para detectar desviaciones de patrones ya establecidos (estructura, naming, estado, fetching). Devuelve hallazgos puntuados (confianza ≥ 75); no emite veredicto global.",
    model: "haiku",
    tools: ["Read", "Grep", "Glob"],
  },
  "verificador-hallazgos": {
    description:
      "Verificador adversarial independiente de /review (solo-lectura). Despáchalo UNA vez tras recoger los hallazgos de los agentes por dimensión: intenta REFUTAR cada hallazgo contra el código y devuelve un veredicto (confirmado/refutado/dudoso) por hallazgo. Filtra falsos positivos antes del informe; no emite el veredicto final.",
    model: "opus",
    tools: ["Read", "Grep", "Glob"],
  },
  "explorador-repo": {
    description:
      "Explorador de repositorio read-only para la Fase 3 de /plan. Despáchalo para mapear estructura del proyecto Next.js, convenciones vigentes, ficheros candidatos y señales de riesgo, y devolver un mapa estructurado (TOON). No propone el plan ni escribe ficheros: el planificador razona el enfoque a partir de su mapa.",
    model: "sonnet",
    tools: ["Read", "Grep", "Glob"],
  },
};

// ---------------------------------------------------------------------------
// Servidores MCP (fuente única). Se generan los ficheros de configuración de
// cada adaptador a partir de aquí para evitar drift entre herramientas.
// Las credenciales se leen de variables de entorno: el usuario las exporta una
// vez (CLICKUP_API_KEY, CLICKUP_TEAM_ID) y NO se versiona ningún secreto.
// ---------------------------------------------------------------------------
const MCP_SERVERS = {
  clickup: {
    command: "npx",
    args: ["-y", "@taazkareem/clickup-mcp-server@latest"],
    env: {
      CLICKUP_API_KEY: "${CLICKUP_API_KEY}",
      CLICKUP_TEAM_ID: "${CLICKUP_TEAM_ID}",
    },
  },
};

// Metadatos por guía. En Claude generan skills con `user-invocable: false`: eso SOLO las
// oculta del menú `/` (no son comandos accionables), pero siguen siendo AUTO-ACTIVABLES por
// el modelo a partir de su `description` — no ponemos `disable-model-invocation`. Por eso el
// `description` se redacta como disparador ambiental ("Úsala cuando…"): es lo que decide
// cuándo se carga la guía sin que un comando la referencie. (revision-hallazgos se mantiene
// con disparador acotado a /review a propósito: es una subrutina interna, no conocimiento
// ambiental.)
const GUIDES = {
  "estados-tareas": {
    description:
      "Catálogo de estados de ClickUp del flujo y su mapeo a comandos del plugin. Úsala cuando necesites interpretar el estado de una tarea, decidir qué comando sugerir al usuario, o validar una transición de estado antes de proponerla.",
  },
  "registro-progreso": {
    description:
      "Procedimiento exacto para crear y actualizar tasks/<taskId>/progress.md. Úsala SIEMPRE que vayas a registrar avance de una tarea, crear su fichero de estado inicial o actualizar su estado actual. Garantiza que cualquier agente en sesión limpia recupere el contexto.",
  },
  "grafo-conocimiento": {
    description:
      "Procedimiento para explorar el repo vía el grafo de conocimiento de graphify en lugar de leer ficheros crudos. Úsala cuando necesites entender la estructura del repo, localizar áreas afectadas por una tarea o analizar el impacto de un cambio. Incluye detección, construcción/actualización del grafo y fallback manual.",
  },
  "formato-toon": {
    description:
      "Convención de salida en formato TOON (Token-Oriented Object Notation) para datos estructurados. Úsala siempre que vayas a devolver listas largas de datos uniformes, múltiples rutas del grafo de graphify, esquemas de base de datos o salidas estructurales complejas — en lugar de JSON o YAML — para minimizar el consumo de tokens.",
  },
  "revision-hallazgos": {
    description:
      "Disciplina para validar y puntuar un hallazgo de revisión antes de reportarlo: auto-refutación contra el código, escala de confianza 0-100 con umbral ≥ 75, lista de qué NO reportar y clasificación por severidad. Úsala en /review y en los subagentes revisores para subir la señal y bajar los falsos positivos.",
  },
  "historias-usuario": {
    description:
      "Plantilla y procedimiento para redactar requisitos como Historias de Usuario en spec.md: historia (rol + valor), contexto de proceso de negocio, comportamientos válidos/no válidos, criterios de aceptación en Given/When/Then, diseño de casos de prueba derivado y tabla de trazabilidad Proceso→RF→HU→CA→EC. Úsala al definir los criterios de aceptación durante /plan, y siempre que redactes o revises una HU, su plan de pruebas o su vínculo con el proceso de negocio. Mantiene una sola fuente de verdad del comportamiento y deja los datos de gestión (programador, iteración, tiempos, riesgo) en ClickUp.",
  },
  "codigo-limpio": {
    description:
      "Principios de código limpio, catálogo de olores de código (code smells) y disciplina de refactorización segura: pasos pequeños, tests verdes antes y después, sin mezclar con funcionalidad nueva. Úsala en el paso de refactor del ciclo TDD de /implement (tras poner un test en verde, antes de registrar el criterio) y en /review para nombrar deuda técnica y olores concretos como hallazgos. Basada en refactoring.guru.",
  },
  "patrones-diseno": {
    description:
      "Catálogo de patrones de diseño (GoF) como referencia con freno anti-sobre-ingeniería: mapa olor→patrón, la crítica (aplicar un patrón solo cuando su problema ya existe; preferir código simple o features del lenguaje) y Singleton como anti-patrón. Úsala al razonar el enfoque técnico en /plan y al valorar una abstracción durante el refactor de /implement, para introducir un patrón solo ante el problema real. Basada en refactoring.guru.",
  },
};

// ---------------------------------------------------------------------------
// Resolución de referencias {{guide:x}} por adaptador
// ---------------------------------------------------------------------------
const ADAPTERS = {
  claude: {
    guideRef: (name) =>
      "`" + name + "` (`${CLAUDE_PLUGIN_ROOT}/skills/" + name + "/SKILL.md`)",
    commandPath: (name) => join(ROOT, "adapters/claude/commands", name + ".md"),
    guidePath: (name) => join(ROOT, "adapters/claude/skills", name, "SKILL.md"),
    agentPath: (name) => join(ROOT, "adapters/claude/agents", name + ".md"),
    commandFrontmatter: (meta) => {
      const lines = [
        "---",
        "description: " + meta.description,
        'argument-hint: "' + meta.argumentHint + '"',
      ];
      // allowed-tools es frontmatter propio de Claude Code; solo se emite si el
      // comando lo declara (p. ej. /review, que es solo-lectura).
      if (meta.allowedTools && meta.allowedTools.length) {
        lines.push("allowed-tools: " + meta.allowedTools.join(", "));
      }
      lines.push("---", "");
      return lines.join("\n");
    },
    guideFrontmatter: (name, meta) =>
      [
        "---",
        "name: " + name,
        "description: " + meta.description,
        "user-invocable: false",
        "---",
        "",
      ].join("\n"),
    // Agentes: solo el adaptador Claude los define. `tools` es la allowlist DURA
    // (read-only) y `model` fija el tier (opus/sonnet/haiku).
    agentFrontmatter: (name, meta) =>
      [
        "---",
        "name: " + name,
        "description: " + meta.description,
        "tools: " + meta.tools.join(", "),
        "model: " + meta.model,
        "---",
        "",
      ].join("\n"),
  },
  opencode: {
    // Las guías se generan como SKILL.md (skills de OpenCode): el modelo las
    // auto-activa por su `description` vía la herramienta `skill`, igual que en
    // Claude. Por eso la referencia cruzada es por NOMBRE, no por ruta.
    guideRef: (name) => "`" + name + "` (skill de OpenCode, auto-activable)",
    commandPath: (name) =>
      join(ROOT, "adapters/opencode/.opencode/command", name + ".md"),
    // Skills: <repo>/.opencode/skills/<name>/SKILL.md (OpenCode requiere el plural).
    guidePath: (name) =>
      join(ROOT, "adapters/opencode/.opencode/skills", name, "SKILL.md"),
    // Subagentes: <repo>/.opencode/agent/<name>.md (el loader acepta singular y plural).
    agentPath: (name) =>
      join(ROOT, "adapters/opencode/.opencode/agent", name + ".md"),
    commandFrontmatter: (meta) => {
      const lines = [
        "---",
        "description: " + meta.description + " Uso: " + meta.argumentHint,
      ];
      // Comandos read-only (p. ej. /review) se ejecutan bajo un agente primario
      // cuyo `permission` bloquea de verdad la escritura (ver agente `revisor`).
      if (meta.opencodeAgent) lines.push("agent: " + meta.opencodeAgent);
      lines.push("---", "");
      return lines.join("\n");
    },
    // Guías → skills: frontmatter mínimo (name + description). El `name` debe
    // casar el nombre del directorio y el patrón ^[a-z0-9]+(-[a-z0-9]+)*$.
    guideFrontmatter: (name, meta) =>
      [
        "---",
        "name: " + name,
        "description: " + meta.description,
        "---",
        "",
      ].join("\n"),
    // Subagentes read-only DURO: en OpenCode `permission` es un bloqueo real (no
    // pre-aprobación). edit/bash/webfetch/websearch/task = deny equivale al
    // `tools: [Read, Grep, Glob]` de Claude (read/grep/glob/list siguen permitidos
    // por defecto). `model` se omite a propósito: hereda el de la sesión (portable
    // entre proveedores; el tiering opcional se documenta en docs/opencode-integracion.md).
    agentFrontmatter: (name, meta) =>
      [
        "---",
        "description: " + meta.description,
        "mode: subagent",
        "permission:",
        "  edit: deny",
        "  bash: deny",
        "  webfetch: deny",
        "  websearch: deny",
        "  task: deny",
        "---",
        "",
      ].join("\n"),
  },
};

// ---------------------------------------------------------------------------
// Generación
// ---------------------------------------------------------------------------
function substitute(text, adapter) {
  return text.replace(/\{\{guide:([a-z-]+)\}\}/g, (_, name) => {
    if (!GUIDES[name]) throw new Error("Guía desconocida en token: " + name);
    return ADAPTERS[adapter].guideRef(name);
  });
}

let written = 0;
for (const adapter of Object.keys(ADAPTERS)) {
  const A = ADAPTERS[adapter];

  for (const [name, meta] of Object.entries(COMMANDS)) {
    const body = readFileSync(join(ROOT, "core/workflows", name + ".md"), "utf8");
    const out = A.commandFrontmatter(meta) + substitute(body, adapter);
    mkdirSync(dirname(A.commandPath(name)), { recursive: true });
    writeFileSync(A.commandPath(name), out);
    written++;
  }

  for (const [name, meta] of Object.entries(GUIDES)) {
    const body = readFileSync(join(ROOT, "core/guides", name + ".md"), "utf8");
    const out = A.guideFrontmatter(name, meta) + substitute(body, adapter);
    mkdirSync(dirname(A.guidePath(name)), { recursive: true });
    writeFileSync(A.guidePath(name), out);
    written++;
  }

  // Agentes: solo los adaptadores que los soporten (hoy, Claude Code). OpenCode no
  // define agentPath → se omite y /review degrada al análisis en línea.
  if (A.agentPath) {
    for (const [name, meta] of Object.entries(AGENTS)) {
      const body = readFileSync(join(ROOT, "core/agents", name + ".md"), "utf8");
      const out = A.agentFrontmatter(name, meta) + substitute(body, adapter);
      mkdirSync(dirname(A.agentPath(name)), { recursive: true });
      writeFileSync(A.agentPath(name), out);
      written++;
    }
  }
}

// ---------------------------------------------------------------------------
// .mcp.json del adaptador Claude: se sirve EN LA RAÍZ DEL PLUGIN para que Claude
// Code lo auto-registre al instalarlo (no hay que copiar nada a mano por repo).
// Claude Code expande ${VAR} desde el entorno al cargar el fichero.
// ---------------------------------------------------------------------------
const claudeMcp = JSON.stringify({ mcpServers: MCP_SERVERS }, null, 2) + "\n";
const claudeMcpPath = join(ROOT, "adapters/claude/.mcp.json");
writeFileSync(claudeMcpPath, claudeMcp);
written++;

// ---------------------------------------------------------------------------
// OpenCode: artefactos que NO salen de core/ (glue específico del adaptador).
// ---------------------------------------------------------------------------

// (a) Agente primario `revisor`: ejecuta /review en modo read-only DURO. A
// diferencia de Claude (donde `allowed-tools` es pre-aprobación, no sandbox), aquí
// `permission` BLOQUEA de verdad: deny a edición y a todo bash salvo git y graphify
// de LECTURA (mismo perímetro que el allowed-tools de /review en Claude). En
// `permission.bash` gana la última regla que coincide, así que el catch-all "*": deny
// va primero y las excepciones de lectura después.
const opencodeRevisor =
  [
    "---",
    "description: Agente de revisión read-only del flujo. Ejecuta /review: solo diagnostica, nunca modifica código, ficheros de estado ni ClickUp.",
    "mode: primary",
    "permission:",
    "  edit: deny",
    "  webfetch: deny",
    "  websearch: deny",
    "  bash:",
    '    "*": deny',
    '    "git diff*": allow',
    '    "git log*": allow',
    '    "git show*": allow',
    '    "git blame*": allow',
    '    "git status*": allow',
    '    "graphify query*": allow',
    '    "graphify explain*": allow',
    '    "graphify path*": allow',
    '    "graphify --version*": allow',
    "---",
    "",
    "Eres el agente de **revisión read-only** del flujo de desarrollo. Tu única función es",
    "ejecutar el comando `/review`: diagnosticar los cambios frente a `spec.md` y reportar.",
    "Tu contrato es estricto: **solo informas**. No editas ficheros, no commiteas, no haces",
    "push, no cambias estados en ClickUp. Solo puedes leer y ejecutar git/graphify de lectura;",
    "el resto de bash está bloqueado por tu `permission`.",
    "",
    "Despacha en paralelo los subagentes revisores read-only (`revisor-bugs-seguridad`,",
    "`revisor-spec-tests`, `revisor-convenciones`) y, tras sintetizar, el `verificador-hallazgos`,",
    "tal como detalla el comando `/review`. Si el usuario quiere corregir algo tras tu informe,",
    "lo pedirá explícitamente con `/implement` (que detecta el modo corrección).",
    "",
  ].join("\n");
const opencodeRevisorPath = join(ROOT, "adapters/opencode/.opencode/agent/revisor.md");
mkdirSync(dirname(opencodeRevisorPath), { recursive: true });
writeFileSync(opencodeRevisorPath, opencodeRevisor);
written++;

// (b) opencode.json del adaptador, desde la MISMA fuente MCP_SERVERS (evita drift con
// el .mcp.json de Claude). OpenCode lee `<repo>/.opencode/opencode.json`, así que el
// consumidor solo copia la carpeta `.opencode/` y queda configurado. Sin secretos
// versionados: se traduce `${VAR}` (Claude) → `{env:VAR}` (sustitución de OpenCode).
const opencodeMcp = Object.fromEntries(
  Object.entries(MCP_SERVERS).map(([name, s]) => [
    name,
    {
      type: "local",
      command: [s.command, ...s.args],
      environment: Object.fromEntries(
        Object.entries(s.env).map(([k, v]) => [
          k,
          v.replace(/^\$\{(\w+)\}$/, "{env:$1}"),
        ])
      ),
    },
  ])
);
const opencodeConfig =
  JSON.stringify(
    { $schema: "https://opencode.ai/config.json", mcp: opencodeMcp },
    null,
    2
  ) + "\n";
const opencodeConfigPath = join(ROOT, "adapters/opencode/.opencode/opencode.json");
writeFileSync(opencodeConfigPath, opencodeConfig);
written++;

// (c) Limpieza: las guías ahora son skills (.opencode/skills/). Borra el directorio
// antiguo de Markdown plano si quedó de una generación previa, para no dejar copias
// obsoletas que el consumidor pudiera arrastrar.
const legacyGuidesDir = join(ROOT, "adapters/opencode/.opencode/guides");
if (existsSync(legacyGuidesDir)) rmSync(legacyGuidesDir, { recursive: true, force: true });

console.log("sync.mjs: " + written + " ficheros generados desde core/.");
