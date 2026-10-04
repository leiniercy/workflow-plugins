#!/usr/bin/env node
/**
 * siglas.mjs — avisa de las siglas que no se explican la primera vez que aparecen.
 *
 * Viaja dentro del plugin voice y lo ejecuta /deliver antes de pedir la firma. Es código y no
 * prosa porque «toda sigla explicada» es comprobable de forma determinista, y un agente que lo
 * comprueba a ojo se salta las que ya conoce: justo las que el lector de fuera no conoce.
 *
 * Lo que avisa lo decide el usuario: una marca o un código de producto no es una sigla. Para
 * eso, `<!-- siglas-ignorar: A, B -->` en el propio documento.
 *
 * Con --diapositivas, cada diapositiva (separada por `---` o por un encabezado `#` o `##`) se
 * revisa suelta, porque se proyecta suelta.
 *
 * Uso:    node siglas.mjs <fichero.md> [--diapositivas]
 * Salida: JSON en stdout. 0 sin avisos · 1 hay siglas sin explicar · 2 no se pudo leer.
 */
import { readFileSync } from "node:fs";

const [fichero, ...flags] = process.argv.slice(2);
const diapositivas = flags.includes("--diapositivas");
let texto;
try {
  texto = readFileSync(fichero, "utf8");
} catch (e) {
  console.error("siglas: no se pudo leer " + fichero + ": " + e.message);
  process.exit(2);
}

const ignoradas = new Set();
for (const m of texto.matchAll(/<!--\s*siglas-ignorar:\s*([^>]*?)\s*-->/g)) {
  for (const s of m[1].split(",")) ignoradas.add(s.trim().replace(/s$/, ""));
}

// Quita lo que no es prosa, conservando los saltos de línea para que los números de línea
// sigan siendo los del fichero.
function limpiar(t) {
  const blanco = (s) => s.replace(/[^\n]/g, " ");
  return t
    .replace(/```[\s\S]*?```/g, blanco)
    .replace(/<!--[\s\S]*?-->/g, blanco)
    .replace(/`[^`\n]*`/g, blanco)
    .replace(/https?:\/\/\S+/g, blanco);
}

// Límite de palabra Unicode: `\b` solo conoce letras ASCII y partiría «ÍNDICE» en «NDICE».
const ANTES = "(?<![\\p{L}\\p{N}])";
const DESPUES = "(?![\\p{L}\\p{N}])";
const SIGLA = new RegExp(`${ANTES}([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ0-9]+)(s?)${DESPUES}`, "gu");
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function explicadaEn(linea, sigla) {
  const s = esc(sigla);
  return new RegExp(`${ANTES}${s}s?${DESPUES}\\s*\\([^)]+\\)`, "u").test(linea) ||
    new RegExp(`\\S[^()]*\\(${s}s?\\)`, "u").test(linea);
}

function revisar(parte, lineaInicial, diapositiva) {
  const vistas = new Set();
  const avisos = [];
  parte.split("\n").forEach((linea, i) => {
    for (const m of linea.matchAll(SIGLA)) {
      const sigla = m[1];
      if (vistas.has(sigla) || ignoradas.has(sigla)) continue;
      vistas.add(sigla);
      if (!explicadaEn(linea, sigla)) {
        avisos.push({ sigla, linea: lineaInicial + i, diapositiva });
      }
    }
  });
  return avisos;
}

const limpio = limpiar(texto);
let sinExplicar;
if (diapositivas) {
  sinExplicar = [];
  // Una diapositiva empieza en una línea `---` o en un encabezado de nivel 1 o 2.
  let linea = 1;
  let n = 0;
  limpio.split(/^---$|^(?=#{1,2} )/m).forEach((parte) => {
    if (parte.trim()) sinExplicar.push(...revisar(parte, linea, ++n));
    linea += parte.split("\n").length - 1;
  });
} else {
  sinExplicar = revisar(limpio, 1, null);
}

console.log(JSON.stringify({ fichero, sinExplicar }, null, 2));
process.exit(sinExplicar.length ? 1 : 0);
