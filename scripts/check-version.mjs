#!/usr/bin/env node
/**
 * check-version.mjs — "doctor" de coherencia de versión.
 *
 * Verifica que la versión coincide en los tres sitios donde vive:
 *   - adapters/claude/.claude-plugin/plugin.json
 *   - .claude-plugin/marketplace.json (entrada del plugin)
 *   - CHANGELOG.md (última versión publicada, ignorando "[No publicado]")
 *
 * Sale con código 1 si hay incoherencia. Pensado para CI y para ejecutar antes
 * de publicar un tag.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PLUGIN_JSON = join(ROOT, "adapters/claude/.claude-plugin/plugin.json");
const MARKETPLACE_JSON = join(ROOT, ".claude-plugin/marketplace.json");
const CHANGELOG = join(ROOT, "CHANGELOG.md");
const PLUGIN_NAME = "custom-ia-plugin";

const pluginV = JSON.parse(readFileSync(PLUGIN_JSON, "utf8")).version;
const market = JSON.parse(readFileSync(MARKETPLACE_JSON, "utf8"));
const marketV = (market.plugins || []).find((p) => p.name === PLUGIN_NAME)?.version;
// Primera cabecera "## [X.Y.Z]" del CHANGELOG (la de "[No publicado]" no casa con \d).
const changelogMatch = readFileSync(CHANGELOG, "utf8").match(/^## \[(\d+\.\d+\.\d+)\]/m);
const changelogV = changelogMatch ? changelogMatch[1] : null;

const problems = [];
if (!pluginV) problems.push("plugin.json no declara `version`.");
if (!marketV) problems.push("marketplace.json no tiene `version` para '" + PLUGIN_NAME + "'.");
if (!changelogV) problems.push("CHANGELOG.md no tiene ninguna versión publicada.");
if (pluginV && marketV && pluginV !== marketV) {
  problems.push(`plugin.json (${pluginV}) != marketplace.json (${marketV}).`);
}
if (pluginV && changelogV && pluginV !== changelogV) {
  problems.push(`plugin.json (${pluginV}) != última versión del CHANGELOG (${changelogV}).`);
}

if (problems.length) {
  console.error("✗ Incoherencia de versión:");
  for (const p of problems) console.error("  - " + p);
  console.error("  Ejecuta 'node scripts/bump-version.mjs <X.Y.Z>' o corrige a mano.");
  process.exit(1);
}

console.log(`✓ Versión coherente: ${pluginV} (plugin.json = marketplace.json = CHANGELOG).`);
