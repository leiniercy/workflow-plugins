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
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
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

// Metadatos por guía (frontmatter de las skills de Claude)
const GUIDES = {
  "estados-tareas": {
    description:
      "Catálogo de estados de ClickUp del flujo y su mapeo a comandos del plugin. Úsala cuando necesites interpretar el estado de una tarea, decidir qué comando sugerir al usuario, o validar una transición de estado antes de proponerla.",
  },
  "registro-progreso": {
    description:
      "Procedimiento exacto para crear y actualizar tasks/<taskId>/progress.md. Úsala SIEMPRE que un comando deba registrar avance, crear el fichero inicial o actualizar el estado actual de una tarea. Garantiza que cualquier agente en sesión limpia recupere el contexto.",
  },
  "grafo-conocimiento": {
    description:
      "Procedimiento para explorar el repo vía el grafo de conocimiento de graphify en lugar de leer ficheros crudos. Úsala cuando un comando necesite entender la estructura del repo, localizar áreas afectadas por una tarea o analizar el impacto de un cambio. Incluye detección, construcción/actualización del grafo y fallback manual.",
  },
  "formato-toon": {
    description:
      "Convención de salida en formato TOON (Token-Oriented Object Notation) para datos estructurados. Úsala siempre que vayas a devolver listas largas de datos uniformes, múltiples rutas del grafo de graphify, esquemas de base de datos o salidas estructurales complejas — en lugar de JSON o YAML — para minimizar el consumo de tokens.",
  },
  "revision-hallazgos": {
    description:
      "Disciplina para validar y puntuar un hallazgo de revisión antes de reportarlo: auto-refutación contra el código, escala de confianza 0-100 con umbral ≥ 75, lista de qué NO reportar y clasificación por severidad. Úsala en /review y en los subagentes revisores para subir la señal y bajar los falsos positivos.",
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
    guideRef: (name) => "`" + name + "` (`.opencode/guides/" + name + ".md`)",
    commandPath: (name) =>
      join(ROOT, "adapters/opencode/.opencode/command", name + ".md"),
    guidePath: (name) =>
      join(ROOT, "adapters/opencode/.opencode/guides", name + ".md"),
    commandFrontmatter: (meta) =>
      [
        "---",
        "description: " + meta.description + " Uso: " + meta.argumentHint,
        "---",
        "",
      ].join("\n"),
    guideFrontmatter: () => "", // las guías de OpenCode son Markdown plano
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

console.log("sync.mjs: " + written + " ficheros generados desde core/.");
