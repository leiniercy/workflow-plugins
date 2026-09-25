# ADR 0001 — `core/` es la única fuente; `adapters/` es salida generada

**Status:** aceptada (v0.21.0)

## Context

El plugin se publica para dos herramientas con formatos distintos: Claude Code
(`adapters/claude/{commands,skills,agents}`) y OpenCode
(`adapters/opencode/.opencode/{command,skills,agent}`). Cambian el frontmatter, el nombre de
los directorios y la sintaxis de las referencias cruzadas entre guías. Mantener el mismo
workflow escrito dos veces es garantizar que a la tercera edición divergen, y la divergencia
no la ve nadie hasta que un usuario de una de las dos herramientas recibe la versión vieja.

## Decision

`core/{workflows,guides,agents}/` es la única fuente de verdad. `scripts/sync.mjs` genera
todo lo que hay bajo `adapters/`: resuelve los tokens `{{guide:nombre}}` a la referencia de
cada herramienta, antepone el frontmatter correspondiente y sobrescribe los ficheros. Los
metadatos —`description` de comandos y guías, modelo y `tools` de los agentes— viven en los
registros `COMMANDS`, `GUIDES` y `AGENTS` de `sync.mjs`, no en el markdown.

Tres cosas bajo `adapters/` sí se editan a mano, porque no se generan:

- `adapters/claude/hooks/` — son código.
- `adapters/claude/evals/` — casos de activación y `routing.json`.
- `adapters/claude/.claude-plugin/plugin.json` — el manifiesto.

Lo hacen cumplir `.claude/rules/editar-solo-core.md` (regla con `paths: adapters/**`, se le
sirve al agente al tocar ahí) y `.github/workflows/sync-check.yml`, que regenera y falla si
el árbol queda distinto de lo que produce `sync.mjs`.

## Consequences

- Una edición a mano bajo `adapters/` no es un atajo: desaparece en la siguiente ejecución
  de `sync.mjs`, y hasta entonces el CI está en rojo.
- Cambiar una `description` obliga a abrir `sync.mjs`, no el markdown. Es el precio de tener
  los metadatos en un sitio donde el generador los puede adaptar a cada formato.
- Cada commit lleva `core/` y lo regenerado juntos. El diff es más grande a cambio de que
  `sync-check` pueda verificarlo.
- Añadir una herramienta nueva es añadir un adaptador a `sync.mjs`, nunca copiar `core/`.
