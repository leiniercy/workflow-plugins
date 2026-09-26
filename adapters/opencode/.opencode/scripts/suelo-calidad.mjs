#!/usr/bin/env node
/**
 * suelo-calidad.mjs — las cinco formas de aflojar la barra, buscadas sobre el paquete
 * de revisión. Determinista, sin modelo, sin red.
 *
 *   node suelo-calidad.mjs <ruta-del-diff>
 *   → JSON por stdout. Código 0 siempre que el diff se pueda leer; 2 si no.
 *
 * Lo usa la Fase 2 de `/review` antes de repartir dimensiones: un agente que topa con un
 * check en rojo no inventa una laguna ingeniosa, coge el camino más barato al verde, y
 * esos atajos se ven en el propio diff.
 *
 * ── Por qué es un script y no prosa ────────────────────────────────────────────
 *
 * Esto era una tabla que el agente traducía a llamadas de `Grep` sobre la marcha. Cada
 * ejecución construía sus propias expresiones, así que dos revisiones del mismo diff
 * podían no coincidir, y nada podía verificar que `# type: ignore` se detectara de
 * verdad: **un patrón que no casa no casca**, devuelve cero hallazgos, y eso es
 * indistinguible de un diff limpio. Aquí los patrones están fijos y `check-suelo.mjs`
 * los prueba en positivo y en negativo.
 *
 * ── La regla transversal ───────────────────────────────────────────────────────
 *
 * **Apretar el listón es silencioso; aflojarlo es ruidoso.** Un diff que AÑADE
 * aserciones o QUITA supresiones sube la barra: no se reporta nada. Por eso casi todo se
 * busca en las líneas añadidas (`+`), y solo la aserción desaparecida se busca en las
 * borradas (`-`).
 *
 * ── Lo que NO cubre, y conviene saberlo antes de fiarse ────────────────────────
 *
 * - **El motivo de una supresión se juzga por heurística.** Se considera que una
 *   supresión lleva motivo si después de la directiva quedan tres o más palabras de
 *   prosa. Un motivo telegráfico («// @ts-ignore bug lib») puede contarse como mudo, y
 *   una ristra de identificadores larga puede colar como motivo. Se prefiere el primer
 *   error: reportar de más se resuelve en la Fase 4; reportar de menos no se resuelve.
 * - **Un umbral movido en una línea sin ninguna de las cinco palabras no se detecta**
 *   (`lines: 80` → `lines: 40`). Por eso se devuelve además `puertasTocadas`: los
 *   ficheros de puerta que el diff toca, para que el revisor los mire aunque el patrón
 *   no diera nada.
 * - **No entiende el lenguaje, solo la forma.** Tres filtros separan usar un patrón de
 *   hablar de él: no mira ficheros de prosa ni bloques `/** … *\/`, exige que una
 *   directiva esté escrita como comentario, y descarta lo que está dentro de un literal
 *   de cadena. Los tres salieron de pasar el escaneo sobre diffs reales de este mismo
 *   repo —ocho hallazgos el primer día, treinta el día que se añadió el catálogo, todos
 *   ruido— y están medidos: sobre un diff de 10.746 líneas de una aplicación Next.js no
 *   quitan ni un verdadero positivo. Lo que queda fuera de su alcance es el sentido: un
 *   `catch {}` dentro de un comentario que explica otra cosa cuenta igual. Es un cable
 *   trampa sobre texto, no un analizador.
 *
 * Nada de lo que devuelve es un hallazgo todavía: son **candidatos** que pasan por la
 * misma disciplina de la guía `revision-hallazgos` que los demás.
 */
import { readFileSync } from "node:fs";

/** Dimensión de `/review` a la que va cada movimiento. */
const DIMENSION = {
  "checker-silenciado": 4,
  "test-mas-facil": 3,
  "trabajo-sin-terminar": 2,
  "umbral-movido": 4,
  "test-desaparecido": 3,
};

/** Techo de la cita literal. Una línea minificada no debe inundar la salida. */
const MAX_CITA = 200;

/** Directivas que silencian un checker. El orden no importa: gana la primera que casa. */
const SUPRESIONES = [
  /@ts-ignore/,
  /@ts-nocheck/,
  /eslint-disable/,
  /biome-ignore/,
  /#\s*noqa/,
  /#\s*type:\s*ignore/,
  /istanbul\s+ignore/,
  /nosemgrep/,
  /gitleaks:\s*allow/,
  /@SuppressWarnings/,
];

/** Formas de saltarse un test. */
const TESTS_SALTADOS = [
  /\b(?:it|test|describe)\s*\.\s*(?:skip|todo)\b/,
  /\bx(?:it|describe)\s*\(/,
  /@pytest\.mark\.skip/,
  /\bt\.Skip(?:Now)?\s*\(/,
  /\bt\.Skip\b/,
];

/** Trabajo que se dejó a medias y no levanta ningún error. Formas de código. */
const SIN_TERMINAR = [
  /throw\s+new\s+\w*Error\s*\(\s*["'`][^"'`]*not\s+implemented/i,
  /\bNotImplementedError\b/,
  /\bcatch\s*(?:\([^)]*\))?\s*\{\s*\}/,
];

/** La marca de trabajo pendiente vive en un comentario, por definición. */
const PENDIENTE = /\b(?:TODO|FIXME)\b/;

/** Palabras que, en un fichero de puerta, marcan que el listón se movió. */
const UMBRALES = [/coverage/i, /threshold/i, /severity/i, /max-warnings/i, /continue-on-error/i];

/** Aserciones cuya desaparición de un test lo deja pasando por nada. */
const ASERCIONES = /\b(?:expect|assert|should)\b/;

/**
 * Guías que la Fase 3 de `/review` carga bajo condición, y cómo se ve esa condición en
 * el diff. Cada entrada mira la RUTA del fichero, el CONTENIDO de sus líneas añadidas, o
 * ambas cosas.
 *
 * Esto sustituye a un «si el diff trae migraciones…» que evaluaba el modelo leyendo el
 * diff. El cambio pesa en las dos direcciones: la guía que no se carga cuando tocaba es
 * un hallazgo de severidad Alta que no se levanta, y la dimensión 6 despachada de más es
 * un subagente pagado para decir que no aplica.
 *
 * Son PISTAS con su evidencia, no veredictos: el revisor abre los ficheros y juzga.
 */
const SENALES = {
  "migraciones-de-datos": {
    ruta: [
      /(?:^|\/)(?:migrations?|migrate)\//i,
      /(?:^|\/)db\/migrate\//i,
      /(?:^|\/)alembic\/versions\//i,
      /(?:^|\/)prisma\/(?:migrations\/|schema\.prisma$)/i,
      /(?:^|\/)V\d+__.*\.sql$/,
    ],
    contenido: [/\bALTER\s+TABLE\b/i, /\bCREATE\s+TABLE\b/i, /\bDROP\s+(?:TABLE|COLUMN)\b/i],
  },
  "consultas-correctas": {
    contenido: [
      /\bSELECT\b[\s\S]*\bFROM\b/i,
      // El JOIN exige cualificador (`LEFT JOIN`) o su `ON` detrás. Sin eso, `\bJOIN\b`
      // casa con `array.join("\n")` — la línea más común de JavaScript que existe — y
      // señalaba como consulta a base de datos cualquier script del propio plugin.
      /\b(?:INNER|LEFT|RIGHT|FULL|OUTER|CROSS|NATURAL)\s+(?:OUTER\s+)?JOIN\b/i,
      /\bJOIN\s+[\w".`[\]]+\s+ON\b/i,
      /\bGROUP\s+BY\b/i,
      /\b(?:db|conn|client|pool)\s*\.\s*(?:query|execute)\s*\(/,
      /\bprisma\s*\.\s*\w+\s*\.\s*(?:findMany|findFirst|aggregate|groupBy)\b/,
      /\bsupabase\s*\.\s*from\s*\(/,
      /\bknex\s*\(/,
    ],
  },
  "llamadas-a-modelos": {
    contenido: [
      /@anthropic-ai\//,
      /\bfrom\s+["']openai["']/,
      /\bmessages\s*\.\s*create\s*\(/,
      /\bchat\s*\.\s*completions\s*\.\s*create\s*\(/,
      /\bgenerate(?:Text|Object)\s*\(/,
      /\blangchain\b/i,
      /\bclaude-[a-z0-9-]+\b/,
    ],
  },
  "usabilidad-accesibilidad": {
    ruta: [
      /\.(?:tsx|jsx|vue|svelte|astro)$/,
      /(?:^|\/)(?:components?|views?|pages?|templates?)\//i,
      /\.(?:html|hbs|ejs|erb)$/,
      /(?:^|\/)(?:sitemap|robots)\.[a-z.]+$/i,
    ],
  },
};

/**
 * ¿El fichero es prosa? Documentación, changelogs y plantillas NOMBRAN las directivas
 * para explicarlas; no las aplican. Se descubrió pasando el escaneo sobre un diff real
 * de este repo: devolvió ocho hallazgos y los ocho eran documentación hablando de sí
 * misma. `umbral-movido` y `test-desaparecido` no se filtran aquí — sus ficheros son de
 * configuración y de test, nunca prosa.
 */
function esProsa(ruta) {
  return /\.(?:md|mdx|markdown|txt|rst|adoc)$/i.test(ruta);
}

/**
 * ¿La línea es la continuación de un bloque `/** … *\/`?
 *
 * La cabecera de un fichero de código es prosa igual que un `.md`: explica qué hace el
 * código, y para explicarlo nombra las directivas. Salió revisando este mismo trabajo —
 * la cabecera de este fichero, que enumera lo que busca, se señalaba a sí misma.
 *
 * Solo las líneas de CONTINUACIÓN (`* …`, `*\/`). La apertura `/* eslint-disable *\/`
 * empieza por `/` y sigue contando: esa sí es una supresión de verdad.
 */
function esDocDeBloque(texto) {
  return /^[+-]?\s*\*/.test(texto);
}

/**
 * ¿El fragmento anterior a la coincidencia abre un comentario?
 *
 * Una supresión es un comentario: `// @ts-ignore`, `# noqa`. La misma palabra dentro de
 * una cadena o de una expresión regular es código que BUSCA supresiones —un linter, un
 * test, este mismo escaneo— y no silencia nada. Distinguirlo cuesta una comprobación y
 * quita la mitad del ruido.
 *
 * `@SuppressWarnings` queda exento: es una anotación de Java, no un comentario.
 */
/**
 * ¿La coincidencia está dentro de un literal de cadena?
 *
 * El último reducto de ruido, y el más terco: el código que HABLA de patrones los lleva
 * como datos. Un linter, un generador, la fixture de un test, esta misma tabla. Sobre la
 * rama que añadió el catálogo de `check-suelo.mjs`, los 30 movimientos que salían eran
 * todos filas de esa tabla.
 *
 * Se cuentan comillas sin escapar antes de la coincidencia: número impar = dentro.
 *
 * El apóstrofo es el caso delicado. En prosa inglesa es una contracción, no un
 * delimitador, y contándolo siempre se perdía `// can't fix this upstream, @ts-ignore`
 * — un falso negativo silencioso, que es el error caro de los dos. Por eso solo cuenta
 * cuando la línea lo usa como delimitador de verdad, es decir, cuando hay dos o más.
 *
 * Medido antes de adoptarlo: 30 → 0 movimientos en la rama que lo motivó, y 0 → 0 en un
 * diff real de 10.746 líneas de una aplicación Next.js, donde no se perdió nada.
 */
function enCadena(linea, indice) {
  const antes = linea.slice(0, indice).replace(/\\./g, "");
  const dobles = (antes.match(/"/g) || []).length;
  const plantillas = (antes.match(/`/g) || []).length;
  const apostrofosLinea = (linea.match(/'/g) || []).length;
  const simples = apostrofosLinea >= 2 ? (antes.match(/'/g) || []).length : 0;
  return dobles % 2 === 1 || plantillas % 2 === 1 || simples % 2 === 1;
}

function enComentario(linea, indice, coincidencia) {
  // Se incluye la propia coincidencia porque en `# noqa` y `# type: ignore` el marcador
  // de comentario forma parte de la directiva: mirando solo lo anterior se perderían.
  const hasta = linea.slice(0, indice) + (coincidencia || "");
  return /\/\/|\/\*|#|<!--|--|;;/.test(hasta);
}

/** ¿El fichero contiene tests? */
function esTest(ruta) {
  return (
    /\.(?:test|spec)\.[A-Za-z0-9]+$/.test(ruta) ||
    /(?:^|\/)__tests__\//.test(ruta) ||
    /(?:^|\/)tests?\//.test(ruta) ||
    /(?:^|\/)test_[^/]+\.py$/.test(ruta) ||
    /_test\.(?:go|py|rb)$/.test(ruta)
  );
}

/**
 * ¿El fichero es una puerta de calidad? Son los que deciden si algo pasa o no:
 * workflows de CI, configuración de lint/tipos/tests y el manifiesto con sus scripts.
 */
function esPuerta(ruta) {
  return (
    /(?:^|\/)\.github\/workflows\//.test(ruta) ||
    /(?:^|\/)(?:vitest|jest|vite|playwright|cypress|karma)\.config\.[cm]?[jt]s$/.test(ruta) ||
    /(?:^|\/)(?:eslint|biome)\.config\.[cm]?[jt]s$/.test(ruta) ||
    /(?:^|\/)\.eslintrc(?:\.[a-z]+)?$/.test(ruta) ||
    /(?:^|\/)(?:tsconfig|biome|codecov|sonar-project|\.pre-commit-config)\.[a-z]+$/.test(ruta) ||
    /(?:^|\/)(?:pyproject\.toml|setup\.cfg|tox\.ini|Makefile|package\.json)$/.test(ruta)
  );
}

/**
 * ¿La supresión lleva su motivo escrito al lado?
 *
 * Una supresión con motivo es una decisión declarada, no un atajo: no se reporta. La que
 * aparece muda, sí. Se cuentan las palabras de prosa que quedan tras la directiva,
 * descartando lo que parece identificador (guiones, barras, dígitos) porque el nombre de
 * la regla silenciada no es una explicación.
 */
function llevaMotivo(linea, indiceFinDirectiva) {
  const resto = linea.slice(indiceFinDirectiva);
  const palabras = (resto.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ][\wÀ-ſ-]*/g) || []).filter(
    (p) => p.length >= 3 && !/[-_/\d]/.test(p)
  );
  return palabras.length >= 3;
}

/** Recorta una línea de diff para citarla: sin el marcador, sin sangría, acotada. */
function cita(linea) {
  return linea.slice(1).trim().slice(0, MAX_CITA);
}

/**
 * Trocea un diff unificado en ficheros con sus líneas numeradas.
 *
 * Devuelve `[{ ruta, lineas: [{ marca, texto, nueva, vieja }], añadidas, borradas }]`.
 * `nueva`/`vieja` son el número de línea en cada lado; el que no aplica va a null.
 *
 * **Lleva estado de «dentro de hunk», y eso no es un detalle.** Sin él, una línea BORRADA
 * cuyo contenido empieza por `-- ` —el comentario de SQL, Lua o Haskell— se renderiza en
 * el diff como `--- comentario` y es indistinguible de una cabecera de fichero. El parser
 * la tomaba por tal, abría un fichero fantasma que nunca se registraba, y **el resto del
 * fichero desaparecía del escaneo**: cero movimientos, que es exactamente lo que devuelve
 * un fichero limpio. Ocurría justo en los `.sql`, que es donde este script tiene que
 * señalar `migraciones-de-datos`. El gemelo por el otro lado es una línea AÑADIDA que
 * empieza por `++ `, que queda `+++ …` y duplicaba el fichero.
 *
 * Lo encontraron tres revisores a la vez y se reprodujo con `git diff -U10` de verdad.
 * Los casos sintéticos de entonces no lo veían porque fabricaban la cabecera a mano; por
 * eso `check-suelo.mjs` monta ahora un repo git real.
 *
 * La regla: `---` y `+++` solo son cabecera FUERA de un hunk. Se entra en hunk con `@@` y
 * se sale con el `diff --git` del fichero siguiente.
 */
function parsear(diff) {
  const ficheros = [];
  let actual = null;
  let nueva = 0;
  let vieja = 0;
  let enHunk = false;

  for (const texto of diff.split(/\r?\n/)) {
    if (texto.startsWith("diff --git ")) {
      actual = null;
      enHunk = false;
      continue;
    }
    if (!enHunk && texto.startsWith("--- ")) {
      // Se guarda por si el fichero se borró entero y el lado nuevo es /dev/null.
      const r = texto.slice(4).replace(/^a\//, "").trim();
      actual = { ruta: r === "/dev/null" ? null : r, lineas: [], añadidas: 0, borradas: 0 };
      continue;
    }
    if (!enHunk && texto.startsWith("+++ ")) {
      const r = texto.slice(4).replace(/^b\//, "").trim();
      if (!actual) actual = { ruta: null, lineas: [], añadidas: 0, borradas: 0 };
      if (r !== "/dev/null") actual.ruta = r;
      if (actual.ruta) ficheros.push(actual);
      continue;
    }
    if (!actual || !actual.ruta) continue;

    const hunk = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(texto);
    if (hunk) {
      vieja = Number(hunk[1]);
      nueva = Number(hunk[2]);
      enHunk = true;
      continue;
    }
    if (texto.startsWith("+")) {
      actual.lineas.push({ marca: "+", texto, nueva, vieja: null });
      actual.añadidas++;
      nueva++;
    } else if (texto.startsWith("-")) {
      actual.lineas.push({ marca: "-", texto, nueva: null, vieja });
      actual.borradas++;
      vieja++;
    } else if (texto.startsWith(" ")) {
      actual.lineas.push({ marca: " ", texto, nueva, vieja });
      nueva++;
      vieja++;
    }
  }
  return ficheros;
}

function escanear(diff) {
  const movimientos = [];
  const puertasTocadas = [];
  const guiasAplicables = {};

  const senalar = (guia, fichero) => {
    if (!guiasAplicables[guia]) guiasAplicables[guia] = [];
    if (!guiasAplicables[guia].includes(fichero)) guiasAplicables[guia].push(fichero);
  };

  const añadir = (movimiento, fichero, linea, texto) => {
    movimientos.push({
      movimiento,
      dimension: DIMENSION[movimiento],
      fichero,
      linea,
      cita: cita(texto),
    });
  };

  for (const f of parsear(diff)) {
    const puerta = esPuerta(f.ruta);
    const test = esTest(f.ruta);
    const prosa = esProsa(f.ruta);
    if (puerta) puertasTocadas.push(f.ruta);

    // La prosa que DESCRIBE una consulta o una llamada a un modelo no es ninguna de las
    // dos: mismo filtro que el de los movimientos, por el mismo motivo.
    if (!prosa) {
      for (const [guia, reglas] of Object.entries(SENALES)) {
        if ((reglas.ruta || []).some((re) => re.test(f.ruta))) {
          senalar(guia, f.ruta);
          continue;
        }
        const hit = f.lineas.find(
          (l) => l.marca === "+" && (reglas.contenido || []).some((re) => re.test(l.texto))
        );
        if (hit) senalar(guia, f.ruta);
      }
    }

    // Un test que se fue y una aserción que se fue son dos movimientos distintos, y sin
    // frontera el mismo diff dispara los dos: «solo borrados» a secas también describe
    // un `expect` quitado de un test que se queda. La frontera es qué se borró — si lo
    // que desaparece es la DECLARACIÓN del test, el test ya no está; si solo desaparece
    // su aserción, el test sigue ahí y ahora pasa por nada.
    const declaraTest = (t) =>
      /\b(?:it|test|describe|context)\s*\(/.test(t) ||
      /\bdef\s+test_\w+/.test(t) ||
      /\bfunc\s+Test\w+/.test(t);
    const desaparecido =
      test && f.añadidas === 0 && f.lineas.some((l) => l.marca === "-" && declaraTest(l.texto));
    if (desaparecido) {
      const primera = f.lineas.find((l) => l.marca === "-" && declaraTest(l.texto));
      añadir("test-desaparecido", f.ruta, primera.vieja, primera.texto);
    }

    for (const l of f.lineas) {
      if (l.marca === "+") {
        if (!prosa && !esDocDeBloque(l.texto)) {
          const sup = SUPRESIONES.find((re) => re.test(l.texto));
          if (sup) {
            const m = sup.exec(l.texto);
            // La exención es para la anotación de Java, que abre la línea. Sin este
            // anclaje disparaba con la palabra dentro de una regex o una cadena.
            const esAnotacion =
              /@SuppressWarnings/.test(m[0]) && /^[+-]?\s*@SuppressWarnings/.test(l.texto);
            if (
              !enCadena(l.texto, m.index) &&
              (esAnotacion || enComentario(l.texto, m.index, m[0])) &&
              !llevaMotivo(l.texto, m.index + m[0].length)
            ) {
              añadir("checker-silenciado", f.ruta, l.nueva, l.texto);
              continue;
            }
          }
          const salto = TESTS_SALTADOS.map((re) => re.exec(l.texto)).find(Boolean);
          if (salto && !enCadena(l.texto, salto.index)) {
            añadir("test-mas-facil", f.ruta, l.nueva, l.texto);
            continue;
          }
          const medias = SIN_TERMINAR.map((re) => re.exec(l.texto)).find(Boolean);
          if (medias && !enCadena(l.texto, medias.index)) {
            añadir("trabajo-sin-terminar", f.ruta, l.nueva, l.texto);
            continue;
          }
          const pend = PENDIENTE.exec(l.texto);
          if (pend && !enCadena(l.texto, pend.index) && enComentario(l.texto, pend.index, pend[0])) {
            añadir("trabajo-sin-terminar", f.ruta, l.nueva, l.texto);
            continue;
          }
        }
        if (puerta && UMBRALES.some((re) => re.test(l.texto))) {
          añadir("umbral-movido", f.ruta, l.nueva, l.texto);
        }
      } else if (l.marca === "-") {
        // Una aserción que desaparece de un test que se queda deja el test pasando por
        // nada. Si el test entero se fue, ya lo dice `test-desaparecido`.
        if (test && !prosa && !desaparecido && ASERCIONES.test(l.texto)) {
          añadir("test-mas-facil", f.ruta, l.vieja, l.texto);
          continue;
        }
        if (puerta && UMBRALES.some((re) => re.test(l.texto))) {
          añadir("umbral-movido", f.ruta, l.vieja, l.texto);
        }
      }
    }
  }

  const porMovimiento = {};
  for (const m of movimientos) {
    porMovimiento[m.movimiento] = (porMovimiento[m.movimiento] || 0) + 1;
  }
  return {
    movimientos,
    puertasTocadas: [...new Set(puertasTocadas)],
    guiasAplicables,
    // Aparte porque no es una guia mas: es el gate que decide si se despacha el subagente
    // de la dimension 6 o si se declara no aplicable en una linea.
    tocaUI: Boolean(guiasAplicables["usabilidad-accesibilidad"]),
    resumen: { total: movimientos.length, porMovimiento },
  };
}

const ruta = process.argv[2];
if (!ruta) {
  process.stderr.write("Uso: node suelo-calidad.mjs <ruta-del-diff>\n");
  process.exit(2);
}
let contenido;
try {
  contenido = readFileSync(ruta, "utf8");
} catch {
  process.stderr.write("No se puede leer el paquete de revisión: " + ruta + "\n");
  process.exit(2);
}
process.stdout.write(JSON.stringify(escanear(contenido), null, 2) + "\n");
