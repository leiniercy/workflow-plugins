#!/usr/bin/env node
/**
 * Hook SessionStart de inyección de contexto + bootstrap del flujo
 * (exclusivo de Claude Code).
 *
 * Al iniciar/limpiar/compactar una sesión:
 *   - En una rama de tarea (`<tipo>/<taskId>_<slug>`): inyecta el "Estado actual"
 *     de progress.md, los criterios pendientes de spec.md y un PRÓXIMO PASO
 *     sugerido (derivado del estado de la spec) + recordatorio de gates. Así el
 *     flujo se auto-conduce sin que el usuario recuerde qué comando toca.
 *   - Fuera de una rama de tarea, si el repo ya usa el flujo (existe `tasks/`):
 *     un recordatorio mínimo de una línea. Sin ruido en repos no adoptados.
 *
 * Tono deliberadamente SUAVE (sugiere, no impone): el plugin mantiene los gates
 * humanos. Contrato de hook: jamás rompe la sesión — cualquier fallo (no es repo
 * git, git ausente, ficheros inexistentes) degrada en silencio con código 0.
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

  const hasTasksDir = existsSync(join(root, "tasks"));

  // 3. taskId desde el patrón <tipo>/<taskId>_<slug>.
  const match = branch.match(/^(?:feat|fix|chore|refactor|docs)\/([^_]+)_/);
  if (!match) {
    // Fuera de rama de tarea: recordatorio mínimo SOLO si el repo ya usa el flujo.
    if (hasTasksDir) {
      emit(
        "## custom-ia-plugin\n\n" +
          "Este repo usa el flujo guiado por tareas, pero `" +
          branch +
          "` no es una rama de tarea. Para empezar una tarea: `/start <taskId>`; " +
          "para retomar una, haz checkout de su rama `<tipo>/<taskId>_<slug>`."
      );
    }
    emit(null);
  }
  const taskId = match[1];

  // 4. Estado de la tarea.
  const taskDir = join(root, "tasks", taskId);
  const progressPath = join(taskDir, "progress.md");
  const specPath = join(taskDir, "spec.md");

  if (!existsSync(progressPath) && !existsSync(specPath)) {
    // Rama de tarea sin esqueleto: lo habitual es no haber corrido /start.
    emit(
      "## custom-ia-plugin\n\n" +
        "Estás en la rama de tarea `" +
        branch +
        "` (`" +
        taskId +
        "`) pero no existe `tasks/" +
        taskId +
        "/`. Sugerido: `/start " +
        taskId +
        "` para crear el esqueleto (spec.md + progress.md) antes de continuar."
    );
  }

  const parts = [];
  let nextStep = null;

  if (existsSync(progressPath)) {
    const progress = readFileSync(progressPath, "utf8");
    const estado = section(progress, /^estado actual$/i);
    if (estado) parts.push("**Estado actual:** " + estado);
  }

  if (existsSync(specPath)) {
    const spec = readFileSync(specPath, "utf8");
    const criterios = section(spec, /criterios de aceptaci[óo]n/i);
    const enfoque = section(spec, /enfoque t[ée]cnico/i);
    const placeholder = /_pendiente de \/plan_/i;

    const items = criterios
      .split(/\r?\n/)
      .filter((l) => /^\s*-\s*\[[ xX]\]/.test(l));
    const pendientes = items
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

    // Próximo paso sugerido (suave, derivado del estado de la spec).
    if (
      placeholder.test(criterios) ||
      placeholder.test(enfoque) ||
      (!criterios && !enfoque)
    ) {
      nextStep =
        "La especificación está incompleta (secciones `_pendiente de /plan_`). " +
        "Sugerido: `/plan` para completarla — `/implement` se negará sin criterios definidos.";
    } else if (pendientes.length) {
      nextStep =
        "Sugerido: `/implement` para continuar criterio a criterio con TDD.";
    } else if (items.length) {
      nextStep =
        "Todos los criterios están marcados. Sugerido: `/review` para un diagnóstico " +
        "independiente antes de pedir revisión humana.";
    }
  } else {
    nextStep = "No existe `spec.md`. Sugerido: `/plan` para crear la especificación.";
  }

  // Si no hay ni estado, ni criterios, ni un próximo paso útil: no inyectamos.
  if (!parts.length && !nextStep) emit(null);

  let context =
    "## Contexto de tarea activa (custom-ia-plugin)\n\n" +
    "Estás en la rama `" +
    branch +
    "` (tarea `" +
    taskId +
    "`). Estado recuperado de `tasks/" +
    taskId +
    "/`:";

  if (parts.length) context += "\n\n" + parts.join("\n\n");
  if (nextStep) context += "\n\n### Próximo paso\n" + nextStep;
  context +=
    "\n\n_Gates: pide aprobación antes de cualquier acción visible (commit, push, PR, " +
    "cambio de estado en ClickUp). La fuente de verdad es `tasks/" +
    taskId +
    "/spec.md`._";

  emit(context);
} catch {
  // Salvaguarda final: nunca romper la sesión.
  emit(null);
}
