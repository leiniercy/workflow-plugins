#!/usr/bin/env node
/**
 * check-fusion.mjs — la síntesis de hallazgos no pierde nada por el camino.
 *
 * `core/scripts/fusion-hallazgos.mjs` junta lo que devuelven los subagentes revisores:
 * deduplica lo que varias dimensiones señalan sobre la misma línea, reaplica el umbral
 * de confianza al conjunto y ordena por severidad. Antes lo hacía el modelo en prosa.
 *
 * ── Por qué existe ─────────────────────────────────────────────────────────────
 *
 * No es por tokens: cuatro revisores no son sesenta y siete tandas, y el ahorro sería
 * pequeño. Es por dos cosas que el modelo no da:
 *
 *   1. **Determinismo.** Deduplicar por `fichero:línea` y comparar un número contra 75
 *      es trabajo mecánico. Hecho en prosa, dos síntesis del mismo material pueden no
 *      coincidir, y nadie lo nota porque no hay con qué comparar.
 *   2. **Trazabilidad.** Hoy, un hallazgo que se cae en la síntesis se cae sin dejar
 *      rastro. No se distingue «no lo había» de «se perdió al juntar».
 *
 * ── La aserción que más importa: la ley de conservación ────────────────────────
 *
 * Todo hallazgo que entra sale contado en algún sitio — publicado, fusionado con otro,
 * bajo umbral o en el apartado de `exigido-por-spec`. La suma cuadra o el test falla.
 * Un informe de revisión que pierde un hallazgo en silencio es peor que uno que no lo
 * encontró: el segundo se sabe incompleto y el primero se cree completo.
 *
 * Y el otro lado, que viene del issue #159 de Understand-Anything: si un revisor tuvo
 * que recortar su lista por el tope, el recorte viaja en `omitidos` y aparece en la
 * auditoría. Un agente que trunca en silencio es exactamente el fallo que no casca.
 *
 * Sale con código 1 si algún caso falla. Pensado para CI.
 */
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = join(ROOT, "core/scripts/fusion-hallazgos.mjs");

const fallos = [];
let total = 0;

function assert(cond, msg) {
  total++;
  if (!cond) fallos.push(msg);
}

const temporales = [];

/** Un hallazgo con lo mínimo, para no repetir el objeto entero en cada caso. */
function hallazgo(over = {}) {
  return {
    fichero: "src/auth.ts",
    linea: 42,
    cita: "const u = await db.user.findUnique({ where: { id } });",
    descripcion: "Acceso sin comprobar autorización.",
    confianza: 85,
    severidad: "Alto",
    sugerencia: "Comprobar el propietario antes de devolver el registro.",
    ...over,
  };
}

/** Un bloque de revisor con lo mínimo. */
function bloque(dimension, hallazgos, over = {}) {
  return { dimension, hallazgos, noVerificables: [], bajaConfianza: "", omitidos: 0, ...over };
}

/** Escribe los bloques a un temporal, ejecuta la fusión y devuelve `{ code, json }`. */
function fusionar(nombre, bloques) {
  const dir = mkdtempSync(join(tmpdir(), "cia-fusion-"));
  temporales.push(dir);
  const ruta = join(dir, "hallazgos.json");
  writeFileSync(ruta, JSON.stringify(bloques), "utf8");
  const r = spawnSync(process.execPath, [SCRIPT, ruta], {
    encoding: "utf8",
    timeout: 15000,
    windowsHide: true,
  });
  let json = null;
  try {
    json = JSON.parse(r.stdout);
  } catch {
    /* json queda null: lo asevera el contrato */
  }
  assert(r.status === 0, `[${nombre}] sale con código 0 — actual: ${r.status}`);
  assert(json !== null, `[${nombre}] emite JSON válido por stdout`);
  return { code: r.status, json };
}

// ---------------------------------------------------------------------------
// 1. Deduplicación: dos dimensiones sobre la misma línea son UN hallazgo.
// ---------------------------------------------------------------------------
{
  const { json } = fusionar("misma línea desde dos dimensiones", [
    bloque("bugs", [hallazgo({ confianza: 78, descripcion: "Puede devolver null." })]),
    bloque("seguridad", [hallazgo({ confianza: 92, descripcion: "IDOR: falta authz." })]),
  ]);
  assert(json && json.hallazgos.length === 1, `se fusionan en uno — actual: ${json && json.hallazgos.length}`);
  const h = json && json.hallazgos[0];
  assert(h && h.confianza === 92, `gana el de más confianza — actual: ${h && h.confianza}`);
  assert(
    h && (h.tambienSenaladoPor || []).includes("bugs"),
    "el fusionado deja constancia de qué otra dimensión lo señaló"
  );
  assert(
    json && json.auditoria.duplicadosFusionados === 1,
    `la auditoría cuenta la fusión — actual: ${json && json.auditoria.duplicadosFusionados}`
  );
}

// ---------------------------------------------------------------------------
// 2. Umbral: por debajo de 75 no se publica, pero se cuenta.
// ---------------------------------------------------------------------------
{
  const { json } = fusionar("hallazgo bajo umbral", [
    bloque("bugs", [
      hallazgo({ linea: 10, confianza: 90 }),
      hallazgo({ linea: 20, confianza: 70 }),
    ]),
  ]);
  assert(json && json.hallazgos.length === 1, "el de confianza 70 no se publica");
  assert(
    json && json.auditoria.bajoUmbral === 1,
    `la auditoría cuenta el descartado por umbral — actual: ${json && json.auditoria.bajoUmbral}`
  );
}

// ---------------------------------------------------------------------------
// 3. Orden por severidad: lo que bloquea una PR va primero.
// ---------------------------------------------------------------------------
{
  const { json } = fusionar("orden por severidad", [
    bloque("convenciones", [
      hallazgo({ linea: 1, severidad: "Bajo" }),
      hallazgo({ linea: 2, severidad: "Crítico" }),
      hallazgo({ linea: 3, severidad: "Medio" }),
      hallazgo({ linea: 4, severidad: "Alto" }),
    ]),
  ]);
  const orden = (json ? json.hallazgos : []).map((h) => h.severidad);
  assert(
    JSON.stringify(orden) === JSON.stringify(["Crítico", "Alto", "Medio", "Bajo"]),
    `ordena Crítico → Alto → Medio → Bajo — actual: ${JSON.stringify(orden)}`
  );
}

// ---------------------------------------------------------------------------
// 4. Lo que un revisor tuvo que recortar por el tope viaja y se cuenta.
//    Es el fallo que no casca: un agente que trunca en silencio (UA #159).
// ---------------------------------------------------------------------------
{
  const { json } = fusionar("revisor que recortó su lista", [
    bloque("bugs", [hallazgo()], { omitidos: 7 }),
  ]);
  assert(
    json && json.auditoria.omitidosPorLosRevisores === 7,
    `la auditoría arrastra los omitidos — actual: ${json && json.auditoria.omitidosPorLosRevisores}`
  );
  assert(
    json && /7/.test(JSON.stringify(json.avisos || [])),
    "un recorte declarado produce un aviso, no una nota al pie"
  );
}

// ---------------------------------------------------------------------------
// 5. `exigido-por-spec` va a su propio apartado: no es trabajo, es una decisión.
// ---------------------------------------------------------------------------
{
  const { json } = fusionar("hallazgo exigido por la spec", [
    bloque("spec", [
      hallazgo({ linea: 5 }),
      hallazgo({ linea: 6, exigidoPorSpec: "El criterio 3 obliga a duplicar el validador." }),
    ]),
  ]);
  assert(json && json.hallazgos.length === 1, "el exigido-por-spec no se mezcla con los demás");
  assert(
    json && json.exigidoPorSpec.length === 1,
    `va a su propio apartado — actual: ${json && json.exigidoPorSpec.length}`
  );
  assert(
    json && /criterio 3/.test(json.exigidoPorSpec[0].exigidoPorSpec || ""),
    "conserva el texto de la spec con el que choca, que es lo que el usuario decide"
  );
}

// ---------------------------------------------------------------------------
// 6. Los ⚠️ no verificables se recogen de todos los revisores, sin filtrar.
// ---------------------------------------------------------------------------
{
  const { json } = fusionar("no verificables", [
    bloque("spec", [], {
      noVerificables: [{ criterio: "Criterio 4", queComprobar: "Si el cron sigue activo." }],
    }),
    bloque("tests", [], {
      noVerificables: [{ criterio: "Criterio 7", queComprobar: "Cobertura del módulo viejo." }],
    }),
  ]);
  assert(
    json && json.noVerificables.length === 2,
    `se recogen los dos — actual: ${json && json.noVerificables.length}`
  );
}

// ---------------------------------------------------------------------------
// 7. LA LEY DE CONSERVACIÓN. Nada desaparece sin quedar contado.
// ---------------------------------------------------------------------------
{
  const { json } = fusionar("conservación", [
    bloque("bugs", [
      hallazgo({ linea: 10, confianza: 90 }),
      hallazgo({ linea: 20, confianza: 60 }),
      hallazgo({ linea: 30, confianza: 80 }),
    ]),
    bloque("seguridad", [
      hallazgo({ linea: 10, confianza: 95 }),
      hallazgo({ linea: 40, confianza: 88, exigidoPorSpec: "La spec lo pide así." }),
    ]),
    bloque("convenciones", [hallazgo({ linea: 50, confianza: 77 })]),
  ]);
  const a = json && json.auditoria;
  assert(a && a.recibidos === 6, `cuenta los 6 recibidos — actual: ${a && a.recibidos}`);
  const contabilizados =
    (json ? json.hallazgos.length : 0) +
    (json ? json.exigidoPorSpec.length : 0) +
    (a ? a.duplicadosFusionados : 0) +
    (a ? a.bajoUmbral : 0);
  assert(
    a && contabilizados === a.recibidos,
    `publicados + exigidos + fusionados + bajo umbral = recibidos ` +
      `(${contabilizados} vs ${a && a.recibidos}): nada se pierde en silencio`
  );
}

// ---------------------------------------------------------------------------
// 8. Un bloque que no cumple el esquema no tumba la síntesis: se nombra y sigue.
//    Cuatro subagentes son cuatro oportunidades de que uno derive del formato.
// ---------------------------------------------------------------------------
{
  const { json } = fusionar("un bloque malformado entre bloques buenos", [
    bloque("bugs", [hallazgo({ linea: 10 })]),
    { dimension: "convenciones", hallazgos: "esto debería ser una lista" },
    bloque("tests", [hallazgo({ linea: 20 })]),
  ]);
  assert(json && json.hallazgos.length === 2, "los bloques válidos sobreviven");
  assert(
    json && (json.errores || []).some((e) => /convenciones/.test(e)),
    "el bloque roto se nombra para que el orquestador lo sintetice a mano"
  );
}

{
  // Un hallazgo sin cita literal no entra: es la regla de la guía revision-hallazgos,
  // y sin ella el informe afirma sobre una línea que nadie abrió.
  const { json } = fusionar("hallazgo sin cita", [
    bloque("bugs", [hallazgo({ linea: 10, cita: "" })]),
  ]);
  assert(json && json.hallazgos.length === 0, "un hallazgo sin cita literal no se publica");
  assert(
    json && (json.errores || []).some((e) => /cita/i.test(e)),
    "y se dice por qué se cayó, en vez de desaparecer"
  );
}

// ---------------------------------------------------------------------------
// 9. Contrato: no rompe a quien lo llama.
// ---------------------------------------------------------------------------
{
  const { json } = fusionar("sin hallazgos", [bloque("bugs", []), bloque("tests", [])]);
  assert(json && json.hallazgos.length === 0, "cero hallazgos es un resultado válido");
  assert(json && json.auditoria.recibidos === 0, "y la auditoría lo dice explícitamente");

  const inexistente = join(tmpdir(), "cia-fusion-no-existe-" + process.pid + ".json");
  const r = spawnSync(process.execPath, [SCRIPT, inexistente], {
    encoding: "utf8",
    timeout: 15000,
    windowsHide: true,
  });
  assert(r.status === 2, `[fichero inexistente] sale con código 2 — actual: ${r.status}`);

  // JSON inválido de entrada: error de uso, no una excepción sin manejar.
  const dir = mkdtempSync(join(tmpdir(), "cia-fusion-"));
  temporales.push(dir);
  const malo = join(dir, "malo.json");
  writeFileSync(malo, "{no es json", "utf8");
  const r2 = spawnSync(process.execPath, [SCRIPT, malo], {
    encoding: "utf8",
    timeout: 15000,
    windowsHide: true,
  });
  assert(r2.status === 2, `[JSON inválido] sale con código 2 — actual: ${r2.status}`);
  assert(/json/i.test(r2.stderr || ""), "[JSON inválido] lo explica por stderr");

  // Por stdin, que es como lo invoca /review en una sola orden.
  const r3 = spawnSync(process.execPath, [SCRIPT], {
    input: JSON.stringify([bloque("bugs", [hallazgo()])]),
    encoding: "utf8",
    timeout: 15000,
    windowsHide: true,
  });
  assert(r3.status === 0, `[stdin] sale con código 0 — actual: ${r3.status}`);
  let porStdin = null;
  try {
    porStdin = JSON.parse(r3.stdout);
  } catch {
    /* lo asevera la línea siguiente */
  }
  assert(
    porStdin && porStdin.hallazgos.length === 1,
    "acepta los bloques por stdin, para que /review lo invoque en una sola orden"
  );
}

// ---------------------------------------------------------------------------
// 10. La severidad NO se degrada al fusionar. El caso que lo motivó es real: en la
//     revisión de este propio plugin, el mismo bug llegó como Medio/90 de una dimensión
//     y como Alto/90 de otra. El desempate era `confianza > previo.confianza`, y 90 > 90
//     es false, así que ganaba el que llegó primero — el Medio — y el Alto desaparecía.
//
//     No es un detalle de orden: Alto y Crítico son lo que convierte el veredicto en
//     «Cambios requeridos». Es el antipatrón que la guía llama «la señal fuerte degradada
//     por comodidad», cometido por la herramienta escrita para evitarlo.
// ---------------------------------------------------------------------------
{
  const { json } = fusionar("misma línea, misma confianza, distinta severidad", [
    bloque("bugs", [hallazgo({ confianza: 90, severidad: "Medio" })]),
    bloque("convenciones", [hallazgo({ confianza: 90, severidad: "Alto" })]),
  ]);
  const h = json && json.hallazgos[0];
  assert(json && json.hallazgos.length === 1, "se fusionan en uno");
  assert(
    h && h.severidad === "Alto",
    `al fusionar gana la severidad MÁS ALTA, no la que llegó primero — actual: ${h && h.severidad}`
  );
  assert(
    h && (h.tambienSenaladoPor || []).includes("bugs"),
    "y sigue constando qué otra dimensión lo señaló"
  );
}

{
  // El orden inverso: la severidad alta llega primero. Mismo resultado, o el arreglo
  // solo funcionaría en una dirección.
  const { json } = fusionar("severidad alta primero", [
    bloque("convenciones", [hallazgo({ confianza: 90, severidad: "Alto" })]),
    bloque("bugs", [hallazgo({ confianza: 90, severidad: "Medio" })]),
  ]);
  assert(
    json && json.hallazgos[0] && json.hallazgos[0].severidad === "Alto",
    "gana la severidad más alta llegue en el orden que llegue"
  );
}

{
  // La severidad manda sobre la confianza: un Alto con 80 pesa más que un Medio con 95.
  // Si fuera al revés, el hallazgo que decide el veredicto se publicaría degradado.
  const { json } = fusionar("severidad por encima de confianza", [
    bloque("bugs", [hallazgo({ confianza: 95, severidad: "Medio" })]),
    bloque("seguridad", [hallazgo({ confianza: 80, severidad: "Alto" })]),
  ]);
  const h = json && json.hallazgos[0];
  assert(h && h.severidad === "Alto", "la severidad decide el primario");
  assert(h && h.confianza === 80, "y el hallazgo publicado es coherente: la confianza es la suya");
}

// ---------------------------------------------------------------------------
// 11. El umbral NO falla abierto. `Number("alta")` es NaN y `NaN < 75` es false, así que
//     una confianza ilegible se publicaba como si hubiera pasado el filtro.
// ---------------------------------------------------------------------------
{
  const { json } = fusionar("confianza ilegible", [
    bloque("bugs", [
      hallazgo({ linea: 10, confianza: "alta" }),
      hallazgo({ linea: 20, confianza: undefined }),
      hallazgo({ linea: 30, confianza: 90 }),
    ]),
  ]);
  assert(
    json && json.hallazgos.length === 1,
    `una confianza no numérica no se publica — actual: ${json && json.hallazgos.length}`
  );
  assert(
    json && (json.errores || []).some((e) => /confianza/i.test(e)),
    "y se dice por qué se cayó, en vez de desaparecer"
  );
}

// ---------------------------------------------------------------------------
// 12. `exigidoPorSpec` también pasa por el umbral. Se apartaba ANTES de comprobarlo, así
//     que un hallazgo con confianza 40 marcado por spec llegaba al informe.
// ---------------------------------------------------------------------------
{
  const { json } = fusionar("exigido por spec bajo umbral", [
    bloque("spec", [hallazgo({ linea: 5, confianza: 40, exigidoPorSpec: "La spec lo pide." })]),
  ]);
  assert(
    json && json.exigidoPorSpec.length === 0,
    "un exigido-por-spec por debajo de 75 no se publica"
  );
  assert(json && json.auditoria.bajoUmbral === 1, "y queda contado como bajo umbral");
}

// ---------------------------------------------------------------------------
// 13. El descarte por falta de cita tiene su propia casilla, y entra en la conservación.
//     Antes se sumaba a `bajoUmbral`, así que la auditoría llamaba «descartado por
//     confianza» a un revisor que no pegó citas.
// ---------------------------------------------------------------------------
{
  const { json } = fusionar("conservación con todas las casillas", [
    bloque("bugs", [
      hallazgo({ linea: 10, confianza: 90 }),
      hallazgo({ linea: 20, confianza: 60 }),
      hallazgo({ linea: 25, cita: "" }),
    ]),
    bloque("seguridad", [
      hallazgo({ linea: 10, confianza: 95 }),
      hallazgo({ linea: 40, confianza: 88, exigidoPorSpec: "La spec lo pide." }),
    ]),
  ]);
  const a = json && json.auditoria;
  assert(a && a.sinCita === 1, `el descarte por falta de cita tiene casilla propia — actual: ${a && a.sinCita}`);
  assert(a && a.bajoUmbral === 1, "y no se mezcla con el descarte por confianza");
  const suma =
    (json ? json.hallazgos.length : 0) +
    (json ? json.exigidoPorSpec.length : 0) +
    (a ? a.duplicadosFusionados : 0) +
    (a ? a.bajoUmbral : 0) +
    (a ? a.sinCita : 0);
  assert(
    a && suma === a.recibidos,
    `la ley de conservación cubre TODAS las casillas (${suma} vs ${a && a.recibidos})`
  );
}

// ---------------------------------------------------------------------------
// 14. Las notas de baja confianza de cada revisor llegan al informe. Es la ruta por la
//     que viajan los 50-74, y no la ejercitaba ningún caso.
// ---------------------------------------------------------------------------
{
  const { json } = fusionar("notas de baja confianza", [
    bloque("bugs", [], { bajaConfianza: "Dos fugas de tipo en el mapper, 60-70." }),
    bloque("tests", [], { bajaConfianza: "Un test frágil, 65." }),
    bloque("convenciones", [], { bajaConfianza: "   " }),
  ]);
  assert(
    json && json.bajaConfianza.length === 2,
    `se recogen las dos notas con contenido — actual: ${json && json.bajaConfianza.length}`
  );
  assert(
    json && json.bajaConfianza.every((n) => n.dimension && n.nota),
    "cada nota viaja etiquetada con su dimensión"
  );
}

// ---------------------------------------------------------------------------
// 15. Las cinco ramas que ningún caso tocaba.
// ---------------------------------------------------------------------------
{
  // (a) JSON válido que no es una lista: el error más probable si un revisor devuelve su
  //     bloque suelto en vez de dentro de un array.
  const dir = mkdtempSync(join(tmpdir(), "cia-fusion-"));
  temporales.push(dir);
  const suelto = join(dir, "suelto.json");
  writeFileSync(suelto, JSON.stringify(bloque("bugs", [hallazgo()])), "utf8");
  const r = spawnSync(process.execPath, [SCRIPT, suelto], {
    encoding: "utf8",
    timeout: 15000,
    windowsHide: true,
  });
  assert(r.status === 2, `[bloque suelto, no lista] sale con código 2 — actual: ${r.status}`);
  assert(/lista/i.test(r.stderr || ""), "[bloque suelto] explica que se esperaba una lista");

  // (b) severidad desconocida o ausente → al final, nunca delante de un Crítico.
  const { json } = fusionar("severidad desconocida", [
    bloque("bugs", [
      hallazgo({ linea: 1, severidad: "Catastrófico" }),
      hallazgo({ linea: 2, severidad: undefined }),
      hallazgo({ linea: 3, severidad: "Bajo" }),
    ]),
  ]);
  const sev = (json ? json.hallazgos : []).map((h) => h.severidad);
  assert(sev[0] === "Bajo", `una severidad desconocida no adelanta a una conocida — actual: ${sev}`);

  // (c) el alias `Critico` sin tilde ordena como crítico.
  const { json: j2 } = fusionar("alias Critico sin tilde", [
    bloque("bugs", [hallazgo({ linea: 1, severidad: "Bajo" }), hallazgo({ linea: 2, severidad: "Critico" })]),
  ]);
  assert(
    j2 && j2.hallazgos[0] && j2.hallazgos[0].severidad === "Critico",
    "`Critico` sin tilde ordena como Crítico"
  );

  // (d) desempate por confianza dentro de la misma severidad.
  const { json: j3 } = fusionar("desempate por confianza", [
    bloque("bugs", [
      hallazgo({ linea: 1, severidad: "Medio", confianza: 80 }),
      hallazgo({ linea: 2, severidad: "Medio", confianza: 95 }),
    ]),
  ]);
  assert(
    j3 && j3.hallazgos[0] && j3.hallazgos[0].confianza === 95,
    "a igual severidad, primero el de más confianza"
  );

  // (e) tres dimensiones sobre la misma línea: la atribución no se pierde por el camino.
  const { json: j4 } = fusionar("tres dimensiones sobre la misma línea", [
    bloque("bugs", [hallazgo({ confianza: 80 })]),
    bloque("seguridad", [hallazgo({ confianza: 95 })]),
    bloque("tests", [hallazgo({ confianza: 85 })]),
  ]);
  const h4 = j4 && j4.hallazgos[0];
  assert(j4 && j4.hallazgos.length === 1, "las tres se fusionan en una");
  assert(
    h4 && (h4.tambienSenaladoPor || []).length === 2,
    `constan las OTRAS dos dimensiones — actual: ${h4 && JSON.stringify(h4.tambienSenaladoPor)}`
  );
  assert(
    j4 && j4.auditoria.duplicadosFusionados === 2,
    "y la auditoría cuenta las dos fusiones"
  );
}

// ---------------------------------------------------------------------------
// Limpieza y veredicto
// ---------------------------------------------------------------------------
for (const d of temporales) {
  try {
    rmSync(d, { recursive: true, force: true });
  } catch {
    /* un temporal que no se deja borrar no invalida el test */
  }
}

if (fallos.length) {
  console.error(`✗ ${fallos.length}/${total} aserción(es) de la fusión de hallazgos fallaron:`);
  for (const f of fallos) console.error("  - " + f);
  console.error("");
  console.error("  Un informe que pierde un hallazgo en silencio es peor que uno que no lo");
  console.error("  encontró: el segundo se sabe incompleto y el primero se cree completo.");
  console.error("  Arregla la fusión, no la aserción.");
  process.exit(1);
}

console.log(`✓ ${total} aserciones de la fusión de hallazgos OK (incluida la ley de conservación, con todas sus casillas).`);
