/**
 * ¿El último commit consta en el historial de `progress.md`?
 *
 * Dos hooks hacen la misma pregunta en momentos distintos: `post-commit-progress.js`
 * justo después del commit, y `session-context.js` al abrir la siguiente sesión. La
 * respuesta vive aquí para que no puedan discrepar — el margen de VENTANA_MIN es
 * ajustable, y tenerlo escrito dos veces significa que algún día valdrá dos cosas y el
 * usuario recibirá dos señales contradictorias sobre el mismo commit.
 *
 * Funciones puras a propósito: cada hook hace su propia llamada a git con su propio
 * runner, y aquí solo entra texto. Nada que ejecutar, nada que escribir — el invariante
 * de `check-hygiene.mjs` se cumple por construcción.
 */

/**
 * Margen entre la última entrada del historial y el commit, en minutos.
 *
 * En el camino feliz el agente escribe la entrada y commitea acto seguido, así que la
 * entrada queda unos segundos MÁS ANTIGUA que el commit. Exigir que el historial sea más
 * nuevo que HEAD haría saltar el aviso siempre, incluso cuando el flujo se cumplió, y un
 * aviso que salta siempre se deja de leer: el mismo destino que la guía
 * `registro-progreso` describe para el «Bloqueo fantasma».
 *
 * Coste de equivocarse, por si hay que ajustarlo: pasarse de corto produce ruido en cada
 * commit; quedarse largo deja pasar el commit que llega justo después del registro
 * anterior. Preferimos lo segundo — es un recordatorio, no una puerta.
 */
const VENTANA_MIN = 15;

/** Techo del asunto inyectado. Lo escribe quien commitea; esto entra en el contexto. */
const MAX_ASUNTO = 80;

/**
 * Fecha de la entrada más reciente del historial, o null si no hay ninguna.
 *
 * Se coge el máximo y no la última en orden de aparición: el historial es append-only
 * por convención, pero un fichero editado a mano puede quedar desordenado, y ahí el
 * máximo es la lectura conservadora — la que menos avisa.
 */
function ultimaEntrada(md) {
  const re = /^###\s+(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/gm;
  let mejor = null;
  let m;
  while ((m = re.exec(md)) !== null) {
    const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
    if (!isNaN(d) && (mejor === null || d > mejor)) mejor = d;
  }
  return mejor;
}

/**
 * Devuelve `{ hash, asunto, sinHistorial }` si el commit no consta, o null si consta
 * (o si no hay commit del que hablar).
 *
 * @param headLine salida de `git log -1 --format=%h%x00%ct%x00%s`, o null si falla.
 * @param progressMd contenido de `progress.md`.
 */
function commitSinRegistrar(headLine, progressMd) {
  if (!headLine) return null;
  const [hash, ct, asuntoCrudo] = String(headLine).split("\0");
  const commitMs = Number(ct) * 1000;
  if (!hash || !isFinite(commitMs) || commitMs === 0) return null;

  const ultima = ultimaEntrada(String(progressMd || ""));
  if (ultima !== null && commitMs - ultima.getTime() <= VENTANA_MIN * 60000) return null;

  // El asunto lo escribe quien commitea y aquí entra en el contexto del agente: una sola
  // línea, acotada, y quien lo inyecte lo pone entre comillas para que se lea como dato
  // y no como instrucción.
  const asunto = String(asuntoCrudo || "")
    .split(/\r?\n/)[0]
    .slice(0, MAX_ASUNTO)
    .trim();

  return { hash, asunto, sinHistorial: ultima === null };
}

module.exports = { VENTANA_MIN, MAX_ASUNTO, ultimaEntrada, commitSinRegistrar };
