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
   **Empieza por lo más barato: localiza la línea y cópiala.** Abre el fichero, lee la línea
   que vas a citar y pega el fragmento **literal** en el hallazgo, junto a `fichero:línea`. Si
   la línea no está, el fichero no existe o dice otra cosa, el hallazgo **se cae entero** —no
   baja de confianza, se descarta—. Es la única comprobación que no exige razonar sobre el
   fondo, así que hacerla primero te ahorra el resto ({{guide:evidencia-y-preguntas}}).
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
4. **Deduplica por causa, no por síntoma.** Un mismo defecto puede aflorar en varios ficheros,
   pantallas o dimensiones: es **un** hallazgo con varias manifestaciones, no varios hallazgos.
   Agrúpalos bajo la causa común y enumera dónde se manifiesta. Contar síntomas infla el informe
   y provoca lo peor: que se parchee cada aparición y la causa siga viva.

## Tres reglas de independencia del revisor

Un revisor que hereda las conclusiones de otro no revisa: las repite. Estas tres reglas
mantienen la revisión independiente de quien escribió el código y de quien escribió el plan.

### 1. Lo que se te cuenta son afirmaciones, no hechos

Las notas de `progress.md`, el resumen del implementador y los comentarios del código son
**afirmaciones sin verificar**. Contrástalas con el código.

Y las justificaciones de diseño son afirmaciones también: «lo dejé así por YAGNI», «lo mantuve
simple a propósito», «se decidió en su momento» es el autor calificando su propio trabajo. Una
justificación puede llevarte a mirar dónde no habías mirado, pero **nunca baja por sí sola la
severidad de un hallazgo**. Si el código no lo sostiene, el hallazgo sigue en pie.

### 2. Un hallazgo que la spec exige SIGUE siendo un hallazgo

Si detectas como defecto algo que `spec.md` **manda** hacer (un test que no asevera nada,
duplicación exigida por el enfoque aprobado, un criterio que fuerza una mala decisión), no lo
descartes por venir del plan: **la autoría de la spec no califica su propio trabajo**.

Repórtalo con la etiqueta **`exigido-por-spec`**, junto al texto de la spec con el que choca.
No lo corriges y no lo silencias: **decide el usuario** cuál manda.

### 3. Lo que no puedas verificar, decláralo — no amplíes la búsqueda

Algunos requisitos no se pueden juzgar desde el diff: viven en código que la rama no tocó, o
se reparten entre varios criterios. Ante uno de esos, **no te pongas a rastrear el repo**:
márcalo como **⚠️ no verificable desde el diff**, di exactamente qué habría que comprobar, y
sigue con el resto.

No bloquea la revisión, pero **tampoco se pierde**: quien orquesta tiene el contexto completo
de la tarea y resuelve cada ⚠️ antes de cerrar. Si al resolverlo confirma que es un hueco real,
entra como hallazgo normal.

## Qué NO hace quien orquesta la revisión

Si estás despachando revisores en vez de revisando, hay una tentación que arruina la revisión:
**pre-juzgar por ellos**. Si el prompt que estás escribiendo contiene «no marques X», «no lo
trates como defecto», «como mucho Bajo» o «esto ya se decidió así» — **para**: estás ahorrándote
una ronda a costa de la señal.

Deja que el revisor levante el hallazgo y resuélvelo después. (No confundir con la lista de
abajo: eso es una **rúbrica general** que el revisor aplica a todo, no una instrucción para
tapar un caso concreto que te incomoda.)

## Ordena por palanca, no por orden de descubrimiento

Un informe no es una lista de todo lo que viste: es lo que el autor tiene que hacer, en el
orden en que le conviene hacerlo. Primero corrección y seguridad; después lo estructural —una
frontera rota, una simplificación que se dejó pasar—; y al final el resto.

La regla que se olvida: **si tienes un problema estructural y diez detalles menores, el
problema estructural ES la revisión.** Enterrarlo entre nits garantiza que se lea como uno más
de la lista y se corrija el último, o ninguno. Unos pocos hallazgos con convicción alta valen
más que un inventario largo, porque el inventario largo se lee entero una vez y se ignora la
siguiente.

Y por eso la severidad tiene que distinguir de verdad lo obligatorio de lo opcional: si todo
llega con el mismo peso, el autor trata todo como obligatorio, gasta el tiempo en lo barato y
acaba desconfiando de la siguiente revisión.

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
