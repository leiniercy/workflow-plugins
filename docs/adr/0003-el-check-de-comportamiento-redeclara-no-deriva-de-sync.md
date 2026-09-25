# ADR 0003 — El check de comportamiento re-declara; no deriva de `sync.mjs`

**Status:** aceptada (v0.21.0)

## Context

`scripts/check-behavior.mjs` asevera los contratos que hacen que el plugin se comporte como
dice: que `/review` sea read-only, que cada agente revisor lleve `tools: Read, Grep, Glob`,
que cada comando tenga su tabla de banderas rojas.

Escribirlo importando los registros de `sync.mjs` sería más corto y no se desactualizaría
nunca. Ese es justo el problema: si el generador pierde un contrato, el test importa el
contrato perdido y da verde. Un test que deriva sus expectativas de la fuente que prueba
solo demuestra que la fuente es la fuente.

## Decision

`check-behavior.mjs` corre contra los artefactos **publicados** (`adapters/claude/*`) y
**re-declara** las expectativas a mano. No importa nada de `sync.mjs`.

Con unas excepciones deliberadas, todas del mismo tipo: donde hace falta una fuente
independiente del registro `GUIDES`, se lee el disco. Son tres — la lista de guías
(`readdirSync("core/guides")`, así se coló una deriva), los borradores de
`core/guides/in-progress/` y el barrido de enlaces entrantes sobre `core/`. Una guía añadida a
`core/guides/` y olvidada en el registro no genera skill y salta aquí, en vez de publicarse sin
comprobar.

Corolario: una aserción sobre texto comprueba que la **sección existe** —la tabla de banderas
rojas, `## Anti-patrones`, el token `{{guide:…}}` entrante—, nunca que la frase diga lo
correcto. Citar la prosa como prueba de conducta es el anti-patrón «test contra el texto
fuente»; ese terreno es del eval manual (`docs/eval-comportamiento.md`).

**El caso que lo motiva.** La `description` de cada skill tiene que salir entrecomillada: un
escalar YAML plano no admite «: », y nuestras descripciones lo llevan de forma natural
(«Síntomas: …»). Si se pierden las comillas, el frontmatter entero no parsea y el harness carga
la skill con metadatos vacíos —sin `name`, sin `description`— y sigue adelante sin error. La
aserción va contra el fichero enviado, no contra `sync.mjs`, por los dos motivos de este ADR: el
fallo es silencioso, y tres ficheros bajo `adapters/` se editan a mano (ADR 0001), así que el
generador no los cubriría. El razonamiento largo quedó en el ADR 0002, hoy superseded.

## Consequences

- Cambiar un contrato obliga a tocar dos sitios: `sync.mjs` y el check. Es fricción a
  propósito — es el momento en el que alguien se pregunta si el cambio es correcto.
- El check puede quedarse corto (un contrato nuevo sin aserción), pero no puede dar un falso
  verde arrastrado por el generador. De los dos fallos, el barato es el primero.
- La independencia solo vale si las expectativas se escriben mirando el contrato, no
  copiándolas del código que las produce.
