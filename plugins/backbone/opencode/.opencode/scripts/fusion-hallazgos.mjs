#!/usr/bin/env node
/**
 * fusion-hallazgos.mjs — junta lo que devuelven los subagentes revisores. Determinista.
 *
 *   node fusion-hallazgos.mjs <ruta.json>     # o los bloques por stdin
 *   → JSON por stdout. Código 0 si la entrada se pudo leer; 2 si no.
 *
 * Lo usa la Fase 4.1 de `/review`: deduplica lo que varias dimensiones señalan sobre la
 * misma línea, reaplica el umbral de confianza al conjunto, separa lo que la spec exige
 * y ordena por severidad.
 *
 * ── Por qué es un script y no prosa ────────────────────────────────────────────
 *
 * **No es por tokens.** Cuatro revisores no son sesenta y siete tandas; el ahorro sería
 * pequeño y no justificaría el cambio. Son otras dos cosas:
 *
 *   1. **Determinismo.** Comparar `fichero:línea` y un número contra 75 es trabajo
 *      mecánico. Hecho en prosa, dos síntesis del mismo material pueden no coincidir, y
 *      nadie lo nota porque no hay con qué comparar.
 *   2. **Trazabilidad.** Antes, un hallazgo que se caía en la síntesis se caía sin
 *      rastro: no se distinguía «no lo había» de «se perdió al juntar». Ahora todo lo
 *      que entra sale contado en `auditoria`, y `scripts/check-fusion.mjs` asevera esa
 *      ley de conservación.
 *
 * ── Lo que NO hace ─────────────────────────────────────────────────────────────
 *
 * - **No juzga.** No sube ni baja confianzas, no reescribe descripciones, no decide el
 *   veredicto. Eso es de la Fase 4.2 (el `verificador-hallazgos`, que refuta) y del
 *   orquestador (que redacta). Aquí solo se junta lo que otros afirmaron.
 * - **No resuelve los ⚠️ no verificables.** Los recoge y los pasa: resolverlos exige el
 *   contexto completo de la tarea, que tiene el orquestador y no tenía el revisor.
 * - **No inventa una cita.** Un hallazgo sin cita literal no se publica —regla de la
 *   guía `revision-hallazgos`—, pero se dice por qué se cayó en vez de desaparecer.
 *
 * Un bloque que no cumple el esquema **no tumba la síntesis**: se nombra en `errores` y
 * el resto sigue. Cuatro subagentes son cuatro oportunidades de derivar del formato, y
 * perder la revisión entera por una coma es peor que sintetizar ese bloque a mano.
 */
import { readFileSync } from "node:fs";

/** Umbral de publicación de la guía `revision-hallazgos`. */
const UMBRAL = 75;

/** Orden de severidad: lo que bloquea una PR va primero. */
const SEVERIDAD = { Crítico: 0, Critico: 0, Alto: 1, Medio: 2, Bajo: 3 };

function rangoSeveridad(s) {
  const r = SEVERIDAD[String(s || "").trim()];
  return r === undefined ? 4 : r;
}

/** Clave de identidad de un hallazgo: dos dimensiones sobre la misma línea son uno. */
function clave(h) {
  return String(h.fichero) + ":" + String(h.linea);
}

function fusionar(bloques) {
  const errores = [];
  const avisos = [];
  const porClave = new Map();
  const noVerificables = [];
  const bajaConfianza = [];
  const exigidoPorSpec = [];

  let recibidos = 0;
  let duplicadosFusionados = 0;
  let bajoUmbral = 0;
  let sinCita = 0;
  let omitidosPorLosRevisores = 0;
  const porDimension = {};

  for (const bloque of bloques) {
    const dim = (bloque && bloque.dimension) || "(sin dimensión)";
    if (!bloque || typeof bloque !== "object" || !Array.isArray(bloque.hallazgos)) {
      errores.push(
        `El bloque de "${dim}" no cumple el esquema (falta la lista \`hallazgos\`): ` +
          "sintetízalo a mano y dilo en el informe."
      );
      continue;
    }

    const omitidos = Number(bloque.omitidos) || 0;
    if (omitidos > 0) {
      omitidosPorLosRevisores += omitidos;
      avisos.push(
        `El revisor de "${dim}" recortó su lista por el tope y dejó fuera ${omitidos} ` +
          "hallazgo(s). La revisión de esa dimensión está incompleta: dilo en el informe."
      );
    }
    if (typeof bloque.bajaConfianza === "string" && bloque.bajaConfianza.trim()) {
      bajaConfianza.push({ dimension: dim, nota: bloque.bajaConfianza.trim() });
    }
    for (const nv of bloque.noVerificables || []) {
      noVerificables.push({ dimension: dim, ...nv });
    }

    for (const h of bloque.hallazgos) {
      recibidos++;
      porDimension[dim] = (porDimension[dim] || 0) + 1;
      const entrada = { dimension: dim, ...h };

      // Sin cita literal no se publica: un `fichero:línea` se escribe sin abrir nada.
      // Tiene casilla propia en la auditoría: contarlo como «bajo umbral» haría que el
      // informe dijera «descartado por confianza» de un revisor que no pegó citas.
      if (!String(h.cita || "").trim()) {
        errores.push(
          `Hallazgo descartado en ${clave(h)} ("${dim}"): sin cita literal de la línea ` +
            "que lo sostiene (regla de la guía `revision-hallazgos`)."
        );
        sinCita++;
        continue;
      }

      // El umbral se comprueba ANTES de apartar lo exigido por spec: si no, un hallazgo
      // con confianza 40 marcado por spec llegaba al informe saltándose el «solo ≥ 75».
      //
      // Y se exige un número de verdad. `Number("alta")` es NaN, y toda comparación con
      // NaN es false, así que el umbral **fallaba abierto**: una confianza ilegible se
      // publicaba como si hubiera pasado el filtro. La entrada la escriben cuatro
      // modelos, que es justo el motivo por el que este script existe.
      const confianza = Number(h.confianza);
      if (!Number.isFinite(confianza)) {
        errores.push(
          `Hallazgo descartado en ${clave(h)} ("${dim}"): confianza ilegible ` +
            `(${JSON.stringify(h.confianza)}); se esperaba un número 0-100.`
        );
        bajoUmbral++;
        continue;
      }
      if (confianza < UMBRAL) {
        bajoUmbral++;
        continue;
      }

      // Lo que la spec MANDA no es trabajo de corrección: es una decisión del usuario,
      // y va a su propio apartado en vez de mezclarse con los defectos.
      if (String(h.exigidoPorSpec || "").trim()) {
        exigidoPorSpec.push(entrada);
        continue;
      }

      const k = clave(h);
      const previo = porClave.get(k);
      if (!previo) {
        porClave.set(k, entrada);
        continue;
      }
      // Manda la SEVERIDAD, y solo a igualdad de severidad la confianza.
      //
      // El desempate era `confianza > previo.confianza`, y con dos revisores que dan la
      // misma confianza eso significa «gana el que llegó primero». Ocurrió de verdad:
      // el mismo bug llegó Medio/90 y Alto/90, y se publicó como Medio. Alto y Crítico
      // son lo que convierte el veredicto en «Cambios requeridos», así que degradarlos
      // no es un detalle de orden — es el antipatrón «señal fuerte degradada por
      // comodidad» que la guía `revision-hallazgos` nombra.
      //
      // Gana un hallazgo ENTERO, no una mezcla: la severidad, la confianza y la
      // descripción publicadas son las que escribió un mismo revisor, o el informe
      // afirmaría algo que nadie sostuvo.
      duplicadosFusionados++;
      const gana =
        rangoSeveridad(entrada.severidad) !== rangoSeveridad(previo.severidad)
          ? rangoSeveridad(entrada.severidad) < rangoSeveridad(previo.severidad)
            ? entrada
            : previo
          : Number(entrada.confianza) > Number(previo.confianza)
            ? entrada
            : previo;
      const pierde = gana === entrada ? previo : entrada;
      const tambien = new Set([...(gana.tambienSenaladoPor || []), ...(pierde.tambienSenaladoPor || [])]);
      if (pierde.dimension !== gana.dimension) tambien.add(pierde.dimension);
      porClave.set(k, { ...gana, tambienSenaladoPor: [...tambien] });
    }
  }

  const hallazgos = [...porClave.values()].sort(
    (a, b) =>
      rangoSeveridad(a.severidad) - rangoSeveridad(b.severidad) ||
      Number(b.confianza) - Number(a.confianza)
  );

  return {
    hallazgos,
    exigidoPorSpec,
    noVerificables,
    bajaConfianza,
    avisos,
    errores,
    auditoria: {
      recibidos,
      publicados: hallazgos.length,
      exigidosPorSpec: exigidoPorSpec.length,
      duplicadosFusionados,
      bajoUmbral,
      sinCita,
      omitidosPorLosRevisores,
      porDimension,
    },
  };
}

function leerEntrada() {
  const ruta = process.argv[2];
  if (ruta) return readFileSync(ruta, "utf8");
  return readFileSync(0, "utf8");
}

let crudo;
try {
  crudo = leerEntrada();
} catch {
  process.stderr.write(
    "No se pueden leer los bloques de hallazgos. Uso: node fusion-hallazgos.mjs <ruta.json> " +
      "(o los bloques por stdin)\n"
  );
  process.exit(2);
}

let bloques;
try {
  bloques = JSON.parse(crudo);
} catch {
  process.stderr.write("La entrada no es JSON válido: se esperaba una lista de bloques.\n");
  process.exit(2);
}
if (!Array.isArray(bloques)) {
  process.stderr.write("La entrada JSON debe ser una lista de bloques, uno por revisor.\n");
  process.exit(2);
}

process.stdout.write(JSON.stringify(fusionar(bloques), null, 2) + "\n");
