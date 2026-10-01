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
const HOOK = join(ROOT, "plugins/backbone/claude/hooks/destructive-guard.js");

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
caso("GUARD=off no interfiere ni con rm -rf /", bash("rm -rf /", { BACKBONE_GUARD: "off" }), undefined);

// stdin no-JSON: el contrato es salir con 0 y JSON válido sin decidir.
{
  const r = corre("esto no es json");
  assert(r.code === 0, `[stdin no-JSON] sale con código 0 — actual: ${r.code}`);
  assert(r.jsonValido, "[stdin no-JSON] emite JSON válido");
  assert(r.decision === undefined, "[stdin no-JSON] no decide");
}

// ---------------------------------------------------------------------------
// Frontera de edición del modo CORRECCIÓN
//
// La regla más floja del guard y la única que necesita un repo de verdad: lee la rama con
// git para decidir si `tasks/<taskId>/.frontera` sigue viva. Se monta un repo temporal por
// caso —barato— en vez de simular git, porque lo que puede romperse es justo la lectura.
// ---------------------------------------------------------------------------
{
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");

  const repos = [];
  function repo(rama, frontera) {
    const dir = mkdtempSync(join(tmpdir(), "frontera-"));
    repos.push(dir);
    const g = (...args) =>
      spawnSync("git", args, { cwd: dir, encoding: "utf8", windowsHide: true });
    g("init", "-q");
    g("config", "user.email", "t@t.t");
    g("config", "user.name", "t");
    g("config", "commit.gpgsign", "false");
    writeFileSync(join(dir, "semilla.txt"), "x");
    g("add", "-A");
    g("commit", "-qm", "semilla");
    if (rama) g("checkout", "-q", "-b", rama);
    if (frontera) {
      mkdirSync(join(dir, "tasks", frontera.taskId), { recursive: true });
      writeFileSync(join(dir, "tasks", frontera.taskId, ".frontera"), frontera.contenido);
    }
    return dir;
  }
  function editaEn(dir, file_path) {
    return corre({ tool_name: "Edit", tool_input: { file_path }, cwd: dir });
  }

  const RAMA = "feat/86abc123_login";
  const BARRA_INV = String.fromCharCode(92);
  const SALTO = String.fromCharCode(10);
  const FRONTERA = {
    taskId: "86abc123",
    contenido: [
      "# Ficheros del diff que se revisó.",
      "rama: " + RAMA,
      "src/app/page.tsx",
      "src/lib/auth.ts",
    ].join("\n"),
  };

  // Dentro de la frontera: el guard no opina.
  {
    const dir = repo(RAMA, FRONTERA);
    caso("frontera: fichero revisado", editaEn(dir, join(dir, "src/app/page.tsx")), undefined);
    caso("frontera: fichero revisado (ruta relativa)", editaEn(dir, "src/lib/auth.ts"), undefined);
  }

  // FUERA de la frontera: ask. Es el caso que motiva la regla.
  {
    const dir = repo(RAMA, FRONTERA);
    const r = editaEn(dir, join(dir, "src/lib/pagos.ts"));
    caso("frontera: fichero que el revisor no vio", r, "ask");
    assert(
      /src\/lib\/pagos\.ts/.test(r.motivo),
      "[frontera] el motivo nombra la ruta que se sale",
    );
    assert(
      /\.frontera/.test(r.motivo),
      "[frontera] el motivo dice dónde está la lista, para poder ampliarla",
    );
  }

  // El estado de la propia tarea lo escribe el flujo: avisar sería avisar de lo pedido.
  {
    const dir = repo(RAMA, FRONTERA);
    caso("frontera: progress.md de la tarea", editaEn(dir, "tasks/86abc123/progress.md"), undefined);
    caso("frontera: spec.md de la tarea", editaEn(dir, "tasks/86abc123/spec.md"), undefined);
  }

  // Frontera olvidada de otra rama: no molesta en la siguiente tarea.
  {
    const dir = repo("feat/99zzz999_otra", FRONTERA);
    caso("frontera: de otra rama, se ignora", editaEn(dir, "src/lib/pagos.ts"), undefined);
  }

  // Sin frontera, y fuera de una rama de tarea: el guard es el de siempre.
  {
    const dir = repo(RAMA, null);
    caso("frontera: no hay fichero", editaEn(dir, "src/lib/pagos.ts"), undefined);
  }
  {
    const dir = repo(null, FRONTERA);
    caso("frontera: rama que no es de tarea", editaEn(dir, "src/lib/pagos.ts"), undefined);
  }

  // Rutas en estilo Windows dentro del fichero: casan igual.
  {
    const dir = repo(RAMA, {
      taskId: "86abc123",
      // Se compone con fromCharCode(92) a proposito: una barra invertida literal aqui
      // depende de cuantas capas de escapado atraviese el fichero, y el fixture tiene
      // que valer lo que dice.
      contenido: ["rama: " + RAMA, "src" + BARRA_INV + "app" + BARRA_INV + "page.tsx"].join(SALTO),
    });
    caso("frontera: ruta escrita con barra invertida", editaEn(dir, "src/app/page.tsx"), undefined);
  }

  // No pisa al catálogo de lo irreversible: ese motivo manda.
  {
    const dir = repo(RAMA, FRONTERA);
    const r = editaEn(dir, join(dir, ".env"));
    caso("frontera: .env fuera de la frontera sigue siendo del catálogo", r, "ask");
    assert(
      /credenciales locales/.test(r.motivo),
      "[frontera] el catálogo de lo irreversible gana al motivo de la frontera",
    );
  }

  // El interruptor global también la apaga.
  {
    const dir = repo(RAMA, FRONTERA);
    const r = corre(
      { tool_name: "Edit", tool_input: { file_path: "src/lib/pagos.ts" }, cwd: dir },
      { BACKBONE_GUARD: "off" },
    );
    caso("frontera: GUARD=off la apaga también", r, undefined);
  }

  for (const d of repos) rmSync(d, { recursive: true, force: true });
}


if (fallos.length) {
  console.error(`✗ ${fallos.length}/${total} comprobación(es) del guard fallaron:`);
  for (const f of fallos) console.error("  - " + f);
  console.error("");
  console.error("  Un guard que deja pasar lo irreversible no casca: canta un ✓ y sigue.");
  process.exit(1);
}

console.log(`✓ ${total} comprobaciones del guard OK — decide y respeta el contrato.`);
