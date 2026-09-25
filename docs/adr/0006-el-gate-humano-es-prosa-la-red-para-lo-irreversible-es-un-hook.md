# ADR 0006 — El gate humano es prosa; la red para lo irreversible es un hook

**Status:** aceptada (v0.21.0)

## Context

El plugin sostiene «gates humanos para todo lo visible»: commit, push, PR y transición de estado
en ClickUp solo se ejecutan tras aprobación explícita del usuario. Está escrito en los workflows
y reforzado con las tablas de banderas rojas.

La prosa gobierna al agente **cuando razona**. No lo gobierna cuando se salta el paso — y
saltárselo es justo el fallo que importa, porque algunas de esas acciones no las deshace un
`git revert`.

## Decision

Dos capas, con alcances distintos a propósito:

1. **El gate normal es prosa.** Cada workflow declara qué exige aprobación explícita y lo repite
   en su tabla de banderas rojas. `scripts/check-behavior.mjs` asevera que esas tablas siguen
   ahí.
2. **La red para lo irreversible es un hook determinista.**
   `adapters/claude/hooks/destructive-guard.js` (PreToolUse, exclusivo de Claude Code)
   intercepta push forzado, borrados en cascada, SQL destructivo y escritura sobre ficheros
   protegidos. Por defecto decide `ask` —devuelve la decisión al usuario, que es el gate del
   plugin hecho efectivo— y reserva `deny` para lo que no tiene uso legítimo iniciado por un
   agente: force-push a la rama principal, `DROP DATABASE`, `rm -rf /` o `~`. Lo verifica
   `scripts/check-guard.mjs`.

## Consequences

- **Alcance honesto: es una red para accidentes, no un sandbox.** Un agente decidido reformula
  el comando y esquiva cualquier patrón. La barrera dura de solo lectura sigue siendo el campo
  `tools` de los agentes revisores, no el hook.
- El hook jamás rompe la sesión: cualquier fallo o entrada que no entienda degrada a «sin
  decisión» y deja pasar el flujo de permisos normal. Un guard que tumba sesiones se acaba
  desactivando, y entonces no protege de nada.
- Se puede apagar (`CUSTOM_IA_GUARD=off`) y ampliar (`CUSTOM_IA_PROTECTED_PATHS`). Que sea
  configurable es lo que evita que alguien lo borre el día que le estorbe.
- OpenCode se queda sin la segunda capa, pero no por imposibilidad: su API de plugins tiene el
  evento equivalente (`tool.execute.before`, §1.6 de `docs/opencode-integracion.md`) y lo que
  falta es escribir el guard allí — está anotado como mejora opcional. Mientras tanto, el gate
  en OpenCode es solo la prosa, y conviene saberlo.
