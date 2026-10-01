/**
 * Lo que comparten los hooks: ejecutar git, emitir la respuesta y reconocer una rama de
 * tarea.
 *
 * ── Por qué existe ─────────────────────────────────────────────────────────────
 *
 * Estaba las tres veces duplicado entre `session-context.js` y `post-commit-progress.js`:
 * `git()` byte a byte idéntico, `emit()` diferenciándose en un literal, y el patrón de
 * rama copiado. Es el mismo argumento con el que se creó `progreso-fresco.js` y que allí
 * solo se aplicó a una función: **tenerlo escrito dos veces significa que algún día
 * valdrá dos cosas**. En concreto, si mañana se añade `test/` o `perf/` a los prefijos,
 * los dos hooks dejarían de coincidir en qué es una rama de tarea y solo uno avisaría —
 * sin que nada casque.
 *
 * `check-hygiene.mjs` recorre `hooks/` recursivamente, así que esto queda cubierto por el
 * invariante de no-escritura igual que los hooks. Sí usa `execFileSync`, que es la
 * excepción declarada en la cabecera de ese check: un hook lee de git, no escribe.
 */
const { execFileSync } = require("child_process");

/**
 * Prefijos de rama que el flujo reconoce como tarea. Fuente única: si esto crece, crece
 * para los dos hooks a la vez.
 */
const PREFIJOS_RAMA = ["feat", "fix", "chore", "refactor", "docs"];

/** Ejecuta git en `cwd` devolviendo stdout recortado, o null si falla. */
function git(args, cwd) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      timeout: 5000,
      windowsHide: true,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

/**
 * taskId de una rama `<tipo>/<taskId>_<slug>`, o null si no es una rama de tarea.
 */
function ramaDeTarea(branch) {
  if (!branch) return null;
  const m = branch.match(new RegExp("^(?:" + PREFIJOS_RAMA.join("|") + ")\\/([^_]+)_"));
  return m ? m[1] : null;
}

/**
 * Fabrica el `emit` de un hook: emite su respuesta y termina SIEMPRE con éxito.
 *
 * Se parametriza solo el `hookEventName` porque es lo único que cambiaba entre las dos
 * copias. El contrato —código 0 y JSON válido pase lo que pase— es el mismo para todos:
 * un hook que rompe la sesión es peor que un hook ausente.
 */
function crearEmit(hookEventName) {
  return function emit(additionalContext) {
    const out = { continue: true, suppressOutput: true };
    if (additionalContext) {
      out.hookSpecificOutput = { hookEventName, additionalContext };
    }
    process.stdout.write(JSON.stringify(out));
    process.exit(0);
  };
}

module.exports = { PREFIJOS_RAMA, git, ramaDeTarea, crearEmit };
