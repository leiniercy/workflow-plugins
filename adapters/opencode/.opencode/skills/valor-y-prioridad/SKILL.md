---
name: valor-y-prioridad
description: "Úsala al elegir qué entra y qué se queda fuera, o cuando el alcance crezca a mitad de algo. Síntomas: en la lista todo es prioritario o urgente; aparece un «ya que estamos»; alguien propone meter más gente para llegar a la fecha; se defiende terminar algo porque ya se empezó; o se llama MVP a un producto hecho con prisa."
---
# Valor y prioridad (decidir qué no se hace)

Priorizar no es ordenar una lista: es **elegir qué se queda fuera**. Una lista donde todo entra
está ordenada, no priorizada, y el producto crece con funcionalidades que nadie usa.

`patrones-diseno` (skill de OpenCode, auto-activable) y `arquitectura` (skill de OpenCode, auto-activable) frenan la sobre-ingeniería **dentro** del
código —abstracciones que nadie pidió—. Esta guía la frena un piso más arriba: **soluciones
técnicas excelentes a problemas que no existen**. Es el mismo error, y el de arriba sale más
caro porque el código sobrante al menos se borra.

## La matriz, que es simple a propósito

Para cada candidato, dos números aproximados: **valor** (qué cambia para quien lo usa) y
**coste** (esfuerzo). No hace falta precisión — hace falta posición relativa.

|  | **Coste bajo** | **Coste alto** |
|---|---|---|
| **Valor alto** | Se hace ya. No hay discusión | Se hace, pero **partido**: entrega lo primero que ya sirva |
| **Valor bajo** | Se hace si cae de camino. Nunca antes que lo de arriba | **No se hace.** Y se dice en voz alta, no se deja al final de una lista |

La casilla que cuesta es la de abajo a la derecha, porque casi siempre la pide alguien con
criterio. Decir que no ahí es el trabajo.

## Cómo se estima el valor sin engañarse

- **El valor lo tiene quien usa, no quien construye.** «Sería más limpio» y «lo pide el
  cliente» no son la misma columna, y solo la segunda es valor.
- **Cuéntalo en problemas, no en deseos.** «No poder filtrar por fecha les cuesta media hora
  cada mañana» se puede comparar; «estaría bien poder filtrar» no.
- **Si nadie sabe cuánta gente lo usará, eso es la respuesta.** Valor desconocido es valor bajo
  hasta que alguien lo mida. Lo contrario —darlo por alto porque suena bien— es como entra casi
  todo lo que sobra.
- **El coste hundido no cuenta.** Que ya se hayan invertido tres semanas no aumenta el valor de
  terminarlo ni un punto. Es la falacia más cara de esta tabla.

Y una corrección conocida, de Kahneman y Tversky: **la falacia de la planificación**. Se
subestima el tiempo y el coste, y a la vez se sobreestima el beneficio — las dos en la
dirección que hace que todo parezca que merece la pena. Si vas a corregir a ojo, corrige
subiendo el coste y bajando el valor, no al revés.

## La única palanca que queda cuando aprieta la fecha

Alcance, plazo y coste no son tres perillas independientes. **Añadir gente a un proyecto tarde
lo retrasa más** (Brooks): la coordinación crece, hay trabajo que no se paraleliza, y quien
entra consume el tiempo de quien ya estaba. Así que cuando la fecha no se mueve y el equipo
tampoco, **lo único que se puede recortar es el alcance** — y recortarlo a tiempo y a propósito
es una decisión; descubrirlo la víspera es un accidente.

Recortar bien significa **entregar menos cosas terminadas**, no las mismas cosas a medias. Un
producto con tres funcionalidades que funcionan es mejor que uno con seis que fallan.

## Prototipo, MVP y producto no son lo mismo

Se confunden constantemente y cada uno se juzga distinto:

- **Prototipo** — sirve para decidir. **No se despliega nunca.** Su calidad se mide en cuánto
  ayuda a elegir, no en si aguanta. Tirarlo es el plan, no un fracaso.
- **MVP** — sí se despliega, con usuarios de verdad, y su objetivo es **aprender** si el
  problema es el que creías. Mínimo en alcance, no en calidad: un MVP que se cae no enseña nada
  sobre el producto, solo sobre el despliegue.
- **Producto** — ya sabes que el problema existe; ahora se trata de servirlo bien.

Llamar MVP a un producto mal hecho es la forma más común de gastar el término.

## Cómo aplicarla

- **En `/define`:** al descomponer, el lote se enseña entero y ordenado, con lo que queda fuera
  **dicho explícitamente**. Una descomposición sin descartes no ha priorizado.
- **En `/plan`:** si el alcance que se propone es mayor que el problema que se enunció, dilo
  antes de escribir la spec. Es más barato recortar aquí que en la revisión.
- **En `/implement`:** cuando aparezca el «ya que estamos», eso es alcance nuevo sin decidir.
  Se nombra y se pregunta; no se mete.
- **Al revisar:** funcionalidad que el criterio no pedía es un hallazgo, no un regalo. Alguien
  la mantendrá durante años.

## Anti-patrones (nómbralos para no caer en ellos)

- **La lista donde todo es prioritario** — si hay diez «críticas», no hay ninguna. Es no
  decidir, con apariencia de haber decidido.
- **«Ya que estamos»** — la vía de entrada de casi todo el alcance no decidido. Cuesta poco
  ahora y se mantiene para siempre.
- **Construir para el usuario hipotético** — el que algún día pedirá esto. No existe, y el que
  sí existe está esperando otra cosa.
- **Valor alto porque lo pide alguien importante** — puede ser verdad, pero entonces se sostiene
  con el problema que resuelve. Si solo se sostiene con quién lo pide, es una orden, no una
  prioridad, y conviene llamarla así.
- **Terminar porque ya se empezó** — coste hundido. La pregunta correcta es qué valor queda por
  delante, no cuánto se lleva gastado.
- **Recortar calidad en vez de alcance** — sale más caro y más tarde: los defectos vuelven con
  intereses (`deuda-tecnica` (skill de OpenCode, auto-activable)). Se entregan menos cosas, no peores.

## Autocrítica antes de cerrar la priorización

Antes de dar por buena una lista, pregúntate: **¿hay algo que he decidido NO hacer, y está
dicho? ¿el valor que he asignado está en problemas concretos o en adjetivos? ¿estoy contando
como valor algo que solo lo tiene para quien construye? ¿he corregido el coste al alza y el
valor a la baja, o al revés? ¿lo que voy a entregar son cosas terminadas, o todas a medias?**
Si algo falla, corrígelo antes de seguir.
