#!/usr/bin/env node
/**
 * check-frescura.mjs — el grado de frescura de la revisión sale de un `===` con tests.
 *
 * `core/scripts/frescura-revision.mjs` contesta a una pregunta que hoy `/close` no se
 * hace: ¿la última revisión con veredicto cubre el commit que vas a cerrar? Es una
 * comparación de dos sha, y por eso mismo es fácil de dar por buena sin probarla: un
 * grado equivocado no casca, sale como «AL_DIA» y se lee igual que estarlo.
 *
 * Se ejecuta el script REAL con `spawnSync` sobre ficheros de verdad —igual que
 * check-fusion— porque lo que se publica es el script, no la función.
 *
 * El esquema de entrada está tomado de `gh pr view --json headRefOid,reviewDecision,reviews`
 * verificado contra la API el 2026-09-26: `reviews[]` trae `state`, `submittedAt`,
 * `author.login` y `commit.oid`. Si GitHub cambia esos nombres, el grado pasa a
 * INDETERMINADO y el comando degrada a preguntar — no a inventarse un veredicto.
 */
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = join(ROOT, "core/scripts/frescura-revision.mjs");
const dir = mkdtempSync(join(tmpdir(), "frescura-"));

const fallos = [];
let total = 0;
function assert(cond, msg) {
  total++;
  if (!cond) fallos.push(msg);
}
function eq(actual, esperado, msg) {
  assert(actual === esperado, `${msg} (esperado ${JSON.stringify(esperado)}, fue ${JSON.stringify(actual)})`);
}

let n = 0;
function correr(pr, head) {
  const ruta = join(dir, "pr-" + ++n + ".json");
  writeFileSync(ruta, typeof pr === "string" ? pr : JSON.stringify(pr));
  const args = [SCRIPT, ruta];
  if (head) args.push("--head", head);
  const r = spawnSync(process.execPath, args, { encoding: "utf8" });
  let json = null;
  try {
    json = JSON.parse(r.stdout);
  } catch {
    /* lo comprueba quien llama */
  }
  return { code: r.status, json, stdout: r.stdout, stderr: r.stderr };
}

const A = "a".repeat(40);
const B = "b".repeat(40);
const rev = (state, oid, at, who = "alguien") => ({
  state,
  submittedAt: at,
  author: { login: who },
  commit: { oid },
});

// --- AL_DIA: la aprobación se emitió sobre el commit que hay ahora ---
{
  const r = correr({ headRefOid: A, reviewDecision: "APPROVED", reviews: [rev("APPROVED", A, "2026-09-20T10:00:00Z")] });
  eq(r.code, 0, "AL_DIA sale con código 0");
  eq(r.json.grado, "AL_DIA", "aprobación sobre el mismo commit = AL_DIA");
  eq(r.json.cambiosSolicitados, false, "AL_DIA no marca cambios solicitados");
  eq(r.json.siguiente, null, "AL_DIA no pide git log");
  eq(r.json.revisadoPor, "alguien", "AL_DIA dice quién revisó");
}

// --- CADUCADA: hay commits después de la aprobación. EL CASO QUE MOTIVA EL SCRIPT ---
{
  const r = correr({ headRefOid: B, reviewDecision: "APPROVED", reviews: [rev("APPROVED", A, "2026-09-20T10:00:00Z")] });
  eq(r.json.grado, "CADUCADA", "aprobación sobre otro commit = CADUCADA");
  eq(r.json.oidRevisado, A, "CADUCADA devuelve el commit revisado");
  eq(r.json.head, B, "CADUCADA devuelve la cabeza actual");
  assert(
    r.json.siguiente === `git log --oneline ${A}..HEAD`,
    "CADUCADA deja escrito el git log que lista lo que entró después",
  );
}

// --- `--head` manda sobre headRefOid: la cabeza local puede ir por delante del remoto ---
{
  const r = correr({ headRefOid: A, reviewDecision: "APPROVED", reviews: [rev("APPROVED", A, "2026-09-20T10:00:00Z")] }, B);
  eq(r.json.grado, "CADUCADA", "--head gana a headRefOid (commits locales sin push)");
  eq(r.json.head, B, "--head es la cabeza que se reporta");
}

// --- COMMENTED no es un veredicto ---
{
  const r = correr({ headRefOid: A, reviewDecision: "", reviews: [rev("COMMENTED", A, "2026-09-20T10:00:00Z")] });
  eq(r.json.grado, "SIN_REVISION", "un comentario suelto no cuenta como revisión");
  assert(/comentarios/.test(r.json.motivo), "SIN_REVISION distingue «hay comentarios» de «no hay nada»");
}
{
  const r = correr({ headRefOid: A, reviewDecision: "REVIEW_REQUIRED", reviews: [] });
  eq(r.json.grado, "SIN_REVISION", "PR sin revisiones = SIN_REVISION");
  assert(/nadie/.test(r.json.motivo), "SIN_REVISION sin revisiones lo dice tal cual");
}

// --- se elige la ÚLTIMA decisiva, no la primera ni la última de la lista ---
{
  const r = correr({
    headRefOid: B,
    reviewDecision: "APPROVED",
    reviews: [
      rev("APPROVED", A, "2026-09-20T10:00:00Z", "temprano"),
      rev("COMMENTED", B, "2026-09-25T10:00:00Z", "ruido"),
      rev("APPROVED", B, "2026-09-24T10:00:00Z", "tarde"),
    ],
  });
  eq(r.json.grado, "AL_DIA", "gana la aprobación más reciente, no el orden del array");
  eq(r.json.revisadoPor, "tarde", "la decisiva es la más reciente por submittedAt");
}

// --- cambios solicitados: se reporta aparte del grado de frescura ---
{
  const r = correr({
    headRefOid: A,
    reviewDecision: "CHANGES_REQUESTED",
    reviews: [rev("CHANGES_REQUESTED", A, "2026-09-20T10:00:00Z")],
  });
  eq(r.json.cambiosSolicitados, true, "CHANGES_REQUESTED se marca");
  eq(r.json.grado, "AL_DIA", "pedir cambios no es lo mismo que estar caducada: son dos ejes");
  eq(r.json.estadoRevision, "CHANGES_REQUESTED", "se dice con qué veredicto se revisó");
}

// --- degradación: nunca un veredicto inventado ---
{
  const r = correr({ headRefOid: "", reviewDecision: "", reviews: [] });
  eq(r.json.grado, "INDETERMINADO", "sin cabeza conocida no se gradúa");
}
{
  const r = correr({ headRefOid: A, reviews: [{ state: "APPROVED", submittedAt: "2026-09-20T10:00:00Z" }] });
  eq(r.json.grado, "INDETERMINADO", "una revisión sin commit no se gradúa");
  assert(r.json.avisos.length > 0, "una revisión sin commit deja aviso en vez de caer en silencio");
}
{
  const r = correr("{ esto no es json");
  eq(r.code, 2, "entrada ilegible sale con código 2");
  eq(r.json && r.json.grado, "INDETERMINADO", "entrada ilegible devuelve INDETERMINADO, no un grado");
}
{
  const r = spawnSync(process.execPath, [SCRIPT], { encoding: "utf8" });
  eq(r.status, 2, "sin argumentos sale con código 2");
  assert(/Uso:/.test(r.stderr), "sin argumentos imprime el uso");
}
{
  const r = correr([1, 2, 3]);
  eq(r.json.grado, "INDETERMINADO", "un array donde se esperaba un objeto no gradúa");
}

rmSync(dir, { recursive: true, force: true });

if (fallos.length) {
  console.error(`✗ ${fallos.length}/${total} comprobaciones de frescura fallaron:`);
  for (const f of fallos) console.error("  - " + f);
  process.exit(1);
}
console.log(`✓ ${total} comprobaciones de frescura de revisión OK (script real, sin red ni repo).`);
