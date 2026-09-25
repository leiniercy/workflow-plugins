---
name: revision-hallazgos
description: "Úsala en /review y en los subagentes revisores, antes de reportar cualquier hallazgo. Síntomas de que la necesitas: dudas de si algo es un defecto real o un nitpick, si ya lo pillaría el linter, si ya estaba roto antes de tu cambio, o si merece bloquear una PR."
---
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
   fondo, así que hacerla primero te ahorra el resto (`evidencia-y-preguntas` (skill de OpenCode, auto-activable)).
2. **Confianza (0-100) y umbral.** Asigna a cada superviviente un nivel, según la fuerza
   de la señal que lo levantó (sección siguiente):

   | Confianza | Significado |
   |---|---|
   | 0 | falso positivo / no sostenible |
   | 25 | quizá real, sin evidencia que lo sostenga |
   | 50 | probable, pero la evidencia admite otra lectura |
   | 75 | sostenible con evidencia concreta ante el autor |
   | 100 | certero |

   La escala mide **cuán sostenible es el hallazgo**, no cuánto daño hace: el daño es el paso
   3. Un defecto pequeño y seguro es 100 de confianza y severidad Baja; uno grave del que no
   estás seguro es Crítico si se confirma, pero hoy no pasa el umbral.

   Solo cuentan los de **confianza ≥ 75**. Los de 50-74 van a una nota breve ("posibles, baja
   confianza", una línea cada uno); por debajo de 50 se descartan.
3. **Severidad** del que pasa el umbral: **Crítico** (rompe funcionalidad, seguridad
   comprometida o criterio fallido), **Alto** (bug probable o desviación significativa de spec),
   **Medio** (deuda técnica, test ausente, convención rota), **Bajo** (estilo, nits).
4. **Deduplica por causa, no por síntoma.** Un mismo defecto puede aflorar en varios ficheros,
   pantallas o dimensiones: es **un** hallazgo con varias manifestaciones, no varios hallazgos.
   Agrúpalos bajo la causa común y enumera dónde se manifiesta. Contar síntomas infla el informe
   y provoca lo peor: que se parchee cada aparición y la causa siga viva.

## De qué depende la confianza del paso 2

Si nadie dice de qué depende, la confianza se asigna a ojo, y a ojo casi todo acaba en 75.

Cada señal que levanta un hallazgo tiene una **fuerza propia**, y es un eje distinto de la
gravedad del defecto que anuncia. Confundirlos es lo que llena los informes de ruido:

| Eje | La pregunta | Dónde se decide |
|---|---|---|
| **Fuerza de la señal** | Al verla, ¿cuántas veces de diez hay defecto detrás? | En el catálogo de la guía que la define |
| **Severidad** | Si hay defecto, ¿cuánto daño hace? | Paso 3 |

Una señal **basta sola** cuando un profesional no la produce a propósito casi nunca: una
escritura que depende de una lectura previa sin protección, un secreto en el diff, un criterio
de aceptación sin ningún test que lo toque. Vista una vez, ya hay hallazgo.

Una señal es **débil en solitario** cuando tiene usos legítimos frecuentes: lo que también es
una decisión de estilo, una elección de diseño defendible o el resultado normal de una
herramienta. Vista una vez, lo que tienes es **dónde mirar**, no un hallazgo.

**La regla.** Una señal débil en solitario no llega a 75 por sí misma. Llega si en el mismo
trozo de código la acompaña **otra señal independiente**, o si la auto-refutación encuentra la
**consecuencia concreta** —la fila que se pierde, la petición que se cuelga, el dato que sale
mal, el dato que lee quien no debería—. Sin una cosa o la otra, es nota de baja confianza o no
es nada.

**En seguridad, el camino de ataque descrito ES la consecuencia concreta.** No hace falta
explotarlo ni medirlo: basta con poder escribir quién llega, por dónde y qué se lleva. Y la
regla no se usa nunca al revés: casi toda señal de seguridad tiene un uso legítimo en algún
sitio —la autorización suele vivir en el middleware, `dangerouslySetInnerHTML` es válido con
saneador, un CORS abierto es correcto en una API pública—, así que clasificarlas como débiles
por eso vaciaría la dimensión entera. Si dudas con una señal de seguridad, **sube**: el umbral
está aguas arriba de la severidad, y lo que no llega a 75 no se puntúa como Crítico después,
desaparece.

**Tres señales débiles del mismo tipo no suman una fuerte.** Eso es contar el mismo síntoma
tres veces, y lo que toca es el paso 4: un hallazgo con varias manifestaciones.

**Cuando la guía que define la señal no marca su fuerza, trátala como débil en solitario.** No
es «bájala»: es que te toca **escribir la consecuencia concreta** —abre el fichero y di qué se
rompe, quién lo nota y cuándo—, que es trabajo que de todas formas tenías que hacer para
sostener el hallazgo. Si la escribes, la señal llega a 75 igual.

El default va a lo conservador a propósito. Un catálogo sin marcar es un hueco del catálogo, no
permiso para puntuar a ojo, y «decídelo tú» acaba siendo 75 por inercia, que es de donde viene
todo esto. Cada guía que marca sus señales **relaja** este default para su terreno, así que
marcar catálogos es una mejora incremental y no un requisito previo.

La excepción es la de siempre y va al revés: en seguridad, ante duda, se sube.

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
- **La señal débil promovida sola** — puntuar 75 algo que tiene usos legítimos frecuentes sin
  una segunda señal ni la consecuencia concreta. Es la vía por la que entra casi todo el ruido.
- **La señal fuerte degradada por comodidad** — llamar «débil en solitario» a lo que el
  catálogo marca como suficiente, o a una señal de seguridad cuyo camino de ataque sabrías
  escribir. Sale más barato que sostener el hallazgo y no deja rastro: lo que no llega a 75 no
  aparece en el informe, así que nadie puede discutirlo. Es el fallo simétrico del anterior y
  el más caro de los dos.

## Autocrítica antes de reportar

Por cada hallazgo, pregúntate: **¿lo sostendría ante el autor con el código delante? ¿la señal
que lo levantó basta sola, o le he dado 75 sin segunda señal ni consecuencia concreta? ¿y al
revés: he bajado alguna de 75 porque sostenerla daba trabajo? ¿alguno de los que he dejado
fuera es de seguridad y sabría escribir su camino de ataque?** Si la
respuesta titubea, baja su confianza o descártalo. La revisión vale por lo que confirma, no por
lo que enumera.
