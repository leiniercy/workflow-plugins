# ADR 0008 — `allowed-tools` es pre-aprobación, no un sandbox

**Status:** aceptada (v0.21.0)

## Context

`allowed-tools` en un slash command de Claude Code se lee como una lista blanca, y no lo es. Lo
que hace es **pre-aprobar**: las herramientas listadas corren sin pedir permiso; las que no
están siguen el flujo normal de permisos y se pueden usar igual. No bloquea nada.

Eso cambia qué significa añadir una herramienta al campo. `/close` escribe una entrada en
`progress.md` y pide permiso cada vez. La «mejora» obvia es listar `Write` y quitarse el
prompt. Parece un arreglo de comodidad y es un cambio de contrato.

## Decision

`allowed-tools` se usa para **privilegio mínimo**, no para comodidad: se pre-aprueba solo
lectura.

- `/review` no lista `Edit` ni `Write` — es su contrato de solo lectura.
- `/close` tampoco, aunque escriba `progress.md`. Listarlo haría del comando que **cierra** el
  único del paquete que escribe sin gate, más suelto que `/implement`, que toca código de
  producción y ni siquiera declara el campo. El sello de `progress.md` pasa por el permiso
  normal; el ámbito «solo ese fichero» lo sostienen la prosa del comando y sus banderas rojas.
- `Bash` queda acotado a git de lectura y consultas de grafo; `Agent` pre-autoriza despachar
  los subagentes revisores.

**El bloqueo duro vive en otro sitio:** el campo `tools` de los agentes revisores sí es una
lista blanca real. Por eso los cuatro revisores llevan `Read, Grep, Glob` y nada más.

Lo aseveran `scripts/check-behavior.mjs` (que `/review` no incluya `Edit`/`Write`, y el mismo
contrato para `/close`) y el razonamiento queda en `scripts/sync.mjs`, en los registros
`COMMANDS` y `AGENTS`. La decisión se tomó en el commit `d7555fb`, «fix(close): no pre-aprobar
Write/Edit en allowed-tools».

## Consequences

- `/close` pide permiso cada vez que sella `progress.md`. Es fricción real y aceptada: un
  prompt de más es más barato que un comando de cierre que escribe sin gate.
- Nadie debe leer `allowed-tools` como garantía de seguridad. Si hace falta impedir algo de
  verdad, va en el `tools` de un subagente o en el hook de ADR 0006, no aquí.
- OpenCode no tiene el campo. Allí el privilegio mínimo lo dan el agente `revisor` y la prosa.
