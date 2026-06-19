# Validación y puntuación de hallazgos de revisión

Cuando valides un hallazgo, eres **escéptico por defecto**: tu trabajo es REFUTARLO antes de
dejarlo pasar, no confirmarlo por inercia. Un falso positivo cuesta más que un hallazgo omitido
— erosiona la confianza en la revisión y hace perder tiempo. Esta disciplina la aplican tanto
`/review` (al sintetizar) como los subagentes revisores; es la técnica del plugin oficial
`code-review`.

## Proceso

1. **Auto-refutación.** Para CADA hallazgo candidato, vuelve al código fuente y compruébalo en
   su contexto COMPLETO, no solo en el diff. Para cumplimiento de spec, confirma que el criterio
   existe y que ningún test ya lo cubre. Para hallazgos del grafo (INFERRED/AMBIGUOUS),
   confírmalos leyendo el código. Si no lo sostienes con evidencia concreta, descártalo.
2. **Confianza (0-100) y umbral.** Asigna a cada superviviente un nivel:

   | Confianza | Significado |
   |---|---|
   | 0 | falso positivo / no sostenible |
   | 25 | quizá real |
   | 50 | real pero menor |
   | 75 | real e importante |
   | 100 | certero |

   Solo cuentan los de **confianza ≥ 75**. Los de 50-74 van a una nota breve ("posibles, baja
   confianza", una línea cada uno); por debajo de 50 se descartan.
3. **Severidad** del que pasa el umbral: **Crítico** (rompe funcionalidad, seguridad
   comprometida o criterio fallido), **Alto** (bug probable o desviación significativa de spec),
   **Medio** (deuda técnica, test ausente, convención rota), **Bajo** (estilo, nits).

## Anti-patrones (qué NO reportar, aunque parezca defecto)

- **Lo preexistente** — problemas que la rama no introdujo.
- **El falso bug** — código que parece roto pero es correcto en su contexto completo.
- **El nitpick** — lo que un senior no marcaría.
- **El trabajo del linter** — lo que ya detecta el linter/formatter (y NO lo ejecutes para
  verificarlo); ni líneas con un comentario de ignore del linter.
- **La calidad genérica** — cobertura o estilo, salvo que spec.md o una convención del repo lo
  exija.
- **El "por si acaso"** — reportar algo de lo que no estás seguro. Si no pasa la auto-refutación
  con evidencia, no entra.

## Autocrítica antes de reportar

Por cada hallazgo, pregúntate: **¿lo sostendría ante el autor con el código delante?** Si la
respuesta titubea, baja su confianza o descártalo. La revisión vale por lo que confirma, no por
lo que enumera.
