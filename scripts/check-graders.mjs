#!/usr/bin/env node
/**
 * check-graders.mjs — el grader de cada caso distingue acierto de fallo. Sin gastar cuota.
 *
 * `check-activation.mjs` mide si la guía se activa y aporta, y para eso lanza sesiones reales:
 * 0,32–0,49 USD equivalentes cada una. Eso hacía que la parte MÁS barata de equivocarse —la
 * lista de palabras con la que se corrige— fuese la única que nadie probaba. Y un grader roto
 * no falla ruidosamente: aprueba la respuesta equivocada y el informe canta un ✓.
 *
 * Ha pasado en cuatro de cuatro casos. El primero se encontró a mano y tarde; los otros tres
 * los destapó esta misma sonda al escribirla, sobre graders que llevaban semanas en verde:
 *
 *   2026-09-07  `presion-autoridad-borrado` suspendió por decir «no tiene reverso» en vez de
 *               «no se revierte». Mismo concepto, y la lista solo tenía uno: FALSO NEGATIVO.
 *   2026-09-13  `presion-dato-sin-verificar` APROBABA respuestas que fabricaban citas a
 *               ficheros inexistentes, porque contenían «verific» y «package.json».
 *   2026-09-13  `fk-sin-indice`, con `calibrado: true`, aprobaba «Postgres genera el index
 *               automaticamente» —lo contrario de lo que enseña la guía— porque el grupo
 *               llevaba la subcadena suelta «automatic». FALSO POSITIVO en un caso certificado.
 *   2026-09-13  `sincrono-por-inercia`, con la subcadena suelta «asincron», aprobaba «No hace
 *               falta complicarlo con nada asincrono»: otro FALSO POSITIVO invertido.
 *
 * Cada caso declara sus respuestas de ejemplo en `graders/muestras.json`: las que DEBEN pasar
 * y las que DEBEN fallar. No son salidas reales del modelo; son la definición ejecutable del
 * criterio. Si el grader las clasifica al revés, el roto es el grader.
 *
 * ── Cómo escribir una muestra útil ─────────────────────────────────────────────
 *
 * Las de `pasan` cubren **variantes de redacción** del mismo concepto: el modelo no repite tu
 * vocabulario, y ese es el falso negativo. Las de `fallan` incluyen al menos una **sonda**: la
 * respuesta equivocada redactada con las palabras que el grader busca. Es lo que caza el falso
 * positivo, que es el peligroso — un falso negativo se investiga, un falso positivo se cree.
 *
 * Sale con código 1 si algún grader clasifica al revés. Pensado para CI.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { corrige } from "./lib/grader.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// `--plugin <nombre>` elige el plugin cuyos graders se prueban; por defecto backbone.
const argv = process.argv.slice(2);
const iPlugin = argv.indexOf("--plugin");
const PLUGIN = (iPlugin >= 0 && argv[iPlugin + 1]) || "backbone";
const EVALS = join(ROOT, "plugins", PLUGIN, "claude", "evals");

const fallos = [];
let total = 0;

function assert(cond, msg) {
  total++;
  if (!cond) fallos.push(msg);
}

// Un plugin que aún no tiene casos no es un fallo de sus graders: no hay grader que probar.
// backbone sí debe tenerlos, y para él se mantiene la aserción de siempre.
if (PLUGIN !== "backbone" && !existsSync(EVALS)) {
  console.log(`✓ ${PLUGIN}: sin casos de eval (no existe ${EVALS}); nada que comprobar.`);
  process.exit(0);
}

const casos = readdirSync(EVALS, { withFileTypes: true })
  .filter((e) => e.isDirectory() && e.name !== "results")
  .map((e) => e.name);

if (PLUGIN !== "backbone" && casos.length === 0) {
  console.log(`✓ ${PLUGIN}: sin casos de eval; nada que comprobar.`);
  process.exit(0);
}

assert(casos.length > 0, "hay casos de eval que comprobar");

for (const caso of casos) {
  const expectPath = join(EVALS, caso, "expect.json");
  const muestrasPath = join(EVALS, caso, "graders/muestras.json");

  if (!existsSync(expectPath)) {
    assert(false, `${caso}: falta expect.json`);
    continue;
  }
  // Sin muestras, este check no mide nada para ese caso — y un hueco silencioso en un test
  // es peor que no tenerlo, porque el verde de al lado lo tapa.
  if (!existsSync(muestrasPath)) {
    assert(
      false,
      `${caso}: falta graders/muestras.json — un caso sin muestras es un grader sin probar`
    );
    continue;
  }

  const expect = JSON.parse(readFileSync(expectPath, "utf8"));
  const muestras = JSON.parse(readFileSync(muestrasPath, "utf8"));
  const pasan = muestras.pasan || [];
  const fallan = muestras.fallan || [];

  assert(pasan.length >= 2, `${caso}: al menos 2 muestras que pasan (variantes de redacción)`);
  assert(fallan.length >= 2, `${caso}: al menos 2 muestras que fallan`);
  assert(
    fallan.some((m) => /sonda/i.test(m.que || "")),
    `${caso}: al menos una muestra 'fallan' marcada como SONDA — la respuesta equivocada ` +
      `escrita con las palabras que el grader busca. Es lo que caza el falso positivo`
  );

  // Trazabilidad de la calibración (ADR 0007). Era convención y nadie la comprobaba: por qué se
  // certificó un grader —o por qué se invalidó— no puede vivir solo en la cabeza de quien lo
  // tocó. Sin fecha no se sabe si la certificación es anterior o posterior al último cambio.
  const nota = String(expect.nota_calibracion || "").trim();
  assert(nota !== "", `${caso}: expect.json sin nota_calibracion — un grader sin historia se
    recertifica a ciegas`);
  assert(
    nota === "" || /\b20\d{2}-\d{2}-\d{2}\b/.test(nota),
    `${caso}: nota_calibracion sin fecha AAAA-MM-DD — no se puede saber si la certificación ` +
      `es anterior o posterior al último cambio del grader`
  );

  for (const m of pasan) {
    const r = corrige(m.texto, expect);
    assert(
      r.ok,
      `${caso}: DEBERÍA PASAR y falla → «${m.que}» · falta: ${r.faltan.join(" || ").slice(0, 90)}`
    );
  }
  for (const m of fallan) {
    const r = corrige(m.texto, expect);
    assert(
      !r.ok,
      `${caso}: DEBERÍA FALLAR y pasa → «${m.que}». El grader aprueba una respuesta ` +
        `equivocada: revisa las alternativas, alguna casa sin llevar la negación`
    );
  }
}

if (fallos.length) {
  console.error(`✗ ${fallos.length}/${total} comprobación(es) de graders fallaron:`);
  for (const f of fallos) console.error("  - " + f);
  console.error("");
  console.error("  Un grader que aprueba la respuesta equivocada no falla: canta un ✓.");
  console.error("  Arregla la lista de `debe_incluir`, no la muestra.");
  process.exit(1);
}

console.log(
  `✓ ${total} comprobaciones de graders OK (${casos.length} casos, sin gastar una sesión).`
);
