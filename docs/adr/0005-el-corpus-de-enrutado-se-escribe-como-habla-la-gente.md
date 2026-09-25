# ADR 0005 — El corpus de enrutado se escribe como habla la gente

**Status:** aceptada (v0.21.0)

## Context

Con dos docenas de guías cuyos dominios se rozan —`rendimiento` con `coste-y-estructuras`,
`revision-hallazgos` con `recepcion-de-revision`—, la pregunta «¿se están acercando dos
descripciones?» no la responde ningún check por guía. Hay que medirla sobre el corpus entero.

La trampa está en cómo se escriben los prompts de prueba. Si un positivo se redacta copiando el
vocabulario de la `description` que debe disparar, acierta siempre — y lo que has medido es el
eval, no el plugin.

## Decision

Los prompts de `adapters/claude/evals/routing.json` se escriben **como habla la gente**, con sus
palabras y sin reutilizar el vocabulario del disparador. Y cuando un positivo no ranquea, **el
arreglo por defecto es la `description`, no el prompt**.

`scripts/check-routing.mjs` (TF-IDF y coseno sobre las descripciones enviadas, determinista y
gratis) reparte la dureza según lo que un proxy léxico puede sostener:

- **Colisión** entre dos descripciones → falla. Es una medida entre descripciones, sin prompts
  de por medio: la parte sólida.
- **Par confundible** —un prompt queda por debajo de la guía con la que se confunde— → falla.
  Comparación relativa sobre el mismo texto: también robusta.
- **Rango de un positivo suelto** → solo informa. Lo que falla es la **tasa agregada** de top-3
  por debajo del suelo.

## Consequences

- Un positivo suelto no tumba el check a propósito. Si lo hiciera, la salida sería retocar el
  prompt hasta que pase —o meterle el vocabulario de la description—, que es exactamente cómo se
  falsea un eval.
- Añadir una guía obliga a darle entrada en el corpus, y eso sí lo exige el check. Que sean
  **tres** positivos es convención —la cumplen todas— y no contrato: un `positivos: []` pasaría.
  Sin prompts no hay forma de saber si su disparador invade el de otra.
- El proxy es léxico y el enrutado real es semántico. Por eso esta capa informa de lo que no
  puede probar y deja el veredicto final a `check-activation.mjs`, que sí usa un modelo.
