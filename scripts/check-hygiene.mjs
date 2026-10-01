#!/usr/bin/env node
/**
 * check-hygiene.mjs — el plugin no escribe fuera de su sitio.
 *
 * Los hooks son el único código nuestro que se ejecuta **solo y en cada sesión** en la
 * máquina del usuario, en todos sus repos. Por eso el invariante vive aquí: un hook lee
 * (git, ficheros del repo) y emite JSON por stdout. No escribe nada, y no toca la
 * configuración global del usuario.
 *
 * ── Por qué ────────────────────────────────────────────────────────────────────
 *
 * Un plugin que escribe fuera de su raíz no se desinstala solo. Medido el 2026-09-11
 * desinstalando context-mode: dejó un hook registrado en el `~/.claude/settings.json`
 * del usuario y un script en `~/.claude/hooks/`, ninguno de los dos eliminado por su
 * propio desinstalador. Habría seguido ejecutándose en cada sesión, en todos los repos,
 * apuntando a un plugin que ya no existía. → §19 de docs/referencias.md.
 *
 * La regla completa que sale de ahí (§20, con headroom como contraejemplo positivo) es:
 * si escribes fuera de tu raíz, dilo en el README, trae el comando inverso y ofrece el
 * opt-out. Nosotros elegimos lo más simple: no escribir.
 *
 * ── Alcance ────────────────────────────────────────────────────────────────────
 *
 * Solo `plugins/backbone/claude/hooks/`. Los scripts de `scripts/` SÍ escriben (sync, bump), pero
 * corren en este repo y los lanza el mantenedor a mano: no se ejecutan en la máquina de
 * nadie más. `tasks/<taskId>/` en el repo consumidor también es escritura deliberada — la
 * hacen los comandos con aprobación humana, es artefacto versionado, y git es su inverso.
 *
 * Cubre además `hooks.json`: todo `command` debe resolverse bajo `${CLAUDE_PLUGIN_ROOT}`,
 * porque el fallo que motivó el check no fue código escribiendo fuera sino un **registro**
 * apuntando fuera.
 *
 * **Lo que NO cubre**, y conviene saberlo antes de fiarse: una escritura hecha a través de
 * un subproceso (`exec("echo x > f")`) es indetectable estáticamente, y no se puede
 * prohibir `exec` sin romper los dos ficheros que legítimamente lo usan: `notify.js` para
 * el sonido y `lib/comun.js` para invocar `git` en nombre de los hooks que lo necesitan.
 * Es un cable trampa contra el descuido, no un sandbox contra la mala fe.
 *
 * (Esa lista se quedó rancia una vez, al añadir un tercer hook que también llamaba a git.
 * Hoy la llamada vive en un solo sitio — `lib/comun.js` —, así que añadir un hook nuevo ya
 * no la invalida; pero si alguno vuelve a hacer `exec` por su cuenta, esta frase hay que
 * actualizarla: es donde el repo declara el alcance real del invariante.)
 *
 * Sale con código 1 si un hook rompe el invariante. Pensado para CI.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const HOOKS_DIR = join(ROOT, "plugins/backbone/claude/hooks");
const HOOKS_JSON = join(HOOKS_DIR, "hooks.json");

/** APIs que escriben en disco. Un hook que necesite una es un hook que hay que discutir. */
const ESCRITURA = [
  "writeFileSync",
  "appendFileSync",
  "mkdirSync",
  "mkdtempSync",
  "rmSync",
  "rmdirSync",
  "unlinkSync",
  "copyFileSync",
  "cpSync",
  "renameSync",
  "truncateSync",
  "ftruncateSync",
  "symlinkSync",
  "linkSync",
  "chmodSync",
  "utimesSync",
  "createWriteStream",
  // openSync + writeSync es la vía sin `writeFileSync`: no es una evasión, es una
  // forma ordinaria de escribir a la que un colaborador puede llegar sin mala fe.
  "openSync",
  "writeSync",
  "writevSync",
  "writeFile",
  "appendFile",
  "outputFile",
];

/** Rutas que pertenecen al usuario, no a su repo: tocarlas sobrevive al desinstalador. */
const RUTAS_DE_USUARIO = [
  "homedir",
  "USERPROFILE",
  "process.env.HOME",
  ".claude.json",
  ".claude/settings",
  ".claude\\settings",
  ".claude/hooks",
  ".claude\\hooks",
];

/**
 * Quita comentarios de línea y de bloque: una mención en prosa no es una llamada.
 *
 * Es un recorte por regex, con dos límites conocidos y asumidos:
 *   - Un comentario **al final de una línea de código** no se recorta, así que
 *     `const x = 1; // no uses writeFileSync(` da un falso positivo.
 *   - Un literal de cadena que contenga `/*` abre un bloque falso.
 * El primero se deja a propósito: recortar comentarios finales obligaría a distinguir
 * `//` de comentario del de `https://` dentro de una cadena, y equivocarse ahí produce
 * un falso NEGATIVO. En un cable trampa, un falso positivo es ruidoso pero seguro; un
 * falso negativo es silencioso y deja pasar justo lo que el check existe para ver.
 */
function sinComentarios(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

// Recursivo y con las tres extensiones: un `hooks/lib/escribe.mjs` se ejecuta igual.
const ficheros = readdirSync(HOOKS_DIR, { recursive: true })
  .map((f) => String(f).replace(/\\/g, "/"))
  .filter((f) => /\.(js|mjs|cjs)$/.test(f));
if (!ficheros.length) {
  console.error(`✗ No hay hooks en ${HOOKS_DIR}: el check no está midiendo nada.`);
  process.exit(1);
}

const problemas = [];
for (const fichero of ficheros) {
  const ruta = join(HOOKS_DIR, fichero);
  const codigo = sinComentarios(readFileSync(ruta, "utf8"));

  for (const api of ESCRITURA) {
    // Frontera de palabra a la izquierda para no casar `miWriteFileSync`.
    if (new RegExp("\\b" + api + "\\s*\\(").test(codigo)) {
      problemas.push(`${fichero}: usa \`${api}(\` — un hook no escribe en disco.`);
    }
  }

  for (const ruta_usuario of RUTAS_DE_USUARIO) {
    if (codigo.includes(ruta_usuario)) {
      problemas.push(
        `${fichero}: referencia \`${ruta_usuario}\` — eso es del usuario, no de su repo.`
      );
    }
  }
}

// El fallo que motivó este check no fue código escribiendo fuera: fue un **registro**
// apuntando fuera. Todo `command` de hooks.json debe resolverse dentro del plugin, o el
// hook sobrevive al desinstalador exactamente igual.
if (existsSync(HOOKS_JSON)) {
  const crudo = readFileSync(HOOKS_JSON, "utf8");
  let manifiesto;
  try {
    manifiesto = JSON.parse(crudo);
  } catch (e) {
    problemas.push(`hooks.json: no es JSON válido (${e.message}).`);
  }
  if (manifiesto) {
    const comandos = [];
    // Recorrido genérico: la forma del manifiesto la fija el harness, no nosotros.
    const visitar = (nodo) => {
      if (Array.isArray(nodo)) return nodo.forEach(visitar);
      if (nodo && typeof nodo === "object") {
        for (const [k, v] of Object.entries(nodo)) {
          if (k === "command" && typeof v === "string") comandos.push(v);
          else visitar(v);
        }
      }
    };
    visitar(manifiesto);
    if (!comandos.length) {
      problemas.push("hooks.json: no declara ningún `command` — el check no mide nada.");
    }
    for (const cmd of comandos) {
      if (!cmd.includes("${CLAUDE_PLUGIN_ROOT}")) {
        problemas.push(
          `hooks.json: el command \`${cmd}\` no se resuelve bajo \${CLAUDE_PLUGIN_ROOT} — ` +
            "un registro que apunta fuera sobrevive al desinstalador."
        );
      }
    }
  }
}

if (problemas.length) {
  console.error("✗ Higiene del plugin rota:");
  for (const p of problemas) console.error("  - " + p);
  console.error("");
  console.error("  Un hook lee y emite JSON por stdout; no escribe y no toca ~/.claude.");
  console.error("  Si un cambio necesita de verdad escribir, no lo silencies aquí:");
  console.error("  documéntalo en el README, trae el inverso y ofrece desactivarlo (§20).");
  process.exit(1);
}

console.log(
  `✓ Higiene OK: ${ficheros.length} hook(s) sin escritura en disco ni rutas de usuario ` +
    `(${ficheros.join(", ")})` +
    (existsSync(HOOKS_JSON) ? ", y hooks.json solo registra rutas del plugin." : ".")
);
