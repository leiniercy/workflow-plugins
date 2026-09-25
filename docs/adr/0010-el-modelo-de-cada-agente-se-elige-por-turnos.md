# ADR 0010 — El modelo de cada agente se elige por turnos, no por precio por token

**Status:** aceptada (v0.21.0)

## Context

Con siete subagentes declarando `model:`, la optimización que se le ocurre a cualquiera es bajar
los baratos a `haiku`. El cálculo intuitivo mira el precio por token y sale a favor.

Ese cálculo está mal para trabajo multi-turno. La medición de superpowers/SDD (§2 de
`docs/referencias.md`) es que **el número de turnos pesa más que el precio por token**: un
modelo que necesita 2-3× turnos para el mismo resultado acaba costando más, y encima tarda más.

## Decision

El `model` de cada agente es un tier razonado según el tipo de trabajo, y el motivo va escrito
al lado en el registro `AGENTS` de `scripts/sync.mjs`:

| Modelo | Agentes | Por qué |
|---|---|---|
| `opus` | `revisor-bugs-seguridad`, `verificador-hallazgos`, `refutador-decision` | Juicio adversarial: encontrar el fallo que nadie vio, refutar una decisión, verificar un hallazgo |
| `sonnet` | `revisor-convenciones`, `revisor-spec-tests`, `revisor-usabilidad-accesibilidad`, `explorador-repo` | Trabajo multi-turno de lectura: hay que abrir ficheros vecinos para deducir el patrón vigente |

El caso que explica la regla es **`revisor-convenciones`: es `sonnet` y no `haiku` a propósito**.
Juzgar convenciones y olores exige leer el código de alrededor para saber cuál es el patrón de
este repo — es trabajo multi-turno, no transcripción.

`scripts/check-behavior.mjs` lo asevera agente a agente, sobre los ficheros publicados, con el
motivo repetido en comentario.

## Consequences

- Cambiar el modelo de un agente obliga a tocar dos sitios y a escribir por qué. Es fricción a
  propósito.
- **Ya se deshizo una vez, en la documentación:** `docs/opencode-integracion.md` decía
  `revisor-convenciones = haiku` en su tabla de equivalencias y en el ejemplo de configuración,
  cuando el modelo real era `sonnet` desde hacía tiempo — y contaba 5 subagentes cuando son 7.
  Se corrigió al escribir este ADR. Es exactamente la deriva que existe para frenar, y la prueba
  de que el razonamiento no aguanta viviendo solo en un comentario del generador.
- La tabla es una elección de tier, no de modelo concreto: cuando salga una generación nueva,
  lo que se conserva es el reparto entre juicio adversarial y lectura multi-turno.
