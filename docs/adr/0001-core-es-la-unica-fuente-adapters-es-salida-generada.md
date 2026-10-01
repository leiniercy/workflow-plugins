# ADR 0001 — `core/` es la única fuente; `adapters/` es salida generada

**Status:** aceptada (v0.21.0)

> **Rutas actualizadas por el [ADR-0012](0012-cada-plugin-tiene-su-directorio-bajo-plugins.md):** lo que aquí es
> `adapters/claude/` y `adapters/opencode/` vive ahora en `plugins/backbone/claude/` y
> `plugins/backbone/opencode/`. La decisión no cambia.

## Context

El plugin se publica para dos herramientas con formatos distintos: Claude Code
(`adapters/claude/{commands,skills,agents}`) y OpenCode
(`adapters/opencode/.opencode/{command,skills,agent}`). Cambian el frontmatter, el nombre de
los directorios y la sintaxis de las referencias cruzadas entre guías. Mantener el mismo
workflow escrito dos veces es garantizar que a la tercera edición divergen, y la divergencia
no la ve nadie hasta que un usuario de una de las dos herramientas recibe la versión vieja.

## Decision

`core/{workflows,guides,agents,scripts}/` es la única fuente de verdad. `scripts/sync.mjs`
genera todo lo que hay bajo `adapters/`: resuelve los tokens `{{guide:nombre}}` a la
referencia de cada herramienta, antepone el frontmatter correspondiente y sobrescribe los
ficheros. Los metadatos —`description` de comandos y guías, modelo y `tools` de los
agentes— viven en los registros `COMMANDS`, `GUIDES` y `AGENTS` de `sync.mjs`, no en el
markdown.

**Ampliación (v0.22.0): `core/scripts/`, una cuarta clase de generado.** Es la excepción a
«`scripts/` es la caja del mantenedor»: lo que hay en `core/scripts/` se **ejecuta en el
repo del usuario** (hoy, el escaneo del suelo de calidad y la fusión de hallazgos que usa
`/review`). No lleva frontmatter ni tokens, así que `sync.mjs` lo copia **byte a byte** a
`adapters/claude/scripts/` y a `adapters/opencode/.opencode/scripts/`, y resuelve el token
`{{script:nombre}}` a la ruta de cada herramienta. Sustituir texto dentro de código sería
una forma nueva de romperlo en silencio, y por eso no se hace.

Se añadió sin ampliar esta ADR ni la regla de `adapters/**`, y una revisión lo levantó: un
colaborador que abriera `adapters/claude/scripts/suelo-calidad.mjs` no encontraba dónde
dijera que es generado, lo editaba, y el cambio desaparecía en el siguiente `sync.mjs`. La
lección es de la propia ADR: **una clase nueva de artefacto generado no existe hasta que
está en los tres sitios** — el registro de `sync.mjs`, esta decisión y la regla que se le
sirve al agente. Un script nuevo que no se dé de alta en el registro `SCRIPTS` no se copia;
lo asevera `check-behavior.mjs` derivando la lista del disco, no del registro.

**Ampliación (01/10/2026): `core/templates/`, una quinta clase.** Las plantillas que `/setup`
copia al repo del usuario (`CLAUDE.md`, `AGENTS.md`, `MEMORY.md`). Hasta entonces vivían en
`examples/`, que quien instala el plugin no recibe. Se copian byte a byte, como los scripts,
con el sufijo `.example` también en `core/` para que ninguna herramienta las cargue como
instrucciones; registro `TEMPLATES` en `sync.mjs` y token `{{template:nombre}}`. Lo asevera
`check-behavior.mjs` derivando la lista del disco.

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
