#!/usr/bin/env node
/**
 * check-guard.mjs — lo que el guard DECIDE, se ejecuta en un test.
 *
 * `destructive-guard.js` es el otro hook que se ejecuta solo en la máquina del usuario,
 * y el más delicado: convierte en determinista el gate de las acciones que un `git revert`
 * no deshace (force-push, `rm -rf`, SQL destructivo, sobrescribir `.env`). Hasta ahora no
 * tenía test propio — `check-hooks.mjs` solo prueba `session-context.js`. Un guard roto no
 * casca: deja pasar en silencio justo lo que existe para frenar, o bloquea trabajo legítimo.
 *
 * Este test lanza el guard de verdad como subproceso, le mete el JSON que le manda el
 * harness por stdin y comprueba la decisión (`deny` / `ask` / ninguna). Mismo enfoque que
 * check-hooks: subproceso + stdin, porque es exactamente como corre en producción.
 *
 * Contrato transversal, en todos los casos: sale con código 0 y emite JSON válido. Un hook
 * que rompe la sesión es peor que un hook ausente.
 *
 * Sale con código 1 si algún caso falla. Pensado para CI.
 */
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const HOOK = join(ROOT, "adapters/claude/hooks/destructive-guard.js");

const fallos = [];
let total = 0;

function assert(cond, msg) {
  total++;
  if (!cond) fallos.push(msg);
}

/**
 * Ejecuta el guard con una entrada de hook. Devuelve la decisión y si cumplió el
 * contrato transversal (código 0, JSON válido).
 */
function corre(input, env = {}) {
  const r = spawnSync(process.execPath, [HOOK], {
    input: typeof input === "string" ? input : JSON.stringify(input),
    encoding: "utf8",
    windowsHide: true,
    env: { ...process.env, ...env },
  });
  let json = null;
  try {
    json = JSON.parse(r.stdout);
  } catch {
    /* json queda null: el contrato de JSON válido lo marcará */
  }
  return {
    code: r.status,
    jsonValido: json !== null,
    decision: json?.hookSpecificOutput?.permissionDecision,
    motivo: json?.hookSpecificOutput?.permissionDecisionReason || "",
  };
}

/** Caso sobre un comando de Bash. */
function bash(command, env) {
  return corre({ tool_name: "Bash", tool_input: { command } }, env);
}
/** Caso sobre una escritura de fichero. */
function escribe(file_path) {
  return corre({ tool_name: "Write", tool_input: { file_path } });
}

/** Comprueba decisión esperada + contrato transversal, en un solo sitio. */
function caso(nombre, r, esperada) {
  assert(r.code === 0, `[${nombre}] sale con código 0 — actual: ${r.code}`);
  assert(r.jsonValido, `[${nombre}] emite JSON válido`);
  assert(
    r.decision === esperada,
    `[${nombre}] decisión esperada ${esperada || "(ninguna)"} — actual: ${
      r.decision || "(ninguna)"
    }`
  );
}

// --- push forzado ------------------------------------------------------------
caso("force a main", bash("git push --force origin main"), "deny");
caso("force -f a master", bash("git push -f origin master"), "deny");
caso("force a rama de trabajo", bash("git push --force origin feat/x"), "ask");
// El comportamiento nuevo: la variante segura tampoco pasa gratis sobre una principal…
caso(
  "force-with-lease a main",
  bash("git push --force-with-lease origin develop"),
  "ask"
);
caso(
  "force-if-includes a main",
  bash("git push --force-if-includes origin main"),
  "ask"
);
// …pero sobre una rama de trabajo es justo el camino recomendado: no se molesta.
caso(
  "force-with-lease a rama de trabajo",
  bash("git push --force-with-lease origin feat/x"),
  undefined
);
caso("push normal a main", bash("git push origin main"), undefined);

// --- borrado recursivo -------------------------------------------------------
caso("rm -rf /", bash("rm -rf /"), "deny");
caso("rm -rf ~", bash("rm -rf ~"), "deny");
caso("rm -rf de una ruta acotada", bash("rm -rf ./build"), "ask");

// --- git que descarta trabajo ------------------------------------------------
caso("reset --hard", bash("git reset --hard HEAD~1"), "ask");
caso("clean -f", bash("git clean -fd"), "ask");

// --- SQL ---------------------------------------------------------------------
caso("DROP DATABASE", bash('psql -c "DROP DATABASE ventas"'), "deny");
caso("DROP TABLE", bash('psql -c "DROP TABLE sesiones"'), "ask");
caso("DELETE sin WHERE", bash('psql -c "DELETE FROM users"'), "ask");
caso("DELETE con WHERE", bash('psql -c "DELETE FROM users WHERE id = 1"'), undefined);
caso("UPDATE sin WHERE", bash('psql -c "UPDATE users SET activo = false"'), "ask");

// --- escritura de ficheros ---------------------------------------------------
caso("sobrescribir .env", escribe(".env"), "ask");
caso("escribir .env.example", escribe(".env.example"), undefined);
caso("escribir un fichero normal", escribe("src/index.js"), undefined);

// --- contrato y degradación --------------------------------------------------
caso("comando inocuo no decide", bash("ls -la"), undefined);
caso("herramienta desconocida no decide", corre({ tool_name: "Grep", tool_input: {} }), undefined);
caso("GUARD=off no interfiere ni con rm -rf /", bash("rm -rf /", { CUSTOM_IA_GUARD: "off" }), undefined);

// stdin no-JSON: el contrato es salir con 0 y JSON válido sin decidir.
{
  const r = corre("esto no es json");
  assert(r.code === 0, `[stdin no-JSON] sale con código 0 — actual: ${r.code}`);
  assert(r.jsonValido, "[stdin no-JSON] emite JSON válido");
  assert(r.decision === undefined, "[stdin no-JSON] no decide");
}

if (fallos.length) {
  console.error(`✗ ${fallos.length}/${total} comprobación(es) del guard fallaron:`);
  for (const f of fallos) console.error("  - " + f);
  console.error("");
  console.error("  Un guard que deja pasar lo irreversible no casca: canta un ✓ y sigue.");
  process.exit(1);
}

console.log(`✓ ${total} comprobaciones del guard OK — decide y respeta el contrato.`);
