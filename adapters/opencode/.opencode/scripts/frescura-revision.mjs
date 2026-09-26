#!/usr/bin/env node
/**
 * frescura-revision.mjs — ¿la revisión de la PR cubre el árbol que vas a cerrar?
 *
 *   gh pr view --json headRefOid,reviewDecision,reviews > /tmp/pr.json
 *   node frescura-revision.mjs /tmp/pr.json --head <sha de HEAD>
 *   → JSON por stdout. Código 0 si la entrada se pudo leer; 2 si no.
 *
 * Lo usa la Fase 3 de `/close`.
 *
 * ── Por qué es un script y no prosa ────────────────────────────────────────────
 *
 * Comparar dos sha y contar estados de revisión es trabajo mecánico, y hecho en prosa
 * tiene el fallo de siempre: el agente que reconstruye el patrón en cada ejecución no
 * se puede probar, y cuando se equivoca no casca — devuelve «parece al día», que es
 * indistinguible de estarlo. Aquí el veredicto sale de un `===` que tiene tests.
 *
 * ── Por qué mira la PR y no lo que dijo `/review` ──────────────────────────────
 *
 * Porque `/review` **no escribe ficheros**, y eso no se toca: es el contrato que hace
 * que «solo informa» sea literal y no una promesa de la prosa. Un recibo escrito por
 * `/review` obligaría a darle `Write`, que es exactamente lo que `check-behavior`
 * prohíbe. La PR ya lleva el dato —GitHub guarda en qué commit se emitió cada
 * revisión—, así que el recibo ya existe y solo había que leerlo.
 *
 * El hueco que cierra: hoy `/close` valida los criterios contra `spec.md` y no mira en
 * ningún punto si alguien revisó esto, ni cuándo. Se puede cerrar una tarea con doce
 * commits posteriores a la aprobación y nada lo nota.
 *
 * ── Lo que NO hace ─────────────────────────────────────────────────────────────
 *
 * - **No bloquea.** Devuelve un grado; quien decide es la persona que cierra. Una
 *   revisión caducada puede ser irrelevante (un README, un typo) y solo quien ve el
 *   diff lo sabe.
 * - **No llama a git ni a gh.** Recibe el JSON y el sha, como `suelo-calidad.mjs`
 *   recibe el diff: puro, y por eso probable sin red ni repo.
 * - **No cuenta los commits posteriores.** Devuelve `oidRevisado` para que `/close`
 *   haga `git log --oneline <oidRevisado>..HEAD`, que es donde ese permiso ya existe.
 */
import { readFileSync } from "node:fs";

/**
 * Estados de revisión de GitHub que cuentan como que alguien MIRÓ el código.
 * `COMMENTED` no entra: un comentario suelto no es un veredicto, y tratarlo como tal
 * daría por revisada una PR donde alguien solo preguntó una duda.
 */
const DECISIVOS = new Set(["APPROVED", "CHANGES_REQUESTED", "DISMISSED"]);

function ultima(revisiones, filtro) {
  let mejor = null;
  for (const r of revisiones) {
    if (!filtro(r)) continue;
    // `submittedAt` es ISO-8601 en UTC, así que el orden lexicográfico es el cronológico.
    if (!mejor || String(r.submittedAt || "") > String(mejor.submittedAt || "")) mejor = r;
  }
  return mejor;
}

function graduar(pr, head) {
  const avisos = [];
  if (!pr || typeof pr !== "object") {
    return { grado: "INDETERMINADO", motivo: "la entrada no es un objeto JSON", avisos };
  }
  const revisiones = Array.isArray(pr.reviews) ? pr.reviews : [];
  const cabeza = String(head || pr.headRefOid || "").trim();
  if (!cabeza) {
    return { grado: "INDETERMINADO", motivo: "no se sabe en qué commit está la rama", avisos };
  }
  // `reviewDecision` es el agregado de GitHub: si pide cambios, el grado de frescura es
  // secundario — lo primero es que hay una revisión pendiente de atender.
  const cambiosSolicitados = pr.reviewDecision === "CHANGES_REQUESTED";

  const decisiva = ultima(revisiones, (r) => DECISIVOS.has(r.state));
  if (!decisiva) {
    const soloComentarios = revisiones.length > 0;
    return {
      grado: "SIN_REVISION",
      motivo: soloComentarios
        ? "la PR tiene comentarios, pero ninguna revisión con veredicto"
        : "nadie ha revisado la PR todavía",
      cambiosSolicitados,
      head: cabeza,
      avisos,
    };
  }

  const oidRevisado = String((decisiva.commit && decisiva.commit.oid) || "").trim();
  if (!oidRevisado) {
    avisos.push("la revisión no dice en qué commit se emitió (PR antigua o API recortada)");
    return { grado: "INDETERMINADO", motivo: "la revisión no trae commit", cambiosSolicitados, head: cabeza, avisos };
  }

  const alDia = oidRevisado === cabeza;
  return {
    grado: alDia ? "AL_DIA" : "CADUCADA",
    motivo: alDia
      ? "la última revisión con veredicto se emitió sobre este mismo commit"
      : "hay commits posteriores a la última revisión con veredicto",
    cambiosSolicitados,
    head: cabeza,
    oidRevisado,
    estadoRevision: decisiva.state,
    revisadoPor: (decisiva.author && decisiva.author.login) || null,
    revisadoEl: decisiva.submittedAt || null,
    // Solo cuando CADUCADA: el comando lo ejecuta, aquí no hay git.
    siguiente: alDia ? null : `git log --oneline ${oidRevisado}..HEAD`,
    avisos,
  };
}

const ruta = process.argv[2];
const iHead = process.argv.indexOf("--head");
const head = iHead >= 0 ? process.argv[iHead + 1] : null;
if (!ruta) {
  process.stderr.write("Uso: node frescura-revision.mjs <ruta-json-de-gh> [--head <sha>]\n");
  process.exit(2);
}
let pr;
try {
  pr = JSON.parse(readFileSync(ruta, "utf8"));
} catch {
  // Sin `gh`, sin PR o con una salida que no parsea, el comando degrada a preguntar.
  // Decirlo aquí es mejor que devolver un grado inventado.
  process.stdout.write(
    JSON.stringify({ grado: "INDETERMINADO", motivo: "no se pudo leer la salida de gh: " + ruta, avisos: [] }, null, 2) + "\n",
  );
  process.exit(2);
}
process.stdout.write(JSON.stringify(graduar(pr, head), null, 2) + "\n");
