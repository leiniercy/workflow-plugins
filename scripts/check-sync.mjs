#!/usr/bin/env node
/**
 * check-sync.mjs — prueba de la generación de adaptadores.
 *
 * sync-check (CI) ya compara lo generado con lo commiteado, pero solo ve ficheros que existen:
 * un fichero que core/ dejó de producir sigue ahí y nadie se entera (pasó con /ship). Esta
 * prueba planta huérfanos en cada directorio que sync.mjs posee, regenera y comprueba que han
 * desaparecido, y que lo que se edita a mano (hooks, evals, manifiesto) sigue intacto.
 *
 * Salida: 0 correcto · 1 violación.
 */
import { writeFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
let total = 0;
function assert(cond, msg) {
  total++;
  if (!cond) failures.push(msg);
}

// Directorios que sync.mjs posee por completo, en la salida de backbone.
const POSEIDOS = [
  "plugins/backbone/claude/commands",
  "plugins/backbone/claude/skills",
  "plugins/backbone/claude/agents",
  "plugins/backbone/claude/scripts",
  "plugins/backbone/claude/templates",
  "plugins/backbone/opencode/.opencode/command",
  "plugins/backbone/opencode/.opencode/skills",
  "plugins/backbone/opencode/.opencode/agent",
  "plugins/backbone/opencode/.opencode/scripts",
  "plugins/backbone/opencode/.opencode/templates",
  "plugins/voice/claude/commands",
  "plugins/voice/claude/skills",
  "plugins/voice/claude/agents",
  "plugins/voice/claude/scripts",
];
// Lo que se edita a mano y sync.mjs nunca debe tocar.
const A_MANO = [
  "plugins/backbone/claude/hooks/hooks.json",
  "plugins/backbone/claude/evals/routing.json",
  "plugins/backbone/claude/.claude-plugin/plugin.json",
];

const huerfanos = POSEIDOS.flatMap((d) => [
  join(ROOT, d, "zz-huerfano.md"),
  join(ROOT, d, "zz-dir-huerfano", "SKILL.md"),
]);
for (const h of huerfanos) {
  mkdirSync(dirname(h), { recursive: true });
  writeFileSync(h, "huérfano plantado por check-sync\n");
}

execFileSync(process.execPath, [join(ROOT, "scripts/sync.mjs")], { stdio: "pipe" });

for (const h of huerfanos) {
  assert(!existsSync(h), `sync.mjs borra el huérfano ${h.slice(ROOT.length + 1)}`);
  assert(!existsSync(dirname(h)) || !h.includes("zz-dir-huerfano"),
    `sync.mjs borra el directorio vacío que deja ${h.slice(ROOT.length + 1)}`);
}
for (const f of A_MANO) assert(existsSync(join(ROOT, f)), `sync.mjs no toca ${f}`);

// --- paquetes ---
const COMPARTIDAS = [
  "evidencia-y-preguntas", "escritura-natural", "diagramas", "usabilidad-accesibilidad",
  "registro-progreso", "grafo-conocimiento", "formato-toon", "espacio-de-trabajo-aislado",
];
const VOICE = join(ROOT, "plugins/voice/claude");
for (const g of COMPARTIDAS) {
  assert(existsSync(join(VOICE, "skills", g, "SKILL.md")), `voice recibe la guía compartida ${g}`);
  assert(existsSync(join(ROOT, "plugins/backbone/claude/skills", g, "SKILL.md")),
    `backbone conserva la guía compartida ${g}`);
}
assert(!existsSync(join(VOICE, "skills", "rendimiento")),
  "una guía solo de backbone (rendimiento) no llega a voice");
assert(existsSync(join(VOICE, "agents", "explorador-repo.md")),
  "voice recibe el agente compartido explorador-repo");
assert(!existsSync(join(ROOT, "plugins/voice/opencode")),
  "voice no se genera para OpenCode (depende de subagentes)");
assert(!existsSync(join(VOICE, ".mcp.json")),
  "voice no trae servidor MCP propio (chocaría con el clickup de backbone)");

// Una referencia a una guía que no está en el paquete se escribe por nombre, sin ruta rota.
const diagramasVoice = readFileSync(join(VOICE, "skills/diagramas/SKILL.md"), "utf8");
assert(!/skills\/arquitectura\/SKILL\.md/.test(diagramasVoice),
  "en voice, diagramas no apunta a la ruta de una guía que voice no tiene");
assert(/`arquitectura` \(guía de backbone, no incluida en este plugin\)/.test(diagramasVoice),
  "en voice, diagramas nombra arquitectura como guía de backbone");

// Y backbone no cambia ni un byte.
const drift = execFileSync("git", ["status", "--porcelain", "--", "plugins/backbone"], {
  cwd: ROOT, encoding: "utf8",
});
assert(drift.trim() === "",
  "la salida de backbone no cambia (si tienes cambios propios sin commitear ahí, commitéalos antes)\n" + drift);

if (failures.length) {
  console.error(`check-sync: ${failures.length} de ${total} fallan`);
  for (const f of failures) console.error("  ✗ " + f);
  process.exit(1);
}
console.log(`check-sync: ${total} comprobaciones en verde`);
