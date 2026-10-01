#!/usr/bin/env node
/**
 * check-hooks.mjs — el hook de SessionStart hace lo que dice, ejecutándolo de verdad.
 *
 * `check-behavior.mjs` asevera la FORMA de los artefactos shipped leyéndolos. Este
 * ejecuta uno: monta repos git desechables, lanza `session-context.js` contra ellos y
 * comprueba el texto que inyecta. Son dos tests distintos a propósito — este necesita
 * `git`, subprocesos y un directorio temporal, y el otro no debe necesitarlos.
 *
 * ── Por qué existe ─────────────────────────────────────────────────────────────
 *
 * El hook dejó de ser decorativo: decide qué comando se sugiere al arrancar. Un fallo
 * suyo no casca, miente — y una sesión limpia se fía. El caso que lo motivó (revisión
 * del 2026-09-13, antes de publicar) es exactamente de esa clase: una cota pensada para
 * `progress.md` se aplicaba también a `spec.md`, los `- [ ]` se contaban DESPUÉS de
 * recortar, y una spec con 12 criterios hechos y 4 pendientes hacía que el hook
 * anunciara «todos los criterios están marcados» y enrutara a `/review`. Ningún check
 * estático lo veía, porque el fichero era sintácticamente perfecto.
 *
 * Regla que sale de ahí: **lo que el hook decide, se ejecuta en un test.** Si mañana
 * alguien toca `section()`, `acotar()`, el árbol de «Próximo paso» o el aviso de commit
 * sin registrar, esto salta.
 *
 * ── Contrato transversal ───────────────────────────────────────────────────────
 *
 * Todos los casos comprueban además lo que el hook promete siempre: sale con código 0 y
 * emite JSON válido. Un hook que rompe la sesión es peor que un hook ausente.
 *
 * Sale con código 1 si algún caso falla. Pensado para CI.
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const HOOK = join(ROOT, "plugins/backbone/claude/hooks/session-context.js");

const fallos = [];
let total = 0;

function assert(cond, msg) {
  total++;
  if (!cond) fallos.push(msg);
}

/** Repo desechable con una rama de tarea. Sin commits: el hook usa `symbolic-ref`. */
function repo(branch) {
  const dir = mkdtempSync(join(tmpdir(), "cia-hooks-"));
  const g = (...args) =>
    spawnSync("git", args, { cwd: dir, encoding: "utf8", windowsHide: true });
  g("init", "-q");
  g("checkout", "-q", "-b", branch);
  return dir;
}

/** Escribe `tasks/<id>/<nombre>` creando el directorio si hace falta. */
function tarea(dir, id, nombre, contenido) {
  const d = join(dir, "tasks", id);
  mkdirSync(d, { recursive: true });
  writeFileSync(join(d, nombre), contenido, "utf8");
}

/**
 * Ejecuta el hook y devuelve `{ contexto, code, jsonValido }`.
 * `contexto` es "" cuando el hook decide no inyectar nada, que es un resultado válido.
 */
function ejecutar(cwd) {
  const r = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ cwd }),
    encoding: "utf8",
    timeout: 15000,
    windowsHide: true,
  });
  let json = null;
  try {
    json = JSON.parse(r.stdout);
  } catch {
    /* json queda null: lo asevera el caso */
  }
  return {
    code: r.status,
    jsonValido: json !== null,
    contexto: (json && json.hookSpecificOutput && json.hookSpecificOutput.additionalContext) || "",
  };
}

/** Genera N criterios, marcados o no. Largos a propósito: superan MAX_SECCION. */
function criterios(hechos, pendientes) {
  const linea = (i, marca) =>
    `- [${marca}] ${i} El usuario puede completar la acción número ${i} desde la pantalla correspondiente`;
  const out = [];
  for (let i = 1; i <= hechos; i++) out.push(linea(i, "x"));
  for (let i = hechos + 1; i <= hechos + pendientes; i++) out.push(linea(i, " "));
  return out.join("\n");
}

function spec(cuerpoCriterios, enfoque = "Next.js con server actions.") {
  return `# Spec\n\n## Criterios de aceptación\n\n${cuerpoCriterios}\n\n## Enfoque técnico\n\n${enfoque}\n`;
}

function progress(estado, extra = "") {
  return (
    `# Progreso\n\n## Estado actual\n\n${estado}\n\n${extra}` +
    `## Historial\n\n### 2026-09-13 10:00 — implement\n\n- **Resultado:** algo concreto.\n`
  );
}

const temporales = [];
function escenario(nombre, branch, ficheros) {
  const dir = repo(branch);
  temporales.push(dir);
  for (const [id, nombre_, contenido] of ficheros) tarea(dir, id, nombre_, contenido);
  const r = ejecutar(dir);
  // Contrato transversal, en todos los casos.
  assert(r.code === 0, `[${nombre}] el hook sale con código 0 — actual: ${r.code}`);
  assert(r.jsonValido, `[${nombre}] el hook emite JSON válido`);
  return r.contexto;
}

// ---------------------------------------------------------------------------
// 1. La regresión que motivó el fichero: criterios largos, cuenta correcta.
// ---------------------------------------------------------------------------
{
  const ctx = escenario("12 hechos + 4 pendientes", "feat/T1_demo", [
    ["T1", "spec.md", spec(criterios(12, 4))],
    ["T1", "progress.md", progress("Implementando el criterio 13.")],
  ]);
  const m = /pendientes \((\d+)\)/.exec(ctx);
  assert(m && m[1] === "4", `cuenta 4 criterios pendientes tras 12 hechos — actual: ${m ? m[1] : "ninguna"}`);
  assert(
    /Sugerido: `\/implement`/.test(ctx),
    "con criterios pendientes sugiere /implement (NO /review)"
  );
  assert(
    !/Todos los criterios están marcados/.test(ctx),
    "no anuncia «todos marcados» habiendo pendientes"
  );
}

// ---------------------------------------------------------------------------
// 2. Muchos pendientes: la cuenta es la real y la LISTA es la que se acota.
// ---------------------------------------------------------------------------
{
  const ctx = escenario("20 pendientes", "feat/T2_demo", [
    ["T2", "spec.md", spec(criterios(0, 20))],
    ["T2", "progress.md", progress("Arrancando.")],
  ]);
  const m = /pendientes \((\d+)\)/.exec(ctx);
  assert(m && m[1] === "20", `cuenta los 20 pendientes — actual: ${m ? m[1] : "ninguna"}`);
  const listados = (ctx.match(/^- \[ \]/gm) || []).length;
  assert(listados === 12, `lista 12 criterios (MAX_CRITERIOS) — actual: ${listados}`);
  assert(/y 8 más en `spec\.md`/.test(ctx), "resume el resto con «y 8 más en spec.md»");
}

// ---------------------------------------------------------------------------
// 3. Todos los criterios marcados → /review. El otro lado de la regresión 1.
// ---------------------------------------------------------------------------
{
  const ctx = escenario("todos hechos", "feat/T3_demo", [
    ["T3", "spec.md", spec(criterios(16, 0))],
    ["T3", "progress.md", progress("Cerrando.")],
  ]);
  assert(/Todos los criterios están marcados/.test(ctx), "sin pendientes anuncia que están todos");
  assert(/Sugerido: `\/review`/.test(ctx), "sin pendientes sugiere /review");
}

// ---------------------------------------------------------------------------
// 4. Spec incompleta → /plan, y no /implement.
// ---------------------------------------------------------------------------
{
  const ctx = escenario("spec sin planificar", "feat/T4_demo", [
    ["T4", "spec.md", spec("_pendiente de /plan_", "_pendiente de /plan_")],
    ["T4", "progress.md", progress("Rama creada, pendiente de planificación.")],
  ]);
  assert(/Sugerido: `\/plan`/.test(ctx), "con la spec incompleta sugiere /plan");
  assert(!/Sugerido: `\/implement`/.test(ctx), "con la spec incompleta NO sugiere /implement");
}

// ---------------------------------------------------------------------------
// 5. Bloqueo: arriba del todo, y el «Próximo paso» se convierte en una parada.
// ---------------------------------------------------------------------------
{
  const ctx = escenario("con bloqueo", "feat/T5_demo", [
    ["T5", "spec.md", spec(criterios(2, 3))],
    [
      "T5",
      "progress.md",
      progress(
        "Implementando el criterio 3.",
        "## Bloqueo\n\nFalta decidir dónde se guarda el refresh token.\n\n"
      ),
    ],
  ]);
  assert(/BLOQUEADO/.test(ctx), "el bloqueo se inyecta");
  assert(
    ctx.indexOf("BLOQUEADO") < ctx.indexOf("Estado actual"),
    "el bloqueo va ANTES que el Estado actual"
  );
  assert(/No avances por tu/.test(ctx), "con bloqueo, el Próximo paso es una parada");
  assert(
    !/Sugerido: `\/implement`/.test(ctx),
    "con bloqueo NO sugiere /implement aunque haya criterios pendientes"
  );
}

// ---------------------------------------------------------------------------
// 6. `## Bloqueo` con el cuerpo vacío no es un bloqueo: no se inventa una alarma.
// ---------------------------------------------------------------------------
{
  const ctx = escenario("bloqueo vacío", "feat/T6_demo", [
    ["T6", "spec.md", spec(criterios(2, 3))],
    ["T6", "progress.md", progress("En curso.", "## Bloqueo\n\n\n\n")],
  ]);
  assert(!/BLOQUEADO/.test(ctx), "una sección Bloqueo vacía NO produce alarma");
  assert(/Sugerido: `\/implement`/.test(ctx), "con bloqueo vacío el flujo sigue normal");
}

// ---------------------------------------------------------------------------
// 7. progress.md malformado: la cota impide que el historial entero entre en contexto.
// ---------------------------------------------------------------------------
{
  const historial = Array.from(
    { length: 60 },
    (_, i) => `### 2026-09-13 10:00 — implement (entrada ${i + 1} de relleno, texto largo)`
  ).join("\n");
  // Sin `## Historial`: section() no encuentra dónde parar y arrastraría el fichero entero.
  const malformado = `# Progreso\n\n## Estado actual\n\nEn curso.\n\n${historial}\n`;
  const ctx = escenario("progress.md malformado", "feat/T7_demo", [
    ["T7", "spec.md", spec(criterios(2, 3))],
    ["T7", "progress.md", malformado],
  ]);
  assert(
    ctx.length < malformado.length,
    `la inyección (${ctx.length}) es menor que el fichero (${malformado.length})`
  );
  assert(/recortado: revisa la estructura de `progress\.md`/.test(ctx),
    "avisa del recorte nombrando el fichero que hay que revisar");
  assert(
    /pendientes \(3\)/.test(ctx),
    "un progress.md malformado NO contamina la cuenta de criterios de spec.md"
  );
}

// ---------------------------------------------------------------------------
// 8. Fuera de rama de tarea: sin ruido si el repo no usa el flujo.
// ---------------------------------------------------------------------------
{
  const dir = repo("main");
  temporales.push(dir);
  const r = ejecutar(dir);
  assert(r.code === 0, `[rama no-tarea] el hook sale con código 0 — actual: ${r.code}`);
  assert(r.jsonValido, "[rama no-tarea] el hook emite JSON válido");
  assert(r.contexto === "", "en un repo sin tasks/ y fuera de rama de tarea no inyecta nada");
}

// ---------------------------------------------------------------------------
// 9. El hook nunca rompe la sesión, pase lo que pase.
// ---------------------------------------------------------------------------
{
  const noGit = mkdtempSync(join(tmpdir(), "cia-hooks-nogit-"));
  temporales.push(noGit);
  const r = ejecutar(noGit);
  assert(r.code === 0, `[no es repo git] sale con código 0 — actual: ${r.code}`);
  assert(r.jsonValido, "[no es repo git] emite JSON válido");

  const inexistente = join(tmpdir(), "cia-hooks-no-existe-" + process.pid);
  const r2 = ejecutar(inexistente);
  assert(r2.code === 0, `[cwd inexistente] sale con código 0 — actual: ${r2.code}`);
  assert(r2.jsonValido, "[cwd inexistente] emite JSON válido");

  // stdin que no es JSON: el hook debe degradar a process.cwd(), no reventar.
  const r3 = spawnSync(process.execPath, [HOOK], {
    input: "esto no es json",
    encoding: "utf8",
    timeout: 15000,
    windowsHide: true,
  });
  assert(r3.status === 0, `[stdin no-JSON] sale con código 0 — actual: ${r3.status}`);
  let ok = false;
  try {
    JSON.parse(r3.stdout);
    ok = true;
  } catch {
    /* ok queda false */
  }
  assert(ok, "[stdin no-JSON] emite JSON válido");
}

// ---------------------------------------------------------------------------
// 10-12. Commit que no consta en el historial.
//
// El hook PostToolUse (`post-commit-progress.js`) avisa en el momento del commit; este
// es la segunda red, para la sesión que se abre después. Sin ella, un commit que se
// escapó del registro solo se descubre leyendo el fichero a mano.
//
// El margen importa igual que allí: en el camino feliz la entrada se escribe justo ANTES
// del commit, así que exigir que el historial sea más nuevo que HEAD haría saltar el
// aviso siempre — y un aviso que salta siempre se lee como ruido.
// ---------------------------------------------------------------------------
{
  /** `YYYY-MM-DD HH:MM` local: el formato de las entradas de progress.md. */
  const sello = (d) => {
    const p = (n) => String(n).padStart(2, "0");
    return (
      d.getFullYear() +
      "-" +
      p(d.getMonth() + 1) +
      "-" +
      p(d.getDate()) +
      " " +
      p(d.getHours()) +
      ":" +
      p(d.getMinutes())
    );
  };

  /** Repo de tarea con un commit fechado y una entrada de historial fechada. */
  function conCommit(branch, taskId, entradaAt, commitAt) {
    const dir = repo(branch);
    temporales.push(dir);
    tarea(dir, taskId, "spec.md", spec(criterios(2, 3)));
    tarea(
      dir,
      taskId,
      "progress.md",
      "# Progreso\n\n## Estado actual\n\nEn curso.\n\n## Historial\n\n### " +
        sello(entradaAt) +
        " — implement\n\n- **Resultado:** criterio 1 completado.\n"
    );
    const g = (args, env) =>
      spawnSync("git", args, {
        cwd: dir,
        encoding: "utf8",
        windowsHide: true,
        env: { ...process.env, ...env },
      });
    g(["config", "user.email", "test@example.com"]);
    g(["config", "user.name", "Test"]);
    if (commitAt) {
      const p = (n) => String(n).padStart(2, "0");
      const off = -commitAt.getTimezoneOffset();
      const signo = off >= 0 ? "+" : "-";
      const abs = Math.abs(off);
      const f =
        sello(commitAt).replace(" ", "T") +
        ":00" +
        signo +
        p(Math.floor(abs / 60)) +
        p(abs % 60);
      g(["add", "-A"]);
      g(["commit", "-q", "-m", "feat: el trabajo que no consta"], {
        GIT_AUTHOR_DATE: f,
        GIT_COMMITTER_DATE: f,
      });
    }
    const r = ejecutar(dir);
    assert(r.code === 0, `[${branch}] el hook sale con código 0 — actual: ${r.code}`);
    assert(r.jsonValido, `[${branch}] el hook emite JSON válido`);
    return r.contexto;
  }

  const ahora = new Date();
  const haceMin = (m) => new Date(ahora.getTime() - m * 60000);

  // 10. El commit es de hace un rato y la última entrada, de hace horas.
  const ctx10 = conCommit("feat/TA_demo", "TA", haceMin(240), haceMin(5));
  assert(
    /commit sin registrar/i.test(ctx10),
    "un commit posterior a la última entrada del historial se avisa al arrancar"
  );
  assert(
    /el trabajo que no consta/.test(ctx10),
    "el aviso nombra el asunto del commit para que se sepa cuál es"
  );

  // 11. Camino feliz: se registró y se commiteó acto seguido.
  const ctx11 = conCommit("feat/TB_demo", "TB", haceMin(6), haceMin(4));
  assert(
    !/commit sin registrar/i.test(ctx11),
    "una entrada escrita justo antes del commit NO produce aviso"
  );

  // 12. Repo sin commits: no hay nada de lo que avisar, y es el caso de los 9 escenarios
  //     anteriores — esta aserción es la que impide que el aviso nuevo los contamine.
  const ctx12 = conCommit("feat/TC_demo", "TC", haceMin(240), null);
  assert(
    !/commit sin registrar/i.test(ctx12),
    "sin commits en la rama no se avisa de ningún commit"
  );
}

// ---------------------------------------------------------------------------
// Limpieza y veredicto
// ---------------------------------------------------------------------------
for (const d of temporales) {
  try {
    rmSync(d, { recursive: true, force: true });
  } catch {
    /* un temporal que no se deja borrar no invalida el test */
  }
}

if (fallos.length) {
  console.error(`✗ ${fallos.length}/${total} aserción(es) de hooks fallaron:`);
  for (const f of fallos) console.error("  - " + f);
  console.error("");
  console.error("  El hook decide qué comando se sugiere al arrancar: si miente, una");
  console.error("  sesión limpia se fía. Arregla el hook, no la aserción.");
  process.exit(1);
}

console.log(`✓ ${total} aserciones de hooks OK (session-context ejecutado en 12 escenarios).`);
