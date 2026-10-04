#!/usr/bin/env node
/**
 * check-activation.mjs — mitad NO determinista del eval de comportamiento (#6).
 *
 * `check-behavior.mjs` asevera la FORMA del disparador de cada guía (description
 * entrecomillada, ≤ 500 caracteres, redactada como «Úsala cuando…»). Lo que no puede
 * comprobar es si esa description **dispara de verdad**: eso exige un modelo.
 *
 * Este script lo comprueba lanzando sesiones reales aisladas:
 *
 *     claude -p "<prompt>" --plugin-dir plugins/<plugin>/claude --allowedTools Skill
 *
 * `--plugin-dir` carga el plugin SOLO para esa sesión: no instala nada ni toca la
 * configuración del usuario. `--allowedTools Skill` impide que la sesión de prueba
 * actúe sobre el disco. De la traza `stream-json` se lee qué skill se invocó.
 *
 * ── Lo que hace distinto a un eval ingenuo ──────────────────────────────────────
 *
 * Que una guía se active NO demuestra que sirva. Si el modelo resuelve el caso igual
 * de bien sin ella, el caso es tautológico: mide que el plugin existe, no que aporte.
 * Es el mismo defecto que `niveles-y-tipos-de-prueba` llama «detector de cambios».
 *
 * Por eso cada caso declara `linea_base_debe_fallar` y `--baseline` corre el brazo sin
 * plugin. Un caso cuya línea base también acierta se reporta como **SIN DELTA**, que es
 * un fallo DEL CASO (hay que rediseñarlo), no del plugin. Es lo que `claude plugin eval`
 * llama ablación «with-without»; se hace a mano porque ese comando está en early access.
 *
 * El control recibe las MISMAS `--runs N` que el tratamiento. Medir la varianza en un
 * solo brazo deja el delta a merced de una corrida: una línea base afortunada produce un
 * SIN DELTA falso y una desafortunada, un «hay delta» falso. Con N en ambos brazos el
 * informe distingue tres cosas, y solo la última es un delta:
 *
 *   base acierta N/N  → **SIN DELTA**  el caso no discrimina; rediséñalo.
 *   base acierta k/N  → **RUIDO**      el delta no se sostiene; rediséñalo.
 *   base acierta 0/N  → hay delta.
 *
 * La regla de RUIDO es la simétrica de `activo = nActivo === runs`: la estabilidad que
 * le exigimos al tratamiento se le exige igual al control. → §20 de docs/referencias.md.
 *
 * OJO con el remedio: subir `--runs` NO saca a un caso de RUIDO, lo hunde más. Si la
 * línea base acierta con probabilidad p, la probabilidad de que acierte al menos una vez
 * de N es 1-(1-p)^N, que CRECE con N — y cada incremento cuesta el doble de sesiones.
 * La única salida de RUIDO es rediseñar el caso para que la línea base no lo resuelva.
 * Es una regla estricta a propósito, no un test de intervalo: no mide cuánto delta hay,
 * decide si el caso separa al plugin del modelo desnudo con fiabilidad.
 *
 * ── Lo que consume ─────────────────────────────────────────────────────────────
 *
 * Cada caso son `--runs N` sesiones, el doble con --baseline. Medido: ~0,32–0,49 USD equivalentes por
 * sesión (unos 60k tokens leídos de caché con el plugin cargado; más en el brazo sin
 * plugin, que arrastra el entorno completo del usuario). Los casos que haya, con
 * --baseline, cuestan el doble de sesiones y varios minutos de reloj; con --runs 3,
 * el triple. El freno de --yes calcula el número exacto antes de gastar nada.
 *
 * En local, con sesión OAuth, eso NO es facturación: consume límite de uso. En CI sí
 * lo sería, porque allí haría falta una clave de API y se factura por token — por eso,
 * y por el tiempo, este script NO corre en CI. Se ejecuta a mano antes de publicar una
 * versión, junto a la checklist manual de docs/eval-comportamiento.md.
 *
 * Uso:
 *   node scripts/check-activation.mjs                  # solo activación
 *   node scripts/check-activation.mjs --baseline       # + brazo sin plugin (recomendado)
 *   node scripts/check-activation.mjs --case consultas # filtra por nombre
 *   node scripts/check-activation.mjs --runs 5       # varianza: N muestras por caso
 *   node scripts/check-activation.mjs --sin-cache    # re-mide el brazo base aunque haya cache
 *   node scripts/check-activation.mjs --json out.json  # vuelca el resultado completo
 *   node scripts/check-activation.mjs --plugin voice   # mide otro plugin (por defecto backbone)
 */
import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
// La corrección vive en su propio módulo para que `check-graders.mjs` pueda probarla
// sin lanzar sesiones: un grader que aprueba la respuesta equivocada no se ve de otro modo.
import { corrige } from "./lib/grader.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TIMEOUT_MS = 300_000;

// ---------------------------------------------------------------------------
// Argumentos
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : null;
};
// `--plugin <nombre>` elige qué plugin del marketplace se mide (ADR-0012: cada uno vive en
// plugins/<nombre>/claude, con sus evals/ al lado). Por defecto backbone, que es lo que
// este script medía antes de que hubiera un segundo plugin.
if (flag("--plugin") && (!value("--plugin") || value("--plugin").startsWith("--"))) {
  console.error("✗ --plugin necesita un nombre (p. ej. --plugin voice).");
  process.exit(2);
}
const PLUGIN_NAME = flag("--plugin") ? value("--plugin") : "backbone";
const PLUGIN_DIR = join(ROOT, "plugins", PLUGIN_NAME, "claude");
const EVALS_DIR = join(PLUGIN_DIR, "evals");
const withBaseline = flag("--baseline");
// `--sin-cache` fuerza a re-medir el brazo base aunque haya caché válida. Es la salida
// para cuando sospechas del dato guardado, no el camino normal.
const sinCache = flag("--sin-cache");
const caseFilter = value("--case");
const jsonOut = value("--json");
const runs = Math.max(1, parseInt(value("--runs") || "1", 10) || 1);

// ---------------------------------------------------------------------------
// Normalización para comparar texto (sin tildes, sin mayúsculas)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Una ejecución: devuelve { skills, texto, error }
// ---------------------------------------------------------------------------
function run(prompt, { plugin }) {
  const args = ["-p", prompt, "--allowedTools", "Skill", "--output-format", "stream-json", "--verbose"];
  if (plugin) args.push("--plugin-dir", PLUGIN_DIR);

  const r = spawnSync("claude", args, {
    encoding: "utf8",
    timeout: TIMEOUT_MS,
    maxBuffer: 64 * 1024 * 1024,
    cwd: ROOT,
  });

  if (r.error) return { skills: [], texto: "", error: r.error.code || String(r.error) };

  const skills = [];
  let texto = "";
  let fallo = null;
  // El modelo forma parte de la clave de caché del brazo base: una respuesta de otro
  // modelo no es la misma medición. La CLI lo anuncia en el evento de init; si algún día
  // deja de hacerlo queda null y la caché lo dice en vez de fingir que coincide.
  let modelo = null;
  for (const linea of (r.stdout || "").split("\n")) {
    if (!linea.trim()) continue;
    let d;
    try {
      d = JSON.parse(linea);
    } catch {
      continue;
    }
    if (typeof d.model === "string" && !modelo) modelo = d.model;
    if (d.type === "result") {
      texto = d.result || "";
      // La CLI puede salir con código 0 y aun así no haber respondido: lo dice aquí.
      if (d.is_error === true || (d.subtype && d.subtype !== "success")) {
        fallo = d.subtype || "is_error";
      }
    }
    const bloques = d?.message?.content;
    if (Array.isArray(bloques)) {
      for (const b of bloques) {
        if (b?.type === "tool_use" && b?.name === "Skill" && b?.input?.skill) skills.push(b.input.skill);
      }
    }
  }
  // Segunda red, por si la CLI no marca el fallo en el evento: una respuesta vacía o un
  // error de la API NO es una respuesta que se pueda corregir. Sin esto, ese texto no casa
  // con `debe_incluir`, sale ok:false y el informe lo canta como veredicto — el mismo delta
  // fabricado del ETIMEDOUT, entrando por otra puerta. Visto con un 403 el 2026-09-07.
  const SIN_VEREDICTO =
    /Failed to authenticate|API Error:|Request not allowed|Invalid API key|Credit balance|rate limit exceeded|Usage limit reached/i;
  if (!fallo) {
    if (!texto.trim()) fallo = "SIN_RESPUESTA";
    else if (SIN_VEREDICTO.test(texto)) fallo = "ERROR_DE_API";
  }

  return { skills, texto, error: fallo, modelo };
}

// ---------------------------------------------------------------------------
// Caché del brazo BASE
//
// Con `--baseline` cada caso cuesta el doble de sesiones, y ese brazo es el que frena la
// calibración: gasta cuota fuera de la sesión de trabajo, así que los casos se quedan en
// `calibrado: false` esperando un hueco.
//
// La observación que lo arregla: **el brazo base no depende del plugin**. Es
// `run(prompt, { plugin: false })` — el modelo desnudo contestando al prompt. Editar una
// guía, afinar una `description` o cambiar el `sync.mjs` no lo mueve ni un carácter. Solo
// lo invalidan dos cosas: que cambie el PROMPT o que cambie el MODELO.
//
// Se guardan los TEXTOS, no el veredicto. Es la parte que importa: `debe_incluir` y
// `no_debe_incluir` SÍ cambian al afinar un caso, así que un veredicto cacheado se
// quedaría contestando a la pregunta vieja. Guardando el texto, re-corregir es gratis y
// exacto — que es justamente lo que se hace al calibrar.
//
// Lo que NO se cachea nunca:
//   - El brazo CON plugin. Ese mide lo que acabas de cambiar; cachearlo sería no medir.
//   - Una corrida con error. Un brazo que no llegó a ejecutarse no es evidencia de nada
//     (la misma regla que `baseInconcluso`), y congelarlo fabricaría un delta.
// ---------------------------------------------------------------------------
const cacheHits = [];

function rutaCache(caso) {
  return join(EVALS_DIR, caso.nombre, ".base-cache.json");
}

function clavePrompt(prompt) {
  return createHash("sha256").update(prompt, "utf8").digest("hex").slice(0, 16);
}

/** Corridas base guardadas que siguen valiendo para este caso, o null. */
function leeCache(caso, runsPedidos) {
  if (sinCache) return null;
  const ruta = rutaCache(caso);
  if (!existsSync(ruta)) return null;
  let c;
  try {
    c = JSON.parse(readFileSync(ruta, "utf8"));
  } catch {
    return null;
  }
  if (c.clavePrompt !== clavePrompt(caso.prompt)) return null;
  if (!Array.isArray(c.corridas) || c.corridas.length < runsPedidos) return null;
  if (c.corridas.some((x) => x.error)) return null;
  // Se usan las N primeras: pedir menos muestras de las guardadas es válido; pedir más, no.
  return { ...c, corridas: c.corridas.slice(0, runsPedidos) };
}

function escribeCache(caso, corridas, modelo) {
  if (corridas.some((x) => x.error)) return;
  writeFileSync(
    rutaCache(caso),
    JSON.stringify(
      {
        _: "Brazo BASE (sin plugin) de este caso. Lo escribe check-activation.mjs --baseline. No se edita a mano: bórralo para re-medir, o usa --sin-cache.",
        clavePrompt: clavePrompt(caso.prompt),
        modelo: modelo || null,
        guardado: new Date().toISOString(),
        corridas: corridas.map((x) => ({ texto: x.texto, skills: x.skills, error: null })),
      },
      null,
      2,
    ) + String.fromCharCode(10),
  );
}

// ---------------------------------------------------------------------------
// Corrección del contenido de una respuesta contra el caso
// ---------------------------------------------------------------------------
// Cada entrada de `debe_incluir` es una frase obligatoria, o un ARRAY de alternativas
// del que basta con que aparezca una. Sin eso el criterio se rompe ante cualquier
// sinónimo y el caso empieza a fallar por redacción en vez de por comportamiento.

// ---------------------------------------------------------------------------
// Carga de casos
// ---------------------------------------------------------------------------
if (!existsSync(EVALS_DIR)) {
  console.error(`✗ No existe ${EVALS_DIR}. No hay casos que ejecutar.`);
  process.exit(1);
}

const casos = readdirSync(EVALS_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory() && e.name !== "results")
  .map((e) => e.name)
  .filter((n) => !caseFilter || n.includes(caseFilter))
  .sort()
  .map((nombre) => {
    const dir = join(EVALS_DIR, nombre);
    const promptPath = join(dir, "prompt.md");
    const expectPath = join(dir, "expect.json");
    if (!existsSync(promptPath) || !existsSync(expectPath)) return null;
    // El prompt es el fichero sin su cabecera de comentario (líneas que empiezan por «> »).
    const prompt = readFileSync(promptPath, "utf8")
      .split("\n")
      .filter((l) => !l.startsWith(">"))
      .join("\n")
      .trim();
    return { nombre, prompt, ...JSON.parse(readFileSync(expectPath, "utf8")) };
  })
  .filter(Boolean);

if (!casos.length) {
  console.error("✗ Ningún caso encontrado" + (caseFilter ? ` para «${caseFilter}»` : "") + ".");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Freno de cuota — este script gasta de la MISMA bolsa que tu sesión de trabajo
// ---------------------------------------------------------------------------
// Cada caso lanza `--runs N` sesiones reales, el doble con --baseline, y ese gasto no
// aparece en
// el contador de la conversación desde la que lo lanzas. Medido: 0,32–0,49 USD
// equivalentes por sesión. Por eso no se ejecuta nada sin --yes: el fallo que
// evita es lanzar la suite entera sin darse cuenta de lo que cuesta.
// Con --baseline, los casos cuyo brazo base ya esta en cache no vuelven a gastar: su
// mitad del experimento ya esta medida y el prompt no ha cambiado.
const conBaseCacheada = withBaseline ? casos.filter((c) => leeCache(c, runs)).length : 0;
const sesiones = casos.length * runs * (withBaseline ? 2 : 1) - conBaseCacheada * runs;
const est = (sesiones * 0.4).toFixed(2);
if (!flag("--yes")) {
  console.log(`\nEsto lanzaría ${sesiones} sesión(es) de Claude reales.`);
  if (conBaseCacheada) {
    console.log(
      `(${conBaseCacheada} brazo(s) base salen de cache: ${conBaseCacheada * runs} sesion(es) ahorradas. --sin-cache para re-medirlos.)`,
    );
  }
  console.log(`Coste estimado: ~${est} USD equivalentes (medido: 0,32–0,49 por sesión).`);
  console.log("Con sesión OAuth no se factura, pero SÍ consume tu límite de uso —");
  console.log("el mismo del que tira la sesión desde la que lanzas esto.\n");
  console.log(`Casos: ${casos.map((c) => c.nombre).join(", ")}`);
  console.log("\nAñade --yes para ejecutarlo de verdad.");
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Ejecución
// ---------------------------------------------------------------------------
console.log(`Ejecutando ${casos.length} caso(s)${withBaseline ? " con brazo de línea base" : ""}…\n`);

const resultados = [];
for (const caso of casos) {
  process.stdout.write(`  ${caso.nombre} … `);

  // §2.A de docs/referencias.md — micro-test de wording: la VARIANZA es una métrica.
  // Una sola muestra no dice nada de un disparador. Si de N repeticiones unas activan
  // la guía y otras no, el problema no es el modelo: es que el wording de la
  // `description` no ata. Un caso solo pasa si es estable en las N.
  const esperada = `${PLUGIN_NAME}:${caso.guia}`;
  const corridas = [];
  for (let i = 0; i < runs; i++) corridas.push(run(caso.prompt, { plugin: true }));
  const conPlugin = corridas[0];
  const nActivo = corridas.filter((c) => c.skills.includes(esperada)).length;
  const nContenido = corridas.filter((c) => corrige(c.texto, caso).ok).length;
  const activo = nActivo === runs;
  const contenido = corrige(conPlugin.texto, caso);
  const inestable = runs > 1 && (nActivo !== runs || nContenido !== runs) && nActivo + nContenido > 0;

  let base = null;
  let sinDelta = false;
  let baseInconcluso = false;
  let ruido = false;
  let nBaseOk = 0;
  if (withBaseline) {
    // El brazo de CONTROL recibe las mismas N muestras que el brazo con plugin.
    // Con una sola muestra la varianza se medía en la mitad del experimento: una corrida
    // afortunada de la línea base produce un SIN DELTA falso (descartas un caso bueno) y
    // una desafortunada, un «hay delta» falso (certificas uno que no discrimina). En ambos
    // casos el delta no está medido: está muestreado una vez. Es el mismo defecto que ya
    // corregimos dos veces en el brazo con plugin, solo que en el otro brazo. → §20.
    const guardado = leeCache(caso, runs);
    let basales;
    if (guardado) {
      basales = guardado.corridas;
      cacheHits.push({ caso: caso.nombre, modelo: guardado.modelo, guardado: guardado.guardado });
    } else {
      basales = [];
      for (let i = 0; i < runs; i++) basales.push(run(caso.prompt, { plugin: false }));
      escribeCache(caso, basales, basales.find((x) => x.modelo)?.modelo || conPlugin.modelo);
    }
    const b = basales[0];
    const bc = corrige(b.texto, caso);
    nBaseOk = basales.filter((x) => !x.error && corrige(x.texto, caso).ok).length;
    const primerError = basales.find((x) => x.error);
    // Se guarda también el TEXTO de la línea base: sin él, un resultado raro del brazo sin
    // plugin no se puede diagnosticar después sin volver a gastar sesiones.
    // nBaseOk es el agregado de las N; lo que lleva sufijo `Muestra0` viene de la primera
    // corrida y está solo para diagnosticar a mano sin volver a gastar sesiones.
    base = {
      nBaseOk,
      runs,
      error: primerError ? primerError.error : null,
      skillsMuestra0: b.skills,
      okMuestra0: bc.ok,
      faltanMuestra0: bc.faltan,
      textoMuestra0: b.texto,
    };
    if (primerError) {
      // Un brazo que NO llegó a ejecutarse no es evidencia de nada. Sin esta rama, el
      // texto vacío de una sesión que reventó no casa con `debe_incluir`, sale `ok:false`
      // y el informe lo canta como «línea base falla (hay delta)»: un delta fabricado que
      // nadie ha medido. Es el mismo defecto que leer un «no pude ejecutarme» como un
      // «correcto». Detectado calibrando los casos de presión el 2026-09-07.
      // Basta UN error de las N: una muestra incompleta no se promedia, se repite.
      baseInconcluso = true;
    } else if (caso.linea_base_debe_fallar !== false && nBaseOk === runs) {
      // El caso solo vale si la línea base falla lo que el caso mide.
      sinDelta = true;
    } else if (caso.linea_base_debe_fallar !== false && nBaseOk > 0) {
      // Un delta dentro de la banda no es un delta (§20). Si la línea base acierta aunque
      // sea UNA vez de N, el caso no separa al plugin del modelo desnudo con la fiabilidad
      // que el informe afirmaría. Simétrico con `activo = nActivo === runs`: la regla de
      // estabilidad que exigimos al tratamiento se le exige igual al control.
      ruido = true;
    }
  }

  const ok =
    !conPlugin.error && activo && contenido.ok && !sinDelta && !inestable && !baseInconcluso && !ruido;
  resultados.push({ ...caso, activo, contenido, base, sinDelta, baseInconcluso, ruido, inestable, runs, nActivo, nContenido, nBaseOk, ok, error: conPlugin.error, texto: conPlugin.texto });

  if (conPlugin.error)
    console.log(`⚠ INCONCLUSO — el brazo con plugin no llegó a responder (${conPlugin.error})`);
  else if (caso.calibrado === false && !withBaseline)
    console.log(`${activo && contenido.ok ? "✓" : "✗"} (SIN CALIBRAR — córrelo con --baseline)`);
  else if (!activo) console.log(`✗ no se activó (disparó: ${conPlugin.skills.join(", ") || "ninguna"})`);
  else if (!contenido.ok) console.log(`✗ activó pero falta: ${contenido.faltan.join(" · ")}`);
  else if (inestable)
    console.log(`⚠ VARIANZA — activó ${nActivo}/${runs}, acertó ${nContenido}/${runs}: el wording no ata`);
  else if (sinDelta)
    console.log(`⚠ SIN DELTA — la línea base acierta ${nBaseOk}/${runs}: rediseña el caso`);
  else if (ruido)
    console.log(`⚠ RUIDO — la línea base acierta ${nBaseOk}/${runs}: el delta cae dentro de la banda`);
  else if (baseInconcluso)
    console.log(`⚠ INCONCLUSO — la línea base no se pudo ejecutar (${base.error}): el delta no está medido`);
  else console.log("✓");
}

// ---------------------------------------------------------------------------
// Informe
// ---------------------------------------------------------------------------
const fallos = resultados.filter((r) => !r.ok);

// Un veredicto sin el texto delante se lee mal, y no es una hipótesis: el 2026-09-28/29,
// tres corridas seguidas sobre tres diseños de un mismo caso cantaron «hay delta» o «RUIDO»
// sobre respuestas que el corrector suspendía por VOCABULARIO, no por contenido. El brazo
// base había escrito «los criterios describen la solución, no la necesidad» —el acierto
// exacto— y figuraba como fallo. Quien lea solo el titular certifica o descarta una guía por
// un motivo que no es el que cree. Por eso el informe no da un veredicto negativo sin
// enseñar lo que contestó cada brazo: es lo que hace cumplir el ADR-0011.
const muestraTexto = (s, n = 280) => {
  const t = String(s || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return "(sin texto)";
  return t.length > n ? t.slice(0, n) + "…" : t;
};

console.log("\n" + "─".repeat(78));
for (const r of resultados) {
  const estado = r.ok
    ? "✓"
    : r.sinDelta || r.ruido || r.inestable || r.baseInconcluso || r.error
      ? "⚠"
      : "✗";
  if (r.error) {
    console.log(`⚠  ${r.nombre}  →  ${r.guia} · brazo con plugin SIN EJECUTAR (${r.error}): sin veredicto`);
    continue;
  }
  const delta = !r.base
    ? ""
    : r.base.error
      ? ` · línea base SIN EJECUTAR (${r.base.error}): delta NO medido`
      : r.linea_base_debe_fallar === false
        ? ` · línea base acierta ${r.nBaseOk}/${r.runs} (esperado por el caso)`
        : r.nBaseOk === r.runs
          ? ` · línea base TAMBIÉN acierta (${r.nBaseOk}/${r.runs})`
          : r.nBaseOk > 0
            ? ` · línea base acierta ${r.nBaseOk}/${r.runs}: delta DENTRO de la banda`
            : ` · línea base falla ${r.runs}/${r.runs} (hay delta)`;
  console.log(`${estado}  ${r.nombre}  →  ${r.guia}${delta}`);
  if (!r.ok) {
    console.log(`   con plugin │ ${muestraTexto(r.texto)}`);
    if (r.base && !r.base.error) console.log(`   línea base │ ${muestraTexto(r.base.textoMuestra0)}`);
    console.log("   ↳ lee el texto ANTES de creerte el veredicto (ADR-0011). Completo, en el --json.");
  }
}
console.log("─".repeat(78));

if (cacheHits.length) {
  console.log(`Brazo base desde cache en ${cacheHits.length} caso(s): ${cacheHits.map((h) => h.caso).join(", ")}`);
  const sinModelo = cacheHits.filter((h) => !h.modelo);
  if (sinModelo.length) {
    // Honestidad sobre el limite de la cache: sin modelo guardado no se puede afirmar que
    // la medicion sea del mismo modelo que corre ahora. Se avisa, no se descarta en
    // silencio ni se finge que coincide.
    console.log(
      `  ADVERTENCIA: ${sinModelo.length} sin modelo registrado (${sinModelo.map((h) => h.caso).join(", ")}): ` +
        "no se puede afirmar que la linea base sea del mismo modelo. --sin-cache para re-medir.",
    );
  }
}

if (jsonOut) {
  writeFileSync(jsonOut, JSON.stringify(resultados, null, 2) + "\n");
  console.log(`Resultado completo en ${jsonOut}`);
}

if (fallos.length) {
  console.error(`\n✗ ${fallos.length}/${resultados.length} caso(s) no pasaron.`);
  console.error("  ✗ = la guía no se activó o no aportó lo que declara → bug de prompt.");
  console.error("  ⚠ SIN DELTA = el caso no discrimina → bug DEL CASO: elige uno que la línea base falle.");
  console.error(
    "  ⚠ RUIDO = la línea base acierta a veces → el caso no discrimina con fiabilidad: " +
      "rediséñalo (subir --runs solo lo hace MÁS probable, y cuesta el doble)."
  );
  console.error("  ⚠ VARIANZA = el disparador no ata: reescribe la description, no el caso.");
  console.error("  ⚠ INCONCLUSO = un brazo no llegó a ejecutarse → repite ESE caso; no es veredicto.");
  process.exit(1);
}
console.log(`\n✓ ${resultados.length}/${resultados.length} caso(s) OK: la guía se activa y aporta sobre la línea base.`);
