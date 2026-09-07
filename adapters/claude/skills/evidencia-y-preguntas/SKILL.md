---
name: evidencia-y-preguntas
description: "Úsala siempre que vayas a escribir un dato que no has comprobado —en spec.md, en progress.md o en un informe— y para decidir si un hueco se verifica, se asume declarándolo, o se pregunta al usuario. Síntomas: te oyes decir «seguro que usan X», «debería funcionar» o «ya se corregirá»; vas a preguntar algo que está en el repo; das por bueno lo que afirma progress.md o un subagente sin abrir el código."
user-invocable: false
license: MIT
---
# Evidencia y preguntas (nada se afirma sin comprobarlo)

Es la guía transversal del plugin: aplica a los cuatro comandos y a todos los subagentes. Otras
guías la aplican a su terreno —`revision-hallazgos` (`${CLAUDE_PLUGIN_ROOT}/skills/revision-hallazgos/SKILL.md`) a un hallazgo,
`depuracion-sistematica` (`${CLAUDE_PLUGIN_ROOT}/skills/depuracion-sistematica/SKILL.md`) a una causa, `qa-exploratoria` (`${CLAUDE_PLUGIN_ROOT}/skills/qa-exploratoria/SKILL.md`) a un defecto de
interfaz— y aquí está la regla de la que salen todas.

Hay **dos formas de fallar**, y una guía que solo ataque una produce la otra:

- **Inventar.** Rellenar un hueco con lo plausible y escribirlo con el mismo tono que lo
  comprobado. Es el fallo caro, porque no deja rastro: una suposición redactada como hecho es
  indistinguible de un hecho hasta que alguien construye encima.
- **Preguntar de más.** Trasladar al usuario cada hueco, incluido el que se resuelve leyendo un
  fichero. Es pereza disfrazada de rigor: gasta el turno de quien podría estar decidiendo lo
  que sí es suyo, y entrena a saltarse las preguntas que importan.

## La regla

**Ninguna afirmación se escribe sin que conste de dónde sale.** Todo dato que acabe en
`spec.md`, en `progress.md`, en un informe de `/review` o en un mensaje al usuario cae en una
de tres procedencias, y lo que no cae en ninguna no se escribe:

| Procedencia | Qué es | Cómo se reconoce |
|---|---|---|
| **Hecho comprobado** | Lo has leído en el repo o ejecutado y visto la salida | Puedes señalar el fichero, la línea o el comando |
| **Asunción declarada** | No es comprobable, pero has elegido una lectura y la has escrito como tal | Está por escrito, marcada como asunción, con lo que pasaría si fuera la otra |
| **Dato del usuario** | Te lo ha dicho quien decide | Consta quién y cuándo |

La regla es plana: no tiene excepción por prisa, por tarea trivial ni por «se sobreentiende».

## El test de los tres escalones

Ante un hueco, antes de escribir nada:

1. **¿Es comprobable desde aquí?** —leyendo el repo, ejecutando un comando, consultando la
   documentación de la herramienta— → **compruébalo**. No se pregunta lo que se puede mirar.
   Qué framework usan, qué runner hay, cómo se llama esa función, si esa columna acepta nulos,
   qué versión está fijada: todo eso son hechos, y están en el repo.
2. **¿No es comprobable, pero todas las lecturas llevan al mismo trabajo?** → **asume, declara
   la asunción y sigue.** Parar aquí es interrumpir sin motivo.
3. **¿No es comprobable, y las lecturas llevan a trabajos distintos —o equivocarse sale caro o
   es irreversible—?** → **pregunta, y para en eso.**

**Para separar el 2 del 3, dale la vuelta a la pregunta:** *si la respuesta fuera la otra,
¿cambiaría lo que voy a escribir o a construir?* Si no cambia nada, es escalón 2 y se asume. Si
cambia el criterio de aceptación, el enfoque, el esquema de datos o algo que no se deshace, es
escalón 3 y se pregunta. Ante duda entre los dos escalones, sube al 3: una interrupción cuesta
un turno, y construir sobre la lectura equivocada cuesta la tarea.

**Parar en eso, no parar del todo.** El escalón 3 bloquea lo que depende de la respuesta, no el
resto. Avanza todo lo demás y deja la pregunta planteada; devolver una sesión entera sin trabajo
hecho por una duda parcial es su propio fallo.

## Qué cuenta como comprobar

- **Leer el fichero completo**, no solo las líneas del diff: el contexto que falta es justo
  donde vive la refutación.
- **Ejecutar el comando y leer su salida.** «Debería pasar» no es un resultado.
- **Distinguir buscar de leer.** Una coincidencia de `grep` o una ruta del grafo señalan dónde
  mirar; son **hipótesis**, y se confirman abriendo el fichero (`grafo-conocimiento` (`${CLAUDE_PLUGIN_ROOT}/skills/grafo-conocimiento/SKILL.md`)).
- **Lo que afirma otro no es un hecho por venir de dentro.** Lo que diga `progress.md`, un
  subagente o el propio enunciado de la tarea es una afirmación con autor: se verifica igual que
  la de fuera (`revision-hallazgos` (`${CLAUDE_PLUGIN_ROOT}/skills/revision-hallazgos/SKILL.md`)).
- **Una regla que has deducido se comprueba buscándole el contraejemplo**, no acumulando casos
  que la confirman. Reunir ejemplos a favor no distingue una regla correcta de una que casi
  siempre acierta: el único caso que informa es el que la rompería. **No basta con no tener
  contraejemplo; hay que haberlo buscado** —y la forma de buscarlo suele ser generar casos
  pequeños y contrastarlos con la versión obviamente correcta
  (`niveles-y-tipos-de-prueba` (`${CLAUDE_PLUGIN_ROOT}/skills/niveles-y-tipos-de-prueba/SKILL.md`)). Si lo buscaste y no apareció, sigue siendo una asunción
  y se declara como tal.
- **Una fuente externa se contrasta con la primaria de su tema** —el RFC, la documentación del
  motor, la norma— antes de que su contenido entre en una decisión. El material divulgativo vale
  para saber qué mirar, no para citarlo.
- **Un hecho sobre un framework se comprueba contra la versión que el repo tiene instalada**, no
  contra la que recuerdas. Las APIs se deprecan y los patrones recomendados cambian de una mayor
  a la siguiente, así que el orden es: leer la versión exacta en el manifiesto o el lockfile →
  buscar la documentación oficial **de esa versión** → y dejar la **URL concreta** junto a la
  decisión (en `spec.md`, en el comentario del código o en la propia respuesta), con enlace
  profundo al apartado, no a la portada. Si la versión no se puede determinar, se pregunta: es
  la que decide qué patrón es correcto. Y si tras buscarla **no encuentras documentación** del
  patrón, dilo con esas palabras —«no he encontrado documentación oficial de esto; va de
  memoria y puede estar desactualizado»— en vez de presentarlo como comprobado.

## Cómo se declara una asunción

En una línea, donde se vaya a leer: en «Decisiones tomadas» de `spec.md` si condiciona el
trabajo, o en `progress.md` si es del momento. Lleva **qué asumes, por qué no era comprobable, y
qué se rompe si es falsa** — esa última parte es la que convierte la asunción en algo que otro
puede refutar de un vistazo.

> *Asunción: el listado de sedes no pasa de unas decenas de filas, porque las da de alta el
> equipo interno y no hay importación masiva. No he encontrado dónde se acota. Si crece sin
> techo, el listado sin paginar de `SedesPanel` pasa a ser un defecto de rendimiento.*

## Cómo se pregunta, cuando toca

- **Una pregunta cada vez**, con tu respuesta recomendada y en orden de dependencia: un bloque
  de dudas de golpe desconcierta, y cada respuesta cambia las siguientes.
- **Di qué harás con cada respuesta.** Una pregunta cuyas dos salidas producen el mismo trabajo
  era escalón 2 y no debía preguntarse.
- **Pregunta por decisiones, no por hechos.** Las decisiones son suyas —el alcance, la
  prioridad, qué se pierde, qué se rompe—; los hechos son tuyos y están en el repo.

## Anti-patrones (nómbralos para no caer en ellos)

- **Suposición con voz de hecho** — escribir «el proyecto usa X» sin haberlo mirado. Si resulta
  falso, el error no se descubre donde se cometió, sino tres pasos después.
- **Preguntar lo comprobable** — «¿qué runner de tests usáis?» con el manifiesto delante.
- **Confianza heredada** — dar por bueno lo que dice `progress.md` o un subagente porque viene
  de dentro del flujo.
- **«Debería funcionar»** — afirmar el resultado de algo que no se ha ejecutado.
- **Citar una fuente sin contrastarla** — un post, un hilo o un archivo divulgativo puestos al
  nivel de la documentación oficial. Sirven para saber qué mirar, no como respuesta.
- **Bloquear entero por una duda parcial** — devolver la sesión sin nada hecho porque falta un
  dato que solo afectaba a una parte.
- **Preguntar para cubrirse** — trasladar la decisión que ya te tocaba a ti para que la firme
  otro. Si el test dice escalón 2, se asume y se declara.
- **Escribir el patrón del framework de memoria** — «así se hace en React». ¿En qué versión?
  Léela en el manifiesto y busca la documentación de esa versión, con la URL al lado.

## Banderas rojas

Si te sorprendes pensando algo de la izquierda, DETENTE: estás a punto de escribir algo que no
puedes sostener.

| Pensamiento | Realidad |
|---|---|
| "Seguro que usan X, es lo normal en este stack" | Lo normal no es lo que hay. Ábrelo y míralo: es escalón 1. |
| "Lo pongo así y si me equivoco ya se corrige" | Se corrige si alguien lo detecta. Una suposición sin marcar se lee como hecho y nadie la revisa. |
| "No está claro, pero no quiero interrumpir" | Dale la vuelta: si la otra respuesta cambiara el trabajo, interrumpir es lo barato. |
| "Le paso todas mis dudas y que elija" | Una cada vez, con tu recomendación, y solo las que son decisiones suyas. |
| "El grafo lo dice, con eso me vale" | El grafo señala dónde mirar. Confírmalo en el código antes de escribirlo. |
| "Lo dice progress.md, es del propio flujo" | Es una afirmación con autor, no un hecho. Verifícala como cualquier otra. |
| "Debería pasar, el cambio es evidente" | Ejecuta y lee la salida. Sin ella no puedes afirmarlo. |
| "Lo vi en un artículo / en el PDF ese" | Contrasta con la fuente primaria del tema antes de meterlo en una decisión. |
| "He probado cinco casos y sale bien" | Cinco casos a favor no comprueban una regla. Busca el que la rompería; una regla que casi siempre acierta se comporta igual que una correcta hasta que no. |

## Autocrítica antes de cerrar

Antes de escribir en `spec.md`, registrar en `progress.md` o emitir un informe, pregúntate:
**¿cada afirmación que he escrito es un hecho comprobado, una asunción declarada o un dato del
usuario? ¿hay alguna que no sepa clasificar? ¿alguna regla que doy por buena la he confirmado
juntando ejemplos a favor en vez de buscarle el contraejemplo? ¿pregunté algo que estaba en el
repo? ¿me callé
una duda cuya otra respuesta habría cambiado el trabajo? ¿bloqueé cosas que no dependían de la
pregunta?** Si algo falla, corrígelo antes de seguir.
