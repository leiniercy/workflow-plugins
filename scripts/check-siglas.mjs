#!/usr/bin/env node
/**
 * check-siglas.mjs — casos del detector de siglas sin explicar (core/scripts/siglas.mjs).
 * Salida: 0 correcto · 1 violación.
 */
import { mkdtempSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = join(ROOT, "core/scripts/siglas.mjs");
const dir = mkdtempSync(join(tmpdir(), "siglas-"));
const failures = [];
let total = 0;

function caso(nombre, texto, esperadas, flags = []) {
  total++;
  const f = join(dir, nombre + ".md");
  writeFileSync(f, texto);
  const r = spawnSync(process.execPath, [SCRIPT, f, ...flags], { encoding: "utf8" });
  if (r.status === 2 || !r.stdout) {
    failures.push(`${nombre}: no se pudo ejecutar (${r.stderr.trim()})`);
    return;
  }
  const got = JSON.parse(r.stdout).sinExplicar.map((s) => s.sigla).sort();
  const want = [...esperadas].sort();
  const exit = want.length ? 1 : 0;
  if (JSON.stringify(got) !== JSON.stringify(want) || r.status !== exit) {
    failures.push(`${nombre}: esperaba [${want}] y salida ${exit}; obtuve [${got}] y salida ${r.status}`);
  }
}

caso("sigla-delante", "El ERP (sistema de gestión empresarial) guarda las facturas. El ERP falla.", []);
caso("sigla-detras", "El sistema de gestión empresarial (ERP) guarda las facturas.", []);
caso("sin-explicar", "La API devuelve un error.", ["API"]);
caso("plural", "Las APIs (interfaces de programación) responden. Otra API más.", []);
caso("solo-glosario", "La API responde.\n\n## Glosario\n\nAPI (interfaz de programación).", ["API"]);
caso("explicada-tarde", "La API responde.\n\nLa API (interfaz de programación) es REST.", ["API", "REST"]);
caso("codigo", "Ejecuta `NODE_ENV=production`.\n\n```\nSELECT * FROM T\n```\n", []);
caso("url", "Mira https://example.com/API/v1 para más detalle.", []);
caso("ignoradas", "<!-- siglas-ignorar: SKU, iOS -->\nCada SKU se vende en la app.", []);
caso("palabra-corta", "A veces Y otras no.", []);
caso("diapositivas", "El ERP (sistema de gestión) arranca.\n---\nEl ERP se reinicia.", ["ERP"], ["--diapositivas"]);
caso("sin-diapositivas", "El ERP (sistema de gestión) arranca.\n---\nEl ERP se reinicia.", []);
caso("tildes", "El ÍNDICE y el ÁREA cambian.", ["ÁREA", "ÍNDICE"]);
caso("tildes-explicada", "La OTAN (Organización del Tratado del Atlántico Norte) se reúne. La OTAN decide.", []);
caso("diapositivas-encabezado", "## Uno\nEl ERP (sistema) arranca.\n## Dos\nEl ERP se reinicia.", ["ERP"], ["--diapositivas"]);

if (failures.length) {
  console.error(`check-siglas: ${failures.length} de ${total} fallan`);
  for (const f of failures) console.error("  ✗ " + f);
  process.exit(1);
}
console.log(`check-siglas: ${total} casos en verde`);
