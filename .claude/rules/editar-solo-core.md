---
description: "Los adaptadores se generan; la fuente única es core/."
paths:
  - "adapters/**"
---

# Estás en `adapters/`, que es salida generada

Todo lo que hay bajo `adapters/claude/{commands,skills,agents,scripts}` y
`adapters/opencode/.opencode/{command,skills,agent,guides,scripts}` lo **escribe
`scripts/sync.mjs`** a partir de `core/`. Editarlo a mano no es un atajo: el cambio desaparece en la siguiente
ejecución de `sync.mjs`, y hasta entonces el CI `sync-check` está en rojo porque los
adaptadores no cuadran con `core/`.

**Lo que toca:**

1. Edita el fichero equivalente en `core/{workflows,guides,agents,scripts}/`, usando los
   tokens `{{guide:nombre}}` y `{{script:nombre}}` para las referencias cruzadas.
   Para una regla que varios ficheros tienen que cumplir **con las mismas palabras**, no la
   copies: escríbela en `core/snippets/<nombre>.md` y ponla con `{{snippet:nombre}}`, solo en
   su línea y sin sangrar. `{{guide:x}}` APUNTA a otro fichero; `{{snippet:x}}` INSERTA el
   texto ahí mismo.
   `core/scripts/` es la excepción a «`scripts/` es del mantenedor»: lo que hay ahí se
   EJECUTA en el repo del usuario, así que `sync.mjs` lo copia byte a byte a los dos
   adaptadores. Un script nuevo hay que darlo de alta en el registro `SCRIPTS` de
   `sync.mjs`, o no se copia y nada lo dice.
2. Si lo que cambias es la `description` de una guía o los metadatos de un agente, eso vive en
   `scripts/sync.mjs` (`GUIDES` y `AGENTS`), no en el markdown.
3. Ejecuta `node scripts/sync.mjs` y commitea también lo regenerado.

**Las tres excepciones**, que sí se editan a mano bajo `adapters/`:

- `adapters/claude/hooks/` — los hooks son código, no se generan.
- `adapters/claude/evals/` — casos de activación y `routing.json`.
- `adapters/claude/.claude-plugin/plugin.json` — el manifiesto.

Antes de dar por buena una edición aquí, comprueba con `node scripts/sync.mjs` que no queda
drift, y pasa `node scripts/check-behavior.mjs` y `node scripts/check-routing.mjs`.
