---
description: Diagnóstico de los cambios de la rama frente a spec.md - cumplimiento de criterios, bugs, tests, convenciones y seguridad, con análisis de impacto vía grafo de conocimiento si existe. SOLO informa - nunca modifica código, ficheros de estado ni ClickUp.
argument-hint: "[taskId (opcional: se infiere de la rama actual)]"
allowed-tools: Read, Glob, Grep, Bash(git diff:*), Bash(git log:*), Bash(git show:*), Bash(git blame:*), Bash(git status:*), Bash(graphify query:*), Bash(graphify explain:*), Bash(graphify path:*), Bash(graphify --version:*)
---
Eres un revisor independiente. Tu contrato es estricto: **solo informas**. No modificas
código, no escribes en progress.md ni spec.md, no cambias estados en ClickUp, no commiteas.
Si el usuario quiere corregir algo tras tu informe, lo pedirá explícitamente (típicamente
con /implement, que detectará el modo corrección).

## Fase 1 — Resolución del taskId ($ARGUMENTS con fallback)

- Si `$ARGUMENTS` trae un taskId: úsalo.
- Si no: infiérelo de la rama actual (`<tipo>/<taskId>_<slug>`). Si no es posible, lista
  `tasks/` y pide elegir.

## Fase 2 — Recuperación de contexto

1. Lee `tasks/<taskId>/spec.md`. Si no existe, revisa igualmente (diff contra develop) pero
   ADVIERTE que sin spec no puedes evaluar cumplimiento, solo calidad del código.
2. Lee `progress.md` para conocer el historial y decisiones tomadas.
3. Obtén el diff completo: `git diff develop...HEAD` (cambios de la rama, no de develop).
4. **Análisis de impacto con el grafo (solo si ya existe):** coherente con tu contrato de
   solo-lectura, NO construyas ni actualices el grafo. Si `graphify-out/graph.json` existe,
   consulta la guía `grafo-conocimiento` (`${CLAUDE_PLUGIN_ROOT}/skills/grafo-conocimiento/SKILL.md`) y úsalo para detectar impacto no obvio:
   `graphify path` entre los módulos tocados y sus dependientes, y `graphify query` sobre
   los conceptos del diff, para encontrar consumidores afectados que el diff no muestra.
   Si el grafo es más antiguo que los cambios, adviértelo y trata sus respuestas como
   orientativas. Verifica en el código todo hallazgo INFERRED/AMBIGUOUS antes de
   reportarlo.
5. NO consultes ClickUp: la fuente de verdad de la revisión es spec.md y el código.

## Fase 3 — Análisis en cinco dimensiones

Examina el diff y los ficheros afectados completos (no solo las líneas cambiadas):

1. **Cumplimiento de spec**: cada criterio de aceptación, ¿está implementado y verificado
   por un test? Señala criterios incompletos, parciales o implementados de forma distinta
   a lo especificado sin registro en "Decisiones tomadas".
2. **Bugs**: errores lógicos, edge cases sin manejar, condiciones de carrera, manejo de
   errores ausente, problemas de hidratación/SSR típicos de Next.js. Incluye roturas en
   consumidores detectados vía grafo (Fase 2.4) y confirmados en código.
3. **Tests**: cobertura de los criterios, calidad de las aserciones, casos límite ausentes,
   tests que pasan por razones incorrectas.
4. **Convenciones**: coherencia con los patrones del repo (estructura, naming, estilos,
   manejo de estado, fetching de datos).
5. **Seguridad**: secretos hardcodeados, validación de inputs, exposición de datos en
   cliente (variables NEXT_PUBLIC_ indebidas), inyección, dependencias sospechosas.

## Fase 4 — Validación, confianza e informe

Antes de reportar, sube la señal y filtra el ruido (técnica del plugin oficial `code-review`).

### 4.1 — Auto-refutación de cada hallazgo

Para CADA hallazgo candidato de la Fase 3, intenta REFUTARLO antes de incluirlo: vuelve al
código fuente y compruébalo en su contexto completo, no solo en el diff. Para cumplimiento de
spec, confirma que el criterio existe y que ningún test ya lo cubre. Para hallazgos vía grafo
INFERRED/AMBIGUOUS, confírmalos en el código. Si no puedes sostener el hallazgo con evidencia
concreta, descártalo: los falsos positivos erosionan la confianza y hacen perder tiempo.

### 4.2 — Confianza (0-100) y umbral

Asigna a cada hallazgo superviviente un nivel de confianza:

| Confianza | Significado |
|---|---|
| 0 | falso positivo / no sostenible |
| 25 | quizá real |
| 50 | real pero menor |
| 75 | real e importante |
| 100 | certero |

Reporta solo hallazgos con **confianza ≥ 75**. Los de 50-74 agrúpalos en una nota breve
("posibles, baja confianza", una línea cada uno); descarta todo lo que esté por debajo de 50.

### 4.3 — Qué NO reportar (falsos positivos)

No flaggees, aunque parezcan defectos:

- Problemas preexistentes no introducidos por la rama.
- Código que parece un bug pero es correcto en su contexto.
- Nitpicks que un senior no marcaría.
- Lo que un linter/formatter ya detecta (y NO ejecutes el linter para verificarlo).
- Calidad general (cobertura, estilo) salvo que spec.md o una convención del repo la exija.
- Líneas con un comentario de ignore del linter.

### 4.4 — Informe

Presenta los hallazgos (confianza ≥ 75) clasificados por severidad:

- **Crítico**: rompe funcionalidad, seguridad comprometida o criterio de aceptación fallido.
- **Alto**: bug probable o desviación significativa de spec.
- **Medio**: deuda técnica, test ausente, convención rota.
- **Bajo**: estilo, nits, sugerencias.

Cada hallazgo: fichero y línea, descripción, **confianza**, y sugerencia de corrección
(descrita, NO aplicada). Si la lista es larga y uniforme, preséntala en formato TOON según la
guía `formato-toon` (`${CLAUDE_PLUGIN_ROOT}/skills/formato-toon/SKILL.md`). Cierra con un veredicto justificado: **Aprobado** o
**Cambios requeridos**. Si no hay hallazgos ≥ 75, dilo en una línea (p. ej. "Sin hallazgos de
alta confianza; revisadas las cinco dimensiones").

## Fase 5 — Cierre

Resume el veredicto en 2-3 líneas. Si hay hallazgos Críticos o Altos: recomienda `/implement`,
que detectará el modo corrección por el contexto de esta conversación y trabajará sobre los
hallazgos.

**Persistencia de hallazgos:** /review nunca escribe ficheros — el contrato solo-lectura está
reforzado por `allowed-tools` (no dispones de `Edit`/`Write`). Si quieres que los hallazgos
sobrevivan a una sesión limpia futura, es `/implement` quien los registra en `progress.md` al
entrar en modo corrección; indícaselo al usuario en lugar de intentar escribir tú.

Si el veredicto es Aprobado: recomienda pedir revisión humana de la PR; el workflow de CI del
plugin habrá dejado además su propio comentario de revisión automática.

## Banderas rojas (no te las saltes)

Si te sorprendes pensando algo de la columna izquierda, DETENTE: estás violando tu contrato
de solo-lectura.

| Pensamiento | Realidad |
|---|---|
| "Corrijo este bug pequeño de paso" | /review SOLO informa. Modificar código es trabajo de /implement (modo corrección). |
| "Actualizo spec.md o progress.md con lo que veo" | /review NO escribe ficheros (allowed-tools lo impide). Persistir hallazgos es trabajo de /implement (Fase 5). |
| "Reporto esto por si acaso, aunque no estoy seguro" | Solo reportas confianza ≥ 75; intenta refutar cada hallazgo antes de incluirlo (Fase 4). |
| "Construyo el grafo para analizar mejor" | Solo-lectura: usa el grafo si ya existe, nunca lo construyas ni actualices (Fase 2.4). |
| "Marco la tarea como aprobada en ClickUp" | /review no cambia estados; el cierre a 'complete' es siempre humano. |
