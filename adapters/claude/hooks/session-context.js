#!/usr/bin/env node
/**
 * Hook SessionStart de inyección de contexto de tarea (exclusivo de Claude Code).
 *
 * Al iniciar/limpiar/compactar una sesión, si la rama actual sigue el patrón
 * `<tipo>/<taskId>_<slug>` y existe `tasks/<taskId>/`, inyecta automáticamente
 * el "Estado actual" de progress.md y los criterios de aceptación pendientes de
 * spec.md. Da continuidad entre sesiones sin base de datos externa.
 *
 * Contrato de hook: jamás rompe la sesión. Cualquier fallo (no es repo git, git
 * no disponible, sin tarea en la rama, ficheros ausentes) degrada en silencio
 * emitiendo `{"continue":true}` y saliendo con código 0.
 */
const { execFileSync } = require("child_process");
const { readFileSync, existsSync } = require("fs");
const { join } = require("path");

/** Emite la respuesta del hook y termina siempre con éxito. */
function emit(additionalContext) {
  const out = { continue: true, suppressOutput: true };
  if (additionalContext) {
    out.hookSpecificOutput = {
      hookEventName: "SessionStart",
      additionalContext,
    };
  }
  process.stdout.write(JSON.stringify(out));
  process.exit(0);
}

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

/** Devuelve el cuerpo de una sección `## <titulo>` hasta el siguiente `## `. */
function section(md, headingRegex) {
  const lines = md.split(/\r?\n/);
  let capturing = false;
  const body = [];
  for (const line of lines) {
    const isH2 = /^##\s+/.test(line);
    if (isH2) {
      if (capturing) break; // siguiente sección → fin
      if (headingRegex.test(line.replace(/^##\s+/, "").trim())) {
        capturing = true;
        continue;
      }
    } else if (capturing) {
      body.push(line);
    }
  }
  return body.join("\n").trim();
}

try {
  // 1. Entrada del hook (stdin JSON). Puede venir vacía: degradamos a cwd.
  let cwd = process.cwd();
  try {
    const raw = readFileSync(0, "utf8");
    if (raw) {
      const input = JSON.parse(raw);
      if (input && typeof input.cwd === "string") cwd = input.cwd;
    }
  } catch {
    /* sin stdin parseable: seguimos con process.cwd() */
  }

  // 2. Raíz del repo y rama actual (si no es git, no hay nada que inyectar).
  const root = git(["rev-parse", "--show-toplevel"], cwd) || cwd;
  // symbolic-ref resuelve el nombre de rama incluso en ramas sin commits aún
  // (unborn HEAD), donde `rev-parse --abbrev-ref HEAD` devolvería "HEAD".
  const branch =
    git(["symbolic-ref", "--short", "HEAD"], cwd) ||
    git(["rev-parse", "--abbrev-ref", "HEAD"], cwd);
  if (!branch || branch === "HEAD") emit(null);

  // 3. taskId desde el patrón <tipo>/<taskId>_<slug>.
  const match = branch.match(/^(?:feat|fix|chore|refactor|docs)\/([^_]+)_/);
  if (!match) emit(null);
  const taskId = match[1];

  // 4. Ficheros de estado de la tarea.
  const taskDir = join(root, "tasks", taskId);
  const progressPath = join(taskDir, "progress.md");
  const specPath = join(taskDir, "spec.md");
  if (!existsSync(progressPath) && !existsSync(specPath)) emit(null);

  const parts = [];

  if (existsSync(progressPath)) {
    const progress = readFileSync(progressPath, "utf8");
    const estado = section(progress, /^estado actual$/i);
    if (estado) parts.push("**Estado actual:** " + estado);
  }

  if (existsSync(specPath)) {
    const spec = readFileSync(specPath, "utf8");
    const criterios = section(spec, /criterios de aceptaci[óo]n/i);
    if (criterios) {
      const pendientes = criterios
        .split(/\r?\n/)
        .filter((l) => /^\s*-\s*\[ \]/.test(l))
        .map((l) => l.trim());
      if (pendientes.length) {
        parts.push(
          "**Criterios de aceptación pendientes (" +
            pendientes.length +
            "):**\n" +
            pendientes.join("\n")
        );
      }
    }
  }

  if (!parts.length) emit(null);

  const context =
    "## Contexto de tarea activa (custom-ia-plugin)\n\n" +
    "Estás en la rama `" +
    branch +
    "` (tarea `" +
    taskId +
    "`). Estado recuperado de `tasks/" +
    taskId +
    "/`:\n\n" +
    parts.join("\n\n") +
    "\n\nUsa `/implement` para continuar o `/review` para diagnosticar. " +
    "La fuente de verdad es `tasks/" +
    taskId +
    "/spec.md`.";

  emit(context);
} catch {
  // Salvaguarda final: nunca romper la sesión.
  emit(null);
}
