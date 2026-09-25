# Ingeniería de prompts (el oficio, no el truco del mes)

Esta guía cubre **cómo se escribe la instrucción que recibe un modelo de lenguaje**, tanto en el
código del producto como en los propios prompts con los que trabajamos. {{guide:llamadas-a-modelos}}
decide *qué modelo* y *cómo se paga*; esta decide *qué le dices*. Y
{{guide:evidencia-y-preguntas}} es su pariente más cercano: casi todo lo que sigue existe para que
el modelo no rellene con plausibilidad lo que no le has dado.

| La situación | La guía |
|---|---|
| Qué modelo, caché, lotes, esfuerzo | {{guide:llamadas-a-modelos}} |
| Qué le digo al modelo y cómo lo estructuro | **Esta.** |
| El modelo como superficie de ataque | La dimensión de seguridad de `/review`, con el OWASP para LLM |
| Cómo pruebo que el prompt hace lo que digo | {{guide:niveles-y-tipos-de-prueba}} y {{guide:historias-usuario}} |

---

## Regla 0 — Lo que depende del modelo no se escribe aquí

**El comportamiento concreto de un modelo —verbosidad por defecto, si el pensamiento viene
encendido, cuánto formatea, si sobre-delega en subagentes— cambia con cada generación y no vive en
esta guía.** Antes de apoyar una decisión en un rasgo de modelo, carga la skill `claude-api` o la
página del proveedor para ese modelo.

No es cautela de más: la propia documentación de Anthropic declara su guía general **subordinada**
a la del modelo —«lee primero la de tu modelo, después las técnicas»— y avisa de que una técnica
medida en un modelo hay que volver a comprobarla en otro. Una guía que congele esos rasgos no
envejece hacia «no lo sé», envejece hacia una instrucción que empeora el resultado.

Lo que queda aquí es lo que sobrevive a los cambios de generación: **el oficio**. Es poco y es
estable.

---

## 1. Antes de escribir el prompt

**Dos preguntas, en este orden, y las dos pueden ahorrarte el trabajo entero.**

- **¿Sé qué es «bien» y puedo comprobarlo?** Sin criterio de éxito verificable no estás
  iterando, estás cambiando cosas a ver qué pasa — que es el anti-patrón que
  {{guide:depuracion-sistematica}} persigue en código y aquí se disfraza de creatividad. El
  criterio se escribe como en {{guide:historias-usuario}}: qué, cuánto, sobre qué conjunto.
- **¿Es esto un problema de prompt?** Latencia, coste y a veces la calidad se arreglan mejor
  cambiando de modelo o de esfuerzo que redactando mejor ({{guide:llamadas-a-modelos}}). Un
  prompt no compensa un modelo mal elegido.

---

## 2. Claridad: el listón es un compañero sin contexto

El modelo es competente y **no conoce tus convenciones**. La prueba operativa: enséñale el prompt
a alguien del equipo que no lleve la tarea y pídele que lo siga. Si duda, el modelo también.

- **Di el formato y las restricciones.** No los deduce de tu intención.
- **Numera los pasos cuando el orden importa.** Una lista de puntos no comunica secuencia.
- **Di la motivación, no solo la orden.** «No uses puntos suspensivos» funciona peor que «esto lo
  lee un motor de voz y no sabe pronunciarlos»: con la razón delante, el modelo generaliza a los
  casos que no enumeraste. Es la diferencia entre una regla y una lista de prohibiciones.
- **Pide lo que quieres, no lo que no quieres.** «Escribe en párrafos de prosa» rinde mejor que
  «no uses markdown». Cuando la prohibición es imprescindible, ponla **además** de la forma
  positiva, no en su lugar.

---

## 3. Ejemplos: la palanca más fiable, y la que más se dispara sola

Los ejemplos dirigen formato, tono y estructura mejor que cualquier descripción abstracta. Tres
requisitos:

- **Relevantes** — que se parezcan al caso real, no a una versión de juguete.
- **Diversos** — que cubran el borde y que **no** compartan un patrón accidental.
- **Delimitados** — cada uno en su propia etiqueta, para que no se confundan con las
  instrucciones.

**El aviso que cuesta dinero: el modelo copia los detalles, incluidos los que no pretendías.** Si
tus tres ejemplos empiezan por un verbo, el cuarto también; si dos llevan un campo vacío, aprende
que puede vaciarlo. Revisa los ejemplos buscando el patrón involuntario, no solo la corrección.

Sobre cuántos: **empieza por uno y añade solo si la salida todavía no encaja.** Las fuentes no
coinciden aquí —la documentación recomienda de tres a cinco, el material más reciente empieza por
uno—, y ante fuentes en desacuerdo lo barato es lo incremental: un ejemplo cuesta poco, cinco
ejemplos malos enseñan cinco patrones malos.

---

## 4. Estructura: separar instrucción, dato y ejemplo

Cuando el prompt mezcla instrucciones, contexto, ejemplos y entrada variable, **etiqueta cada tipo
de contenido**. El modelo deja de tener que adivinar dónde acaba tu orden y empieza el material.

Tres reglas que se sostienen:

- **Nombres consistentes** entre prompts. Una etiqueta que significa algo distinto en cada sitio
  no estructura nada.
- **Anida cuando hay jerarquía real** — varios documentos, cada uno con su fuente y su contenido.
- **El dato que no controlas va delimitado siempre.** Aquí no es cuestión de claridad sino de
  seguridad: un texto de terceros concatenado en medio de tus instrucciones es la superficie de
  inyección. Lo que va dónde lo manda la dimensión de seguridad de `/review`.

Hay quien sostiene que los modelos actuales ya no necesitan etiquetas y que bastan títulos y
espacios en blanco. Para una respuesta de chat, probablemente. **Para un prompt de producción que
mezcla dato no confiable con instrucciones, la estructura explícita sigue siendo la frontera**, y
esa frontera no es estilo.

---

## 5. Rol y sistema: una frase basta

Fijar el rol en el prompt de sistema enfoca comportamiento y tono, y **una sola frase ya cambia el
resultado**. Lo que no hay que hacer es construir un personaje: el rol sobrecargado gasta prefijo,
compite con las instrucciones reales y envejece peor.

El reparto que funciona: **el rol y lo estable, en el sistema; las reglas del caso y el dato
variable, después.** Y hay una razón de coste además de la de claridad — el prefijo estable es lo
que se cachea ({{guide:llamadas-a-modelos}}).

---

## 6. Documentos largos: arriba, y citando antes de responder

Con entradas grandes, dos decisiones de colocación mandan sobre todo lo demás:

- **El documento va arriba; la pregunta y las instrucciones, al final.** Es la medición más
  robusta que da la documentación: preguntar al final mejora la calidad de forma apreciable,
  sobre todo con varios documentos.
- **Pide la cita antes que la conclusión.** «Extrae primero las citas relevantes, y responde solo
  a partir de ellas» ancla la respuesta en el texto en vez de en el recuerdo. Es exactamente la
  regla de la cita textual de {{guide:evidencia-y-preguntas}}, aplicada al prompt en vez de al
  revisor, y cierra igual: **si no hay cita, no hay afirmación**.

---

## 7. Razonamiento: general antes que prescriptivo

- **«Piensa a fondo» suele rendir más que un plan paso a paso escrito por ti.** El razonamiento
  del modelo excede con frecuencia al procedimiento que le habrías dictado, y el plan prescriptivo
  le impide encontrar el camino mejor.
- **Pedir el razonamiento explícito en el texto es un recurso de respaldo**, no la técnica
  principal: sirve cuando el pensamiento del modelo está apagado. Antes de llegar ahí,
  {{guide:llamadas-a-modelos}} dice lo que toca — bajar el esfuerzo, no apagar el razonamiento.
- **Pedir autocomprobación funciona** («antes de terminar, verifica la respuesta contra estos
  criterios»), y es de las instrucciones con mejor relación coste/beneficio. Con un matiz que hay
  que comprobar por modelo: en los que ya verifican solos, insistir añade tokens y latencia sin
  mejorar nada, y lo correcto es **quitar** la instrucción heredada, no reescribirla.

---

## 8. Lo que ya no se hace (y sigue circulando)

Tres patrones que aparecen en material todavía publicado y que hoy **fallan o estorban**. No los
copies de un ejemplo viejo sin comprobar contra `claude-api`:

| Patrón heredado | Qué pasa hoy |
|---|---|
| **Prellenar el último turno del asistente** para forzar formato o cortar el preámbulo | Rechazado por los modelos recientes. Se sustituye por pedir el formato en lenguaje natural, por salida estructurada, o por instrucción en el sistema |
| **Techo fijo de tokens de razonamiento** | Sustituido por el parámetro de esfuerzo; en los modelos recientes el parámetro viejo es un error |
| **Lenguaje anti-pereza heredado** — «CRÍTICO: DEBES usar esta herramienta», «ante la duda, úsala» | Los modelos actuales ya disparan solos: ese lenguaje hace que **sobre-disparen**. Lo que toca es bajar el tono a «usa esta herramienta cuando…», no subirlo |

La forma de no acumular esto es la de {{guide:evidencia-y-preguntas}}: un patrón que llevas tiempo
arrastrando es una afirmación sin comprobar, y se comprueba contra la documentación de la versión
que estás usando.

---

## Cómo aplicarla

- **En `/plan`:** si la tarea incluye un prompt, el criterio de aceptación dice **cómo se
  comprueba que el prompt hace lo que promete** — no «que responda bien». Sin eso no hay forma de
  saber si una iteración mejoró.
- **En `/implement`:** monta el prompt con lo estable primero y lo variable al final; delimita el
  dato que no controlas; empieza con un ejemplo y añade solo si hace falta. Al despachar un
  subagente, dale el encargo y el contrato, no tu conclusión.
- **En `/review`**, dos firmas sobre lo que el diff **introduce o empeora**:
  1. **Dato de terceros concatenado en el prompt** —contenido de usuario, resultado de
     herramienta, texto recuperado— sin delimitar y mezclado con las instrucciones. Va con la
     dimensión de seguridad; es superficie de inyección, no estilo.
  2. **Patrón heredado de la tabla anterior**: prellenado del último turno del asistente, techo
     fijo de razonamiento, o lenguaje de disparo en mayúsculas sobre una herramienta. Severidad
     normalmente Media; alta si el patrón hace fallar la petición.

  Ninguna otra propuesta de reescritura de prompts sin un criterio que la mida.

## Anti-patrones (nómbralos para no caer en ellos)

- **Iterar sin criterio** — cambiar la redacción y juzgar a ojo si mejoró. Es prueba y error con
  otro nombre, y no converge.
- **Arreglar con prompt lo que es del modelo** — redactar mejor para ganar latencia o coste,
  cuando la palanca era el modelo o el esfuerzo.
- **El rol como personaje** — media página de biografía donde bastaba una frase.
- **La lista de prohibiciones** — un prompt hecho solo de «no hagas». Di la forma positiva; deja
  la prohibición para lo que de verdad hay que cerrar.
- **Ejemplos con patrón accidental** — tres ejemplos que comparten algo que no pretendías
  enseñar. El modelo lo aprende igual.
- **Subir el tono para que obedezca** — mayúsculas y «CRÍTICO» sobre una instrucción de disparo.
  Hoy produce sobre-disparo, que es el fallo contrario y más caro.
- **Copiar un patrón de un ejemplo viejo** — el material publicado incluye técnicas que ya fallan.
- **Congelar en una guía un rasgo de modelo** — lo que cambia cada generación se consulta, no se
  escribe aquí.

## Autocrítica antes de cerrar

Antes de dar por bueno un prompt, pregúntate: **¿sé cómo comprobaré si este cambio lo mejora, o
voy a juzgarlo a ojo? ¿un compañero sin contexto sabría qué hacer con estas instrucciones? ¿he
dicho por qué, o solo qué? ¿el dato que no controlo está delimitado y separado de mis órdenes?
¿mis ejemplos comparten algún patrón que no quiero enseñar? ¿estoy subiendo el tono donde debería
bajarlo? ¿hay aquí algún rasgo de modelo que debería estar consultado en vez de escrito?** Si algo
falla, corrígelo antes de seguir.
