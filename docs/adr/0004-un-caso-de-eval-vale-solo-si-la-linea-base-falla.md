# ADR 0004 — Un caso de eval vale solo si la línea base falla

**Status:** aceptada (v0.21.0)

## Context

Que una guía se active no demuestra que sirva. Si el modelo desnudo resuelve el caso igual de
bien, el caso mide que el plugin existe, no que aporte. Es el mismo defecto que
`niveles-y-tipos-de-prueba` llama «detector de cambios»: un test que pasa siempre.

Y no basta con correr la línea base una vez. Con un solo intento por brazo el delta queda a
merced de la suerte: una línea base afortunada produce un «sin delta» falso, y una
desafortunada, un «hay delta» falso.

## Decision

Cada caso declara `linea_base_debe_fallar` en su `expect.json`, y
`scripts/check-activation.mjs --baseline` corre el brazo sin plugin con **las mismas `--runs N`**
que el brazo con plugin. El informe distingue tres cosas, y solo la última es un delta:

| La línea base acierta | Veredicto |
|---|---|
| N de N | **SIN DELTA** — el caso no discrimina; rediséñalo |
| k de N | **RUIDO** — el delta no se sostiene; rediséñalo |
| 0 de N | Hay delta |

SIN DELTA y RUIDO son fallos **del caso**, no del plugin.

Ojo al leer la salida: cuando el brazo con plugin también es inestable, el informe imprime
VARIANZA antes que RUIDO y el titular dice «el wording no ata». El veredicto de fondo sigue
siendo RUIDO. Mira el flag, no el titular.

## Consequences

- Subir `--runs` **no** saca un caso de RUIDO: lo hunde. Si la línea base acierta con
  probabilidad p, la de que acierte al menos una vez de N es 1-(1-p)^N, que crece con N — y
  cada corrida extra se paga dos veces, una por brazo. La única salida es rediseñar el caso.
- El eval consume cuota real: cada sesión ronda 0,32-0,49 USD equivalentes y con `--baseline`
  se pagan dos por caso y corrida. Aquí no se fija el total a propósito — cambia cada vez que se
  añade un caso, y el freno de `--yes` lo calcula antes de gastar nada. Por eso este script **no
  corre en CI**; se ejecuta a mano antes de publicar. Las capas baratas (`check-behavior`,
  `check-routing`, `check-graders`) son las que sí están en CI.
- Es una regla estricta a propósito: no mide cuánto delta hay, decide si el caso separa al
  plugin del modelo desnudo con fiabilidad.
