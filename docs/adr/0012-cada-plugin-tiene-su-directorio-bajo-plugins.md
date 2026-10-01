# ADR 0012 — Cada plugin del marketplace tiene su directorio bajo `plugins/`

**Status:** aceptada (sin publicar)

## Context

El marketplace `biomas` va a tener un segundo plugin, `voice`, para entregables de cliente:
manuales de usuario, presentaciones e informes técnicos. Hasta ahora el repo solo tenía
uno, y su salida vivía en `adapters/claude/` y `adapters/opencode/`, en la raíz, junto a
`core/`. Con esa forma no había sitio para un segundo plugin que no pareciera una pieza de
backbone: una carpeta `voice/` en la raíz, al lado de `core/` y `adapters/`, se leía como
parte de backbone.

Se miraron dos alternativas:

- **Un repo propio para voice.** Es la separación más limpia (memoria, CI, versión e
  historial propios), y el marketplace puede listar un plugin de otro repo. Se descartó
  porque pierde la fuente única de las guías compartidas (`escritura-natural`, `diagramas`,
  `evidencia-y-preguntas`…): habría que copiarlas y mantener dos copias.
- **Mismo repo, con los dos plugins como hermanos.** Es lo que se decidió.

## Decision

Cada plugin tiene su directorio en `plugins/<plugin>/`, y dentro, uno por herramienta:

```
plugins/backbone/claude/     antes adapters/claude/
plugins/backbone/opencode/   antes adapters/opencode/
plugins/voice/               README y memoria de trabajo; su salida irá a plugins/voice/claude/
```

`core/` sigue siendo la única fuente de los dos (ADR-0001 no cambia: cambian las rutas de la
salida). Lo que es solo de un plugin y lo que se comparte se distinguirá con un campo
`packages` en los registros de `scripts/sync.mjs`.

Las rutas se hacen cumplir en los mismos sitios que antes: `.claude-plugin/marketplace.json`
(el `source` de cada plugin), `.claude/rules/editar-solo-core.md` (con `paths`
`plugins/*/claude/**` y `plugins/*/opencode/**`, para no cubrir el README ni la memoria de
`plugins/voice/`, que se escriben a mano), `.github/workflows/sync-check.yml` y los
`scripts/check-*.mjs`.

## Consequences

- Los dos plugins se instalan y versionan por separado, pero comparten repo, CI y `core/`.
- El histórico (CHANGELOG anterior, `tasks/`, `docs/referencias.md` y los ADR 0001–0011)
  sigue diciendo `adapters/`: es lo que era cierto cuando se escribió y no se reescribe.
- Los usuarios de OpenCode copian ahora `plugins/backbone/opencode/.opencode/`. Los de
  Claude Code no notan nada: el marketplace apunta a la ruta nueva.
- Las herramientas de versión (`bump-version.mjs`, `check-version.mjs`) siguen pensadas para
  un solo plugin. Cuando voice tenga manifiesto, habrá que decidir si cada plugin lleva su
  versión.
