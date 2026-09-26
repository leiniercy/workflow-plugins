#!/usr/bin/env node
/**
 * bump-version.mjs — sube la versión del plugin de forma sincronizada.
 *
 * Fuente única de versión: adapters/claude/.claude-plugin/plugin.json. Este script
 * la sube y mantiene en sync los tres sitios donde vive una versión:
 *   1. adapters/claude/.claude-plugin/plugin.json  (campo `version`)
 *   2. .claude-plugin/marketplace.json             (entrada del plugin)
 *   3. CHANGELOG.md  (mueve "[No publicado]" a "[X.Y.Z] - fecha" y abre un
 *      "[No publicado]" vacío encima)
 *
 * NO crea el commit ni el tag: deja los ficheros listos para que los revises,
 * commitees (`chore(release): X.Y.Z`) y etiquetes (`git tag vX.Y.Z`).
 *
 * Uso:
 *   node scripts/bump-version.mjs <patch|minor|major>
 *   node scripts/bump-version.mjs <X.Y.Z>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PLUGIN_JSON = join(ROOT, "adapters/claude/.claude-plugin/plugin.json");
const MARKETPLACE_JSON = join(ROOT, ".claude-plugin/marketplace.json");
const CHANGELOG = join(ROOT, "CHANGELOG.md");
const REPO_SETTINGS = join(ROOT, "examples/repo-settings.json");
const PLUGIN_NAME = "backbone";

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

const arg = process.argv[2];
if (!arg) {
  console.error("Uso: node scripts/bump-version.mjs <patch|minor|major|X.Y.Z>");
  process.exit(1);
}

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

// 4) examples/repo-settings.json — el `ref` (tag) que copian los repos consumidores
const settings = JSON.parse(readFileSync(REPO_SETTINGS, "utf8"));
const biomas = settings.extraKnownMarketplaces && settings.extraKnownMarketplaces.biomas;
if (biomas && biomas.source) {
  biomas.source.ref = "v" + next;
  writeFileSync(REPO_SETTINGS, JSON.stringify(settings, null, 2) + "\n");
} else {
  throw new Error("No se encontró extraKnownMarketplaces.biomas.source en repo-settings.json");
}

console.log(`bump-version: ${current} -> ${next}`);
console.log("  ✓ plugin.json, marketplace.json y CHANGELOG actualizados");
console.log(`  Ahora: revisa el diff, ejecuta 'node scripts/check-version.mjs',`);
console.log(`  commitea (chore(release): ${next}) y etiqueta (git tag v${next}).`);
