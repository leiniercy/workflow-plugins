#!/usr/bin/env node
/**
 * check-entorno.mjs — el pre-flight no miente sobre lo que hay.
 *
 * `core/scripts/entorno.mjs` sustituye tres sondeos en prosa («verifica que el working
 * tree está limpio», «que develop existe», «que el MCP responde») por una llamada con
 * respuesta. El riesgo del cambio es exactamente el que justifica el test: un pre-flight
 * que se equivoca no casca — contesta `limpio: true` sobre un árbol sucio y el comando
 * sigue tan contento.
 *
 * Se monta un repo de verdad por caso y se ejecuta el script REAL como subproceso, que es
 * como corre en el repo del usuario. Lo que NO se prueba aquí: que `gh` o `graphify` estén
 * instalados en esta máquina, porque eso mediría la máquina, no el script.
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, utimesSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = join(ROOT, "core/scripts/entorno.mjs");

const fallos = [];
let total = 0;
function assert(cond, msg) {
  total++;
  if (!cond) fallos.push(msg);
}
function eq(actual, esperado, msg) {
  assert(
    actual === esperado,
    `${msg} (esperado ${JSON.stringify(esperado)}, fue ${JSON.stringify(actual)})`,
  );
}

const creados = [];
function repo({ rama, sucio, conDevelop, tarea, grafoDias } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "entorno-"));
  creados.push(dir);
  const g = (...args) => spawnSync("git", args, { cwd: dir, encoding: "utf8", windowsHide: true });
  g("init", "-q");
  g("config", "user.email", "t@t.t");
  g("config", "user.name", "t");
  g("config", "commit.gpgsign", "false");
  writeFileSync(join(dir, "semilla.txt"), "x");
  g("add", "-A");
  g("commit", "-qm", "semilla");
  if (conDevelop) {
    g("branch", "develop");
  }
  if (rama) g("checkout", "-q", "-b", rama);
  if (tarea) {
    const d = join(dir, "tasks", tarea.taskId);
    mkdirSync(d, { recursive: true });
    if (tarea.spec !== undefined) writeFileSync(join(d, "spec.md"), tarea.spec);
    if (tarea.progress) writeFileSync(join(d, "progress.md"), "# progreso");
    if (tarea.frontera) writeFileSync(join(d, ".frontera"), "rama: " + rama);
  }
  if (grafoDias !== undefined) {
    mkdirSync(join(dir, "graphify-out"), { recursive: true });
    const f = join(dir, "graphify-out", "graph.json");
    writeFileSync(f, "{}");
    const cuando = new Date(Date.now() - grafoDias * 86400000);
    utimesSync(f, cuando, cuando);
  }
  if (sucio) writeFileSync(join(dir, "sin-commitear.txt"), "y");
  return dir;
}

function correr(dir, args = []) {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: dir,
    encoding: "utf8",
    windowsHide: true,
  });
  let json = null;
  try {
    json = JSON.parse(r.stdout);
  } catch {
    /* lo comprueba quien llama */
  }
  return { code: r.status, json };
}

// --- git: lo que sustituye a los sondeos en prosa ---
{
  const dir = repo({ rama: "feat/86abc123_login", conDevelop: true });
  const { code, json } = correr(dir);
  eq(code, 0, "el pre-flight sale con código 0 (la ausencia de algo es un dato, no un fallo)");
  eq(json.git.disponible, true, "detecta que hay repo");
  eq(json.git.rama, "feat/86abc123_login", "lee la rama");
  eq(json.git.limpio, true, "árbol limpio = limpio");
  eq(json.git.develop, true, "detecta la rama base develop");
  eq(json.git.taskId, "86abc123", "saca el taskId de la rama");
  eq(json.git.ramaDeTarea, true, "reconoce una rama de tarea");
  assert(typeof json.git.head === "string" && json.git.head.length >= 7, "devuelve el sha corto de HEAD");
}
{
  const dir = repo({ rama: "feat/86abc123_login", sucio: true });
  const { json } = correr(dir);
  eq(json.git.limpio, false, "árbol sucio = sucio (el pre-flight de /start depende de esto)");
  eq(json.git.develop, false, "sin develop lo dice");
}
{
  const dir = repo({ rama: "chapuza-rapida" });
  const { json } = correr(dir);
  eq(json.git.taskId, null, "una rama que no es de tarea no inventa taskId");
  eq(json.git.ramaDeTarea, false, "y lo declara");
}

// --- tarea: el estado que cada comando releía por su cuenta ---
{
  const dir = repo({
    rama: "feat/86abc123_login",
    tarea: { taskId: "86abc123", spec: "## Criterios\n_pendiente de /plan_\n", progress: true },
  });
  const { json } = correr(dir);
  eq(json.tarea.spec, true, "ve spec.md");
  eq(json.tarea.progress, true, "ve progress.md");
  eq(json.tarea.specPendiente, true, "spec con marcadores = planificación inicial");
  eq(json.tarea.frontera, false, "sin frontera lo dice");
}
{
  const dir = repo({
    rama: "feat/86abc123_login",
    tarea: { taskId: "86abc123", spec: "## Criterios\n- [ ] algo concreto\n", frontera: true },
  });
  const { json } = correr(dir);
  eq(json.tarea.specPendiente, false, "spec sin marcadores = revisión de plan");
  eq(json.tarea.frontera, true, "detecta una frontera de corrección viva");
}
{
  const dir = repo({ rama: "chapuza-rapida", tarea: { taskId: "86abc123", spec: "x" } });
  const { json } = correr(dir, ["--task", "86abc123"]);
  eq(json.tarea.taskId, "86abc123", "--task manda cuando la rama no lo dice");
  eq(json.tarea.spec, true, "y con él encuentra la carpeta de la tarea");
}

// --- grafo: LA razón de que este script exista ---
{
  const dir = repo({ rama: "feat/86abc123_login", grafoDias: 1 });
  const { json } = correr(dir);
  eq(json.grafo.indexado, true, "detecta el grafo indexado");
  eq(json.grafo.obsoleto, false, "un grafo de ayer no es obsoleto");
  assert(json.grafo.diasDesdeIndexado <= 1, "cuenta los días desde el indexado");
}
{
  const dir = repo({ rama: "feat/86abc123_login", grafoDias: 40 });
  const { json } = correr(dir);
  eq(json.grafo.obsoleto, true, "un grafo de hace 40 días sale como obsoleto");
  assert(json.grafo.diasDesdeIndexado >= 39, "y dice cuántos días");
}
{
  const dir = repo({ rama: "feat/86abc123_login" });
  const { json } = correr(dir);
  eq(json.grafo.indexado, false, "sin graphify-out no hay grafo");
  eq(json.grafo.obsoleto, null, "y obsoleto es null, no false: no se sabe porque no hay");
  eq(json.grafo.ruta, null, "sin grafo no hay ruta");
}

// --- contexto: los ficheros que /setup propone crear ---
{
  const dir = repo({ rama: "feat/86abc123_login" });
  const { json } = correr(dir);
  eq(json.contexto?.claudeMd, false, "sin CLAUDE.md lo dice");
  eq(json.contexto?.agentsMd, false, "sin AGENTS.md lo dice");
  eq(json.contexto?.memoryMd, false, "sin MEMORY.md lo dice");
  eq(json.contexto?.memoryIgnorado, false, "sin regla en .gitignore, MEMORY.md no está ignorado");
}
{
  const dir = repo({ rama: "feat/86abc123_login" });
  writeFileSync(join(dir, "CLAUDE.md"), "# repo");
  writeFileSync(join(dir, "AGENTS.md"), "# repo");
  writeFileSync(join(dir, "MEMORY.md"), "# memoria");
  writeFileSync(join(dir, ".gitignore"), "/MEMORY.md\n");
  const { json } = correr(dir);
  eq(json.contexto?.claudeMd, true, "ve CLAUDE.md en la raíz");
  eq(json.contexto?.agentsMd, true, "ve AGENTS.md en la raíz");
  eq(json.contexto?.memoryMd, true, "ve MEMORY.md en la raíz");
  eq(json.contexto?.memoryIgnorado, true, "detecta que MEMORY.md está en .gitignore");
}
{
  const dir = repo({ rama: "feat/86abc123_login" });
  mkdirSync(join(dir, ".claude"), { recursive: true });
  writeFileSync(join(dir, ".claude", "CLAUDE.md"), "# repo");
  const { json } = correr(dir);
  eq(json.contexto?.claudeMd, true, "CLAUDE.md dentro de .claude/ también cuenta (Claude Code lo lee ahí)");
}
{
  const dir = repo({ rama: "feat/86abc123_login" });
  writeFileSync(join(dir, "MEMORY.md"), "# memoria");
  const { json } = correr(dir);
  eq(json.contexto?.memoryIgnorado, false, "un MEMORY.md que existe pero se versionaría sale como no ignorado");
}

// --- honestidad: lo que NO puede comprobar no se inventa ---
{
  const dir = repo({ rama: "feat/86abc123_login" });
  const { json } = correr(dir);
  assert(
    typeof json.clickup.disponible === "string" && /no comprobable/.test(json.clickup.disponible),
    "ClickUp sale como NO comprobable desde el shell, no como un booleano inventado",
  );
  assert(
    typeof json.gh.autenticado === "string" && /no comprobado/.test(json.gh.autenticado),
    "la autenticación de gh sale como no comprobada, no como true",
  );
  assert(typeof json.gh.cli === "boolean", "la presencia del binario gh sí es un booleano");
}

for (const d of creados) rmSync(d, { recursive: true, force: true });

if (fallos.length) {
  console.error(`✗ ${fallos.length}/${total} comprobaciones del pre-flight fallaron:`);
  for (const f of fallos) console.error("  - " + f);
  console.error("");
  console.error("  Un pre-flight que se equivoca no casca: contesta y el comando sigue.");
  process.exit(1);
}
console.log(`✓ ${total} comprobaciones del pre-flight de entorno OK (script real, repos de verdad).`);
