#!/usr/bin/env node
/**
 * check-version.mjs — "doctor" de coherencia de versión.
 *
 * Para cada plugin del marketplace verifica que la versión coincide en los
 * tres sitios donde vive:
 *   - su plugin.json (plugins/<nombre>/claude/.claude-plugin/plugin.json)
 *   - .claude-plugin/marketplace.json (entrada del plugin)
 *   - su changelog (última versión publicada, ignorando "[No publicado]")
 * Solo para backbone, además, el `ref` de examples/repo-settings.json.
 *
 * Sale con código 1 si hay incoherencia. Pensado para CI y para ejecutar antes
 * de publicar un tag.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MARKETPLACE_JSON = join(ROOT, ".claude-plugin/marketplace.json");
const REPO_SETTINGS = join(ROOT, "examples/repo-settings.json");
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

const market = JSON.parse(readFileSync(MARKETPLACE_JSON, "utf8"));
const problems = [];
const found = [];

for (const { name, pluginJson, changelog, settingsRef: checkRef } of PLUGINS) {
  if (!existsSync(pluginJson)) {
    problems.push(`plugin.json de ${name} no existe.`);
    continue;
  }
  const pluginV = JSON.parse(readFileSync(pluginJson, "utf8")).version;
  const marketV = (market.plugins || []).find((p) => p.name === name)?.version;
  // Primera cabecera "## [X.Y.Z]" del changelog (la de "[No publicado]" no casa con \d).
  const changelogMatch = existsSync(changelog)
    ? readFileSync(changelog, "utf8").match(/^## \[(\d+\.\d+\.\d+)\]/m)
    : null;
  const changelogV = changelogMatch ? changelogMatch[1] : null;

  if (!pluginV) problems.push(`plugin.json de ${name} no declara \`version\`.`);
  if (!marketV) problems.push(`marketplace.json no tiene \`version\` para '${name}'.`);
  if (!changelogV) problems.push(`El changelog de ${name} no tiene ninguna versión publicada.`);
  if (pluginV && marketV && pluginV !== marketV) {
    problems.push(`${name}: plugin.json (${pluginV}) != marketplace.json (${marketV}).`);
  }
  if (pluginV && changelogV && pluginV !== changelogV) {
    problems.push(`${name}: plugin.json (${pluginV}) != última versión del changelog (${changelogV}).`);
  }

  if (checkRef) {
    // El `ref` (tag) de la plantilla que copian los consumidores debe ser "v" + versión.
    const settings = JSON.parse(readFileSync(REPO_SETTINGS, "utf8"));
    const ref = settings.extraKnownMarketplaces?.leiniercy?.source?.ref;
    if (!ref) problems.push("examples/repo-settings.json no tiene extraKnownMarketplaces.leiniercy.source.ref.");
    if (pluginV && ref && ref !== "v" + pluginV) {
      problems.push(`examples/repo-settings.json ref (${ref}) != v${pluginV}.`);
    }
  }
  if (pluginV) found.push(`${name} ${pluginV}`);
}

if (problems.length) {
  console.error("✗ Incoherencia de versión:");
  for (const p of problems) console.error("  - " + p);
  console.error("  Ejecuta 'node scripts/bump-version.mjs <X.Y.Z> [--plugin <nombre>]' o corrige a mano.");
  process.exit(1);
}

console.log(`✓ Versión coherente: ${found.join(", ")} (plugin.json = marketplace.json = changelog).`);
