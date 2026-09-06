---
name: rendimiento
description: "Úsala al fijar un requisito de rendimiento en /plan y al juzgar el coste de ejecución de un cambio en /implement y /review. Síntomas: una consulta dentro de un bucle, una lista sin paginar sobre una tabla que crece, llamadas en serie que podrían ir a la vez, «con los datos de ahora va bien», o te oyes optimizar algo que no has medido."
user-invocable: false
---
# Rendimiento (medir antes de optimizar)

Cubre la característica **Eficiencia de desempeño** de ISO 25010 (ver
`calidad-producto` (`${CLAUDE_PLUGIN_ROOT}/skills/calidad-producto/SKILL.md`)), que hasta ahora era la única que el flujo nombraba sin decir cómo
se trabaja. La guía tiene dos filos y hay que sostener los dos a la vez:

- **No optimices lo que no has medido.** Una optimización sin medición es complejidad gratis:
  añade código, hace el diseño más difícil de cambiar y casi nunca ataca donde está el tiempo.
  Es la misma disciplina que `patrones-diseno` (`${CLAUDE_PLUGIN_ROOT}/skills/patrones-diseno/SKILL.md`) aplica a las abstracciones.
- **Pero hay defectos de rendimiento que se ven en el diff y no necesitan medición**, porque no
  son «lento»: son **errores de diseño conocidos** que empeoran con el volumen. Callarlos
  escudándose en «habría que medir» es la otra forma de equivocarse.

La frontera entre ambos es lo que resuelve esta guía.

## Lo que SÍ es un hallazgo desde el código (no requiere medición)

Todos comparten la misma firma: **funcionan con los datos de hoy y se degradan con el
volumen**, de forma no lineal.

- **Consulta dentro de un bucle** (el N+1 clásico): una consulta por elemento de una colección.
  Se resuelve trayendo el conjunto en una sola consulta o con carga anticipada.
- **Trabajo cuadrático sobre una colección que crece**: buscar dentro de un bucle recorriendo
  otra lista. Se resuelve indexando por clave en un mapa antes del bucle.
- **Llamadas independientes en serie** que podrían resolverse a la vez: si ninguna necesita el
  resultado de la anterior, esperarlas una a una suma latencias sin motivo.
- **Consulta sin límite ni paginación** sobre una tabla que crece sin techo. «Ahora hay 40
  filas» no es un límite: es el estado actual.
- **Paginar por desplazamiento (`OFFSET`) sobre una colección que crece.** Paginar no basta si
  la estrategia es la que se degrada: para servir la página 5000 el motor recorre y descarta
  todas las filas anteriores, así que el coste crece con la **profundidad** de la página, no
  con su tamaño. La forma que aguanta es la de cursor o clave (`WHERE id > último` apoyado en
  un índice), que salta directa al punto de corte. Es hallazgo cuando el listado no tiene techo
  y se pagina en profundidad; con tres páginas de un catálogo cerrado, no.
- **Filtrar, ordenar o agregar en memoria** lo que el motor de datos haría con un índice: se
  trae todo para descartar casi todo.
- **Traer más de lo que se usa**: campos, relaciones o columnas que nadie lee, en una respuesta
  que viaja por red.
- **Cargar el conjunto entero para contar o para comprobar si existe algo**.
- **Índice ausente —o de un tipo que no sirve para esa consulta—** en la columna por la que se
  filtra o se une, cuando la propia tarea crea esa consulta o esa tabla (si la migración es
  suya, ver `migraciones-de-datos` (`${CLAUDE_PLUGIN_ROOT}/skills/migraciones-de-datos/SKILL.md`)). Que exista un índice no basta: el tipo tiene que
  corresponder a la **forma** de la consulta. Un índice *hash* solo resuelve la igualdad, así
  que un filtro por rango o un ordenado sobre esa columna lo ignora y se vuelve al recorrido
  completo; el árbol equilibrado (B-tree y variantes) es el que cubre rango y orden. Comprueba
  la correspondencia, no solo la presencia.
- **Clave foránea sin índice.** Es el hueco que más veces se da por cubierto, porque la
  intuición dice que declarar la relación la indexa. `PRIMARY KEY` y `UNIQUE` sí crean su índice
  solos; **`FOREIGN KEY` no** — *«the declaration of a foreign key constraint does not
  automatically create an index on the referencing columns»* (documentación de PostgreSQL).
  Sin él, cada unión por esa columna y cada borrado o actualización en la tabla referenciada
  recorren la tabla que apunta. Es hallazgo cuando la propia tarea crea la relación o consulta
  por ella; si la migración es suya, ver `migraciones-de-datos` (`${CLAUDE_PLUGIN_ROOT}/skills/migraciones-de-datos/SKILL.md`).
- **Recálculo en cada pasada** de algo estable dentro del ciclo de render o de un bucle
  caliente; y trabajo pesado que bloquea el hilo que debía responder.
- **Importar un módulo entero** para usar una función, en código que viaja al cliente.

Repórtalos con la disciplina de `revision-hallazgos` (`${CLAUDE_PLUGIN_ROOT}/skills/revision-hallazgos/SKILL.md`): severidad normalmente Media, y
Alta si el crecimiento es previsible y el camino es de uso frecuente. Si el volumen está
acotado de verdad por el dominio (una lista de países, los roles del sistema), **no es un
hallazgo**: dilo y sigue.

## Lo que NO se juzga sin medir

Elegir entre dos implementaciones razonables, sustituir una estructura de datos, introducir una
caché, memorizar un cálculo, reescribir algo «porque será más rápido». Aquí la intuición falla
de forma sistemática: el tiempo casi nunca está donde uno cree. Sin una medición delante, la
respuesta correcta es **el código más simple**, y la optimización se convierte en su propia
tarea con su propio criterio.

**Ojo a la frontera:** esto vale para **sustituir** una estructura que ya está escrita. Para
**elegirla la primera vez**, cuando el código todavía no existe y no hay nada que medir, no hay
especulación posible —hay una tabla de operaciones contra costes— y esa decisión la resuelve
`coste-y-estructuras` (`${CLAUDE_PLUGIN_ROOT}/skills/coste-y-estructuras/SKILL.md`), igual que la de derivar del volumen qué clase de coste es
admisible.

## Cuando el cambio SÍ mete una caché

Que la caché no sea la primera respuesta (ver anti-patrones) no significa que nunca sea la
respuesta. Cuando el diff introduce una, deja de valer «habría que medir»: una caché mal puesta
tiene modos de fallo **conocidos y revisables leyendo el código**, y todos comparten la misma
firma —funcionan en local y revientan bajo concurrencia o con el tiempo—.

- **Todo caduca a la vez → estampida** (*cache stampede*, también *thundering herd* o
  *dogpile*). Si un lote de claves se puebla junto y con el mismo tiempo de vida, caduca junto:
  cada petición concurrente falla el acierto en el mismo instante y todas caen sobre el origen
  a la vez. Se evita repartiendo el vencimiento (un margen aleatorio por clave) y dejando que
  solo una petición recalcule mientras las demás esperan o sirven lo caducado.
- **Sin respuesta para la clave que no existe → penetración.** Si solo se guarda lo que se
  encuentra, cada petición de algo inexistente atraviesa la caché y golpea el origen — y eso lo
  provoca cualquiera desde fuera pidiendo identificadores al azar, así que además de lento es
  un vector. Se evita guardando también el «no existe», con un tiempo de vida corto.
- **Sin invalidación en la escritura.** La ruta que escribe tiene que decidir qué pasa con la
  entrada cacheada. Si nadie la toca, el sistema sirve datos viejos hasta que expiren, y eso ya
  no es un problema de rendimiento: es de corrección.
- **La caché tratada como fuente de verdad.** Código que da por hecho que lo cacheado está ahí.
  Una caché se puede vaciar entera en cualquier momento; el camino sin acierto tiene que seguir
  siendo correcto, solo más lento.
- **La clave no distingue lo que la respuesta distingue.** Si la respuesta depende del usuario,
  del rol, del idioma o del tenant y la clave no los incluye, el primer acierto contesta a
  todos los demás. Es el mismo fallo que el anterior visto desde el otro lado, y el más caro:
  se manifiesta como datos de una persona servidos a otra.
- **Respuesta autenticada declarada cacheable en una caché compartida.** Aquí solo se nombra
  para que no se cuele como «detalle de caché»: es un hallazgo de **seguridad**, no de esta
  guía, y lo reporta la dimensión 5.

Ninguno exige medición: son errores de diseño de la caché. Se reportan con la disciplina de
`revision-hallazgos` (`${CLAUDE_PLUGIN_ROOT}/skills/revision-hallazgos/SKILL.md`).

## Perseguir una ruta lenta (cuando la medición ya dice que lo es)

Con el problema medido y real, el error caro es empezar a tocar por donde uno sospecha. Esto es
`depuracion-sistematica` (`${CLAUDE_PLUGIN_ROOT}/skills/depuracion-sistematica/SKILL.md`) aplicada al tiempo, y el orden importa porque cada capa se
descarta con una medición barata antes de bajar a la siguiente:

1. **Red y transporte** — tamaño de la respuesta, compresión, número de viajes de ida y vuelta.
   Es lo que se descarta más rápido y sin tocar código.
2. **El código de la ruta** — trabajo pesado en el camino que debía responder, y esperas en
   serie que podrían ir a la vez.
3. **Los datos** — el sospechoso más frecuente: la consulta por elemento, el índice que no
   corresponde a la consulta, el conjunto que se trae entero para descartarlo casi todo.
4. **Lo que no controlas** — llamadas a terceros. El arreglo casi nunca es hacerlas más
   rápidas, sino no esperarlas en serie y ponerles un tiempo máximo, para que la lentitud ajena
   no se convierta en la tuya.
5. **El entorno** — recursos, límites del pool de conexiones, concurrencia. Va el último
   porque es lo que más veces se culpa sin pruebas.

**Mide antes de bajar de escalón.** Descartar una capa con una medición es barato; reescribirla
por sospecha, no.

## Cómo se escribe un criterio de rendimiento

«Que sea rápido» no es un requisito. Un criterio verificable tiene **cuatro piezas**, y sin las
cuatro no se puede comprobar en `/review` ni escribir un test que lo defienda:

1. **Qué se mide** — la operación concreta y su frontera (tiempo de respuesta del endpoint,
   tiempo hasta que la vista es interactiva, consultas ejecutadas por petición, memoria).
2. **Con qué volumen** — el tamaño de datos y la concurrencia bajo los que se mide. Este es el
   que más se olvida y el que hace inútil al resto.
3. **En qué entorno** — local, integración o producción: los números no son comparables entre
   ellos, así que el entorno forma parte del criterio.
4. **Cuál es el límite** — un número, y si procede su percentil (la media esconde justo los
   casos que molestan al usuario).

**Y no confundas las dos magnitudes.** La **latencia** es lo que tarda una petición; el
**throughput** es cuántas caben por segundo. No son lo mismo ni se mueven juntas: un sistema
puede sostener mucho volumen respondiendo despacio, y uno rápido puede saturarse con poco. Las
ata la concurrencia, por la ley de Little:

> concurrencia = throughput × tiempo de respuesta

Léela en el sentido que sirve: **si el tiempo de respuesta sube y la entrada no baja, lo que
crece es el número de peticiones vivas a la vez** — y con ellas las conexiones abiertas, la
memoria y los hilos ocupados. Por eso un criterio que fija un límite de tiempo sin decir bajo
qué concurrencia se mide no acota nada, y por eso una ruta que se degrada bajo carga suele
delatarse antes en el pool de conexiones que en el reloj.

Circula bastante la fórmula al revés («throughput = concurrencia × tiempo de respuesta»), que
afirma justo lo contrario: que responder más lento produce más throughput. Si te la encuentras
en una fuente, esa fuente no está revisada.

**Para elegir el volumen, juega con las escalas.** Pregúntate qué pasa con 1000 veces más datos
y con 1000 veces menos: el salto expone lo que a escala de hoy está escondido —el listado sin
paginar, la consulta sin índice, el bucle cuadrático— y convierte un umbral inventado en uno
derivado de una fuerza real del dominio. Si el dominio acota el volumen de verdad, esa cota
**es** la respuesta y se escribe.

## Cómo aplicarla

- **En `/plan`:** solo si la tarea activa la característica de eficiencia
  (`calidad-producto` (`${CLAUDE_PLUGIN_ROOT}/skills/calidad-producto/SKILL.md`)), y entonces con las cuatro piezas de arriba y su nivel de prueba
  según `niveles-y-tipos-de-prueba` (`${CLAUDE_PLUGIN_ROOT}/skills/niveles-y-tipos-de-prueba/SKILL.md`). Marcar «rendimiento» sin criterio es inventario.
- **En `/implement`:** el paso de refactor del ciclo TDD es para el **diseño**, no para la
  velocidad (`codigo-limpio` (`${CLAUDE_PLUGIN_ROOT}/skills/codigo-limpio/SKILL.md`)). No metas optimizaciones ahí. Lo que sí corresponde es no
  **introducir** ninguno de los defectos de la lista de arriba: son evitables mientras escribes,
  y carísimos de descubrir en producción.
- **En `/review` (dimensión 4):** recorre la lista de «hallazgo desde el código» sobre lo que el
  diff **introduce o empeora**. Nada preexistente, y ninguna propuesta de optimización
  especulativa: si no está en la lista, exige medición y no es un hallazgo.

## Anti-patrones (nómbralos para no caer en ellos)

- **Optimización especulativa** — «lo dejo así que es más rápido», sin medición y sin que el
  problema exista. Es la hermana de la generalidad especulativa: complejidad hoy a cambio de un
  beneficio hipotético.
- **Caché como primera respuesta** — una caché no arregla una consulta mal planteada: la
  esconde, y añade invalidación, coherencia y una clase nueva de bugs. Primero la consulta.
- **Caché sin clave ni invalidación decididas** — «lo cacheo y listo». Una caché es un segundo
  almacén con su propia coherencia: si nadie decide qué distingue su clave y cuándo se
  invalida, el ahorro se paga en datos viejos o, peor, cruzados entre usuarios.
- **Confundir latencia con throughput** — perseguir peticiones por segundo cuando lo que
  molesta al usuario es lo que tarda la suya, o al revés. Son criterios distintos y se miden
  distinto.
- **«Habría que medir» como excusa para callar un N+1** — el N+1 no es lento, es incorrecto por
  diseño. Se reporta.
- **Umbral sin volumen** — «responde en menos de 200 ms» sin decir con cuántos datos ni con
  cuánta concurrencia no se puede verificar ni fallar.
- **Micro-optimizar el bucle equivocado** — pulir lo que cuesta microsegundos mientras la
  petición espera cien milisegundos a una consulta. Sin perfilar, se acierta por casualidad.
- **Confundir rendimiento con deuda técnica** — un método largo es `codigo-limpio` (`${CLAUDE_PLUGIN_ROOT}/skills/codigo-limpio/SKILL.md`); una
  consulta por elemento es esta guía. Etiquetarlo bien evita que el hallazgo se pierda.

## Autocrítica antes de cerrar

Antes de reportar o de escribir un criterio, pregúntate: **¿este hallazgo está en la lista de
lo evidente en código, o estoy opinando sin medir? ¿el volumen que asumo es real o es el de
hoy? ¿mi criterio dice qué, con cuánto, dónde y cuál es el límite? ¿estoy proponiendo una
caché para tapar una consulta mal hecha? Si el cambio mete una caché, ¿alguien decidió su
clave, su invalidación y qué pasa con la clave que no existe? ¿estoy hablando de latencia o de
throughput, y lo he dicho?** Si algo falla, corrígelo antes de seguir.
