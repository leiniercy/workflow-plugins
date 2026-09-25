# ADR 0002 — Las `description` del frontmatter van entrecomilladas

**Status:** superseded por [ADR 0003](0003-el-check-de-comportamiento-redeclara-no-deriva-de-sync.md)

> Se queda como registro, con el cuerpo intacto. Lo que tenía de **política** —que la aserción
> va contra el artefacto publicado y no contra el generador— es la tesis del ADR 0003, que ahora
> recoge este caso como su ejemplo. El mecanismo YAML en sí es implementación y lo explica el
> comentario de `yamlString()` en `scripts/sync.mjs`, que es su sitio: nadie va a proponer quitar
> unas comillas, así que no había nada que re-litigar.

## Context

La `description` de una guía es su disparador: es lo único que el agente ve antes de decidir
si carga la skill. Nuestras descripciones llevan «: » de forma natural, porque enumeran
síntomas («Síntomas: el informe y el panel dan cifras distintas…»).

Un escalar YAML **plano** —sin comillas— no puede contener «: ». YAML lo lee como un mapa
anidado y **falla el parseo del frontmatter entero**. Lo grave no es que falle: es cómo
falla. El harness carga la skill con metadatos **vacíos** —sin `name`, sin `description`,
sin `user-invocable`— y sigue adelante. La guía deja de auto-activarse, no hay error, y
nadie se entera hasta que alguien nota que una guía nunca dispara.

## Decision

La `description` que genera `sync.mjs` pasa por `yamlString()`: se envuelve en comillas
dobles escapando `\` y `"`. Se aplica a la `description` de comandos, guías y agentes en los
dos adaptadores, y al `argument-hint` de los comandos de Claude — el único sitio donde ese
campo se emite aparte, porque OpenCode lo empotra dentro de la propia `description`.

El resto de campos (`name`, `tools`, `model`, `allowed-tools`, `mode`) se emiten crudos: no
llevan «: » y no lo necesitan.

Además se asevera sobre el artefacto **publicado**, no sobre el generador:
`scripts/check-behavior.mjs` exige que la `description` de cada skill case `/^".*"$/`. El
comportamiento del parser se verificó con `claude plugin validate --strict`.

## Consequences

- La `description` no puede perder las comillas ni por un reformateo ni por una edición a
  mano bajo `adapters/`: el check lo canta.
- La aserción va contra el fichero enviado precisamente porque el fallo es silencioso. Un
  test contra `sync.mjs` no cubriría los tres ficheros que sí se editan a mano (ADR 0001).
- Es una restricción de formato, no de contenido: la longitud y la redacción del disparador
  («≤ 500 caracteres», «Úsala cuando…») son otras aserciones del mismo script.
