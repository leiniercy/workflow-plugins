#!/usr/bin/env node
/**
 * Hook PreToolUse — red de seguridad para acciones irreversibles
 * (exclusivo de Claude Code).
 *
 * El plugin sostiene "gates humanos para todo lo visible" con prosa y banderas
 * rojas; eso gobierna al agente cuando razona, pero no cuando se salta el paso.
 * Este hook convierte el gate en algo DETERMINISTA para el puñado de acciones
 * que un `git revert` no deshace: push forzado, borrados en cascada, SQL
 * destructivo y escritura sobre ficheros protegidos.
 *
 * Decisiones, por orden de dureza:
 *   - `ask`  → devuelve la decisión al usuario (el gate del plugin, hecho efectivo).
 *              Es el modo por defecto: el humano decide, no el hook.
 *   - `deny` → solo para lo que no tiene uso legítimo iniciado por un agente
 *              (force-push a la rama principal, `DROP DATABASE`, `rm -rf /` o `~`).
 *              El usuario siempre puede ejecutarlo él mismo desde su terminal.
 *
 * Alcance honesto: esto es una RED PARA ACCIDENTES, no un sandbox. Un agente
 * decidido puede reformular el comando y esquivar cualquier patrón. La barrera
 * dura de solo-lectura sigue siendo el campo `tools` de los agentes revisores.
 *
 * Configuración (opcional, por variables de entorno):
 *   CUSTOM_IA_GUARD=off              → desactiva el hook por completo.
 *   CUSTOM_IA_PROTECTED_PATHS=a,b,c  → fragmentos de ruta extra que exigen gate.
 *
 * Contrato de hook: jamás rompe la sesión. Cualquier fallo o entrada que no
 * entienda degrada a "sin decisión" (código 0) y deja pasar el flujo normal de
 * permisos de Claude Code.
 */
const { readFileSync, existsSync } = require("fs");

/** Emite la decisión (o ninguna) y termina siempre con éxito. */
function emit(decision, reason) {
  const out = { continue: true, suppressOutput: true };
  if (decision) {
    out.hookSpecificOutput = {
      hookEventName: "PreToolUse",
      permissionDecision: decision,
      permissionDecisionReason: reason,
    };
  }
  process.stdout.write(JSON.stringify(out));
  process.exit(0);
}

const RAMA_PRINCIPAL = /\b(main|master|develop)\b/;

/** Reglas sobre un comando de shell. Devuelve [decision, motivo] o null. */
function revisarComando(raw) {
  const c = String(raw).replace(/\s+/g, " ").trim();
  const flags = (c.match(/\s-([a-zA-Z]+)/g) || []).join("");

  // --- git: reescritura y descarte de trabajo -------------------------------
  // Push forzado. `--force`/`-f` reescribe el remoto a ciegas; `--force-with-lease`
  // (y `--force-if-includes`) es la variante segura, que aborta si el remoto se movió
  // desde tu último fetch. Se tratan distinto: la bruta más dura, y la segura tampoco
  // pasa gratis sobre una rama principal, porque aun así reescribe historia compartida.
  if (/\bgit\s+push\b/.test(c)) {
    const forzadoBruto = /(^|\s)(--force|-f)(\s|$)/.test(c);
    const forzadoConSeguro = /--force-with-lease\b|--force-if-includes\b/.test(c);
    if (forzadoBruto) {
      if (RAMA_PRINCIPAL.test(c)) {
        return [
          "deny",
          "Push forzado sobre una rama principal (main/master/develop): reescribe " +
            "historia compartida y rompe el trabajo de quien la tenga descargada. Si de " +
            "verdad hace falta, que lo ejecute el usuario desde su terminal.",
        ];
      }
      return [
        "ask",
        "Push forzado: sobrescribe la rama remota y descarta commits que no tengas en " +
          "local. Confirma con el usuario, o usa `--force-with-lease`, que aborta si el " +
          "remoto se movió.",
      ];
    }
    if (forzadoConSeguro && RAMA_PRINCIPAL.test(c)) {
      return [
        "ask",
        "`--force-with-lease` es más seguro que `--force` (aborta si el remoto se movió), " +
          "pero sobre una rama principal (main/master/develop) sigue reescribiendo " +
          "historia compartida. Confirma con el usuario que el equipo lo espera.",
      ];
    }
  }
  if (/\bgit\s+reset\b/.test(c) && /--hard\b/.test(c)) {
    return [
      "ask",
      "`git reset --hard` descarta los cambios sin commitear del árbol de trabajo, y no " +
        "hay forma de recuperarlos. Confirma con el usuario antes.",
    ];
  }
  if (/\bgit\s+clean\b/.test(c) && /f/.test(flags)) {
    return [
      "ask",
      "`git clean -f` borra ficheros no versionados: se lleva por delante `.env`, " +
        "credenciales locales y cualquier trabajo aún sin añadir. Confirma con el usuario.",
    ];
  }
  if (/\bgit\s+branch\b/.test(c) && /(\s-D\b|--delete\s+--force|--force\s+--delete)/.test(c)) {
    return [
      "ask",
      "Borrado forzado de rama: se pierden los commits que no estén fusionados en otra " +
        "parte. Confirma con el usuario.",
    ];
  }
  if (/\bgit\s+(checkout\s+--|restore)\s+\.(\s|$)/.test(c)) {
    return [
      "ask",
      "Descartar TODOS los cambios del árbol de trabajo es irreversible. Si solo quieres " +
        "revertir un fichero, nómbralo; si no, confirma con el usuario.",
    ];
  }

  // --- borrado recursivo del sistema de ficheros ----------------------------
  if (/\brm\b/.test(c) && /r/i.test(flags) && /f/i.test(flags)) {
    if (/\s(\/|~|\/\*|\*|\.)(\s|$)/.test(c)) {
      return [
        "deny",
        "Borrado recursivo forzado sobre la raíz, el directorio personal o un comodín " +
          "sin acotar. No hay uso legítimo de esto dentro de una tarea; si hace falta, " +
          "que lo ejecute el usuario.",
      ];
    }
    return [
      "ask",
      "Borrado recursivo forzado: no pasa por la papelera y no se puede deshacer. " +
        "Confirma la ruta exacta con el usuario.",
    ];
  }

  // --- SQL y herramientas de migración --------------------------------------
  if (/\bDROP\s+DATABASE\b/i.test(c)) {
    return [
      "deny",
      "`DROP DATABASE` destruye todos los datos. Un agente no debería iniciarlo nunca: " +
        "si el usuario lo quiere, que lo ejecute él.",
    ];
  }
  if (/\bDROP\s+(TABLE|SCHEMA)\b/i.test(c) || /\bTRUNCATE\b/i.test(c)) {
    return [
      "ask",
      "Operación destructiva sobre el esquema: los datos no vuelven con un revert. " +
        "Preséntala aparte, con qué se pierde, y espera aprobación (guía migraciones-de-datos).",
    ];
  }
  if (/\bDELETE\s+FROM\b/i.test(c) && !/\bWHERE\b/i.test(c)) {
    return [
      "ask",
      "`DELETE FROM` sin `WHERE` borra la tabla entera. Si de verdad es lo que quieres, " +
        "dilo explícitamente y que lo apruebe el usuario; si no, añade la condición.",
    ];
  }
  if (/\bUPDATE\b/i.test(c) && /\bSET\b/i.test(c) && !/\bWHERE\b/i.test(c)) {
    return [
      "ask",
      "`UPDATE` sin `WHERE` reescribe todas las filas y pierde los valores anteriores. " +
        "Añade la condición o pide aprobación explícita.",
    ];
  }
  if (
    /\bmigrate\s+reset\b/.test(c) ||
    /--accept-data-loss\b/.test(c) ||
    /\bmigrate:undo:all\b/.test(c) ||
    /\bdb:drop\b/.test(c)
  ) {
    return [
      "ask",
      "Este comando reinicia o revierte el esquema en bloque y vacía los datos existentes. " +
        "Confirma con el usuario contra qué entorno se ejecuta antes de seguir.",
    ];
  }

  return null;
}

/** Reglas sobre la escritura de un fichero. Devuelve [decision, motivo] o null. */
function revisarFichero(rutaCruda, existe) {
  const ruta = String(rutaCruda).replace(/\\/g, "/");
  const nombre = ruta.split("/").pop() || "";

  // .env reales — nunca las plantillas versionadas.
  if (/^\.env(\..+)?$/.test(nombre) && !/\.(example|sample|template)$/.test(nombre)) {
    return [
      "ask",
      "`" +
        nombre +
        "` guarda credenciales locales y no está versionado: si lo sobrescribes, no hay " +
        "copia de la que recuperarlo. Confirma con el usuario qué claves cambian.",
    ];
  }

  // Migraciones YA existentes: se corrigen con una nueva, no se editan.
  if (existe && /\/migrations?\//.test(ruta)) {
    return [
      "ask",
      "Estás editando una migración que ya existe. Si se ha aplicado en algún entorno, " +
        "modificarla deja cada base de datos en un estado distinto del histórico: se " +
        "corrige creando una migración nueva (guía migraciones-de-datos, regla 9).",
    ];
  }

  // Rutas extra declaradas por el repo consumidor.
  const extras = String(process.env.CUSTOM_IA_PROTECTED_PATHS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const frag of extras) {
    if (ruta.includes(frag)) {
      return [
        "ask",
        "`" +
          ruta +
          "` está en la lista de rutas protegidas del repo (CUSTOM_IA_PROTECTED_PATHS). " +
          "Modificarla es una decisión del equipo, no un efecto colateral de una tarea.",
      ];
    }
  }

  return null;
}

try {
  if (String(process.env.CUSTOM_IA_GUARD || "").toLowerCase() === "off") emit(null);

  let input = null;
  try {
    const raw = readFileSync(0, "utf8");
    if (raw) input = JSON.parse(raw);
  } catch {
    /* sin stdin parseable: no hay nada que juzgar */
  }
  if (!input || typeof input.tool_name !== "string") emit(null);

  const tool = input.tool_name;
  const args = input.tool_input || {};
  let veredicto = null;

  if (tool === "Bash" && typeof args.command === "string") {
    veredicto = revisarComando(args.command);
  } else if (typeof args.file_path === "string") {
    // Write/Edit/NotebookEdit. `existe` distingue crear una migración nueva
    // (normal) de editar una ya escrita (lo que la guía prohíbe).
    let existe = false;
    try {
      existe = existsSync(args.file_path);
    } catch {
      /* ruta ilegible: tratamos como inexistente */
    }
    veredicto = revisarFichero(args.file_path, existe);
  }

  if (!veredicto) emit(null);
  emit(veredicto[0], "[custom-ia-plugin] " + veredicto[1]);
} catch {
  // Salvaguarda final: ante la duda, no interferir.
  emit(null);
}
