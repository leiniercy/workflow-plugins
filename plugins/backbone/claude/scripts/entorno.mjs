#!/usr/bin/env node
/**
 * entorno.mjs — qué hay disponible, en una llamada y sin adivinar.
 *
 *   node entorno.mjs [--task <taskId>]
 *   → JSON por stdout. Código 0 siempre: la ausencia de algo es un dato, no un fallo.
 *
 * Lo usa el pre-flight de los cinco comandos.
 *
 * ── Por qué es un script y no prosa ────────────────────────────────────────────
 *
 * La degradación elegante es uno de los cinco principios del plugin: si falta ClickUp,
 * `gh` o el grafo, el comando lo dice y sigue por el camino manual. Pero hasta ahora eso
 * dependía de que el agente se acordara de sondear —«intenta una operación de lectura
 * ligera»— en cada comando y cada sesión. Un principio que se cumple por memoria se
 * cumple casi siempre, que es otra forma de decir que falla sin avisar.
 *
 * ── Lo que aporta que la prosa no tenía ────────────────────────────────────────
 *
 * La **antigüedad del grafo**. `/plan` lo usa para explorar el repo y `/review` para el
 * análisis de impacto, y ninguno de los dos sabía si se indexó ayer o hace tres semanas.
 * Un grafo viejo no falla: contesta, y contesta sobre un repo que ya no existe. Eso es
 * exactamente un dato sin verificar presentado como fresco, que es lo que la guía
 * `evidencia-y-preguntas` prohíbe.
 *
 * ── Lo que NO puede comprobar, y lo dice ───────────────────────────────────────
 *
 * **El MCP de ClickUp.** Un MCP vive dentro del harness, no en el shell: desde aquí no
 * hay forma honesta de saber si responde. El campo sale como `"no comprobable desde el
 * shell"` y el comando lo sondea como siempre, con una lectura ligera. Inventar un
 * `disponible: true` porque el binario de `npx` existe sería peor que no mirar.
 *
 * **Que `gh` esté autenticado.** Se comprueba que el binario está; `gh auth status` es
 * una llamada de red y este script corre en cada pre-flight. La autenticación se
 * descubre al usarlo, que es cuando importa.
 */
import { existsSync, statSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

/** Ejecuta un comando devolviendo stdout recortado, o null si falla o no está. */
function corre(cmd, args, opciones = {}) {
  try {
    return execFileSync(cmd, args, {
      encoding: "utf8",
      timeout: 5000,
      windowsHide: true,
      stdio: ["ignore", "pipe", "ignore"],
      ...opciones,
    }).trim();
  } catch {
    return null;
  }
}

/** Rutas siempre con "/": git ya las devuelve así y join() no, y mezclarlas confunde. */
function conBarras(ruta) {
  return ruta === null || ruta === undefined ? ruta : String(ruta).split(SEP_WIN).join("/");
}
const SEP_WIN = String.fromCharCode(92);

const PREFIJOS_RAMA = ["feat", "fix", "chore", "refactor", "docs"];

function taskIdDeRama(rama) {
  if (!rama) return null;
  const m = rama.match(new RegExp("^(?:" + PREFIJOS_RAMA.join("|") + ")/([^_]+)_"));
  return m ? m[1] : null;
}

/** Días enteros transcurridos desde `ms`, o null si no se sabe. */
function diasDesde(ms, ahora) {
  if (!ms) return null;
  return Math.floor((ahora - ms) / 86400000);
}

function inspeccionar({ taskIdPedido, ahora } = {}) {
  const raiz = corre("git", ["rev-parse", "--show-toplevel"]);
  const rama = raiz
    ? corre("git", ["symbolic-ref", "--short", "HEAD"]) ||
      corre("git", ["rev-parse", "--abbrev-ref", "HEAD"])
    : null;
  const estado = raiz ? corre("git", ["status", "--porcelain"]) : null;
  const taskId = taskIdPedido || taskIdDeRama(rama);

  const git = {
    disponible: Boolean(raiz),
    raiz,
    rama,
    // `--porcelain` vacío es limpio; null es «no se pudo mirar», que no es lo mismo.
    limpio: estado === null ? null : estado === "",
    develop: raiz
      ? corre("git", ["rev-parse", "--verify", "--quiet", "refs/heads/develop"]) !== null ||
        corre("git", ["rev-parse", "--verify", "--quiet", "refs/remotes/origin/develop"]) !== null
      : null,
    head: raiz ? corre("git", ["rev-parse", "--short", "HEAD"]) : null,
    taskId,
    ramaDeTarea: Boolean(taskIdDeRama(rama)),
  };

  const tarea = { taskId, spec: false, progress: false, frontera: false, specPendiente: null };
  if (raiz && taskId) {
    const dir = join(raiz, "tasks", taskId);
    tarea.dir = conBarras(dir);
    tarea.spec = existsSync(join(dir, "spec.md"));
    tarea.progress = existsSync(join(dir, "progress.md"));
    tarea.frontera = existsSync(join(dir, ".frontera"));
    if (tarea.spec) {
      // El marcador que deja /start y quita /plan. Es lo que separa «planificación
      // inicial» de «revisión de plan», y hasta ahora cada comando lo releía por su cuenta.
      try {
        tarea.specPendiente = /_pendiente de \/plan_/.test(readFileSync(join(dir, "spec.md"), "utf8"));
      } catch {
        /* ilegible: queda null, que es «no se sabe», no «no hay» */
      }
    }
  }

  // graphify: el binario es una cosa; que el grafo esté indexado y FRESCO es otra.
  const grafoJson = raiz ? join(raiz, "graphify-out", "graph.json") : null;
  const indexado = Boolean(grafoJson && existsSync(grafoJson));
  let dias = null;
  if (indexado) {
    try {
      dias = diasDesde(statSync(grafoJson).mtimeMs, ahora ?? Date.now());
    } catch {
      /* sin mtime legible: queda null y el comando lo trata como desconocido */
    }
  }
  const grafo = {
    cli: corre("graphify", ["--version"]) !== null,
    indexado,
    diasDesdeIndexado: dias,
    // Umbral declarado aquí y no en la prosa: un número que cada comando reinventa
    // acaba valiendo tres cosas distintas.
    obsoleto: dias === null ? null : dias > 14,
    ruta: indexado ? conBarras(grafoJson) : null,
  };

  // Los ficheros de contexto que /setup propone crear. Solo se mira si están: qué dicen
  // por dentro es cosa del comando, que los lee. `memoryIgnorado` importa porque
  // MEMORY.md es personal: uno que existe pero se versionaría es un fallo, no un acierto.
  const contexto = {
    claudeMd: Boolean(raiz && (existsSync(join(raiz, "CLAUDE.md")) || existsSync(join(raiz, ".claude", "CLAUDE.md")))),
    agentsMd: Boolean(raiz && existsSync(join(raiz, "AGENTS.md"))),
    memoryMd: Boolean(raiz && existsSync(join(raiz, "MEMORY.md"))),
    // `check-ignore -q` sale con 0 si la ruta está ignorada y con 1 si no: corre() devuelve
    // "" en el primer caso y null en el segundo. Funciona aunque el fichero no exista.
    memoryIgnorado: raiz ? corre("git", ["check-ignore", "-q", "MEMORY.md"], { cwd: raiz }) !== null : null,
  };

  return {
    git,
    tarea,
    contexto,
    grafo,
    gh: { cli: corre("gh", ["--version"]) !== null, autenticado: "no comprobado (es una llamada de red; se descubre al usarlo)" },
    clickup: { disponible: "no comprobable desde el shell (un MCP vive en el harness): sondéalo con una lectura ligera" },
  };
}

const iTask = process.argv.indexOf("--task");
const taskIdPedido = iTask >= 0 ? process.argv[iTask + 1] || null : null;
process.stdout.write(JSON.stringify(inspeccionar({ taskIdPedido }), null, 2) + "\n");
