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
   consulta la guía {{guide:grafo-conocimiento}} y úsalo para detectar impacto no obvio:
   `graphify path` entre los módulos tocados y sus dependientes, y `graphify query` sobre
   los conceptos del diff, para encontrar consumidores afectados que el diff no muestra.
   Si el grafo es más antiguo que los cambios, adviértelo y trata sus respuestas como
   orientativas. Verifica en el código todo hallazgo INFERRED/AMBIGUOUS antes de
   reportarlo.
5. NO consultes ClickUp: la fuente de verdad de la revisión es spec.md y el código.

## Fase 3 — Análisis en cinco dimensiones

Las cinco dimensiones a cubrir (examinando el diff y los ficheros afectados COMPLETOS, no
solo las líneas cambiadas):

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

### Cómo ejecutar el análisis — subagentes con tiering, o en línea

**Si dispones de los agentes revisores del plugin** (`revisor-bugs-seguridad`,
`revisor-spec-tests`, `revisor-convenciones`): despáchalos EN PARALELO como subagentes,
pasándole a cada uno el contexto que ya recopilaste en la Fase 2 (contenido de spec.md, el
diff completo, los hallazgos del grafo si los hubo y las notas de progress.md). El reparto y
el modelo de cada uno (tiering por coste/complejidad, patrón del plugin oficial `code-review`):

- `revisor-bugs-seguridad` (opus) → dimensiones 2 (bugs) y 5 (seguridad).
- `revisor-spec-tests` (sonnet) → dimensiones 1 (cumplimiento de spec) y 3 (tests).
- `revisor-convenciones` (haiku) → dimensión 4 (convenciones).

Cada subagente es solo-lectura por su campo `tools` (no puede modificar nada ni despachar
más agentes) y devuelve sus hallazgos ya auto-refutados y puntuados. Recoge sus informes y
pasa a la Fase 4 a sintetizarlos.

**Si NO dispones de esos agentes** (p. ej. en OpenCode): analiza tú mismo las cinco
dimensiones en línea, leyendo el diff y los ficheros afectados completos, y aplica a cada
hallazgo la validación de la Fase 4 antes de incluirlo.

## Fase 4 — Síntesis, refutación cruzada e informe

### 4.1 — Síntesis de los hallazgos candidatos

Reúne los hallazgos de los tres agentes (o de tu análisis en línea). Todos deben cumplir la
disciplina de la guía {{guide:revision-hallazgos}}: confianza 0-100 con umbral ≥ 75, lista de
"qué NO reportar" y severidad. **Deduplica** los que varias dimensiones señalen sobre la misma
línea y **reaplica el umbral** al conjunto. Para hallazgos vía grafo (Fase 2.4) marcados
INFERRED/AMBIGUOUS, confírmalos en el código.

### 4.2 — Refutación cruzada (validación adversarial independiente)

**Si dispones del agente `verificador-hallazgos`**: despáchalo UNA vez con la lista de
hallazgos candidatos sintetizados, el diff y el spec. Es un revisor independiente que NO los
encontró y cuyo trabajo es intentar REFUTARLOS (¿preexistente?, ¿correcto en su contexto
completo?, ¿ya cubierto por un test?, ¿contradice a otro hallazgo?). Quédate solo con los que
marque `confirmado`; descarta los `refutado` y reubica los `dudoso` en la nota de baja
confianza. Es la validación adversarial del plugin oficial `code-review`: un agente distinto,
con contexto fresco, intenta tumbar lo que otro afirmó.

**Si NO dispones de ese agente** (p. ej. en OpenCode): haz tú una segunda pasada escéptica
sobre cada hallazgo superviviente, con la misma intención de refutarlo, antes de reportarlo.

### 4.3 — Informe

Presenta los hallazgos supervivientes (confianza ≥ 75) clasificados por severidad (Crítico /
Alto / Medio / Bajo, según la guía {{guide:revision-hallazgos}}). Cada hallazgo: fichero y
línea, descripción, **confianza**, severidad y sugerencia de corrección (descrita, NO
aplicada). Si la lista es larga y uniforme, preséntala en formato TOON según la guía
{{guide:formato-toon}}. Cierra con un veredicto justificado: **Aprobado** o **Cambios
requeridos**. Si no hay hallazgos ≥ 75, dilo en una línea (p. ej. "Sin hallazgos de alta
confianza; revisadas las cinco dimensiones").

## Fase 5 — Cierre

Resume el veredicto en 2-3 líneas. Si hay hallazgos Críticos o Altos: recomienda `/implement`,
que detectará el modo corrección por el contexto de esta conversación y trabajará sobre los
hallazgos.

**Persistencia de hallazgos:** /review nunca escribe ficheros. En Claude Code el solo-lectura
se refuerza a nivel de herramientas: los subagentes revisores son read-only por su campo
`tools` (allowlist DURA) y el comando pre-autoriza solo herramientas de lectura. Ojo:
`allowed-tools` es PRE-APROBACIÓN de permisos, no un sandbox — el bloqueo duro lo dan los
agentes, no el comando. Si quieres que los hallazgos sobrevivan a una sesión limpia futura, es
`/implement` quien los registra en `progress.md` al entrar en modo corrección; indícaselo al
usuario en lugar de intentar escribir tú.

Si el veredicto es Aprobado: recomienda pedir revisión humana de la PR; el workflow de CI del
plugin habrá dejado además su propio comentario de revisión automática.

## Banderas rojas (no te las saltes)

Si te sorprendes pensando algo de la columna izquierda, DETENTE: estás violando tu contrato
de solo-lectura.

| Pensamiento | Realidad |
|---|---|
| "Corrijo este bug pequeño de paso" | /review SOLO informa. Modificar código es trabajo de /implement (modo corrección). |
| "Actualizo spec.md o progress.md con lo que veo" | /review NO escribe ficheros. Persistir hallazgos es trabajo de /implement (Fase 5); el solo-lectura duro lo garantizan los subagentes revisores (su `tools` es read-only), no el `allowed-tools` del comando. |
| "Reporto esto por si acaso, aunque no estoy seguro" | Solo reportas confianza ≥ 75; intenta refutar cada hallazgo antes de incluirlo (Fase 4). |
| "Construyo el grafo para analizar mejor" | Solo-lectura: usa el grafo si ya existe, nunca lo construyas ni actualices (Fase 2.4). |
| "Marco la tarea como aprobada en ClickUp" | /review no cambia estados; el cierre a 'complete' es siempre humano. |
