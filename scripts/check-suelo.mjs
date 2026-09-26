#!/usr/bin/env node
/**
 * check-suelo.mjs — el escaneo del suelo de calidad detecta lo que dice detectar, y no
 * dispara con lo que dice no disparar.
 *
 * `core/scripts/suelo-calidad.mjs` es el único script del plugin que se EJECUTA en el
 * repo del usuario (los de `scripts/` los lanza el mantenedor aquí). Recorre el paquete
 * de revisión buscando las cinco formas de aflojar la barra de calidad que describe la
 * Fase 2 de `/review`, y lo que devuelve entra como hallazgo candidato en el informe.
 *
 * ── Por qué existe ─────────────────────────────────────────────────────────────
 *
 * El escaneo era prosa: una tabla de cinco movimientos que el agente traducía a llamadas
 * de `Grep` sobre la marcha. Funcionaba, pero cada ejecución construía sus propias
 * expresiones, así que dos revisiones del mismo diff podían no coincidir y ningún check
 * podía verificar que `# type: ignore` se detectaba de verdad. Un patrón que no casa no
 * casca: devuelve cero hallazgos, que es indistinguible de un diff limpio.
 *
 * ── Los dos lados, que pesan igual ─────────────────────────────────────────────
 *
 * Cada movimiento se prueba en positivo (lo detecta) y en negativo (no dispara con el
 * caso que la propia guía excluye). El negativo no es adorno: la regla «una supresión
 * con su motivo escrito al lado no es un hallazgo» es la que separa una señal útil de un
 * linter de segunda que reporta cada `@ts-ignore` del repo. Un escaneo que dispara de
 * más se desactiva, y entonces deja de servir para lo que existe.
 *
 * Y la regla transversal: **apretar el listón es silencioso, aflojarlo es ruidoso**. Un
 * diff que AÑADE aserciones o QUITA supresiones sube la barra y no produce nada.
 *
 * Sale con código 1 si algún caso falla. Pensado para CI.
 */
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = join(ROOT, "core/scripts/suelo-calidad.mjs");

const fallos = [];
let total = 0;

function assert(cond, msg) {
  total++;
  if (!cond) fallos.push(msg);
}

const temporales = [];

/**
 * Envuelve un cuerpo de hunk en una cabecera de diff unificado válida.
 *
 * Los dos lados arrancan en números DISTINTOS (viejo 100, nuevo 200) a propósito: con
 * ambos en 10, una aserción del tipo `linea >= 10` se cumple con cualquier valor mal
 * calculado, y confundir el contador del lado viejo con el del nuevo pasaba inadvertido.
 * El número de línea no es decorativo — es la mitad de la clave con la que la fusión
 * deduplica, y lo que un humano abre para comprobar la cita.
 */
function diff(fichero, cuerpo, { antiguo = fichero } = {}) {
  const lineas = cuerpo.split("\n");
  return (
    `diff --git a/${antiguo} b/${fichero}\n` +
    `--- a/${antiguo}\n` +
    `+++ b/${fichero}\n` +
    `@@ -100,${lineas.length} +200,${lineas.length} @@\n` +
    cuerpo +
    "\n"
  );
}

/** Escribe el diff a un temporal, ejecuta el script y devuelve `{ code, json }`. */
function escanear(nombre, contenido) {
  const dir = mkdtempSync(join(tmpdir(), "cia-suelo-"));
  temporales.push(dir);
  const ruta = join(dir, "review.diff");
  writeFileSync(ruta, contenido, "utf8");
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

/** ¿Hay al menos un hallazgo de ese movimiento? */
function tiene(json, movimiento) {
  return !!json && (json.movimientos || []).some((m) => m.movimiento === movimiento);
}

/** Hallazgos de ese movimiento. */
function de(json, movimiento) {
  return ((json && json.movimientos) || []).filter((m) => m.movimiento === movimiento);
}

// ---------------------------------------------------------------------------
// 1. Checker silenciado — dimensión 4.
// ---------------------------------------------------------------------------
{
  const { json } = escanear(
    "checker silenciado (mudo)",
    diff(
      "src/auth.ts",
      [
        " const sesion = leerSesion();",
        "+// @ts-ignore",
        "+const usuario = sesion.usuario!;",
        "+// eslint-disable-next-line no-console",
        "+console.log(usuario);",
      ].join("\n")
    ) +
      diff(
        "src/calc.py",
        [" import math", "+valor = calcular()  # type: ignore", "+otro = x  # noqa"].join("\n")
      )
  );
  const hallados = de(json, "checker-silenciado");
  assert(hallados.length === 4, `detecta las 4 supresiones mudas — actual: ${hallados.length}`);
  assert(
    hallados.every((h) => h.dimension === 4),
    "las supresiones entran en la dimensión 4 (convenciones y deuda técnica)"
  );
  assert(
    hallados.some((h) => h.fichero === "src/auth.ts" && /@ts-ignore/.test(h.cita)),
    "el hallazgo trae fichero y cita literal de la línea"
  );
  // Números exactos, derivados a mano del hunk: contexto en 200, luego 201, 202, 203…
  const ts = hallados.find((h) => /@ts-ignore/.test(h.cita));
  const es = hallados.find((h) => /eslint-disable/.test(h.cita));
  assert(ts && ts.linea === 201, `@ts-ignore está en la línea 201 — actual: ${ts && ts.linea}`);
  assert(es && es.linea === 203, `eslint-disable está en la línea 203 — actual: ${es && es.linea}`);
  assert(
    hallados
      .filter((h) => h.fichero === "src/calc.py")
      .every((h) => h.linea === 201 || h.linea === 202),
    "las del segundo fichero llevan la numeración de SU hunk, no la del anterior"
  );
}

// ---------------------------------------------------------------------------
// 2. Checker silenciado CON motivo — no es hallazgo. La regla que evita el ruido.
// ---------------------------------------------------------------------------
{
  const { json } = escanear(
    "checker silenciado (con motivo)",
    diff(
      "src/auth.ts",
      [
        "+// @ts-ignore: la librería tipa mal el callback y no acepta null",
        "+const usuario = sesion.usuario;",
        "+// eslint-disable-next-line no-console -- log de arranque, va a stdout a propósito",
        "+console.log(usuario);",
        "+valor = x  # type: ignore  # el stub de la librería está incompleto",
      ].join("\n")
    )
  );
  assert(
    !tiene(json, "checker-silenciado"),
    "una supresión con el motivo escrito al lado NO es hallazgo"
  );
}

// ---------------------------------------------------------------------------
// 3. Una supresión BORRADA sube la barra: silencio.
// ---------------------------------------------------------------------------
{
  const { json } = escanear(
    "supresión borrada",
    diff("src/auth.ts", ["-// @ts-ignore", " const usuario = sesion.usuario;"].join("\n"))
  );
  assert(
    !tiene(json, "checker-silenciado"),
    "quitar una supresión sube el listón y no produce hallazgo"
  );
}

// ---------------------------------------------------------------------------
// 4. Test hecho más fácil — dimensión 3. Dos formas: saltarlo, o quitarle la aserción.
// ---------------------------------------------------------------------------
{
  const { json } = escanear(
    "tests saltados",
    diff(
      "src/auth.test.ts",
      [
        "+it.skip('rechaza el token caducado', () => {",
        "+  login(tokenCaducado);",
        "+});",
        "+xdescribe('sesión', () => {});",
      ].join("\n")
    ) +
      diff(
        "tests/test_auth.py",
        ["+@pytest.mark.skip", "+def test_token_caducado():", "+    pass"].join("\n")
      )
  );
  const hallados = de(json, "test-mas-facil");
  assert(hallados.length >= 3, `detecta los tests saltados — actual: ${hallados.length}`);
  assert(
    hallados.every((h) => h.dimension === 3),
    "los tests aflojados entran en la dimensión 3 (tests)"
  );
}

{
  const { json } = escanear(
    "aserción borrada de un test que se queda",
    diff(
      "src/auth.test.ts",
      [
        " it('rechaza el token caducado', () => {",
        "   const r = login(tokenCaducado);",
        "-  expect(r.error).toBe('token caducado');",
        " });",
      ].join("\n")
    )
  );
  assert(
    tiene(json, "test-mas-facil"),
    "una aserción borrada de un test que se queda es hallazgo"
  );
  // Lado VIEJO (arranca en 100): contexto 100 y 101, la borrada es la 102. Si el parser
  // cruzara los contadores, aquí saldría 202 y el caso fallaría.
  const borrada = de(json, "test-mas-facil")[0];
  assert(
    borrada && borrada.linea === 102,
    `una línea borrada se numera por el lado viejo — actual: ${borrada && borrada.linea}`
  );
}

{
  const { json } = escanear(
    "aserción añadida",
    diff(
      "src/auth.test.ts",
      [
        " it('rechaza el token caducado', () => {",
        "+  expect(r.error).toBe('token caducado');",
        " });",
      ].join("\n")
    )
  );
  assert(
    !tiene(json, "test-mas-facil"),
    "añadir una aserción sube el listón y no produce hallazgo"
  );
}

{
  // Un `expect` borrado en código que NO es de test no es este movimiento: puede ser
  // cualquier refactor. La regla habla de un test que se queda.
  const { json } = escanear(
    "expect borrado fuera de un test",
    diff("src/auth.ts", ["-  expect(algo);", " return usuario;"].join("\n"))
  );
  assert(
    !tiene(json, "test-mas-facil"),
    "una línea borrada fuera de un fichero de test no cuenta como test aflojado"
  );
}

// ---------------------------------------------------------------------------
// 5. Trabajo sin terminar — dimensión 2.
// ---------------------------------------------------------------------------
{
  const { json } = escanear(
    "trabajo sin terminar",
    diff(
      "src/pago.ts",
      [
        "+export function reembolsar() {",
        '+  throw new Error("not implemented");',
        "+}",
        "+try { cobrar(); } catch {}",
        "+try { cobrar(); } catch (e) {}",
        "+// TODO: validar el importe antes de cobrar",
      ].join("\n")
    )
  );
  const hallados = de(json, "trabajo-sin-terminar");
  assert(hallados.length === 4, `detecta los 4 restos de trabajo sin terminar — actual: ${hallados.length}`);
  assert(
    hallados.every((h) => h.dimension === 2),
    "el trabajo sin terminar entra en la dimensión 2 (bugs)"
  );
}

{
  // Un `catch` que hace algo no es un `catch` vacío, por corto que sea.
  const { json } = escanear(
    "catch que sí maneja",
    diff("src/pago.ts", ["+try { cobrar(); } catch (e) { registrar(e); }"].join("\n"))
  );
  assert(
    !tiene(json, "trabajo-sin-terminar"),
    "un catch con cuerpo no es un catch vacío"
  );
}

// ---------------------------------------------------------------------------
// 6. Umbral movido — dimensión 4. Solo cuenta en ficheros de puerta.
// ---------------------------------------------------------------------------
{
  const { json } = escanear(
    "umbral movido en un fichero de puerta",
    diff(
      ".github/workflows/ci.yml",
      ["+        continue-on-error: true", "-        max-warnings: 0", "+        max-warnings: 50"].join("\n")
    ) +
      diff("vitest.config.ts", ["-      lines: 80,", "+      lines: 40,", " // coverage"].join("\n"))
  );
  const hallados = de(json, "umbral-movido");
  assert(hallados.length >= 2, `detecta los umbrales movidos — actual: ${hallados.length}`);
  assert(
    hallados.every((h) => h.dimension === 4),
    "los umbrales movidos entran en la dimensión 4"
  );
  // Un umbral puede moverse en una línea que no lleva ninguna de las cinco palabras
  // (`lines: 80` → `lines: 40` en la config de cobertura). El escaneo no lo sabe leer,
  // así que en vez de callarlo devuelve qué ficheros de puerta se tocaron: es el paso
  // del `--stat` que la prosa pedía, y deja la lectura al revisor.
  const puertas = (json && json.puertasTocadas) || [];
  assert(
    puertas.includes("vitest.config.ts"),
    "una puerta tocada sin palabra clave se reporta igual, como fichero a mirar"
  );
  assert(
    puertas.includes(".github/workflows/ci.yml"),
    "las puertas tocadas se listan todas, también las que sí dieron hallazgo"
  );
}

{
  // La misma palabra en código de producción no es una puerta que se afloja.
  const { json } = escanear(
    "la palabra threshold en código normal",
    diff("src/alertas.ts", ["+const threshold = 50;", "+const severity = 'alta';"].join("\n"))
  );
  assert(
    !tiene(json, "umbral-movido"),
    "`threshold` fuera de un fichero de puerta no es un umbral aflojado"
  );
}

// ---------------------------------------------------------------------------
// 7. Test desaparecido — dimensión 3. Un fichero de test con SOLO borrados.
// ---------------------------------------------------------------------------
{
  const { json } = escanear(
    "fichero de test solo con borrados",
    diff(
      "src/auth.test.ts",
      ["-it('rechaza el token caducado', () => {", "-  expect(r.error).toBe('x');", "-});"].join("\n")
    )
  );
  assert(tiene(json, "test-desaparecido"), "un fichero de test con solo borrados es hallazgo");
  assert(
    de(json, "test-desaparecido").every((h) => h.dimension === 3),
    "el test desaparecido entra en la dimensión 3"
  );
}

{
  const { json } = escanear(
    "fichero de test editado",
    diff(
      "src/auth.test.ts",
      ["-it('viejo', () => {});", "+it('nuevo', () => { expect(1).toBe(1); });"].join("\n")
    )
  );
  assert(
    !tiene(json, "test-desaparecido"),
    "un fichero de test que se edita (borra Y añade) no ha desaparecido"
  );
}

// ---------------------------------------------------------------------------
// 8. Hablar de un patrón no es usarlo. Los dos casos salieron de pasar el escaneo
//    sobre un diff real de este mismo repo: devolvió 8 hallazgos y los 8 eran ruido.
//
//    Importa más de lo que parece. Un escaneo con esta relación señal/ruido no se
//    corrige leyéndolo con cuidado: se desactiva, y entonces deja de servir para lo
//    único que existe.
// ---------------------------------------------------------------------------
{
  const { json } = escanear(
    "prosa que menciona los patrones",
    diff(
      "docs/revision.md",
      [
        "+Busca supresiones mudas: `@ts-ignore`, `eslint-disable`, `# noqa`.",
        "+Y restos de trabajo sin terminar: un `TODO` o un `catch {}` vacío.",
      ].join("\n")
    )
  );
  assert(
    json && json.movimientos.length === 0,
    `documentación que nombra las directivas no es un atajo — actual: ${
      json ? json.movimientos.length : "?"
    }`
  );
}

{
  const { json } = escanear(
    "la directiva dentro de una cadena o una regex",
    diff(
      "scripts/check.mjs",
      [
        "+const SUPRESIONES = [/eslint-disable/, /nosemgrep/];",
        '+if (linea.includes("@ts-ignore")) marcar(linea);',
      ].join("\n")
    )
  );
  assert(
    !tiene(json, "checker-silenciado"),
    "una directiva dentro de una cadena o una regex no silencia nada: es código que la busca"
  );
}

{
  // El otro lado: la misma directiva EN un comentario sigue siendo hallazgo.
  const { json } = escanear(
    "la directiva en un comentario de verdad",
    diff("scripts/check.mjs", ["+// eslint-disable-next-line", "+const x = eval(y);"].join("\n"))
  );
  assert(
    tiene(json, "checker-silenciado"),
    "la directiva escrita como comentario sí es una supresión"
  );
}

{
  // La prosa de un bloque `/** … */` DENTRO de un fichero de código sigue siendo prosa.
  // Salió revisando este mismo trabajo: la cabecera de `suelo-calidad.mjs`, que explica
  // qué busca, se señalaba a sí misma. El filtro de `esProsa` solo miraba la extensión.
  const { json } = escanear(
    "prosa dentro de un bloque de comentario en código",
    diff(
      "src/lib/doc.ts",
      [
        "+/**",
        "+ * Busca supresiones como `@ts-ignore` o `# type: ignore`, y restos de trabajo",
        "+ * sin terminar: un `TODO` o un `catch {}` vacío.",
        "+ */",
        "+export const X = 1;",
      ].join("\n")
    )
  );
  assert(
    json && json.movimientos.length === 0,
    `la documentación de un bloque /** */ no es código que afloje nada — actual: ${
      json ? json.movimientos.length : "?"
    }`
  );
}

{
  // `@SuppressWarnings` estaba exento de la comprobación de comentario por ser una
  // anotación de Java. La exención era demasiado ancha: disparaba con la palabra dentro
  // de una regex. Una anotación abre la línea; una regex que la menciona, no.
  const { json } = escanear(
    "@SuppressWarnings dentro de una expresión regular",
    // Aislado a propósito: con otra directiva en la misma línea casaría esa primero y el
    // caso pasaría sin probar la exención de `@SuppressWarnings`, que es lo que se mide.
    diff("scripts/patrones.mjs", ["+const ANOTACIONES = [/@SuppressWarnings/];"].join("\n"))
  );
  assert(
    !tiene(json, "checker-silenciado"),
    "`@SuppressWarnings` dentro de una regex no silencia nada"
  );
}

{
  const { json } = escanear(
    "@SuppressWarnings como anotación de verdad",
    diff("src/Servicio.java", ['+  @SuppressWarnings("unchecked")', "+  public void x() {}"].join("\n"))
  );
  assert(
    tiene(json, "checker-silenciado"),
    "`@SuppressWarnings` abriendo la línea sí es una supresión"
  );
}

// ---------------------------------------------------------------------------
// 9. Diff limpio: cero hallazgos, y se dice en una línea.
// ---------------------------------------------------------------------------
{
  const { json } = escanear(
    "diff limpio",
    diff(
      "src/auth.ts",
      [
        "+export function validar(token: string) {",
        "+  if (!token) return { error: 'token requerido' };",
        "+  return { ok: true };",
        "+}",
      ].join("\n")
    )
  );
  assert(json && json.movimientos.length === 0, "un diff que no afloja nada no produce hallazgos");
  assert(
    json && json.resumen && json.resumen.total === 0,
    "el resumen dice explícitamente que no hay nada, en vez de omitirlo"
  );
}

// ---------------------------------------------------------------------------
// 9. Contrato: el script no rompe a quien lo llama.
// ---------------------------------------------------------------------------
{
  const inexistente = join(tmpdir(), "cia-suelo-no-existe-" + process.pid + ".diff");
  const r = spawnSync(process.execPath, [SCRIPT, inexistente], {
    encoding: "utf8",
    timeout: 15000,
    windowsHide: true,
  });
  assert(r.status === 2, `[fichero inexistente] sale con código 2 (uso) — actual: ${r.status}`);
  assert(/no/i.test(r.stderr || ""), "[fichero inexistente] explica el problema por stderr");

  const sinArgs = spawnSync(process.execPath, [SCRIPT], {
    encoding: "utf8",
    timeout: 15000,
    windowsHide: true,
  });
  assert(sinArgs.status === 2, `[sin argumentos] sale con código 2 — actual: ${sinArgs.status}`);

  // Un fichero vacío es un diff válido sin cambios, no un error.
  const { json } = escanear("diff vacío", "");
  assert(json && json.movimientos.length === 0, "un diff vacío no produce hallazgos ni error");
}

// ---------------------------------------------------------------------------
// 10-15. Guías condicionales: qué aplica se calcula, no se juzga.
//
// La Fase 3 de /review lleva condiciones en prosa —«si el diff trae migraciones…», «si
// el cambio llama a un modelo de lenguaje…», «despacha la dimensión 6 SOLO si toca UI»—
// que evalúa el modelo leyendo el diff. Son computables, y la diferencia importa en las
// dos direcciones: la guía que no se carga cuando tocaba es un hallazgo de severidad
// Alta que no se levanta, y el subagente de la dimensión 6 despachado de más es dinero.
//
// Cada señal viene con los ficheros que la sostienen: una pista verificable, no un
// veredicto. El revisor sigue juzgando.
// ---------------------------------------------------------------------------

/** Guías señaladas por el escaneo. */
function guias(json) {
  return Object.keys((json && json.guiasAplicables) || {});
}

/** Ficheros que sostienen una señal, o [] si la señal no está. */
function evidencia(json, guia) {
  return (((json && json.guiasAplicables) || {})[guia]) || [];
}

{
  const { json } = escanear(
    "migración de datos",
    diff(
      "db/migrate/20260101_add_column.sql",
      ["+ALTER TABLE usuarios ADD COLUMN email TEXT NOT NULL;"].join("\n")
    )
  );
  assert(
    guias(json).includes("migraciones-de-datos"),
    "un fichero de migración señala la guía de migraciones"
  );
  assert(
    evidencia(json, "migraciones-de-datos").includes("db/migrate/20260101_add_column.sql"),
    "la señal trae el fichero que la sostiene, para poder comprobarla"
  );
}

{
  const { json } = escanear(
    "consulta a base de datos",
    diff(
      "src/informes.ts",
      [
        "+const filas = await db.query(",
        "+  'SELECT total FROM pedidos JOIN clientes ON clientes.id = pedidos.cliente_id'",
        "+);",
      ].join("\n")
    )
  );
  assert(
    guias(json).includes("consultas-correctas"),
    "una consulta a base de datos señala la guía de consultas"
  );
}

{
  const { json } = escanear(
    "llamada a un modelo de lenguaje",
    diff(
      "src/resumen.ts",
      [
        '+import Anthropic from "@anthropic-ai/sdk";',
        "+const r = await client.messages.create({ model, messages });",
      ].join("\n")
    )
  );
  assert(
    guias(json).includes("llamadas-a-modelos"),
    "una llamada a un modelo señala la guía de llamadas a modelos"
  );
}

{
  const { json } = escanear(
    "cambio de interfaz",
    diff(
      "src/components/Formulario.tsx",
      ["+export function Formulario() {", "+  return <form><input name='email' /></form>;", "+}"].join("\n")
    )
  );
  assert(
    guias(json).includes("usabilidad-accesibilidad"),
    "un fichero de UI señala la guía de usabilidad y accesibilidad"
  );
  assert(
    json && json.tocaUI === true,
    "el escaneo dice explícitamente si el diff toca UI: es el gate de la dimensión 6"
  );
}

{
  const { json } = escanear(
    "cambio de backend sin nada condicional",
    diff(
      "src/utils/formato.ts",
      ["+export function capitalizar(s: string) {", "+  return s[0].toUpperCase() + s.slice(1);", "+}"].join("\n")
    )
  );
  assert(guias(json).length === 0, `un cambio sin señales no activa ninguna guía — actual: ${guias(json)}`);
  assert(
    json && json.tocaUI === false,
    "sin UI el escaneo lo dice, para no gastar el subagente de la dimensión 6"
  );
}

{
  // `JOIN` como palabra suelta casa con `array.join("\\n")`, que es la línea más común de
  // JavaScript que existe. Salió pasando el escaneo sobre este mismo repo: señalaba
  // `sync.mjs` como código con consultas a base de datos. Una señal que se dispara con
  // `.join(` no señala nada.
  const { json } = escanear(
    "join de JavaScript, no de SQL",
    diff(
      "scripts/generar.mjs",
      ["+const salida = lineas.join(\"\\n\");", "+return partes.join(\", \");"].join("\n")
    )
  );
  assert(
    !guias(json).includes("consultas-correctas"),
    "`array.join(...)` no es una consulta a base de datos"
  );
}

{
  // El otro lado: un JOIN de SQL de verdad sí se señala, aunque no traiga SELECT delante.
  const { json } = escanear(
    "JOIN de SQL sin SELECT en la misma línea",
    diff("src/informes.ts", ["+  `LEFT JOIN clientes ON clientes.id = p.cliente_id`,"].join("\n"))
  );
  assert(
    guias(json).includes("consultas-correctas"),
    "un JOIN de SQL con su cualificador sí es una consulta"
  );
}

{
  // La prosa que menciona SQL o un modelo no es un cambio que los use. Mismo filtro que
  // el de los movimientos, por el mismo motivo.
  const { json } = escanear(
    "documentación que habla de consultas y modelos",
    diff(
      "docs/arquitectura.md",
      [
        "+El informe hace un `SELECT total FROM pedidos` y luego llama a",
        "+`client.messages.create` para resumirlo.",
      ].join("\n")
    )
  );
  assert(
    guias(json).length === 0,
    `documentación que describe una consulta no es una consulta — actual: ${guias(json)}`
  );
}

// ---------------------------------------------------------------------------
// N. Un diff REAL de git, no uno sintético.
//
// Todos los casos de arriba pasan por el helper `diff()`, que fabrica una cabecera
// mínima. Eso dejó pasar el fallo más caro que ha tenido este escaneo: una línea BORRADA
// que empieza por `-- ` (el comentario de SQL, Lua, Haskell) se renderiza en el diff como
// `--- comentario`, el parser la tomaba por cabecera de fichero, y **el resto del fichero
// desaparecía del escaneo**. Cero movimientos, que es indistinguible de un fichero limpio.
//
// Justo en los `.sql`, que es donde el escaneo tenía que señalar `migraciones-de-datos`.
//
// Por eso este caso monta un repo de verdad y usa la salida de `git diff -U10`: cubre de
// una vez la cabecera real, `/dev/null`, los índices y varios ficheros en un mismo diff.
// ---------------------------------------------------------------------------
{
  const dir = mkdtempSync(join(tmpdir(), "cia-suelo-git-"));
  temporales.push(dir);
  const g = (...args) =>
    spawnSync("git", args, { cwd: dir, encoding: "utf8", windowsHide: true });
  g("init", "-q");
  g("config", "user.email", "test@example.com");
  g("config", "user.name", "Test");

  // Base: un .sql con un comentario que luego se borra, y un .ts cualquiera.
  writeFileSync(
    join(dir, "migracion.sql"),
    "-- crea la tabla de usuarios\nCREATE TABLE usuarios (id INT);\nINSERT INTO usuarios VALUES (1);\n",
    "utf8"
  );
  writeFileSync(join(dir, "app.ts"), "export const a = 1;\n", "utf8");
  g("add", "-A");
  g("commit", "-q", "-m", "base");

  // Cambio: se borra el comentario SQL (→ línea `--- …` en el diff) y DESPUÉS se añaden
  // cosas que el escaneo tiene que ver. Si el parser se corrompe, no verá ninguna.
  writeFileSync(
    join(dir, "migracion.sql"),
    "CREATE TABLE usuarios (id INT);\nALTER TABLE usuarios ADD COLUMN email TEXT NOT NULL;\n-- TODO: revisar los indices\nINSERT INTO usuarios VALUES (1);\n",
    "utf8"
  );
  writeFileSync(join(dir, "app.ts"), "export const a = 1;\n// @ts-ignore\nexport const b = c;\n", "utf8");
  g("add", "-A");

  const real = join(dir, "real.diff");
  const out = spawnSync("git", ["diff", "--cached", "-U10"], {
    cwd: dir,
    encoding: "utf8",
    windowsHide: true,
  });
  writeFileSync(real, out.stdout, "utf8");
  assert(
    /^--- crea la tabla de usuarios$/m.test(out.stdout),
    "el diff real contiene la línea `--- …` que rompía el parser (si no, el caso no prueba nada)"
  );

  const r = spawnSync(process.execPath, [SCRIPT, real], {
    encoding: "utf8",
    timeout: 15000,
    windowsHide: true,
  });
  let json = null;
  try {
    json = JSON.parse(r.stdout);
  } catch {
    /* lo aseveran las líneas siguientes */
  }
  assert(r.status === 0, `[git real] sale con código 0 — actual: ${r.status}`);
  assert(json !== null, "[git real] emite JSON válido");

  assert(
    de(json, "trabajo-sin-terminar").some((h) => h.fichero === "migracion.sql"),
    "ve el `-- TODO` del .sql que va DESPUÉS de la línea que parecía una cabecera"
  );
  assert(
    (((json && json.guiasAplicables) || {})["migraciones-de-datos"] || []).includes(
      "migracion.sql"
    ),
    "señala la guía de migraciones por el `ALTER TABLE`, que también iba después"
  );
  assert(
    de(json, "checker-silenciado").some((h) => h.fichero === "app.ts"),
    "el otro fichero del mismo diff se escanea igual"
  );
}

{
  // El gemelo del mismo defecto, por el lado de las añadidas: una línea AÑADIDA que
  // empiece por `++ ` se renderiza `+++ …` y se tomaba por cabecera.
  const { json } = escanear(
    "línea añadida que parece cabecera `+++`",
    // La línea de contenido es `++ nota …`, que con el marcador `+` del diff queda
    // `+++ nota …` — idéntica a una cabecera. Escrita así a propósito.
    diff(
      "src/notas.ts",
      ["+++ nota de estilo antigua", "+// @ts-ignore", "+const x = y;"].join("\n")
    )
  );
  assert(
    tiene(json, "checker-silenciado"),
    "una línea añadida que empieza por `++` no corrompe el resto del fichero"
  );
  assert(
    de(json, "checker-silenciado").every((h) => h.fichero === "src/notas.ts"),
    "y no inventa un fichero con el texto de esa línea"
  );
}

// ---------------------------------------------------------------------------
// M. Una directiva dentro de una CADENA es un dato, no una supresión.
//
// El último reducto de ruido del escaneo, y el más terco: el código que habla de patrones
// los lleva como literales. Linters, generadores, fixtures de test, documentación
// ejecutable. Pasando el escaneo sobre la propia rama que lo añadía, los 30 movimientos
// que salían eran las filas del catálogo de aquí abajo.
//
// El filtro cuenta comillas sin escapar antes de la coincidencia: número impar = dentro.
// El apóstrofo es el caso delicado, porque en prosa inglesa es una contracción y no un
// delimitador — con él contando siempre, `// can't fix this upstream, @ts-ignore` dejaba
// de detectarse, que es justo el error caro. Por eso solo cuenta cuando la línea lo usa
// como delimitador de verdad (dos o más).
//
// Medido antes de adoptarlo: 30 → 0 en la rama, 0 → 0 en un diff real de 10.746 líneas.
// ---------------------------------------------------------------------------
{
  const noDisparan = [
    ["fila de catálogo con comillas dobles", "scripts/tabla.mjs", '+  ["@ts-ignore", "src/a.ts", "checker-silenciado"],'],
    // Esta es la forma que de verdad necesita el filtro de cadena: la línea LLEVA `//`
    // antes de la directiva, así que `enComentario` la da por buena y solo `enCadena`
    // la salva. Es exactamente la pinta de una fila del catálogo de aquí abajo, y sin
    // este caso el guard de las supresiones se podía borrar con todo en verde.
    ["supresión entrecomillada CON marca de comentario", "scripts/tabla.mjs", '+  ["ts", "src/a.ts", ["+// @ts-ignore"], "checker-silenciado"],'],
    ["fixture entre comillas simples", "scripts/tabla.mjs", `+  ['+  throw new Error("not implemented");'],`],
    ["test saltado como dato", "scripts/tabla.mjs", `+  const ejemplo = "+it.skip('x', () => {});";`],
    ["catch vacío dentro de una plantilla", "scripts/tabla.mjs", "+  const ej = `try { f(); } catch {}`;"],
    ["TODO dentro de una cadena", "scripts/tabla.mjs", '+  const marca = "// TODO: algo";'],
  ];
  for (const [que, fichero, linea] of noDisparan) {
    const { json } = escanear("cadena: " + que, diff(fichero, linea));
    assert(
      json && json.movimientos.length === 0,
      `«${que}»: un literal no afloja nada — actual: ${
        json ? (json.movimientos || []).map((m) => m.movimiento) : "sin JSON"
      }`
    );
  }

  // Y el otro lado, que es el que importa más: fuera de una cadena sigue disparando.
  const siDisparan = [
    ["contracción inglesa antes de la directiva", "src/a.ts", "+// can't fix this upstream, @ts-ignore", "checker-silenciado"],
    ["comillas pares antes de la directiva", "src/a.ts", '+const s = "hola"; // @ts-ignore', "checker-silenciado"],
    ["apóstrofo suelto antes de un TODO", "src/a.ts", "+// don't ship this — TODO: quitarlo", "trabajo-sin-terminar"],
    ["cadena cerrada y luego catch vacío", "src/a.ts", '+const m = "x"; try { f(); } catch {}', "trabajo-sin-terminar"],
  ];
  for (const [que, fichero, linea, espera] of siDisparan) {
    const { json } = escanear("cadena, otro lado: " + que, diff(fichero, linea));
    assert(
      tiene(json, espera),
      `«${que}»: esto SÍ es ${espera} — actual: ${
        json ? (json.movimientos || []).map((m) => m.movimiento) : "sin JSON"
      }`
    );
  }
}

// ---------------------------------------------------------------------------
// CATÁLOGO — una entrada por patrón, y ninguna se puede borrar sin que esto falle.
//
// Los casos de arriba prueban los MOVIMIENTOS; este prueba las ENTRADAS. La diferencia
// salió de un barrido de borrado 1 a 1 sobre el escaneo: **29 patrones se podían quitar
// con todos los casos en verde**. `nosemgrep`, `istanbul ignore`, `NotImplementedError`,
// `FIXME`, `prisma`, `knex`, `__tests__`, `.eslintrc`… todos muertos sin que nada lo
// dijera. Es el fallo que este script declara venir a eliminar, cometido dentro de su
// propio test: un patrón que no casa devuelve cero, y cero parece un diff limpio.
//
// La regla que sale de aquí: **añadir un patrón al escaneo obliga a añadir su fila.**
// ---------------------------------------------------------------------------
{
  // Línea de CONTEXTO, no añadida: las filas que prueban `esTest` deben pasar por el
  // reconocimiento del fichero, no por un `it.skip` que dispara en cualquier sitio.
  // Con un `it.skip` ahí, borrar `__tests__` de `esTest` no rompía nada.
  const CTX = " const r = login(token);";
  const CATALOGO = [
    // ---- SUPRESIONES ----
    ["@ts-ignore", "src/a.ts", ["+// @ts-ignore"], "checker-silenciado"],
    ["@ts-nocheck", "src/a.ts", ["+// @ts-nocheck"], "checker-silenciado"],
    ["eslint-disable", "src/a.ts", ["+// eslint-disable-next-line"], "checker-silenciado"],
    ["biome-ignore", "src/a.ts", ["+// biome-ignore"], "checker-silenciado"],
    ["# noqa", "src/a.py", ["+valor = f()  # noqa"], "checker-silenciado"],
    ["# type: ignore", "src/a.py", ["+valor = f()  # type: ignore"], "checker-silenciado"],
    ["istanbul ignore", "src/a.ts", ["+/* istanbul ignore next */"], "checker-silenciado"],
    ["nosemgrep", "src/a.ts", ["+exec(cmd); // nosemgrep"], "checker-silenciado"],
    ["gitleaks:allow", "src/a.ts", ['+const k = "x"; // gitleaks:allow'], "checker-silenciado"],
    ["@SuppressWarnings", "src/A.java", ['+  @SuppressWarnings("unchecked")'], "checker-silenciado"],

    // ---- TESTS_SALTADOS ----
    ["it.skip", "src/a.test.ts", ["+it.skip('x', () => {});"], "test-mas-facil"],
    ["describe.todo", "src/a.test.ts", ["+describe.todo('x');"], "test-mas-facil"],
    ["xit", "src/a.test.ts", ["+xit('x', () => {});"], "test-mas-facil"],
    ["xdescribe", "src/a.test.ts", ["+xdescribe('x', () => {});"], "test-mas-facil"],
    ["@pytest.mark.skip", "tests/test_a.py", ["+@pytest.mark.skip"], "test-mas-facil"],
    ["t.Skip()", "a_test.go", ["+  t.Skip()"], "test-mas-facil"],
    ["t.SkipNow()", "a_test.go", ["+  t.SkipNow()"], "test-mas-facil"],

    // ---- SIN_TERMINAR y PENDIENTE ----
    ["not implemented", "src/a.ts", ['+  throw new Error("not implemented");'], "trabajo-sin-terminar"],
    ["NotImplementedError", "src/a.py", ["+    raise NotImplementedError"], "trabajo-sin-terminar"],
    ["catch vacío", "src/a.ts", ["+try { f(); } catch {}"], "trabajo-sin-terminar"],
    ["TODO", "src/a.ts", ["+// TODO: validar el importe"], "trabajo-sin-terminar"],
    ["FIXME", "src/a.ts", ["+// FIXME: esto se rompe con cero"], "trabajo-sin-terminar"],

    // ---- UMBRALES (solo cuentan en ficheros de puerta) ----
    ["coverage", ".github/workflows/ci.yml", ["+      coverage: 10"], "umbral-movido"],
    ["threshold", ".github/workflows/ci.yml", ["+      threshold: 10"], "umbral-movido"],
    ["severity", ".github/workflows/ci.yml", ["+      severity: low"], "umbral-movido"],
    ["max-warnings", ".github/workflows/ci.yml", ["+      max-warnings: 99"], "umbral-movido"],
    ["continue-on-error", ".github/workflows/ci.yml", ["+      continue-on-error: true"], "umbral-movido"],

    // ---- esPuerta: cada ruta reconocida como puerta ----
    ["puerta: workflow", ".github/workflows/x.yml", ["+  coverage: 1"], "umbral-movido"],
    ["puerta: vitest.config", "vitest.config.ts", ["+  coverage: 1"], "umbral-movido"],
    ["puerta: eslint.config", "eslint.config.js", ["+  severity: 1"], "umbral-movido"],
    ["puerta: .eslintrc", ".eslintrc.json", ["+  severity: 1"], "umbral-movido"],
    ["puerta: tsconfig", "tsconfig.json", ["+  coverage: 1"], "umbral-movido"],
    ["puerta: package.json", "package.json", ["+  coverage: 1"], "umbral-movido"],
    ["puerta: pyproject", "pyproject.toml", ["+  coverage = 1"], "umbral-movido"],

    // ---- ASERCIONES borradas (exigen que el fichero sea de test) ----
    ["expect borrado", "src/a.test.ts", ["-  expect(x).toBe(1);", CTX], "test-mas-facil"],
    ["assert borrado", "tests/test_a.py", ["-    assert x == 1", CTX], "test-mas-facil"],
    ["should borrado", "src/a.test.ts", ["-  x.should.equal(1);", CTX], "test-mas-facil"],

    // ---- esTest: cada ruta reconocida como fichero de test ----
    ["test: .test.", "src/a.test.ts", ["-  expect(x).toBe(1);", CTX], "test-mas-facil"],
    ["test: .spec.", "src/a.spec.ts", ["-  expect(x).toBe(1);", CTX], "test-mas-facil"],
    ["test: __tests__/", "src/__tests__/a.ts", ["-  expect(x).toBe(1);", CTX], "test-mas-facil"],
    ["test: tests/", "tests/a.js", ["-  expect(x).toBe(1);", CTX], "test-mas-facil"],
    ["test: test_*.py", "test_a.py", ["-    assert x == 1", CTX], "test-mas-facil"],
    ["test: *_test.go", "a_test.go", ["-  assert(x)", CTX], "test-mas-facil"],

    // ---- declaraTest: qué borrado cuenta como test que se fue ----
    ["declara: it(", "src/a.test.ts", ["-it('x', () => {});"], "test-desaparecido"],
    ["declara: def test_", "tests/test_a.py", ["-def test_x():"], "test-desaparecido"],
    ["declara: func Test", "a_test.go", ["-func TestX(t *testing.T) {"], "test-desaparecido"],

    // ---- SENALES: migraciones (ruta y contenido) ----
    ["mig: migrations/", "migrations/001.sql", ["+valor = 1;"], "guia:migraciones-de-datos"],
    ["mig: db/migrate/", "db/migrate/001.sql", ["+valor = 1;"], "guia:migraciones-de-datos"],
    ["mig: alembic", "alembic/versions/a.py", ["+valor = 1"], "guia:migraciones-de-datos"],
    ["mig: prisma/schema", "prisma/schema.prisma", ["+model X {}"], "guia:migraciones-de-datos"],
    ["mig: flyway V1__", "sql/V1__init.sql", ["+valor = 1;"], "guia:migraciones-de-datos"],
    ["mig: ALTER TABLE", "src/a.ts", ["+run(`ALTER TABLE x ADD COLUMN y TEXT`);"], "guia:migraciones-de-datos"],
    ["mig: CREATE TABLE", "src/a.ts", ["+run(`CREATE TABLE x (id INT)`);"], "guia:migraciones-de-datos"],
    ["mig: DROP COLUMN", "src/a.ts", ["+run(`ALTER TABLE x DROP COLUMN y`);"], "guia:migraciones-de-datos"],

    // ---- SENALES: consultas ----
    ["sql: SELECT/FROM", "src/a.ts", ["+const q = `SELECT a FROM b`;"], "guia:consultas-correctas"],
    ["sql: LEFT JOIN", "src/a.ts", ["+const q = `LEFT JOIN c ON c.id = b.id`;"], "guia:consultas-correctas"],
    ["sql: JOIN … ON", "src/a.ts", ["+const q = `JOIN clientes ON clientes.id = p.id`;"], "guia:consultas-correctas"],
    ["sql: GROUP BY", "src/a.ts", ["+const q = `GROUP BY a`;"], "guia:consultas-correctas"],
    ["sql: db.query(", "src/a.ts", ["+const r = await db.query(sql);"], "guia:consultas-correctas"],
    ["sql: prisma", "src/a.ts", ["+const r = await prisma.user.findMany();"], "guia:consultas-correctas"],
    ["sql: supabase", "src/a.ts", ["+const r = supabase.from('t');"], "guia:consultas-correctas"],
    ["sql: knex", "src/a.ts", ["+const r = knex('t');"], "guia:consultas-correctas"],

    // ---- SENALES: llamadas a modelos ----
    ["llm: @anthropic-ai/", "src/a.ts", ['+import A from "@anthropic-ai/sdk";'], "guia:llamadas-a-modelos"],
    ["llm: openai", "src/a.ts", ['+import O from "openai";'], "guia:llamadas-a-modelos"],
    ["llm: messages.create", "src/a.ts", ["+const r = await c.messages.create({});"], "guia:llamadas-a-modelos"],
    ["llm: chat.completions", "src/a.ts", ["+const r = await c.chat.completions.create({});"], "guia:llamadas-a-modelos"],
    ["llm: generateText", "src/a.ts", ["+const r = await generateText({});"], "guia:llamadas-a-modelos"],
    ["llm: langchain", "src/a.ts", ['+import { X } from "langchain/core";'], "guia:llamadas-a-modelos"],
    ["llm: id de modelo", "src/a.ts", ['+const m = "claude-opus-5";'], "guia:llamadas-a-modelos"],

    // ---- SENALES: UI ----
    ["ui: .tsx", "src/A.tsx", ["+export const A = 1;"], "guia:usabilidad-accesibilidad"],
    ["ui: components/", "src/components/a.ts", ["+export const A = 1;"], "guia:usabilidad-accesibilidad"],
    ["ui: .html", "public/index.html", ["+<p>hola</p>"], "guia:usabilidad-accesibilidad"],
    ["ui: sitemap", "app/sitemap.xml", ["+<url/>"], "guia:usabilidad-accesibilidad"],
  ];

  let cubiertos = 0;
  for (const [que, fichero, lineas, espera] of CATALOGO) {
    const { json } = escanear("catálogo: " + que, diff(fichero, lineas.join("\n")));
    if (espera.startsWith("guia:")) {
      const guia = espera.slice(5);
      assert(
        guias(json).includes(guia),
        `catálogo «${que}»: debe señalar la guía ${guia} — actual: ${guias(json)}`
      );
    } else {
      assert(
        tiene(json, espera),
        `catálogo «${que}»: debe producir ${espera} — actual: ${
          json ? (json.movimientos || []).map((m) => m.movimiento) : "sin JSON"
        }`
      );
    }
    cubiertos++;
  }
  assert(cubiertos === CATALOGO.length, "todas las filas del catálogo se ejecutaron");
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
  console.error(`✗ ${fallos.length}/${total} aserción(es) del suelo de calidad fallaron:`);
  for (const f of fallos) console.error("  - " + f);
  console.error("");
  console.error("  Un patrón que no casa no casca: devuelve cero hallazgos, que es");
  console.error("  indistinguible de un diff limpio. Y uno que casa de más se acaba");
  console.error("  desactivando. Arregla el escaneo, no la aserción.");
  process.exit(1);
}

console.log(`✓ ${total} aserciones del suelo de calidad OK (5 movimientos con sus dos lados, un diff real de git y el catálogo de patrones entero).`);
