#!/usr/bin/env node
/**
 * check-behavior.mjs — mitad DETERMINISTA del eval de comportamiento (#6).
 *
 * Asevera los contratos que encodean el comportamiento del plugin sobre los
 * artefactos SHIPPED (adapters/claude/*): si un contrato se rompe (p. ej. /review
 * deja de ser read-only, o un agente pierde su modelo o gana Write), el agente se
 * comportaría mal — y esto lo detecta antes de publicar.
 *
 * Es un test INDEPENDIENTE de sync.mjs a propósito: re-declara las expectativas en
 * vez de derivarlas, para que un cambio que rompa un contrato salte aquí.
 *
 * La mitad NO determinista (¿se auto-activa la guía?, ¿elige el comando correcto?)
 * vive en docs/eval-comportamiento.md y se ejecuta a mano antes de publicar.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CLAUDE = join(ROOT, "adapters/claude");

const failures = [];
let total = 0;

function assert(cond, msg) {
  total++;
  if (!cond) failures.push(msg);
}
function read(p) {
  return existsSync(p) ? readFileSync(p, "utf8") : null;
}
function frontmatter(text) {
  const m = /^---\n([\s\S]*?)\n---/.exec(text || "");
  return m ? m[1] : "";
}
function field(fm, name) {
  const m = new RegExp("^" + name + ":\\s*(.*)$", "m").exec(fm);
  return m ? m[1].trim() : null;
}

// --- /review: read-only + puede despachar subagentes ---
const reviewFm = frontmatter(read(join(CLAUDE, "commands/review.md")));
const allowed = field(reviewFm, "allowed-tools") || "";
assert(/\bRead\b/.test(allowed) && /\bGlob\b/.test(allowed) && /\bGrep\b/.test(allowed),
  "/review allowed-tools incluye Read/Glob/Grep");
assert(/\bAgent\b/.test(allowed), "/review allowed-tools incluye Agent (despacho de subagentes)");
assert(!/\bEdit\b/.test(allowed) && !/\bWrite\b/.test(allowed),
  "/review allowed-tools NO incluye Edit/Write (contrato read-only)");

// --- los 4 comandos existen y llevan Banderas rojas ---
for (const cmd of ["start", "plan", "implement", "review"]) {
  const body = read(join(CLAUDE, "commands", cmd + ".md"));
  assert(body !== null, `comando /${cmd} existe`);
  assert(body !== null && /Banderas rojas/i.test(body), `/${cmd} tiene tabla de Banderas rojas`);
}

// --- 6 agentes: read-only DURO (tools exacto) + modelo por tier ---
const AGENTS = {
  "revisor-bugs-seguridad": "opus",
  "revisor-spec-tests": "sonnet",
  // sonnet a propósito (no haiku): deducir el patrón vigente exige leer ficheros vecinos —
  // trabajo multi-turno, donde el tier más barato gasta más turnos de los que ahorra.
  "revisor-convenciones": "sonnet",
  "revisor-usabilidad-accesibilidad": "sonnet",
  "verificador-hallazgos": "opus",
  "explorador-repo": "sonnet",
};
for (const [name, model] of Object.entries(AGENTS)) {
  const body = read(join(CLAUDE, "agents", name + ".md"));
  assert(body !== null, `agente ${name} existe`);
  if (body === null) continue;
  const fm = frontmatter(body);
  const tools = field(fm, "tools") || "";
  assert(/^Read,\s*Grep,\s*Glob$/.test(tools),
    `${name} tools = "Read, Grep, Glob" (read-only duro) — actual: "${tools}"`);
  assert(field(fm, "model") === model, `${name} model = ${model} — actual: ${field(fm, "model")}`);
}

// --- guías: auto-activables (user-invocable:false, sin disable-model-invocation, con description) ---
//
// La `description` es el DISPARADOR: si resume el contenido de la guía, el agente sigue el
// resumen y no llega a abrirla (hallazgo medido de superpowers/writing-skills, §2 de
// docs/referencias.md). Por eso se asevera su forma, no solo su presencia:
//   - ≤ 500 caracteres (además, el frontmatter completo tiene un techo duro de 1024)
//   - contiene "Úsala", que es como se redacta un disparador ("Úsala cuando/al/en…")
const DESC_MAX = 500;
const FRONTMATTER_MAX = 1024;
const GUIDES = ["estados-tareas", "registro-progreso", "grafo-conocimiento", "formato-toon", "revision-hallazgos", "historias-usuario", "codigo-limpio", "patrones-diseno", "niveles-y-tipos-de-prueba", "arquitectura", "calidad-producto", "rendimiento", "usabilidad-accesibilidad", "migraciones-de-datos", "depuracion-sistematica", "recepcion-de-revision", "qa-exploratoria", "espacio-de-trabajo-aislado"];
for (const g of GUIDES) {
  const body = read(join(CLAUDE, "skills", g, "SKILL.md"));
  assert(body !== null, `skill ${g} existe`);
  if (body === null) continue;
  const fm = frontmatter(body);
  assert(field(fm, "user-invocable") === "false", `${g} es user-invocable:false (fuera del menú /)`);
  assert(!/disable-model-invocation/.test(fm), `${g} NO desactiva la auto-activación`);
  const rawDesc = field(fm, "description");
  assert(!!rawDesc, `${g} tiene description (disparador de auto-activación)`);
  assert(!!rawDesc && /^".*"$/.test(rawDesc),
    `${g} description ENTRECOMILLADA — un escalar YAML plano con «: » rompe el parseo del frontmatter ENTERO y el harness carga la skill sin metadatos (sin name, sin description: deja de auto-activarse en silencio)`);
  const desc = (rawDesc || "").replace(/^"|"$/g, "");
  assert(desc.length <= DESC_MAX,
    `${g} description ≤ ${DESC_MAX} chars (disparador, no resumen) — actual: ${desc.length}`);
  assert(/Úsala/.test(desc),
    `${g} description redactada como disparador ("Úsala cuando/al/en…")`);
  assert(fm.length <= FRONTMATTER_MAX,
    `${g} frontmatter ≤ ${FRONTMATTER_MAX} chars (techo del formato) — actual: ${fm.length}`);
}

// --- estados-tareas mapea los 4 estados del flujo ---
const estados = read(join(CLAUDE, "skills/estados-tareas/SKILL.md")) || "";
for (const st of ["to do", "in progress", "review", "complete"]) {
  assert(estados.includes("`" + st + "`"), `estados-tareas documenta el estado ${st}`);
}

if (failures.length) {
  console.error(`✗ ${failures.length}/${total} aserciones de comportamiento fallaron:`);
  for (const f of failures) console.error("  - " + f);
  console.error("  (los contratos de los prompts cambiaron: revisa core/ y sync.mjs)");
  process.exit(1);
}
console.log(`✓ ${total} aserciones de comportamiento OK (contratos de los prompts intactos).`);
