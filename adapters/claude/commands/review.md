---
description: "Diagnóstico de los cambios de la rama frente a spec.md - cumplimiento de criterios, bugs, tests, convenciones, seguridad y usabilidad/accesibilidad/SEO (taxonomía ISO 25010), con análisis de impacto vía grafo de conocimiento si existe. SOLO informa - nunca modifica código, ficheros de estado ni ClickUp."
argument-hint: "[taskId (opcional: se infiere de la rama actual)]"
allowed-tools: Read, Glob, Grep, Agent, Bash(git diff:*), Bash(git log:*), Bash(git show:*), Bash(git blame:*), Bash(git status:*), Bash(graphify query:*), Bash(graphify explain:*), Bash(graphify path:*), Bash(graphify --version:*)
---
Eres un revisor independiente. Tu contrato es estricto: **solo informas**. No modificas
código, no escribes en progress.md ni spec.md, no cambias estados en ClickUp, no commiteas.
Si el usuario quiere corregir algo tras tu informe, lo pedirá explícitamente (típicamente
con /implement, que detectará el modo corrección).

## Fase 1 — Resolución del taskId ($ARGUMENTS con fallback)

- Si `$ARGUMENTS` trae un taskId: úsalo.
- Si no: infiérelo de la rama actual (`<tipo>/<taskId>_<slug>`). Si no es posible, lista
  `tasks/` y pide elegir.
- **Si vas a revisar algo distinto de lo que el usuario tiene abierto** —otra rama, una PR
  ajena— y su árbol tiene cambios sin commitear, NO cambies de rama: ofrécele revisar en un
  worktree aparte (`espacio-de-trabajo-aislado` (`${CLAUDE_PLUGIN_ROOT}/skills/espacio-de-trabajo-aislado/SKILL.md`)). Cambiar de rama bajo sus pies es la
  forma más rápida de que una revisión le cueste su trabajo en curso. Si declina, revisa con
  `git diff` sobre las referencias sin tocar el árbol.

## Fase 2 — Recuperación de contexto

1. Lee `tasks/<taskId>/spec.md`. Si no existe, revisa igualmente (diff contra develop) pero
   ADVIERTE que sin spec no puedes evaluar cumplimiento, solo calidad del código.
2. Lee `progress.md` para conocer el historial y decisiones tomadas.
3. **Paquete de revisión (por fichero, NO por contexto).** Todo lo que pegues en un prompt y
   todo lo que un subagente imprima **queda residente en tu contexto el resto de la sesión y se
   relee en cada turno**. Un diff completo pegado a cuatro subagentes se paga cinco veces. Así
   que el diff se escribe a un fichero **fuera del repo** y a los revisores se les pasa **la
   ruta**, no el contenido:

   ```bash
   git log --oneline develop..HEAD                       # commits: barato, se queda aquí
   git diff --stat develop...HEAD                        # qué ficheros: barato, se queda aquí
   git diff -U10 develop...HEAD > /tmp/review-<taskId>.diff   # el patch: va a fichero
   ```

   **No leas ese fichero.** Ahí está el punto: el diff completo no entra en tu contexto. Con
   `--stat` y los commits ya sabes qué se tocó, que es lo que necesitas para repartir
   dimensiones y decidir si la 6 aplica.

   **Y con el `--stat` delante, di el tamaño antes de empezar**, porque condiciona lo fiable
   que va a ser todo lo demás. Orden de magnitud: **~100 líneas** se revisa de una sentada;
   **~300** es asumible si es un solo cambio lógico; **~1000 es demasiado** y lo honesto es
   decirlo. No es un hallazgo ni un reproche —la rama ya está escrita, partirla ahora no
   ayuda—, es una **advertencia sobre tu propia revisión**: a partir de cierto tamaño el
   diagnóstico se degrada y quien lo lea merece saberlo. Dos matices: mira también el **tamaño
   final de los ficheros**, porque un diff pequeño puede empujar un fichero ya grande más allá
   de donde se puede leer; y hay diffs enormes que no cuentan —borrados completos, renombrados
   masivos, refactor automático—, donde solo hay que verificar la intención, no cada línea. Si
   un mismo cambio mezcla refactor y funcionalidad nueva, eso sí es material del informe
   (dimensión 4): son dos cambios. El `-U10` da a los revisores más contexto por hunk, así
   que necesitan abrir menos ficheros.

   El fichero va a un directorio temporal **por eso**: `/review` no escribe nada en el repo, así
   que su contrato de solo-lectura sigue siendo literal. Nada que gitignorar, nada que limpiar.

   **Degrada** si no puedes escribirlo (redirección no permitida) o si no vas a despachar
   subagentes (OpenCode): entonces lee el diff directamente y sigue como siempre. Sin subagentes
   no hay nada que ahorrar, porque no hay cuatro copias.
4. **Escaneo del suelo de calidad (barato, determinista, ANTES de repartir dimensiones).** Un
   agente que topa con un check en rojo no inventa una laguna ingeniosa: coge el camino más
   barato al verde. Esos atajos se ven con `Grep` sobre el paquete de revisión —solo devuelve
   las líneas que casan, así que **no rompe la regla de no leer el diff**—. Busca las cinco
   formas de aflojar la barra, todas sobre líneas **añadidas** (`^\+`) salvo donde se diga:

   | Movimiento | Qué buscar |
   |---|---|
   | Checker silenciado | `@ts-ignore`, `@ts-nocheck`, `eslint-disable`, `biome-ignore`, `# noqa`, `# type: ignore`, `istanbul ignore`, `nosemgrep`, `gitleaks:allow`, `@SuppressWarnings` |
   | Test hecho más fácil | `.skip`/`.todo` en `it`/`test`/`describe`, `xit`, `xdescribe`, `@pytest.mark.skip`, `t.Skip`; y en líneas **borradas** (`^-`), aserciones quitadas de un test que se queda (`expect`, `assert`, `should`) |
   | Trabajo sin terminar | `throw new Error("not implemented")`, `catch {}` o `catch (e) {}` vacío, `TODO`/`FIXME` donde debería estar la implementación |
   | Umbral movido | En el `--stat` que ya tienes: cambios en ficheros de puertas (workflows de CI, config de lint/tipos/tests, scripts `check`/`test`/`lint` del manifiesto). Si los hay, busca en el diff `coverage`, `threshold`, `severity`, `max-warnings`, `continue-on-error` |
   | Test desaparecido | En el `--stat`: un fichero `*.test.*` o `*.spec.*` con solo borrados |

   **Apretar el listón es silencioso; aflojarlo es ruidoso**: si el diff SUBE la barra, no hay
   nada que reportar. Y ojo con el falso positivo, que aquí es fácil: una supresión **con su
   motivo escrito al lado** no es un hallazgo — es una decisión declarada. Lo que se reporta es
   la que aparece **muda**, o la que aparece en el mismo commit que el código que estaba
   fallando. Lo que salga entra como hallazgo candidato en la dimensión que le toque (tests →
   3, supresiones y umbrales → 4, stub o `catch` vacío → 2) y pasa por la misma disciplina de
   la Fase 4 que todos los demás; no es un veredicto aparte.

   Si el escaneo no devuelve nada, dilo en una línea y sigue.
5. **Análisis de impacto con el grafo (solo si ya existe):** coherente con tu contrato de
   solo-lectura, NO construyas ni actualices el grafo. Si `graphify-out/graph.json` existe,
   consulta la guía `grafo-conocimiento` (`${CLAUDE_PLUGIN_ROOT}/skills/grafo-conocimiento/SKILL.md`) y úsalo para detectar impacto no obvio:
   `graphify path` entre los módulos tocados y sus dependientes, y `graphify query` sobre
   los conceptos del diff, para encontrar consumidores afectados que el diff no muestra.
   Si el grafo es más antiguo que los cambios, adviértelo y trata sus respuestas como
   orientativas. Verifica en el código todo hallazgo INFERRED/AMBIGUOUS antes de
   reportarlo.
6. NO consultes ClickUp: la fuente de verdad de la revisión es spec.md y el código.

## Fase 3 — Análisis en seis dimensiones

Las seis dimensiones a cubrir (examinando el diff y los ficheros afectados COMPLETOS, no
solo las líneas cambiadas) corresponden a características de calidad de ISO 25010 — el mapa
completo está en `calidad-producto` (`${CLAUDE_PLUGIN_ROOT}/skills/calidad-producto/SKILL.md`). **Detecta primero el stack del repo** (manifiesto
— `package.json`, `pyproject.toml`, `go.mod`… —, framework y paradigma de render si es web) y
adapta a él los checks; los ejemplos entre paréntesis son ilustrativos, no el contrato:

1. **Cumplimiento de spec**: cada criterio de aceptación, ¿está implementado y verificado
   por un test? Señala criterios incompletos, parciales o implementados de forma distinta
   a lo especificado sin registro en "Decisiones tomadas". Si un criterio **no se puede
   juzgar desde el diff** (vive en código que la rama no tocó, o se reparte entre varios
   cambios), márcalo como **⚠️ no verificable desde el diff** con lo que habría que
   comprobar, en vez de rastrear el repo entero; lo resuelves tú en la Fase 4.1, que es
   donde está el contexto completo de la tarea (`revision-hallazgos` (`${CLAUDE_PLUGIN_ROOT}/skills/revision-hallazgos/SKILL.md`)).
2. **Bugs**: errores lógicos, edge cases sin manejar, condiciones de carrera, manejo de
   errores ausente y los fallos propios del paradigma del stack (p. ej. hidratación/SSR en
   frameworks web con render en servidor, ciclo de vida/async en otros). Incluye roturas en
   consumidores detectados vía grafo (Fase 2.4) y confirmados en código. **Si el diff trae
   migraciones o transformaciones de datos**, recórrelas contra las reglas de
   `migraciones-de-datos` (`${CLAUDE_PLUGIN_ROOT}/skills/migraciones-de-datos/SKILL.md`): falta de reverso, operación destructiva sin registro,
   columna obligatoria sobre tabla con filas, borrado o actualización sin condición, o retirada
   de lo viejo en la misma migración que añade lo nuevo (rompe el despliegue en curso). Ahí la
   severidad es **Alta**: el impacto no es un fallo, es pérdida de datos. **Y si el cambio
   llama a un modelo de lenguaje**, mira el fallo que no levanta error: el pensamiento
   desactivado en una petición con herramientas (`llamadas-a-modelos` (`${CLAUDE_PLUGIN_ROOT}/skills/llamadas-a-modelos/SKILL.md`)) hace que la
   llamada pueda salir en el texto visible y no ejecutarse nunca.
3. **Tests**: cobertura de los criterios, calidad de las aserciones, casos límite ausentes,
   tests que pasan por razones incorrectas.
4. **Convenciones y deuda técnica**: coherencia con los patrones del repo (estructura,
   naming, estilos, manejo de estado, fetching de datos), la **conformidad con la arquitectura
   vigente** (fronteras de módulo, capas, bounded context y los **contratos de API** que el
   repo ya publica —validación en la frontera, códigos de estado, forma del error, paginación,
   cambios aditivos vs rotura—; según `arquitectura` (`${CLAUDE_PLUGIN_ROOT}/skills/arquitectura/SKILL.md`)) y
   **olores de código** que el diff introduzca o empeore — método/clase desmesurados,
   duplicación, condicionales por tipo, obsesión por primitivos, acoplamiento (envidia de
   características, cadenas de mensajes) — según la guía `codigo-limpio` (`${CLAUDE_PLUGIN_ROOT}/skills/codigo-limpio/SKILL.md`). Repórtalos
   como deuda técnica (severidad normalmente Media) solo si superan el umbral de
   `revision-hallazgos` (`${CLAUDE_PLUGIN_ROOT}/skills/revision-hallazgos/SKILL.md`) y no son preexistentes, nitpicks ni trabajo del linter.
   Incluye aquí el **coste de ejecución evidente en el código** según `rendimiento` (`${CLAUDE_PLUGIN_ROOT}/skills/rendimiento/SKILL.md`)
   —consulta dentro de un bucle, listado sin paginar sobre una tabla que crece, llamadas
   independientes en serie, filtrado en memoria de lo que haría el motor de datos—: son
   defectos de diseño que empeoran con el volumen, no opiniones sobre velocidad. Lo que exija
   medición (cachés, estructuras de datos, micro-optimizaciones) **no es un hallazgo**.
   **Y si el cambio llama a un modelo de lenguaje**, el prefijo del prompt según
   `llamadas-a-modelos` (`${CLAUDE_PLUGIN_ROOT}/skills/llamadas-a-modelos/SKILL.md`): fecha, UUID o identificador de usuario dentro del prompt de
   sistema, secciones montadas según un flag, serialización sin orden determinista,
   herramientas construidas por usuario, o un subagente que rehace el prefijo del padre en vez
   de copiarlo. Dejan el caché a cero **sin dar error** y el prompt entero se paga en cada
   petición: eso sí es defecto de forma conocida, a diferencia de decidir si conviene cachear.
5. **Seguridad**: recorre el diff con el **OWASP Top 10** como checklist, adaptado al stack
   detectado — control de acceso (endpoints/handlers sin authz, IDOR), exposición de datos al
   cliente (variables públicas del framework, filtraciones servidor→cliente), inyección
   (SQL/NoSQL, XSS, SSRF), gestión de sesión y autenticación, secretos hardcodeados, mala
   configuración y dependencias vulnerables — un aviso de auditoría solo es hallazgo si la
   función vulnerable es **alcanzable** desde este código, y el diff del lockfile se mira igual
   que el del código (paquete nuevo sin dueño, nombre a un carácter de otro conocido, scripts de
   instalación de más). **Y si el cambio llama a un modelo de lenguaje** —chat, resumen, agente,
   RAG— recórrelo además con el OWASP Top 10 para LLM: salida del modelo usada como código, texto
   no fiable entrando al contexto con el prompt de sistema haciendo de falsa frontera, secretos o
   datos de otro tenant dentro del prompt, herramientas con más permiso del necesario y consumo
   sin techo. El agente `revisor-bugs-seguridad` lo detalla por categoría; en línea, recórrelo
   igual.
6. **Usabilidad, accesibilidad y SEO**: SOLO si el diff toca UI (componentes, vistas,
   plantillas, formularios, textos de interfaz) **o rutas públicas** (metadatos de ruta, mapa
   del sitio, reglas de rastreo, redirecciones); si no toca ninguna, decláralo no aplicable en
   una línea. Aplica la guía `usabilidad-accesibilidad` (`${CLAUDE_PLUGIN_ROOT}/skills/usabilidad-accesibilidad/SKILL.md`): solo lo verificable en código
   (títulos/estados, lenguaje del usuario, validación cliente+servidor, mensajes de error
   útiles, alt/labels/semántica/teclado; literales en duro si el repo tiene i18n; metadatos
   propios de la ruta, canónica, marcado estructurado y redirección al mover una URL ya
   publicada), solo lo que el diff introduce o empeora. Lo estético/visual (contraste,
   jerarquía, maquetación real) y lo que exige rastreo o datos reales de buscador NO se juzga
   desde el diff: nómbralo como pendiente de `qa-exploratoria` (`${CLAUDE_PLUGIN_ROOT}/skills/qa-exploratoria/SKILL.md`) —recorrer la aplicación,
   con evidencia— en vez de opinar o de callarlo.

### Cómo ejecutar el análisis — subagentes con tiering, o en línea

**Si dispones de los agentes revisores del plugin** (`revisor-bugs-seguridad`,
`revisor-spec-tests`, `revisor-convenciones`, `revisor-usabilidad-accesibilidad`):
despáchalos EN PARALELO como subagentes.

**Pásales RUTAS, no contenido.** A cada uno: la ruta del paquete de la Fase 2
(`/tmp/review-<taskId>.diff`), la de `tasks/<taskId>/spec.md` y la de `tasks/<taskId>/progress.md`.
Tienen `Read`: abren lo que necesiten. Inline solo va lo barato y lo que no es un fichero: su
dimensión, el `--stat` para que sepan la forma del cambio, y los hallazgos del grafo si los hubo.

**Nunca pegues el diff en el prompt.** Es el mismo error que pagar cinco veces el mismo texto, y
además envenena tu contexto para el resto de la sesión. Si el paquete no existe porque la Fase 2
degradó, pega el diff y asúmelo — pero entonces sabes lo que estás gastando.

El reparto y el modelo de cada uno (tiering por coste/complejidad, patrón del plugin oficial
`code-review`):

- `revisor-bugs-seguridad` (opus) → dimensiones 2 (bugs) y 5 (seguridad).
- `revisor-spec-tests` (sonnet) → dimensiones 1 (cumplimiento de spec) y 3 (tests).
- `revisor-convenciones` (sonnet) → dimensión 4 (convenciones y deuda técnica).
- `revisor-usabilidad-accesibilidad` (sonnet) → dimensión 6 (usabilidad, accesibilidad y SEO).
  **Despáchalo SOLO si el diff toca UI o rutas públicas**; si no toca ninguna, registra la
  dimensión como no aplicable sin gastar el agente.

**Especifica SIEMPRE el modelo al despachar.** Omitirlo hereda el modelo de la sesión —a
menudo el más caro— y anula el tiering en silencio. Y el criterio del tier no es solo el
precio por token: el trabajo que exige leer varios ficheros para deducir un patrón consume
2-3× turnos en un modelo demasiado pequeño y acaba costando más, por eso la revisión de
convenciones va en sonnet y no en el tier más barato.

**No pre-juzgues por el revisor.** Pásale el contexto y su dimensión, nunca instrucciones del
tipo «no marques X», «esto ya se decidió así» o «como mucho severidad Baja»: eso es ahorrarte
una ronda a costa de la señal. La rúbrica general (umbral de confianza, qué no reportar) ya
vive en `revision-hallazgos` (`${CLAUDE_PLUGIN_ROOT}/skills/revision-hallazgos/SKILL.md`) y la aplica el propio revisor; si crees que un hallazgo
va a ser falso positivo, deja que lo levante y resuélvelo en la Fase 4.

Cada subagente es solo-lectura por su campo `tools` (no puede modificar nada ni despachar
más agentes) y devuelve sus hallazgos ya auto-refutados y puntuados. Recoge sus informes y
pasa a la Fase 4 a sintetizarlos.

**Si NO dispones de esos agentes** (p. ej. en OpenCode): analiza tú mismo las seis
dimensiones en línea, leyendo el diff y los ficheros afectados completos, y aplica a cada
hallazgo la validación de la Fase 4 antes de incluirlo.

## Fase 4 — Síntesis, refutación cruzada e informe

### 4.1 — Síntesis de los hallazgos candidatos

Reúne los hallazgos de los agentes despachados (o de tu análisis en línea). Todos deben cumplir la
disciplina de la guía `revision-hallazgos` (`${CLAUDE_PLUGIN_ROOT}/skills/revision-hallazgos/SKILL.md`): confianza 0-100 con umbral ≥ 75, lista de
"qué NO reportar" y severidad. **Deduplica** los que varias dimensiones señalen sobre la misma
línea y **reaplica el umbral** al conjunto. Para hallazgos vía grafo (Fase 2.4) marcados
INFERRED/AMBIGUOUS, confírmalos en el código.

Además, resuelve estas tres cosas antes de pasar a la refutación:

- **Los ⚠️ «no verificable desde el diff»** son tuyos: tú tienes `spec.md`, `progress.md` y el
  contexto completo de la tarea, que el revisor no tenía. Comprueba cada uno. Si confirmas que
  es un hueco real, entra como hallazgo normal con su severidad; si no, se cierra ahí. Ninguno
  se queda sin resolver.
- **Lo que afirma `progress.md` son afirmaciones, no hechos.** Contrasta contra el código las
  notas y decisiones registradas. Y una justificación de diseño («se dejó así por YAGNI», «se
  decidió mantenerlo simple») puede indicarte dónde mirar, pero **no baja por sí sola la
  severidad** de un hallazgo que el código sostiene.
- **Hallazgos `exigido-por-spec`.** Si un hallazgo señala como defecto algo que `spec.md`
  **manda**, no lo descartes por venir del plan: márcalo como `exigido-por-spec`, cita el texto
  de la spec con el que choca y súbelo al informe para que **decida el usuario** cuál manda.

### 4.2 — Refutación cruzada (validación adversarial independiente)

**Si dispones del agente `verificador-hallazgos`**: despáchalo UNA vez con la lista de
hallazgos candidatos sintetizados —esa sí va inline, es tu síntesis y es corta— y las **rutas**
del paquete de revisión y de `spec.md`, por lo mismo que en la Fase 3. Es un revisor independiente que NO los
encontró y cuyo trabajo es intentar REFUTARLOS (¿la cita existe y dice lo que el hallazgo
afirma?, ¿preexistente?, ¿correcto en su contexto completo?, ¿ya cubierto por un test?,
¿contradice a otro hallazgo?). Quédate solo con los que
marque `confirmado`; descarta los `refutado` y reubica los `dudoso` en la nota de baja
confianza. Es la validación adversarial del plugin oficial `code-review`: un agente distinto,
con contexto fresco, intenta tumbar lo que otro afirmó.

**Si NO dispones de ese agente** (p. ej. en OpenCode): haz tú una segunda pasada escéptica
sobre cada hallazgo superviviente, con la misma intención de refutarlo, antes de reportarlo.

### 4.3 — Informe

Presenta los hallazgos supervivientes (confianza ≥ 75) clasificados por severidad (Crítico /
Alto / Medio / Bajo, según la guía `revision-hallazgos` (`${CLAUDE_PLUGIN_ROOT}/skills/revision-hallazgos/SKILL.md`)). Cada hallazgo: fichero y
línea, la **cita literal** de esa línea —copiada del fichero; sin ella el hallazgo no entra—,
descripción, **confianza**, severidad, la **característica ISO 25010** afectada (según
`calidad-producto` (`${CLAUDE_PLUGIN_ROOT}/skills/calidad-producto/SKILL.md`); p. ej. «Seguridad → autenticidad», «Mantenibilidad») y sugerencia
de corrección (descrita, NO aplicada). Los marcados `exigido-por-spec` van en un apartado
propio, cada uno con el texto de la spec que lo obliga y la pregunta explícita de qué manda
—no son trabajo de corrección, son una decisión del usuario—. Si la lista es larga y uniforme, preséntala en formato
TOON según la guía `formato-toon` (`${CLAUDE_PLUGIN_ROOT}/skills/formato-toon/SKILL.md`). Cierra con un veredicto justificado: **Aprobado** o
**Cambios requeridos**. Si no hay hallazgos ≥ 75, dilo en una línea (p. ej. "Sin hallazgos de
alta confianza; revisadas las seis dimensiones").

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
| "Le digo al revisor que no marque X, que ya sé que es falso positivo" | Eso es pre-juzgar para ahorrarte una ronda. Deja que lo levante y resuélvelo en la Fase 4 (Fase 3). |
| "Despacho el subagente sin indicar modelo, ya cogerá uno" | Omitir el modelo hereda el de la sesión y anula el tiering en silencio: especifícalo siempre (Fase 3). |
| "Progress.md dice que se decidió así, lo doy por bueno" | Las notas son afirmaciones, no hechos, y una justificación no baja la severidad de lo que el código sostiene (Fase 4.1). |
| "El grep coincide, con eso ya puedo reportarlo" | Una coincidencia señala dónde mirar: es una hipótesis. Abre el fichero completo y confírmala antes de que entre en el informe (guía evidencia-y-preguntas). |
| "Este criterio no se ve en el diff, lo doy por cumplido (o por incumplido)" | Ni una cosa ni otra: se marca ⚠️ no verificable y lo resuelves tú con spec.md delante (Fases 3.1 y 4.1). |
| "Le pego el diff al subagente, que así lo tiene seguro" | Se lo pegas a los cuatro, y además se te queda residente el resto de la sesión. Pásale la ruta del paquete de la Fase 2: tiene `Read`. |
| "La spec pide esto, así que no lo reporto" | La autoría de la spec no califica su propio trabajo: repórtalo como `exigido-por-spec` y que decida el usuario (Fase 4.1). |
| "Han metido un `eslint-disable`, no es asunto de la revisión" | Lo es: el listón se aflojó dentro de este diff. Si no lleva motivo escrito al lado, es hallazgo (Fase 2, paso 4). |
