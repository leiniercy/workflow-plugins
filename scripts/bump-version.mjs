#!/usr/bin/env node
/**
 * bump-version.mjs — sube la versión de un plugin de forma sincronizada.
 *
 * Fuente única de versión: el plugin.json del plugin (por defecto backbone, o el
 * que indique --plugin). Este script la sube y mantiene en sync los sitios
 * donde vive una versión:
 *   1. plugins/<nombre>/claude/.claude-plugin/plugin.json  (campo `version`)
 *   2. .claude-plugin/marketplace.json             (entrada del plugin)
 *   3. su changelog  (mueve "[No publicado]" a "[X.Y.Z] - fecha" y abre un
 *      "[No publicado]" vacío encima)
 *   4. solo backbone: el `ref` de examples/repo-settings.json
 *
 * NO crea el commit ni el tag: deja los ficheros listos para que los revises,
 * commitees y etiquetes. backbone: `chore(release): X.Y.Z` y `git tag vX.Y.Z`.
 * voice: `chore(release): voice X.Y.Z` y `git tag voice-vX.Y.Z`, para no chocar con las
 * etiquetas vX.Y.Z, que son de backbone.
 *
 * Uso:
 *   node scripts/bump-version.mjs <patch|minor|major|X.Y.Z> [--plugin voice]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MARKETPLACE_JSON = join(ROOT, ".claude-plugin/marketplace.json");
const REPO_SETTINGS = join(ROOT, "examples/repo-settings.json");
// Mismo reparto que scripts/check-version.mjs.
const PLUGINS = [
  {
    name: "backbone",
    pluginJson: join(ROOT, "plugins/backbone/claude/.claude-plugin/plugin.json"),
    changelog: join(ROOT, "CHANGELOG.md"),
    // Las etiquetas git vX.Y.Z y el ref de la plantilla de repo son de backbone.
    settingsRef: true,
  },
  {
    name: "voice",
    pluginJson: join(ROOT, "plugins/voice/claude/.claude-plugin/plugin.json"),
    changelog: join(ROOT, "plugins/voice/CHANGELOG.md"),
    settingsRef: false,
  },
];

function parseVersion(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v || "");
  if (!m) throw new Error("Versión no semver (X.Y.Z): " + v);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function computeNext(current, arg) {
  if (/^\d+\.\d+\.\d+$/.test(arg)) return arg;
  const [maj, min, pat] = parseVersion(current);
  if (arg === "major") return `${maj + 1}.0.0`;
  if (arg === "minor") return `${maj}.${min + 1}.0`;
  if (arg === "patch") return `${maj}.${min}.${pat + 1}`;
  throw new Error("Argumento inválido. Usa: patch | minor | major | X.Y.Z");
}

const args = process.argv.slice(2);
const pluginFlag = args.indexOf("--plugin");
let pluginName = "backbone";
if (pluginFlag !== -1) {
  pluginName = args[pluginFlag + 1];
  if (!pluginName || pluginName.startsWith("--")) {
    console.error("--plugin necesita un nombre: --plugin voice");
    process.exit(1);
  }
  args.splice(pluginFlag, 2);
}
const arg = args[0];
const target = PLUGINS.find((p) => p.name === pluginName);
if (!arg || !target) {
  console.error("Uso: node scripts/bump-version.mjs <patch|minor|major|X.Y.Z> [--plugin voice]");
  if (arg && !target) {
    console.error(`Plugin desconocido: '${pluginName}'. Disponibles: ${PLUGINS.map((p) => p.name).join(", ")}`);
  }
  process.exit(1);
}
const { name: PLUGIN_NAME, pluginJson: PLUGIN_JSON, changelog: CHANGELOG, settingsRef } = target;

// 1) plugin.json — fuente única de la versión
const plugin = JSON.parse(readFileSync(PLUGIN_JSON, "utf8"));
const current = plugin.version;
const next = computeNext(current, arg);
parseVersion(next); // valida formato del destino
if (next === current) throw new Error("La versión nueva coincide con la actual: " + next);
plugin.version = next;
writeFileSync(PLUGIN_JSON, JSON.stringify(plugin, null, 2) + "\n");

// 2) marketplace.json — entrada del plugin
const market = JSON.parse(readFileSync(MARKETPLACE_JSON, "utf8"));
const entry = (market.plugins || []).find((p) => p.name === PLUGIN_NAME);
if (!entry) throw new Error(`No se encontró el plugin '${PLUGIN_NAME}' en marketplace.json`);
entry.version = next;
writeFileSync(MARKETPLACE_JSON, JSON.stringify(market, null, 2) + "\n");

// 3) CHANGELOG — [No publicado] pasa a la versión con fecha; se abre uno nuevo vacío
const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
const changelog = readFileSync(CHANGELOG, "utf8");
const MARKER = "## [No publicado]";
if (!changelog.includes(MARKER)) {
  throw new Error("No se encontró '## [No publicado]' en el CHANGELOG");
}
const replacement = `## [No publicado]\n\n## [${next}] - ${today}`;
writeFileSync(CHANGELOG, changelog.replace(MARKER, replacement));

// 4) examples/repo-settings.json — el `ref` (tag) que copian los repos consumidores (solo backbone)
if (settingsRef) {
  const settings = JSON.parse(readFileSync(REPO_SETTINGS, "utf8"));
  const marketplace = settings.extraKnownMarketplaces && settings.extraKnownMarketplaces.leiniercy;
  if (marketplace && marketplace.source) {
    marketplace.source.ref = "v" + next;
    writeFileSync(REPO_SETTINGS, JSON.stringify(settings, null, 2) + "\n");
  } else {
    throw new Error("No se encontró extraKnownMarketplaces.leiniercy.source en repo-settings.json");
  }
}

console.log(`bump-version (${PLUGIN_NAME}): ${current} -> ${next}`);
console.log("  ✓ plugin.json, marketplace.json y changelog actualizados");
console.log(`  Ahora: revisa el diff, ejecuta 'node scripts/check-version.mjs',`);
// Las etiquetas vX.Y.Z son de backbone; los demás plugins llevan su nombre delante.
const isBackbone = PLUGIN_NAME === "backbone";
const commitMsg = isBackbone ? `chore(release): ${next}` : `chore(release): ${PLUGIN_NAME} ${next}`;
const tag = isBackbone ? `v${next}` : `${PLUGIN_NAME}-v${next}`;
console.log(`  commitea (${commitMsg}) y etiqueta (git tag ${tag}).`);
