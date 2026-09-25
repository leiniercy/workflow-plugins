# Llamadas a modelos (qué modelo, cómo ordenas el prompt, y quién está esperando)

{{guide:rendimiento}} juzga el coste de ejecución de código **que ya existe** y exige medición.
{{guide:coste-y-estructuras}} deriva de un volumen la **clase de coste** admisible antes de
escribir nada. Esta guía cubre un coste que no es ninguno de los dos: cuando el código llama a
un modelo de lenguaje, **cada petición tiene un precio de catálogo**. No se perfila y no se
deduce del algoritmo —se lee de una factura—, y se decide antes de escribir, con tres palancas
que se aplican en este orden: **qué modelo**, **cómo está ordenado el prompt** y **si hay
alguien esperando la respuesta**.

| La situación | La guía |
|---|---|
| Código nuevo: qué estructura de datos escribo | {{guide:coste-y-estructuras}} |
| Código escrito: «esto podría ir más rápido» | {{guide:rendimiento}}. Exige medición. |
| Código que llama a un modelo: qué modelo, cómo monto el prompt, quién espera | **Esta.** |
| El modelo como superficie de ataque (inyección, salida usada como código, agencia) | Otra cosa: la dimensión de seguridad de `/review`, con el OWASP para LLM. |

---

## Regla 0 — Aquí no hay ni una cifra, y es a propósito

**Precios, mínimos de caché, límites de lote y nombres de modelo no se escriben en esta guía ni
se citan de memoria.** Antes de escribir un número o un identificador de modelo, carga la skill
`claude-api` que trae Claude Code y léelo de ahí. Fuera de Claude Code, la documentación viva
del proveedor; nunca el recuerdo.

No es ceremonia. Estas cifras se mueven entre generaciones de modelo y **no se mueven en la
dirección que parece**: el mínimo de tokens para que un prompt llegue a cachearse no baja de
forma monótona con cada modelo nuevo —hay modelos recientes cuyo mínimo multiplica por varias
veces el de otro de su misma familia—, así que «me suena que era X» falla justo donde parecía
más seguro. Una tabla copiada aquí no envejece hacia «no lo sé»: envejece hacia **una respuesta
equivocada con la autoridad de una guía**, que es peor que no tener guía.

Lo que sí sobrevive a los cambios de modelo es el criterio, y es lo único que hay debajo. Es
{{guide:evidencia-y-preguntas}} aplicado a un dato de proveedor: **una cifra que no has
comprobado hoy es una cifra que no tienes**.

---

## 1. Qué modelo — la pregunta no es cuál es mejor

Es **¿la tarea tiene una respuesta verificable?** Si la tiene, el modelo grande no acierta
«más»: acierta lo mismo y cuesta varias veces más, en entrada y en salida.

| La tarea | ¿Respuesta verificable? | Va en |
|---|---|---|
| Clasificar en categorías fijas | Sí: es una de N, no hay criterio | Tier barato |
| Extraer campos a un esquema | Sí: el esquema la valida | Tier barato |
| Resumir, traducir, reformular | Sí en la práctica: la calidad marginal no se nota | Tier barato |
| Escribir o revisar código | No: hay criterio, y un bug cuesta más que los tokens | Tier alto |
| Decidir enfoque, razonar con ambigüedad | No: es exactamente lo que estás comprando | Tier alto |

**La trampa que le da la vuelta a la tabla: el número de turnos pesa más que el precio por
token.** Un modelo pequeño en trabajo multi-turno —leer varios ficheros para deducir el patrón
vigente, iterar sobre un fallo, encadenar herramientas— gasta 2-3× turnos y acaba costando
**más** que el mediano que lo resuelve a la primera. La tabla vale para trabajo **de un turno**;
en cuanto la tarea es un bucle con herramientas, el suelo es el tier medio, por mucho que la
tarea parezca transcripción.

### La palanca que no degrada el modelo

Antes de bajar de gama, baja el **esfuerzo de razonamiento** (el parámetro `effort` de la API
de Claude): mantienes la capacidad del modelo y pagas menos razonamiento. Bajo para subtareas
simples, alto para el trabajo que importa, el máximo cuando la corrección pesa más que el coste.
Suele ser mejor apuesta que cambiar de modelo.

**Y no desactives el pensamiento para ahorrar.** En los modelos que lo traen activo por defecto,
apagarlo tiene un modo de fallo silencioso: el modelo escribe la llamada a la herramienta en el
**texto visible** en vez de en un bloque de uso de herramienta. La petición termina bien, la
herramienta **nunca se ejecuta**, no salta ningún error, y en un bucle de agente ese texto
contamina los turnos siguientes. Bajar el esfuerzo da el mismo ahorro sin ese riesgo.

---

## 2. Cómo ordenas el prompt — el caché es un prefijo, no un marcador

**Una sola regla, y de ella sale todo lo demás: el caché de prompt es una coincidencia de
prefijo, byte a byte.** Un byte distinto en la posición N invalida todo lo que venga después de
N. No hay coincidencia parcial ni difusa.

O sea que el trabajo no es poner el marcador de caché: es **ordenar el prompt de estable a
volátil**. Bien ordenado, el caché casi funciona solo; mal ordenado, no hay marcador que lo
salve. Lo estable primero (instrucciones congeladas, documentos, definiciones de herramientas
serializadas en orden determinista), lo volátil al final (la pregunta de este turno, la fecha,
el identificador de la petición).

Y el corte va **al final de lo compartido, no al final del prompt**. Puesto al final del todo,
cada petición escribe una entrada nueva y no lee ninguna: pagas la prima de escritura siempre y
no la amortizas nunca.

### Los invalidadores silenciosos

No dan error. Dan cero aciertos de caché, que es lo mismo pero sin avisar. Búscalos con `grep`
en todo lo que alimente el prefijo:

| Patrón | Por qué rompe |
|---|---|
| `new Date()`, `Date.now()` o la hora metidos en el prompt de sistema | El prefijo cambia en cada petición. **Es el más común, con diferencia.** |
| Un UUID, un `requestId` o un identificador de traza al principio | Igual: cada petición es única |
| Serializar un objeto sin orden determinista de claves | Los bytes difieren aunque el objeto sea el mismo |
| Interpolar usuario, sesión o tenant en el prompt de sistema | Un prefijo por usuario: cero compartición |
| Secciones condicionales (`if (flag) sistema += ...`) | Cada combinación de flags es un prefijo distinto |
| Herramientas que varían por usuario o por modo | Las herramientas se renderizan las primeras: no cachea nada, nunca |

El arreglo es siempre el mismo: **mover el dato dinámico detrás del último corte**, hacerlo
determinista, o borrarlo si no sostenía nada. Un dato inyectado en el turno 5 no invalida nada
anterior al turno 5.

### Dos que no salen en ninguna lista y cuestan más que todos los anteriores

- **Un fork que reconstruye el prefijo.** Un subagente, un resumen, una compactación: cualquier
  llamada lateral que vuelva a montar sistema, herramientas o modelo con **un byte de
  diferencia** falla el caché del padre entero. Copia del padre el prompt de sistema, las
  herramientas y el modelo **tal cual**, y añade lo propio al final. Un flujo que abre en
  abanico a varios revisores paga este error una vez por revisor.
- **Las peticiones concurrentes.** Una entrada de caché no es legible hasta que la primera
  respuesta empieza a llegar. Diez peticiones en paralelo con el mismo prefijo pagan las diez el
  precio completo. Lanza una, espera, y dispara el resto.

### Cómo se comprueba que funciona

Por el contador de tokens **leídos de caché** que devuelve cada respuesta. **Si sale cero
petición tras petición con el mismo prefijo, hay un invalidador** — y no se razona, se difunden
los bytes de dos prompts renderizados y se mira dónde se separan.

Y un malentendido que hace creer que no se está gastando: el contador de tokens de entrada es
**solo el resto sin cachear**. El tamaño real del prompt es la suma de los tres contadores
—entrada, escritura de caché y lectura de caché—. Un agente que lleva horas corriendo y marca
una entrada pequeña no mandó poco: el resto vino del caché.

---

## 3. Quién está esperando — la pregunta que abre el descuento

Si no hay nadie delante de una pantalla, el trabajo puede irse a la API de lotes, que rebaja a
la mitad todo el consumo a cambio de asincronía. Catálogo entero de productos, etiquetado
nocturno de tickets, traducciones de una migración: nadie espera. Una respuesta de chat: alguien
espera.

Es la misma pregunta **¿online u offline?** que plantea {{guide:coste-y-estructuras}} al elegir
estructura, y la misma frontera entre petición-respuesta y procesamiento por lotes de
{{guide:arquitectura}}. Casi nadie la hace en la fase de diseño, y es la que más descuento abre.

**El fallo número uno al recoger un lote: emparejar los resultados por posición del array.**
Llegan desordenados. Cada petición lleva un identificador propio y es por ahí por donde se
recuperan; además hay resultados que pueden venir con error o caducados, y ésos no traen
respuesta. Un lote recogido por índice pasa las pruebas con tres elementos y desalinea los datos
en producción.

---

## 4. Antes de fiarte de la respuesta: mira por qué paró

Una petición que devuelve 200 no garantiza que dentro haya una respuesta. El campo que dice **por
qué paró el modelo** es lo primero que hay que leer, y tiene tres formas de arruinarte el día sin
lanzar una sola excepción:

- **El modelo declinó.** Llega como respuesta correcta —200, con el motivo de parada puesto a
  «rechazo»—, así que **la monitorización montada sobre tasas de error no la ve nunca**. Y se
  ramifica por el motivo de parada, nunca por la categoría ni por el texto explicativo: esos
  pueden venir vacíos de forma normal y permanente.
- **La respuesta se cortó por el tope de tokens.** El corte es a mitad de palabra y el 200 es el
  mismo. Si no miras por qué paró, guardas una respuesta truncada como si estuviera completa.
- **En un lote, el rechazo llega como resultado correcto**, no como error. Un proceso que filtre
  por los fallidos lo cuela entero. Es el hermano del fallo de emparejar por posición: el lote no
  avisa, devuelve algo con la forma correcta.

La regla es una: **ramifica por el motivo de parada antes de leer el contenido**, y trata «se
cortó» y «declinó» como caminos propios, no como el camino feliz. Reintentar un rechazo en el
mismo modelo suele dar otro rechazo.

---

## 5. Antes de optimizar nada: mide cuál es la llamada cara

Si no sabes qué llamada se come el presupuesto, vas a optimizar la que no es. Dos cosas, las dos
baratas:

- **Contar los tokens de un prompt antes de mandarlo**, con el endpoint de conteo del propio
  proveedor. No con un tokenizador de otro: los modelos no comparten tokenizador, y ni siquiera
  lo comparten todas las generaciones del mismo.
- **Registrar el consumo de cada respuesta unos días.** Casi siempre sale **una sola** llamada
  responsable de la mayor parte del gasto, y hasta que no está en una tabla nadie adivina cuál.

Saltarse esto es {{guide:rendimiento}} otra vez: una afirmación sobre coste sin medición que la
sostenga.

---

## Cómo aplicarla

- **En `/plan`:** si la tarea llama a un modelo, el enfoque técnico fija **qué modelo por tarea**
  y **quién espera la respuesta** (online u offline). Son decisiones de diseño, no detalles de
  implementación: cambiarlas después es rehacer el flujo. Si hace falta una cifra —precio,
  mínimo de caché, límite de lote—, sale de `claude-api`; si no se puede comprobar, se declara
  como asunción ({{guide:evidencia-y-preguntas}}).
- **En `/implement`:** monta el prompt estable primero y volátil después, con el corte al final
  de lo compartido. Al despachar un subagente, **indica siempre el modelo** —omitirlo hereda el
  de la sesión, que suele ser el más caro— y reutiliza el prefijo del padre sin reconstruirlo.
- **En `/review`:** dos firmas, y solo sobre lo que el diff **introduce o empeora**:
  1. **Invalidador silencioso en el prefijo** — fecha, identificador único, serialización sin
     orden o interpolación de usuario dentro del prompt de sistema; herramientas construidas por
     usuario; un fork que rehace el prefijo del padre. Es un defecto de forma conocida, como el
     N+1: severidad normalmente Media, va con el coste de ejecución de la dimensión de
     convenciones, y se reporta con la disciplina de {{guide:revision-hallazgos}}.
  2. **Pensamiento desactivado en una petición con herramientas** — la llamada puede salir en el
     texto visible y no ejecutarse nunca, sin error. Eso no es coste: es un **bug**, y va a la
     dimensión de bugs.

  Ninguna otra propuesta de ahorro sin medición.

## Anti-patrones (nómbralos para no caer en ellos)

- **Citar una cifra de memoria** — un precio, un mínimo de caché o un nombre de modelo escritos
  sin comprobarlos hoy. Es el anti-patrón principal de esta guía, y la razón de que no tenga
  tablas de cifras.
- **Poner el marcador de caché sin ordenar el prompt** — el marcador no crea un prefijo estable,
  solo lo corta. Con la fecha en el sistema no cachea nada y el marcador da falsa tranquilidad.
- **Cortar al final del prompt** — escribe una entrada nueva en cada petición y no lee ninguna:
  la prima de escritura, siempre, a cambio de nada.
- **Cachear lo que cambia desde el principio** — sin prefijo reutilizable solo pagas la prima. Si
  el prompt difiere desde la primera línea, no lo caches.
- **Bajar de gama en trabajo multi-turno** — el modelo pequeño gasta en turnos lo que se ahorró
  en tokens, y encima tarda más.
- **Desactivar el pensamiento para ahorrar** — cambia un ahorro pequeño por una herramienta que
  no se ejecuta y no avisa. Baja el esfuerzo.
- **Emparejar resultados de un lote por posición** — llegan desordenados. Pasa las pruebas y
  desalinea los datos reales.
- **Optimizar la llamada que no es** — sin registrar el consumo, la intuición señala la llamada
  frecuente y el gasto está en la grande.

## Autocrítica antes de cerrar

Antes de dar por buena una llamada a un modelo, pregúntate: **¿la cifra que voy a escribir la he
leído hoy de `claude-api`, o la recuerdo? ¿esta tarea tiene respuesta verificable, y es de un
turno o de muchos? ¿qué hay en mi prompt de sistema que cambie en cada petición? ¿el corte está
al final de lo compartido o al final del todo? ¿algún fork reconstruye el prefijo del padre?
¿hay alguien esperando esta respuesta de verdad? ¿sé cuál es mi llamada cara, o lo estoy
suponiendo?** Si algo falla, corrígelo antes de seguir.
