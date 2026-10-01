# Decisiones de arquitectura (ADR)

Un ADR deja por escrito **por qué** está decidido algo del propio plugin, para que dentro de
tres meses nadie lo deshaga sin saber qué se rompía antes.

## Cuándo se escribe uno

Cuando cierras una **política** del plugin: algo que condiciona cómo se trabaja aquí y que
alguien —tú incluido— podría querer rediscutir. Señal de que toca: te has parado a razonar una
alternativa y la has descartado por un motivo que no cabe en el mensaje de commit.

**Cuándo NO.** Una decisión de implementación normal no es un ADR. Si el código lo explica
solo, o si cambiarlo mañana no rompe nada, va en el commit o en un comentario.

## La regla de no re-litigar

Si vas a cambiar algo que tiene ADR, **léelo primero**. Casi siempre la alternativa que se te
ocurre ya está en su sección «Context», descartada por un motivo que sigue vigente.

Si aun así procede cambiarlo: el ADR viejo pasa a `superseded` y se escribe uno nuevo que
explique qué cambió. **El original no se edita** — su valor es ser el registro de lo que se
pensaba entonces.

## Formato

Corto: entre una y tres pantallas. Si pasas de 3 KB, sobra texto.

```markdown
# ADR NNNN — <la decisión, en una línea>

**Status:** aceptada (vX.Y.Z) | superseded por ADR NNNN

## Context
Qué problema había y qué alternativas se miraron.

## Decision
Qué se decidió, y qué fichero o script lo hace cumplir.

## Consequences
Con qué se carga uno al aceptarla. También lo malo.
```

Numeración correlativa, nombre de fichero en kebab-case: `NNNN-<slug>.md`.

Cada ADR cita el fichero, script o workflow de CI que hace cumplir la decisión. Un ADR que no
puede señalar quién lo verifica es una intención, no una política.

## Índice

| ADR | Decisión |
|---|---|
| [0001](0001-core-es-la-unica-fuente-adapters-es-salida-generada.md) | `core/` es la única fuente; `adapters/` es salida generada |
| [0002](0002-las-description-del-frontmatter-van-entrecomilladas.md) | ~~Las `description` del frontmatter van entrecomilladas~~ — superseded por 0003 |
| [0003](0003-el-check-de-comportamiento-redeclara-no-deriva-de-sync.md) | El check de comportamiento re-declara; no deriva de `sync.mjs` |
| [0004](0004-un-caso-de-eval-vale-solo-si-la-linea-base-falla.md) | Un caso de eval vale solo si la línea base falla |
| [0005](0005-el-corpus-de-enrutado-se-escribe-como-habla-la-gente.md) | El corpus de enrutado se escribe como habla la gente |
| [0006](0006-el-gate-humano-es-prosa-la-red-para-lo-irreversible-es-un-hook.md) | El gate humano es prosa; la red para lo irreversible es un hook |
| [0007](0007-el-grader-se-prueba-con-sondas.md) | El grader se prueba con sondas, no se da por bueno |
| [0008](0008-allowed-tools-es-pre-aprobacion-no-sandbox.md) | `allowed-tools` es pre-aprobación, no un sandbox |
| [0009](0009-las-acciones-de-ci-van-pineadas-por-sha.md) | Las acciones de CI van pineadas por SHA, y los workflows con permisos mínimos |
| [0010](0010-el-modelo-de-cada-agente-se-elige-por-turnos.md) | El modelo de cada agente se elige por turnos, no por precio por token |
| [0011](0011-el-eval-solo-mide-comportamientos-de-vocabulario-estrecho.md) | El eval solo mide comportamientos de vocabulario estrecho, y el informe enseña el texto |
| [0012](0012-cada-plugin-tiene-su-directorio-bajo-plugins.md) | Cada plugin del marketplace tiene su directorio bajo `plugins/` |
