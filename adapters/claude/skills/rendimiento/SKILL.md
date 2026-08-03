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
- **Filtrar, ordenar o agregar en memoria** lo que el motor de datos haría con un índice: se
  trae todo para descartar casi todo.
- **Traer más de lo que se usa**: campos, relaciones o columnas que nadie lee, en una respuesta
  que viaja por red.
- **Cargar el conjunto entero para contar o para comprobar si existe algo**.
- **Índice ausente** en la columna por la que se filtra o se une, cuando la propia tarea crea
  esa consulta o esa tabla (si la migración es suya, ver `migraciones-de-datos` (`${CLAUDE_PLUGIN_ROOT}/skills/migraciones-de-datos/SKILL.md`)).
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
caché para tapar una consulta mal hecha?** Si algo falla, corrígelo antes de seguir.
