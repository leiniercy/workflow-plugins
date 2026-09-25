# ADR 0007 — El grader se prueba con sondas, no se da por bueno

**Status:** aceptada (v0.21.0)

## Context

El eval de activación corrige las respuestas con una lista de palabras por caso. Lanzar el eval
cuesta cuota, así que la parte **más barata de equivocarse** —esa lista— era la única que nadie
probaba.

Y un grader roto no falla a gritos: aprueba la respuesta equivocada y el informe canta un ✓.
Pasó en **cuatro de cuatro** casos (commit `4f2c92c`): el primero se encontró a mano, en
2026-09-07; los otros tres los destapó esta misma sonda el día que se escribió, sobre graders
que llevaban semanas en verde. El peor, en un caso ya certificado (`calibrado: true`): el grupo
llevaba la subcadena suelta «automatic», que casa igual en «no lo crea automáticamente» que en
«lo crea automáticamente» — es decir, **aprobaba exactamente el error que el caso medía**.

## Decision

Cada caso declara sus respuestas de ejemplo en `graders/muestras.json`: las que **deben pasar** y
las que **deben fallar**. No son salidas reales del modelo; son la definición ejecutable del
criterio. Si el grader las clasifica al revés, el roto es el grader.

`scripts/check-graders.mjs` lo comprueba en CI, sin gastar una sola sesión.

Cómo se escribe una muestra útil:

- Las de `pasan` cubren **variantes de redacción** del mismo concepto. El modelo no repite tu
  vocabulario, y ahí está el falso negativo.
- Las de `fallan` incluyen al menos una **sonda**: la respuesta equivocada redactada con las
  palabras que el grader busca.

## Consequences

- El falso positivo es el peligroso, y por eso la sonda es obligatoria: un falso negativo se
  investiga, un falso positivo se cree.
- Cuando se corrige un grader, la certificación anterior **se invalida** (`calibrado` vuelve a
  `false`) y hay que recertificar gastando sesiones. Se midió con un corrector que aprobaba la
  respuesta equivocada, así que ese número no vale.
- El motivo de cada corrección se escribe en `nota_calibracion`, con fecha. Sin eso, la
  siguiente persona reabre el mismo agujero.
- **Esas dos últimas no las comprueba nadie**: son convención, no política. `check-graders.mjs`
  no lee `calibrado` ni `nota_calibracion`, así que si se pierden, se pierden en silencio.
  Aseverarlas son seis líneas en ese script, y entonces sí serían política.
