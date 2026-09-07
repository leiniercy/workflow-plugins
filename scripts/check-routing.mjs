#!/usr/bin/env node
/**
 * check-routing.mjs — tercera capa del eval, entre la forma y el modelo.
 *
 * `check-behavior.mjs` asevera la FORMA del disparador (entrecomillado, ≤ 500 caracteres,
 * redactado como «Úsala cuando…»). `check-activation.mjs` comprueba que dispara DE VERDAD,
 * pero lanza sesiones reales: gasta cuota y por eso no corre en CI.
 *
 * Falta la capa de en medio, y es la que este script cubre: con 21 guías cuyos dominios se
 * rozan —`rendimiento` con `coste-y-estructuras`, `revision-hallazgos` con
 * `recepcion-de-revision`—, la pregunta «¿se están acercando dos descripciones?» no la
 * responde ningún check por guía. Se mide sobre el corpus entero, es determinista y cuesta
 * cero. Patrón tomado del Tier 2 de addyosmani/agent-skills (§18.C de docs/referencias.md).
 *
 * ── Qué mide, y con qué fuerza ─────────────────────────────────────────────────
 *
 * TF-IDF sobre las `description` enviadas + coseno. Es un proxy LÉXICO del enrutado real,
 * que es semántico. Esa diferencia decide qué falla y qué solo se informa:
 *
 *   COLISIÓN (falla).  Dos descripciones que se parecen demasiado compiten por los mismos
 *     prompts. Es una medida entre descripciones, sin prompts de por medio, así que el proxy
 *     no la degrada: es la parte sólida.
 *
 *   PARES CONFUNDIBLES (falla).  Un prompt que pertenece a una guía concreta no puede quedar
 *     por debajo de la guía con la que se confunde. Es una comparación relativa entre dos
 *     descripciones sobre el mismo texto: también robusta.
 *
 *   RANGO DE LOS POSITIVOS (informa; solo falla el agregado).  Un positivo suelto NO tumba el
 *     check. Si lo hiciera, la salida sería retocar el prompt hasta que pase —o meterle el
 *     vocabulario de la description—, que es exactamente cómo se falsea un eval. Lo que sí
 *     falla es la TASA agregada de top-3 por debajo del suelo: eso es deriva del corpus, no
 *     ruido de un caso.
 *
 * El suelo es un trinquete: se sube cuando el corpus mejora, y NO se baja para que pase una
 * regresión. Si baja, el hallazgo es la regresión.
 *
 * ── Cómo se leen los fallos ────────────────────────────────────────────────────
 *
 * Casi siempre el arreglo es la `description`, no el caso: si un prompt realista no puede
 * ranquear porque a la description le falta el vocabulario que usa la gente, eso es un
 * hallazgo del plugin. Al revés —retocar el prompt para que case— es hacer trampa.
 *
 * Uso:
 *   node scripts/check-routing.mjs                 # informe + veredicto
 *   node scripts/check-routing.mjs --min-top3 85   # sobrescribe el suelo
 *   node scripts/check-routing.mjs --verbose       # imprime el rango de cada positivo
 *
 * Salida: 0 correcto · 1 violación · 2 no se pudo ejecutar (nunca se lee un 2 como un 0).
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS = join(ROOT, "adapters/claude/skills");
const CASES = join(ROOT, "adapters/claude/evals/routing.json");

// Suelo del corpus, CALIBRADO (no aspiracional). Medido el 2026-09-07 sobre 63 prompts:
// rank-1 52,4 % · top-3 77,8 %. El suelo se pone unos puntos por debajo del top-3 medido para
// que una edición no relacionada no ponga CI en rojo de inmediato. Trinquete: se sube cuando
// el corpus mejora, y NO se baja para que pase una regresión (ver cabecera).
//
// Ese 52,4 % de rank-1 mide EL PROXY, no el plugin: en buena parte de los prompts que fallan,
// el mejor candidato puntúa ~0 % —no hay una sola palabra en común con ninguna description— y
// ahí el orden es azar, no enrutado. El router de verdad es semántico y no tiene ese problema.
// Lo que este script aporta con solidez es la colisión, los pares confundibles y la señal de
// regresión sobre el agregado; la confirmación de que una guía dispara la da check-activation,
// que gasta cuota.
const MIN_TOP3 = 70;
// Umbrales de colisión entre descripciones, tomados de agent-skills (§18.C).
const COLISION_ERROR = 0.75;
const COLISION_AVISO = 0.5;

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const value = (n) => (argv.indexOf(n) > -1 ? argv[argv.indexOf(n) + 1] : null);
const minTop3 = Number(value("--min-top3") ?? MIN_TOP3);
const verbose = flag("--verbose");

function morir(msg) {
  console.error("check-routing: " + msg);
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Normalización léxica (conservadora a propósito)
// ---------------------------------------------------------------------------
// Un stemmer agresivo mete más ruido del que quita: recorta «listado» a «list» y lo hace
// casar con «lista». Aquí solo se quita el plural, que es la variación que de verdad separa
// el prompt de la description.
const PALABRAS_VACIAS =
  "a al algo ante antes aqui asi aun bastante bien cada como con contra cual cuales cuando de del desde donde dos e el ella ellos en entre era eran es esa ese eso esta estan este esto estos ha hace hacer hasta hay la las le les lo los mas me mi mientras mucho muy nada nadie ni no nos o os otra otro para pero poco por porque que se sea segun ser si sin sobre solo son su sus tal tan te tener tiene todo toda todos tras tu un una uno unos vas voy ya y ver haber estar puede debe deba alli ahi cosa hacia";
const STOP = new Set(PALABRAS_VACIAS.split(/\s+/));
const sinTildes = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
function singular(w) {
  if (w.endsWith("es") && w.length > 4 && /[lrndzjsx]/.test(w[w.length - 3])) return w.slice(0, -2);
  if (w.endsWith("s") && w.length > 3) return w.slice(0, -1);
  return w;
}
const tokenizar = (s) =>
  sinTildes(s)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map(singular)
    .filter((w) => w.length > 2);

// ---------------------------------------------------------------------------
// Corpus: las descriptions ENVIADAS (no las de sync.mjs: se mide lo que llega al harness)
// ---------------------------------------------------------------------------
if (!existsSync(SKILLS)) morir("no existe " + SKILLS + " — ejecuta antes node scripts/sync.mjs");
const guias = [];
for (const dir of readdirSync(SKILLS)) {
  const p = join(SKILLS, dir, "SKILL.md");
  if (!existsSync(p)) continue;
  const m = /^description:\s*(.*)$/m.exec(readFileSync(p, "utf8"));
  if (!m) morir(`la skill ${dir} no tiene description`);
  guias.push({ nombre: dir, desc: m[1].replace(/^"|"$/g, ""), tokens: tokenizar(m[1]) });
}
if (guias.length === 0) morir("no se encontró ninguna skill con description");

const N = guias.length;
const df = {};
for (const g of guias) for (const w of new Set(g.tokens)) df[w] = (df[w] || 0) + 1;
function vector(tokens) {
  const tf = {};
  for (const w of tokens) tf[w] = (tf[w] || 0) + 1;
  const v = {};
  let norma = 0;
  for (const w in tf) {
    const x = (1 + Math.log(tf[w])) * Math.log((N + 1) / ((df[w] || 0) + 1));
    v[w] = x;
    norma += x * x;
  }
  norma = Math.sqrt(norma) || 1;
  for (const w in v) v[w] /= norma;
  return v;
}
for (const g of guias) g.v = vector(g.tokens);
const coseno = (a, b) => {
  let s = 0;
  for (const w in a) if (b[w]) s += a[w] * b[w];
  return s;
};
const ranking = (texto) => {
  const q = vector(tokenizar(texto));
  return guias.map((g) => ({ nombre: g.nombre, s: coseno(q, g.v) })).sort((a, b) => b.s - a.s);
};

const errores = [];
const avisos = [];

// ---------------------------------------------------------------------------
// 1. Colisión entre descripciones
// ---------------------------------------------------------------------------
const pares = [];
for (let i = 0; i < N; i++)
  for (let j = i + 1; j < N; j++)
    pares.push({ a: guias[i].nombre, b: guias[j].nombre, s: coseno(guias[i].v, guias[j].v) });
pares.sort((x, y) => y.s - x.s);
for (const p of pares) {
  if (p.s >= COLISION_ERROR)
    errores.push(
      `colisión ${(p.s * 100).toFixed(1)}% entre «${p.a}» y «${p.b}» — sus descripciones compiten por los mismos prompts`,
    );
  else if (p.s >= COLISION_AVISO)
    avisos.push(`colisión ${(p.s * 100).toFixed(1)}% entre «${p.a}» y «${p.b}»`);
}

// ---------------------------------------------------------------------------
// 2 y 3. Casos: positivos por guía y pares confundibles
// ---------------------------------------------------------------------------
if (!existsSync(CASES)) morir("no existe " + CASES);
let casos;
try {
  casos = JSON.parse(readFileSync(CASES, "utf8"));
} catch (e) {
  morir("routing.json no es JSON válido: " + e.message);
}

const declaradas = Object.keys(casos.guias || {});
for (const g of guias)
  if (!declaradas.includes(g.nombre))
    errores.push(
      `la guía «${g.nombre}» no tiene positivos en routing.json (toda guía enviada declara los suyos)`,
    );
for (const n of declaradas)
  if (!guias.some((g) => g.nombre === n))
    errores.push(`routing.json declara «${n}», que no existe como skill enviada`);

let total = 0;
let enUno = 0;
let enTres = 0;
const flojos = [];
for (const [nombre, caso] of Object.entries(casos.guias || {})) {
  for (const prompt of caso.positivos || []) {
    const r = ranking(prompt);
    const pos = r.findIndex((x) => x.nombre === nombre) + 1;
    total++;
    if (pos === 1) enUno++;
    if (pos > 0 && pos <= 3) enTres++;
    else flojos.push({ nombre, prompt, pos, top: r.slice(0, 3) });
    if (verbose) {
      const marca = pos === 1 ? "✓" : pos > 0 && pos <= 3 ? "~" : "✗";
      console.log(`  ${marca} #${pos || "-"} ${nombre} · «${prompt.slice(0, 60)}»`);
    }
  }
}

for (const par of casos.pares_confundibles || []) {
  const r = ranking(par.prompt);
  const iDueno = r.findIndex((x) => x.nombre === par.dueno);
  const iOtro = r.findIndex((x) => x.nombre === par.no_debe_ganar);
  if (iDueno === -1 || iOtro === -1) {
    errores.push(`par confundible con una guía inexistente: ${par.dueno} / ${par.no_debe_ganar}`);
    continue;
  }
  if (iOtro < iDueno)
    errores.push(
      `«${par.no_debe_ganar}» supera a «${par.dueno}» en «${par.prompt.slice(0, 60)}» — la frontera entre ambas descripciones se ha borrado`,
    );
}

// ---------------------------------------------------------------------------
// Informe
// ---------------------------------------------------------------------------
const tasa1 = total ? (enUno / total) * 100 : 0;
const tasa3 = total ? (enTres / total) * 100 : 0;
const nPares = (casos.pares_confundibles || []).length;

console.log(
  `\n${N} guías · ${pares.length} pares · ${total} prompts positivos · ${nPares} pares confundibles`,
);
console.log(
  `colisión máxima: ${(pares[0].s * 100).toFixed(1)}% (${pares[0].a} ~ ${pares[0].b})`,
);
console.log(`rank-1: ${tasa1.toFixed(1)}%   top-3: ${tasa3.toFixed(1)}% (suelo ${minTop3}%)`);

if (flojos.length) {
  console.log(
    `\nfuera de top-3 (${flojos.length}) — mira si a la description le falta ese vocabulario:`,
  );
  for (const f of flojos) {
    const top = f.top.map((t) => `${t.nombre} ${(t.s * 100).toFixed(0)}%`).join(" · ");
    console.log(`  #${f.pos || "-"} ${f.nombre} · «${f.prompt.slice(0, 70)}»`);
    console.log(`      gana: ${top}`);
  }
}
for (const a of avisos) console.log("⚠ " + a);

if (tasa3 < minTop3)
  errores.push(
    `top-3 ${tasa3.toFixed(1)}% por debajo del suelo ${minTop3}% — el corpus ha derivado (no bajes el suelo: arregla las descriptions)`,
  );

if (errores.length) {
  console.error(`\n✗ ${errores.length} violación(es) de enrutado:`);
  for (const e of errores) console.error("  - " + e);
  process.exit(1);
}
console.log("\n✓ enrutado OK — sin colisiones, fronteras intactas y top-3 sobre el suelo.");
