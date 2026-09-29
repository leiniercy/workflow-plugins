# ADR 0011 — El eval solo mide comportamientos de vocabulario estrecho, y el informe enseña el texto

**Status:** aceptada (sin publicar)

## Context

`scripts/lib/grader.mjs` corrige buscando **subcadenas** en la respuesta del modelo. Eso
funciona cuando la respuesta correcta se dice de pocas maneras, que es el caso de los ocho
casos que tenemos: «índice» en la clave foránea, «no pego el `.env`», «PNG en vez de SVG»,
«no lo borro sin comprobarlo». Hay un puñado de formas de acertar y todas comparten palabra.

El 2026-09-28/29 se intentó medir con este arnés un comportamiento que **no** es así:
descubrir que un ticket describe una solución en vez de un problema. Tres diseños distintos
del caso, tres corridas de `--baseline --runs 3`, y las tres veces el veredicto del informe
no se sostuvo al abrir las respuestas:

| Anclaje escrito | Lo que contestó el modelo | Resultado |
|---|---|---|
| `describen el boton` | «describen **el botón**» | Falla: la negrita parte la adyacencia |
| `que van a escribir` | «¿qué **va** a escribir la gente de sala?» | Falla: singular |
| `cajon de sastre` | La alergia no llega a cocina; art. 9 RGPD | Falla: argumentó mejor |
| `antes de anadir` | «antes de que lo des por fácil» | Falla |

El brazo **sin plugin** llegó a escribir «los criterios describen la solución, no la
necesidad» —el acierto exacto— y figuró como fallo. El informe cantó «hay delta» dos veces
sobre datos que decían lo contrario.

Dos alternativas miradas y descartadas:

- **Ensanchar las listas tras cada corrida.** Es perseguir el vocabulario del modelo y ajustar
  el corrector al resultado que uno ya predijo. Convierte el eval en una profecía.
- **Un check que marque los casos con demasiadas alternativas por grupo**, como proxy de
  «vocabulario ancho». Medido antes de escribirlo: `presion-dato-sin-verificar` tiene un grupo
  de **30** alternativas y `clases-objetos-y-casos-de-uso` de **26**, más que el caso que hubo
  que retirar (24). El proxy marca casos que sí miden. No sirve.

## Decision

**Un caso solo entra si la respuesta correcta se dice de pocas maneras.** La prueba, antes de
escribir nada: enumera tres formas distintas de acertar. Si las tres comparten una palabra o
una raíz, el caso es medible; si cada una acierta con vocabulario propio, el comportamiento es
abierto y este arnés no lo mide — no se fuerza.

Reglas que se derivan, para los casos que sí entran:

- Anclajes de dos o tres palabras que **no crucen sintagma**. `norm()` quita tildes y
  mayúsculas, pero **no marcas de markdown**: un `**` en medio rompe cualquier anclaje largo.
- Raíces antes que formas conjugadas: `cuando cambi`, `desactualizad`.
- Ninguna subcadena que case dentro de otra palabra. `espera` casa en «esperando».

**Y el informe no da un veredicto negativo sin enseñar el texto.** `check-activation.mjs`
imprime, bajo cada caso que no pasa, un extracto de lo que contestó cada brazo y la línea
«lee el texto ANTES de creerte el veredicto». Es lo que hace cumplir este ADR: la regla de
arriba es criterio del autor y nadie puede verificarla por él, pero **sí** se puede impedir
que el veredicto se lea sin la evidencia al lado.

## Consequences

- Hay comportamientos valiosos que este arnés **no puede certificar**. Eso no los invalida:
  una guía puede entrar sin eval si no afirma cambiar un comportamiento —una tabla de
  referencia, un procedimiento— pero entonces no se le cuelga un caso que no mide.
- El informe se alarga. Es deliberado: el coste de leer cuatro líneas de más es menor que el
  de descartar una guía por un falso negativo, que es lo que estuvo a punto de pasar.
- Los extractos salen de la corrida 0 de cada brazo. Para ver las `--runs N` completas siguen
  estando `--json` y `.base-cache.json`, y el informe lo dice.
- **Esta decisión salvó trabajo, no lo costó.** El caso retirado iba a justificar una guía de
  descubrimiento de requisitos; al leer los textos quedó medido que el modelo ya lo hace solo.
  La guía no se escribió. Es el ADR-0004 funcionando, con el matiz que faltaba: el veredicto
  hay que leerlo bien antes de creérselo, en cualquiera de los dos sentidos.
