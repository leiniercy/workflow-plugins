---
name: revision-hallazgos
description: Disciplina para validar y puntuar un hallazgo de revisión antes de reportarlo: auto-refutación contra el código, escala de confianza 0-100 con umbral ≥ 75, lista de qué NO reportar y clasificación por severidad. Úsala en /review y en los subagentes revisores para subir la señal y bajar los falsos positivos.
user-invocable: false
---
# Validación y puntuación de hallazgos de revisión

Disciplina común para subir la señal y bajar los falsos positivos de un hallazgo de
revisión, antes de incluirlo en un informe. La aplican tanto `/review` (al sintetizar)
como los subagentes revisores por dimensión. Es la técnica del plugin oficial `code-review`.

## 1 — Auto-refutación de cada hallazgo

Para CADA hallazgo candidato, intenta REFUTARLO antes de incluirlo: vuelve al código fuente
y compruébalo en su contexto COMPLETO, no solo en el diff. Para cumplimiento de spec,
confirma que el criterio existe y que ningún test ya lo cubre. Para hallazgos derivados del
grafo (INFERRED/AMBIGUOUS), confírmalos leyendo el código. Si no puedes sostener el hallazgo
con evidencia concreta, descártalo: los falsos positivos erosionan la confianza y hacen
perder tiempo.

## 2 — Confianza (0-100) y umbral

Asigna a cada hallazgo superviviente un nivel de confianza:

| Confianza | Significado |
|---|---|
| 0 | falso positivo / no sostenible |
| 25 | quizá real |
| 50 | real pero menor |
| 75 | real e importante |
| 100 | certero |

Solo cuentan los hallazgos con **confianza ≥ 75**. Los de 50-74 se agrupan en una nota breve
("posibles, baja confianza", una línea cada uno); todo lo que esté por debajo de 50 se descarta.

## 3 — Qué NO reportar (falsos positivos)

No flaggees, aunque parezcan defectos:

- Problemas preexistentes no introducidos por la rama.
- Código que parece un bug pero es correcto en su contexto.
- Nitpicks que un senior no marcaría.
- Lo que un linter/formatter ya detecta (y NO ejecutes el linter para verificarlo).
- Calidad general (cobertura, estilo) salvo que spec.md o una convención del repo la exija.
- Líneas con un comentario de ignore del linter.

## 4 — Severidad

Clasifica cada hallazgo que pasa el umbral:

- **Crítico**: rompe funcionalidad, seguridad comprometida o criterio de aceptación fallido.
- **Alto**: bug probable o desviación significativa de spec.
- **Medio**: deuda técnica, test ausente, convención rota.
- **Bajo**: estilo, nits, sugerencias.
