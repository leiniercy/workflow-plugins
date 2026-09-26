
# Escritura natural

Un texto dirigido a una persona funciona si al terminarlo sabe qué hacer. El tono, la
longitud y las palabras que eliges están al servicio de eso.

Aplica a **todo** lo que un humano va a leer y contestar. No aplica a código ni a
documentación de esquema.

## Las tres piezas: hecho → impacto → acción

Casi cualquier texto útil responde a tres preguntas, en este orden:

1. **Hecho** — qué pasa. Se puede ver y se puede señalar: `users.controller.ts:58`, "la
   demo del martes", "3 de 8 endpoints pasan de 2 s". No una impresión.
2. **Impacto** — por qué importa. La consecuencia concreta, y de quién. Un id de otra org
   pasa el guard. El cliente se queda sin cierre de mes. El equipo repite el trabajo.
3. **Acción** — qué hacer y quién. Un paso que se pueda empezar hoy.
Sin el **hecho**, el texto es vago. No se puede discutir ni cumplir.

Sin el **impacto**, es una queja. El otro no sabe si le señalas un bug o un gusto tuyo.

Sin la **acción**, es un diagnóstico. Puede ser correcto y no servir de nada, porque
traducirlo en tareas le queda al que lo lee.

Escribe las tres piezas primero, en sucio, y solo después arréglales el tono. Un texto
amable y vago obliga a una segunda conversación. Uno seco y concreto, no.

### Corto por defecto

Un comentario práctico cabe en tres o cuatro frases. Si necesitas más, casi siempre es que
hay dos temas metidos en uno. Sepáralos y manda dos.

- Una idea por comentario. Dos problemas en el mismo hilo hacen que se conteste solo uno.
- Palabra de todos los días. Si una palabra obliga al otro a pararse, cámbiala.
- Si el comentario necesita un párrafo de contexto, el problema no es de escritura. Es que
  hace falta una llamada.
### Cuando no tienes la acción

Ver un problema sin tener el arreglo pasa a menudo. No inventes una solución para tapar el
hueco. "No sé de dónde sale, pero se reproduce siempre con un pedido sin `taxId`. ¿Lo
miramos juntos mañana?" ya es una acción. Una propuesta que no has pensado cuesta más
tiempo del que ahorra.

### Cuando el canal no pide acción

Un changelog, un post o un artículo informan, y la acción se entiende sola (actualiza,
lee, pruébalo). No fuerces un "siguiente paso" donde no hay ninguno. Lo que no se salta
nunca es el hecho concreto.

## Lo que las tres piezas no arreglan

### Objetivo: el trabajo, no la persona

Describe el trabajo y lo que hace. Los rasgos de carácter no se arreglan en una tarde; el
código sí.

- "El PR no trae test del caso de error", no "no te preocupas por la calidad".
- Etiqueta lo que es opinión. "Las tres queries del dashboard cargan en serie" es un hecho.
  "Creo que aquí un join sale mejor" es un juicio, y decirlo así invita a que te corrijan
  en lugar de defenderse.
- Pon número cuando lo tengas. "3 de 8 endpoints pasan de 2 s" mueve a alguien. "Va lento"
  solo abre un debate.
### Constructivo: el otro acaba con un camino

Constructivo no quiere decir suave. Quiere decir que al terminar de leer hay una salida.

- El elogio entra cuando es información. "El wrapper de retry de `queue.ts` es el patrón
  que copiaría en el resto" le dice algo que puede repetir. "¡Gran trabajo!" antes de una
  crítica solo avisa de que viene la crítica.
- Separa lo que bloquea de lo que harías distinto, y dilo con esa palabra. Mezclarlos
  convierte tu gusto en un bloqueo y hace que se discuta lo pequeño.
- Si la lista es larga, marca qué entra ahora y qué puede esperar. Doce comentarios sin
  prioridad se leen como "está todo mal".
### Oportuno: llega cuando aún se puede cambiar algo

El mismo texto vale distinto según cuándo llega.

- Antes de que ya no se pueda cambiar. Un comentario de arquitectura el día del deploy ya
  no es feedback, es un reproche.
- Si bloquea, va por el canal que interrumpe (Slack, mención directa), no en un hilo de
  ClickUp que se lee el lunes. Y "bloquea" va en la primera frase.
- Si ya no hay marcha atrás, cambia el objetivo. No vuelvas a discutir la decisión;
  escribe qué se hace distinto la próxima vez y dónde queda apuntado.
- No acumules. Tres semanas de feedback juntas se leen como un ataque, y ningún punto
  llega con el detalle que necesitaba.
## Cómo suena

### Tono humano

Escribe como le hablarías a un compañero competente al que respetas. Cercano sin ser
coloquial de más. Directo sin ser seco.

- Voz activa y sujeto explícito: "he cambiado el guard", no "se ha procedido a la
  modificación del guard".
- Palabra corriente antes que palabra culta: *usar* > *utilizar*, *hacer* > *efectuar*,
  *pero* > *no obstante*, *así que* > *por consiguiente*.
- Primera persona cuando eres tú quien hizo algo o quien opina. Nada de pasivas para
  esconder al autor, ni de plurales para diluir la responsabilidad.
- Se permite el matiz: "no me convence", "esto me molesta", "creo que aquí hay un bug".
  Un juicio propio suena humano; un veredicto impersonal, no.
### Cero relleno

Empieza por lo importante. La primera frase debe poder leerse sola y ya decir algo.

Nada de:

- Preámbulos: "Antes de nada, quería comentar que…", "Espero que estés bien", "Buena pregunta".
- Meta-narración: "En este comentario voy a explicar…", "Como se puede observar…".
- Despedidas infladas: "Quedo a tu entera disposición para cualquier aclaración que precises".
- Rodeos para no decirlo: "quizás podrías considerar la posibilidad de valorar si…".
- Resumir al final lo que acabas de decir en cinco líneas.
Si borras una frase y no se pierde información, esa frase era relleno.

### Estructura clara

- Párrafos de 1 a 3 frases. Un párrafo, una idea.
- Frases cortas. Si hay que leerla dos veces, pártela.
- Listas solo con elementos paralelos de verdad (3+ ítems comparables). Una lista de dos
  puntos es un párrafo mal cortado.
- **Negrita** para la palabra que decide, no para media frase.
- Apunta al sitio exacto: `file.ts:42`, no "en el archivo del servicio".
## El registro cambia con el canal

Deduce o pregunta **para dónde va** el texto antes de escribirlo. Las tres piezas son las
mismas en todos los canales; el registro y la longitud, no.

| Canal | Registro | Longitud | Detalles |
|---|---|---|---|
| **Code review / PR** | Técnico y concreto. Precisión antes que diplomacia, pero sin desprecio | 1-4 frases por hilo | Cita `fichero:línea`. Marca si bloquea o es preferencia. Un hilo, un problema |
| **Comentario en ClickUp** | Profesional, orientado a decisión | 3 líneas como máximo, y la tercera es un enlace | Estado o decisión / lo que bloquea con @dueño / dónde está el detalle. Los ficheros tocados, la investigación y las alternativas descartadas van en el enlace, no en el comentario |
| **Slack** | Conversacional, casi hablado | 1-3 frases | Un mensaje, un tema. Si pides algo, va en la primera línea. El contexto largo va en hilo |
| **1:1 / feedback a una persona** | Directo, en primera persona y en privado | 2-4 frases por punto, dos o tres puntos como máximo | Un ejemplo fechado por punto ("en la demo del martes"). Di el impacto en ti o en el equipo. Cierra con una pregunta abierta de verdad, no con un permiso |
| **Retrospectiva** | Neutro, sobre el sistema | 1-2 frases por punto | Nombra el proceso que falló, no a quien lo ejecutó. Cada acuerdo sale con dueño y fecha o no es un acuerdo |
| **Correo / feedback a cliente** | Cortés y sin evasivas | 1 párrafo + siguiente paso | El impacto en su negocio, no en tu arquitectura. Si son malas noticias, van en la primera frase y tu propuesta justo detrás |
| **Descripción de PR / changelog** | Neutro, informativo | Resumen + qué cambia + cómo probarlo | Escrito para quien lo lea en seis meses sin contexto |
| **Blog / artículo** | Explicativo, con ritmo | Párrafos cortos, subtítulo cada 3-4 párrafos | Se permite una anécdota o un ejemplo real. Un concepto por sección |
| **Redes sociales** | Directo y con gancho | Twitter/X: 1-2 frases. LinkedIn: 3-5 líneas máx | La primera línea es el anzuelo. Sin cadenas de hashtags, sin emojis decorativos, sin "🚀 Encantado de compartir que…" |

Si no está claro el canal, **pregunta** en una línea. No escribas un texto neutro que no
encaja en ninguno.

### El comentario de ClickUp cabe en tres líneas

Es el canal que más se infla, porque el que escribe acaba de terminar el trabajo y quiere
contarlo. El que lee está entre dos tareas y solo necesita saber si le toca mover algo.

1. **Estado o decisión.** Una frase que se entienda sola.
2. **Lo que bloquea.** Qué falta, @quién y una pregunta que se conteste en diez segundos.
   Si no bloquea nada, esta línea no existe.
3. **Dónde está el detalle.** Spec, PR o doc.
Al enlace se van los ficheros tocados, los pasos de la investigación, las alternativas
descartadas, los logs y el resumen del spec — que ya está escrito en el spec.

El comentario largo no falla por largo. Falla porque entierra la decisión pendiente en la
línea siete y nadie llega hasta ahí.

Única excepción: si no hay spec ni PR donde enlazar, el detalle tiene que caber en algún
sitio y ese sitio es el comentario. Pero entonces lo que toca es crear el spec, no alargar
el comentario.

## Anti-patrones (nómbralos para no escribirlos)

Palabras y muletillas que delatan texto generado. Fuera:

*delve*, *profundizar en*, *aprovechar (por "usar")*, *robusto*, *sinergia*,
*holístico*, *en el vertiginoso mundo de*, *no es solo X, es Y*, *desbloquear el
potencial*, *game changer*, *cabe destacar*, *es importante señalar*, *en resumen*,
*en conclusión* (en un texto de tres párrafos), *sumergirse*, *un viaje*,
*revolucionario*, *el poder de*.

También fuera el trío de adjetivos de relleno ("rápido, fiable y escalable") cuando el
tercero solo está ahí por ritmo. Y el emoji al inicio de cada bullet.

### Dónde está la línea del "no es X, es Y"

Lo que sobra es el contraste **aditivo**: "no es solo rápido, es escalable". Niega algo que
nadie discutía para colar dos elogios por el precio de uno.

El **correctivo** se queda: "el N+1 no es lento, es incorrecto por diseño". Ahí la negación es
el contenido, porque el que lee llega creyendo lo que niegas.

La prueba: si nadie habría pensado X, borra la negación y afirma Y. Si el otro llega creyendo
X, escríbela.

### Y cuando el texto es feedback, fuera además

- **El sándwich de elogios.** "¡Gran trabajo! Solo un detalle… ¡pero en general genial!"
  El otro se queda con el pan y tira el relleno.
- **El juicio de carácter.** *descuidado*, *poco riguroso*, *le falta implicación*.
  Describe lo que hizo, que es lo único que puede cambiar.
- **El "en general está bien" a secas.** Sin un ejemplo detrás no informa de nada y no se
  puede repetir a propósito.
- **La pregunta retórica como reproche.** "¿No lo habías probado?" Di qué falta y qué
  falta hacer.
- **El plural que esconde al destinatario.** "Deberíamos tener más cuidado con los tests".
  Lo que quieres decir es "a este PR le falta el test del 402".
- **El "para futuras ocasiones" sobre algo que todavía se puede arreglar hoy.**
## Ejemplos

**Code review**

❌ ~~¡Excelente trabajo con esta implementación! Solo quería señalar que, desde mi humilde punto de vista, podría ser interesante considerar la posibilidad de añadir una validación adicional en el endpoint, ya que en determinados escenarios el input podría no venir correctamente formado. Quedo atento a tus comentarios.~~

✅ **Bloquea.** `users.controller.ts:58` — el DTO no valida `organizationId`, así que un id de otra org pasa el guard y el usuario acaba viendo datos ajenos. Añade el `@IsUUID()` y el check de pertenencia antes del `findOne`.

*El ❌ tiene las tres piezas, escondidas bajo cortesía. El ✅ dice dónde, qué se rompe y qué escribir.*

**Comentario en ClickUp**

❌ ~~Procedo a informar de que se ha completado el análisis de la tarea. Tras revisar el módulo de facturación he identificado que el flujo actual pasa por tres servicios (`billing.service.ts`, `invoice.repository.ts` y el worker de Bull), de los cuales dos comparten la lógica de redondeo. He valorado dos alternativas: extraer un helper común o mover el cálculo al dominio. Me he decantado por la segunda porque… Adjunto el spec con el detalle completo. Quedo atento a comentarios.~~

✅ Spec cerrado: el cálculo de redondeo se mueve al dominio. Afecta a `api` y `worker`.
Falta decidir si migramos las facturas ya emitidas. @Enol, ¿entra en este sprint?
Detalle en `tasks/869ed6ue8/spec.md`

*Estado, lo único que bloquea y el enlace. Todo lo que el ❌ narra ya está escrito en el spec, así que contarlo otra vez solo entierra la pregunta a @Enol.*

**1:1**

❌ ~~Últimamente te veo un poco desconectado del equipo y creo que deberías implicarte más en las reuniones. No lo digo a malas, en general lo haces muy bien.~~

✅ En las tres últimas dailies has pasado tu turno en menos de diez segundos. Y del bloqueo del ETL nos enteramos el martes, cuando ya llevaba dos días. Eso me deja sin margen para ayudarte antes de la demo. ¿Te funcionaría mejor escribirlo en el hilo del canal antes de la daily?

*Cero rasgos de carácter. Hechos con fecha, el impacto en mí y una propuesta que se prueba mañana.*

**Retrospectiva**

❌ ~~El sprint ha ido mal porque QA no llegó a tiempo con las pruebas y hubo poca comunicación.~~

✅ Las pruebas de `billing` entraron el último día porque staging no estuvo levantado hasta el jueves. Propuesta: staging se levanta el primer día del sprint. @Marta lo mete en el checklist de arranque antes del lunes.

*Falla el proceso, no QA. Y el acuerdo tiene dueño y fecha, así que existe.*

**Feedback a cliente**

❌ ~~Le escribo para comunicarle que, debido a una serie de circunstancias ajenas a nuestra planificación inicial, la entrega del módulo de inventario sufrirá una ligera demora…~~

✅ El módulo de inventario no llega el 14, llega el 28. El conector de Holded cambió su API el mes pasado y hemos tenido que reescribir la sincronización.
Para que no te quedes sin cierre de mes, te propongo esto. El 14 te dejamos el inventario en el dashboard, cargando el CSV a mano. El 28 entra la sincronización automática.

*La mala noticia en la primera frase, la causa en una línea y una salida para lo que a él le importa.*

**LinkedIn**

❌ ~~🚀 ¡Encantado de compartir que hemos lanzado una solución revolucionaria que desbloquea el verdadero potencial de los datos en el sector hostelero! En el vertiginoso mundo actual…~~

✅ Un restaurante medio pierde un 3% de caja en descuadres que nadie mira.
Hemos montado un motor que los detecta el mismo día, cruzando TPV, inventario y turnos. Sin que nadie tenga que abrir un Excel.

**Blog**

❌ ~~En este artículo profundizaremos en el fascinante viaje de la migración de nuestro data warehouse, explorando de manera holística los desafíos…~~

✅ Migramos el DWH de PostgreSQL a Snowflake sin cortar el servicio. Los dos convivieron cuatro meses.
Esto es lo que rompimos por el camino, y qué haríamos distinto.

## Autocrítica antes de entregar

- [ ] ¿Está el **hecho**? Se puede señalar, y con número si lo hay.
- [ ] ¿Está el **impacto**? Qué se rompe y para quién.
- [ ] ¿Está la **acción**? Un paso que se empieza hoy, con dueño si hay más de una persona.
- [ ] ¿Cabe en tres o cuatro frases? Si no, ¿son dos comentarios?
- [ ] ¿Hablo del trabajo o de la persona?
- [ ] ¿Se distingue lo que bloquea de lo que yo haría distinto?
- [ ] ¿Llega a tiempo de cambiar algo, y por el canal que corresponde?
- [ ] La primera frase, sola, ¿ya dice algo?
- [ ] ¿Sobra alguna frase? Bórrala.
- [ ] ¿Hay alguna palabra que obligue al otro a pararse? Cámbiala.
- [ ] Leído en voz alta, ¿suena a algo que diría una persona?
